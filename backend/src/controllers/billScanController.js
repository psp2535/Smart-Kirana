const { GoogleGenerativeAI } = require('@google/generative-ai');
const Inventory = require('../models/Inventory');
const { normalize, isValidQuantity } = require('../utils/quantityHelper');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * STEP 1: PARSE BILL IMAGE
 * Extract items from wholesale bill - NO DB WRITES
 */
const parseBillImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No bill image uploaded'
            });
        }

        const userId = req.user.id;

        console.log('📄 Parsing bill image from memory buffer using Gemini');

        // Get image buffer directly from memory
        const imageBuffer = req.file.buffer;
        const base64Image = imageBuffer.toString('base64');

        const prompt = `You are analyzing a wholesale purchase bill/invoice image for an Indian kirana store.

STRICT EXTRACTION RULES:
1. Extract ALL clearly visible items from the bill.
2. Return item name, quantity, unit, cost price, and category.
3. If selling price is not visible, estimate as cost_price * 1.2 (20% markup).
4. Ignore tax/GST details, addresses, and other non-item info.
5. Units must be one of: kg, litre, piece.
6. Categories must be one of: Food & Beverages, Electronics, Clothing, Books, Home & Garden, Sports, Beauty & Health, Automotive, Office Supplies, Other.

OUTPUT FORMAT (Respond with ONLY a valid JSON object, no markdown, no explanation):
{
  "items": [
    {
      "item_name": "Product Name",
      "quantity": 10,
      "unit": "kg|litre|piece",
      "cost_price": 50,
      "selling_price": 60,
      "category": "Category"
    }
  ],
  "confidence": 0.95
}

Confidence scoring:
- 0.9-1.0: All items clearly visible
- 0.7-0.89: Most items clear, some fields estimated
- Below 0.7: Poor quality, manual review needed`;

        // Use gemini-2.5-flash multimodal model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    mimeType: req.file.mimetype || 'image/jpeg',
                    data: base64Image,
                }
            }
        ]);

        const responseText = result.response.text().trim();
        console.log('🤖 AI Response:', responseText);

        // Parse AI response
        let parsedData;
        try {
            // Remove markdown code fences if model wrapped it
            const clean = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsedData = JSON.parse(clean);
        } catch (parseError) {
            console.error('JSON parse error from Gemini:', parseError);
            return res.status(400).json({
                success: false,
                message: 'Could not parse bill image. Please ensure the image is clear.',
                aiResponse: responseText
            });
        }
        // Validate structure
        if (!parsedData.items || !Array.isArray(parsedData.items)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid bill format. Please upload a clear bill image with item details.'
            });
        }

        // Check confidence
        const confidence = parsedData.confidence || 0;
        const needsReview = confidence < 0.7;

        // Log for debugging
        console.log('📊 Parsed items:', parsedData.items.length);
        console.log('🎯 Confidence:', confidence);

        // Return parsed data for user confirmation
        return res.json({
            success: true,
            message: needsReview 
                ? 'Bill parsed with low confidence. Please review items carefully.'
                : `Successfully extracted ${parsedData.items.length} item(s) from bill.`,
            data: {
                items: parsedData.items,
                confidence: confidence,
                needsReview: needsReview,
                userId: userId // Include for execute step
            }
        });

    } catch (error) {
        console.error('❌ Bill parsing error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // No file cleanup needed (using memory storage)
        
        return res.status(500).json({
            success: false,
            message: 'Error parsing bill: ' + error.message
        });
    }
};

/**
 * STEP 2: EXECUTE BILL ITEMS
 * User confirmed - now write to database
 */
const executeBillItems = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items } = req.body;

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No items provided for execution'
            });
        }

        console.log('✅ Executing bill items:', items.length);

        const results = {
            created: [],
            updated: [],
            errors: []
        };

        // Process each item
        for (const item of items) {
            try {
                // Validate item data
                if (!item.item_name || !item.quantity || !item.cost_price) {
                    results.errors.push({
                        item: item.item_name || 'Unknown',
                        error: 'Missing required fields (name, quantity, cost price)'
                    });
                    continue;
                }

                // Validate quantity
                if (!isValidQuantity(item.quantity)) {
                    results.errors.push({
                        item: item.item_name,
                        error: 'Invalid quantity - must be a positive number'
                    });
                    continue;
                }

                // Normalize quantity
                const normalizedQty = normalize(item.quantity);

                // Validate positive numbers
                if (normalizedQty <= 0 || item.cost_price <= 0) {
                    results.errors.push({
                        item: item.item_name,
                        error: 'Quantity and cost price must be positive'
                    });
                    continue;
                }

                // Ensure selling price is higher than cost price
                const sellingPrice = item.selling_price || Math.round(item.cost_price * 1.2);
                if (sellingPrice <= item.cost_price) {
                    results.errors.push({
                        item: item.item_name,
                        error: 'Selling price must be higher than cost price'
                    });
                    continue;
                }

                // Determine unit (default to piece for backward compatibility)
                const unit = item.unit || 'piece';

                // Check if item exists (case-insensitive)
                const existingItem = await Inventory.findOne({
                    user_id: userId,
                    item_name: { $regex: new RegExp(`^${item.item_name}$`, 'i') }
                });

                if (existingItem) {
                    // Update existing item - increase stock (safely)
                    const newStock = normalize(existingItem.stock_qty + normalizedQty);
                    
                    existingItem.stock_qty = newStock;
                    existingItem.cost_price = item.cost_price;
                    existingItem.selling_price = sellingPrice;
                    existingItem.price_per_unit = sellingPrice;
                    existingItem.unit = unit; // Update unit if changed
                    
                    // Update category if provided
                    if (item.category) {
                        existingItem.category = item.category;
                    }
                    
                    await existingItem.save();
                    
                    results.updated.push({
                        item_name: existingItem.item_name,
                        quantity_added: normalizedQty,
                        new_stock: newStock,
                        unit: unit,
                        cost_price: existingItem.cost_price,
                        selling_price: existingItem.selling_price,
                        category: existingItem.category
                    });
                } else {
                    // Create new item
                    const newItem = new Inventory({
                        user_id: userId,
                        item_name: item.item_name,
                        stock_qty: normalizedQty,
                        cost_price: item.cost_price,
                        selling_price: sellingPrice,
                        price_per_unit: sellingPrice,
                        category: item.category || 'Other',
                        description: 'Added from bill scan',
                        min_stock_level: 5,
                        unit: unit
                    });
                    
                    await newItem.save();
                    
                    results.created.push({
                        item_name: newItem.item_name,
                        quantity: normalizedQty,
                        unit: unit,
                        cost_price: newItem.cost_price,
                        selling_price: newItem.selling_price,
                        category: newItem.category
                    });
                }

            } catch (itemError) {
                console.error('Error processing item:', itemError);
                results.errors.push({
                    item: item.item_name || 'Unknown',
                    error: itemError.message
                });
            }
        }

        // Log execution results
        console.log('📊 Execution results:', {
            created: results.created.length,
            updated: results.updated.length,
            errors: results.errors.length
        });

        // Return results
        return res.json({
            success: true,
            message: `Successfully processed ${results.created.length + results.updated.length} item(s)`,
            data: {
                summary: {
                    total_items: items.length,
                    created: results.created.length,
                    updated: results.updated.length,
                    failed: results.errors.length
                },
                created: results.created,
                updated: results.updated,
                errors: results.errors.length > 0 ? results.errors : null
            }
        });

    } catch (error) {
        console.error('Bill execution error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error executing bill items: ' + error.message
        });
    }
};

module.exports = {
    parseBillImage,
    executeBillItems
};
