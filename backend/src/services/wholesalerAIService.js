const WholesalerInventory = require('../models/WholesalerInventory');
const WholesalerOrder = require('../models/WholesalerOrder');
const Notification = require('../models/Notification');
const User = require('../models/User');
const geminiService = require('./geminiService');

const getWholesalerAIInsights = async (wholesalerId) => {
    try {
        const inventory = await WholesalerInventory.find({ wholesaler: wholesalerId, isActive: true });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const orders = await WholesalerOrder.find({
            wholesaler: wholesalerId,
            createdAt: { $gte: thirtyDaysAgo }
        }).populate('retailer', 'name shop_name');

        const productPerformance = inventory.map(product => {
            const productOrders = orders.filter(order =>
                order.items.some(item => item.productId.toString() === product._id.toString())
            );

            const totalSold = productOrders.reduce((sum, order) => {
                const item = order.items.find(i => i.productId.toString() === product._id.toString());
                return sum + (item ? item.quantity : 0);
            }, 0);

            const avgOrdersPerWeek = (productOrders.length / 4).toFixed(1);
            const stockTurnoverRate = product.availableQty > 0 ? (totalSold / product.availableQty * 100).toFixed(1) : 0;

            let movementSpeed = 'slow';
            if (avgOrdersPerWeek >= 3 || stockTurnoverRate >= 50) movementSpeed = 'fast';
            else if (avgOrdersPerWeek >= 1 || stockTurnoverRate >= 20) movementSpeed = 'medium';

            const stockStatus = product.availableQty < product.minOrderQty * 2 ? 'low' :
                product.availableQty > product.minOrderQty * 10 ? 'high' : 'normal';

            return {
                productId: product._id, productName: product.productName, category: product.category,
                totalSold, avgOrdersPerWeek: parseFloat(avgOrdersPerWeek), stockTurnoverRate: parseFloat(stockTurnoverRate),
                availableQty: product.availableQty, pricePerUnit: product.pricePerUnit,
                movementSpeed, stockStatus
            };
        });

        const retailerAnalysis = {};
        orders.forEach(order => {
            const retailerId = order.retailer._id.toString();
            if (!retailerAnalysis[retailerId]) {
                retailerAnalysis[retailerId] = {
                    retailerName: order.retailer.shop_name || order.retailer.name,
                    totalOrders: 0, totalSpent: 0, favoriteProducts: {}
                };
            }
            retailerAnalysis[retailerId].totalOrders++;
            retailerAnalysis[retailerId].totalSpent += order.totalAmount;
            order.items.forEach(item => {
                retailerAnalysis[retailerId].favoriteProducts[item.productName] = (retailerAnalysis[retailerId].favoriteProducts[item.productName] || 0) + item.quantity;
            });
        });

        // Use Gemini to generate professional insights
        const analysisReport = await geminiService.analyzeWholesalerInsights(
            inventory,
            productPerformance,
            Object.values(retailerAnalysis)
        );

        // Pre-calculate technical data for the UI
        const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
        const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        let totalCost = 0;
        deliveredOrders.forEach(order => {
            order.items.forEach(item => {
                const product = inventory.find(p => p._id.toString() === item.productId?.toString());
                if (product && product.costPrice) totalCost += product.costPrice * item.quantity;
            });
        });

        const netProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

        // Legacy extraction for individual action buttons (keeping basic logic for backward compatibility if UI needs them)
        // In a real app, we'd parse Gemini's JSON if we wanted specific IDs, 
        // but since geminiService returns markdown, we provide the tech data separately.
        const slowMovingProducts = productPerformance.filter(p => p.movementSpeed === 'slow' && p.totalSold < 5).slice(0, 5);
        const fastMovingProducts = productPerformance.filter(p => p.movementSpeed === 'fast').slice(0, 5);
        
        return {
            success: true,
            data: { 
                productPerformance, 
                retailerAnalysis: Object.values(retailerAnalysis), 
                aiAnalysis: analysisReport, // The new Markdown report
                profitSummary: {
                    totalRevenue: totalRevenue.toFixed(2),
                    totalCost: totalCost.toFixed(2),
                    netProfit: netProfit.toFixed(2),
                    profitMargin: parseFloat(profitMargin),
                    message: `Business is ${profitMargin > 15 ? 'healthy' : 'stable'} with ₹${netProfit.toFixed(0)} net profit.`
                },
                // Actionable stubs for the UI buttons
                aiInsights: {
                    slowMovingProducts: slowMovingProducts.map(p => ({
                        productName: p.productName,
                        productId: p.productId,
                        suggestedDiscount: 15,
                        message: "Poor sales movement recently."
                    })),
                    fastMovingProducts: fastMovingProducts.map(p => ({
                        productName: p.productName,
                        productId: p.productId,
                        message: "High demand detected."
                    }))
                },
                generatedAt: new Date() 
            }
        };

    } catch (error) {
        console.error('Wholesaler AI Insights Error:', error);
        return { success: false, message: 'Failed to generate AI insights', error: error.message };
    }
};

const aiInventoryAssistant = async (wholesalerId, imageUrl, manualData) => {
    try {
        let productData = manualData;
        
        if (imageUrl) {
            const prompt = `Extract product information from this image. Return ONLY a valid JSON object with these fields:
            {
                "productName": "string",
                "category": "string (one of: Grains, Pulses, Oils, Spices, Sweeteners, Beverages, Dairy, Snacks, Other)",
                "unit": "string (one of: kg, litre, box, piece, dozen)",
                "quantity": number,
                "costPrice": number,
                "estimatedPrice": number,
                "expiryDate": "YYYY-MM-DD",
                "brand": "string",
                "description": "string"
            }`;
            const visionResult = await geminiService.generateResponse(prompt, { image: imageUrl });
            try {
                const cleanedJson = visionResult.replace(/```json|```/g, '').trim();
                productData = JSON.parse(cleanedJson);
            } catch (e) {
                console.error("Failed to parse vision result:", e);
                // Continue with partial data if parsing fails
            }
        }

        const prompt = `Analyze this NEW PRODUCT for a wholesaler: ${JSON.stringify(productData)}
        
        Return ONLY a valid JSON object with strategic advice:
        {
            "recommendedPrice": number,
            "recommendedMinOrder": number,
            "profitMargin": number (percentage),
            "salesVelocity": "string (Low/Medium/High)",
            "marketingStrategy": "string (concise advice)",
            "targetRetailers": "string (concise target group)",
            "expiryConsiderations": "string (advice on expiry management)",
            "bulkDiscountSuggestions": [
                {"minQty": number, "discountPercent": number},
                {"minQty": number, "discountPercent": number}
            ]
        }`;
        
        const aiResponse = await geminiService.generateResponse(prompt);
        let aiRecommendations = {};
        
        try {
            const cleanedJson = aiResponse.replace(/```json|```/g, '').trim();
            aiRecommendations = JSON.parse(cleanedJson);
        } catch (e) {
            console.error("Failed to parse AI recommendations:", e);
            throw new Error("AI failed to generate a structured recommendation. Please try again.");
        }

        return {
            success: true,
            data: { 
                productData, 
                aiRecommendations 
            }
        };

    } catch (error) {
        console.error('AI Inventory Assistant Error:', error);
        return { success: false, message: 'Failed to get AI recommendations', error: error.message };
    }
};

module.exports = { getWholesalerAIInsights, aiInventoryAssistant };
