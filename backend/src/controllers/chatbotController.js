/**
 * AI Chatbot Controller - Handles intelligent business queries with database access
 * Migrated to Google Gemini 1.5
 */

const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const CustomerUser = require('../models/CustomerUser');
const CustomerRequest = require('../models/CustomerRequest');
const Notification = require('../models/Notification');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ttsService = require('../services/ttsService');
const { handleRetailerChat } = require('./retailerChatHandler');
const { handleRetailerChatOptimized } = require('./retailerChatHandlerOptimized');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
    }
});

const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const USE_OPTIMIZED_HANDLER = process.env.USE_OPTIMIZED_CHAT === 'true' || false;
const pendingOrders = new Map();

/**
 * Handle customer chat with retailer
 */
const handleCustomerChat = async (userId, retailerId, message, language) => {
    try {
        const [inventory, retailer] = await Promise.all([
            Inventory.find({ user_id: retailerId }).limit(100),
            User.findById(retailerId)
        ]);

        if (!retailer) return { success: false, message: "Store not found." };

        const greetings = ['hi', 'hello', 'hey', 'namaste'];
        if (greetings.some(g => message.toLowerCase().trim() === g)) {
            return {
                success: true,
                message: `Hi! Welcome to ${retailer.shop_name}. What can I get for you today?`,
                data: { type: 'greeting', retailer: retailer.shop_name }
            };
        }

        if (['yes', 'confirm', 'ok'].some(word => message.toLowerCase().trim() === word)) {
            return await handleOrderConfirmation(userId, retailerId, message, language);
        }

        const intentPrompt = `
Analyze this customer message for ${retailer.shop_name}: "${message}"
Inventory:
${inventory.map(item => `${item.item_name}: ₹${item.price_per_unit}`).join('\n')}

Extract items as JSON array:
[{"item_name": "exact name", "quantity": number, "unit": "kg/litre/pieces"}]
If none, return []. Respond ONLY with JSON.`;

        const result = await model.generateContent(intentPrompt);
        const aiResponse = result.response.text();
        
        let orderItems = [];
        try {
            orderItems = JSON.parse(aiResponse);
        } catch (e) {
            console.error('Gemini JSON Parse Error:', aiResponse);
        }

        const matchedItems = orderItems.map(item => {
            const inv = inventory.find(i => i.item_name.toLowerCase().includes(item.item_name.toLowerCase()));
            if (inv) {
                return {
                    item_name: inv.item_name,
                    quantity: item.quantity,
                    unit: item.unit || 'units',
                    price_per_unit: inv.price_per_unit,
                    total_price: inv.price_per_unit * item.quantity,
                    available: inv.stock_qty >= item.quantity,
                    inventory_id: inv._id
                };
            }
            return { ...item, available: false, price_per_unit: 0, total_price: 0 };
        });

        const availableItems = matchedItems.filter(i => i.available);
        const totalAmount = availableItems.reduce((sum, i) => sum + i.total_price, 0);

        if (availableItems.length > 0) {
            pendingOrders.set(`${userId}_${retailerId}`, { items: availableItems, totalAmount });
        }

        return {
            success: true,
            message: availableItems.length > 0 ? `I found ${availableItems.length} items for ₹${totalAmount}. Confirm order?` : "Sorry, those items aren't available.",
            data: { type: 'order_summary', availableItems, totalAmount, can_order: availableItems.length > 0 }
        };
    } catch (error) {
        console.error('Gemini Customer Chat Error:', error);
        return { success: false, message: "Error processing request." };
    }
};

const handleOrderConfirmation = async (userId, retailerId, message, language) => {
    const orderKey = `${userId}_${retailerId}`;
    const pendingOrder = pendingOrders.get(orderKey);
    if (!pendingOrder) return { success: false, message: "No pending order found." };

    const customer = await CustomerUser.findById(userId);
    const orderRequest = new CustomerRequest({
        customer_id: userId,
        retailer_id: retailerId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        items: pendingOrder.items,
        status: 'pending',
        total_amount: pendingOrder.totalAmount
    });
    await orderRequest.save();
    pendingOrders.delete(orderKey);

    return { success: true, message: "Order placed successfully via Gemini!", data: { type: 'order_confirmed' } };
};

const handleCustomerWithoutRetailer = async (userId, message, language) => {
    const retailers = await User.find({ role: 'retailer' }).select('shop_name');
    const prompt = `Help customer choose a store. Message: "${message}". Stores: ${retailers.map(r => r.shop_name).join(', ')}`;
    const result = await textModel.generateContent(prompt);
    return { success: true, message: result.response.text(), data: { needs_retailer_selection: true } };
};

const chat = async (req, res) => {
    try {
        const { message, language = 'en', retailer_id } = req.body;
        const userId = req.user._id;
        const user = await User.findById(userId) || await CustomerUser.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const isBusinessUser = user.role === 'retailer' || user.role === 'wholesaler';
        let response;

        if (!isBusinessUser && retailer_id) response = await handleCustomerChat(userId, retailer_id, message, language);
        else if (isBusinessUser) response = USE_OPTIMIZED_HANDLER ? await handleRetailerChatOptimized(userId, message, language) : await handleRetailerChat(userId, message, language);
        else response = await handleCustomerWithoutRetailer(userId, message, language);

        res.json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gemini Chat Error', error: error.message });
    }
};

const getStatus = async (req, res) => {
    res.json({ success: true, data: { status: 'active', provider: 'gemini' } });
};

const speechToText = async (req, res) => {
    res.json({ success: true, message: "Gemini voice-to-text enabled (browser-side backup active)." });
};

const textToSpeech = async (req, res) => {
    try {
        const { text, language = 'en' } = req.body;
        if (ttsService.isAvailable()) {
            const buffer = await ttsService.synthesizeSpeech(text, language);
            res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length }).send(buffer);
        } else {
            res.json({ success: false, message: 'Google Cloud TTS not configured, using browser synthesis.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'TTS Error', error: error.message });
    }
};

module.exports = { chat, getStatus, speechToText, textToSpeech };
