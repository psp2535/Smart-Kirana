const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const visionController = {
    /**
     * POST /api/vision/identify
     * Body: { imageBase64: string (data URL or raw base64), inventory: [{item_name}] }
     * Returns: { matched: inventoryItem | null, productName: string, confidence: string }
     */
    identifyProduct: async (req, res) => {
        try {
            const { imageBase64, inventoryNames } = req.body;

            if (!imageBase64) {
                return res.status(400).json({ success: false, message: 'imageBase64 required' });
            }

            // Strip data URL prefix if present
            const base64Data = imageBase64.includes(',')
                ? imageBase64.split(',')[1]
                : imageBase64;

            // Use gemini-2.5-flash multimodal model
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const inventoryList = Array.isArray(inventoryNames) && inventoryNames.length > 0
                ? `\n\nMy inventory items:\n${inventoryNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
                : '';

            const prompt = `You are a product recognition system for an Indian kirana store POS.

Look at this product image and identify what it is.${inventoryList}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "productName": "exact product name as you see it",
  "matchedInventoryItem": "closest matching name from my inventory list above, or null if none match",
  "confidence": "high|medium|low"
}

Rules:
- productName should be specific (brand + product, e.g. "Maggi 2-Minute Noodles Masala")
- matchedInventoryItem must exactly match one of the inventory names I gave you, or null
- If no inventory list given, set matchedInventoryItem to null
- Respond ONLY with valid JSON, nothing else`;

            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: base64Data,
                    }
                }
            ]);

            const text = result.response.text().trim();

            // Parse JSON response
            let parsed;
            try {
                // Remove markdown code fences if model wrapped it
                const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                parsed = JSON.parse(clean);
            } catch (parseErr) {
                console.error('Gemini returned non-JSON:', text);
                return res.status(500).json({
                    success: false,
                    message: 'AI could not identify the product clearly',
                    raw: text,
                });
            }

            return res.json({
                success: true,
                productName: parsed.productName || 'Unknown product',
                matchedInventoryItem: parsed.matchedInventoryItem || null,
                confidence: parsed.confidence || 'low',
            });

        } catch (err) {
            console.error('Vision identify error:', err);
            return res.status(500).json({
                success: false,
                message: 'Vision API error: ' + (err.message || String(err)),
            });
        }
    }
};

module.exports = visionController;
