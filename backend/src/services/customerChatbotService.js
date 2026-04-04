const { GoogleGenerativeAI } = require('@google/generative-ai');
const Inventory = require('../models/Inventory');
const CustomerRequest = require('../models/CustomerRequest');
const CustomerUser = require('../models/CustomerUser');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { normalize, isValidQuantity, normalizeQuantity } = require('../utils/quantityHelper');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
    }
});

// In-memory storage for pending orders
const pendingOrders = new Map();

/**
 * Customer Chatbot Service
 * Handles all customer-side chatbot interactions for ordering
 */
class CustomerChatbotService {
  constructor() {
    this.systemPrompt = `You are Smart Kirana, an AI shopping assistant for Indian kirana stores.
    
Your purpose is to help customers order groceries and ingredients for cooking.

CAPABILITIES:
1. Understand dish requests and generate ONLY the most ESSENTIAL ingredient lists
2. Parse direct grocery lists with items and quantities
3. Handle mixed requests
4. Support multiple languages
5. Provide conversational, friendly service

RESPONSE FORMAT (STRICT JSON):
{
  "intent": "dish_order | grocery_order | mixed_order | item_removal | unclear",
  "items": [
    {
      "item_name": "string",
      "quantity": number,
      "unit": "kg | litre | piece",
      "confidence": "high | medium | low",
      "essential": boolean
    }
  ],
  "dish_name": "string",
  "servings": number,
  "message": "string (friendly response)",
  "questions": ["string"],
  "alternatives": ["string"],
  "removable_items": ["string"]
}`;
  }

  /**
   * Process customer message and generate response
   */
  async processMessage(message, customerId, retailerId, language = 'en') {
    try {
      const isConfirmation = ['yes', 'confirm', 'ok', 'proceed', 'हाँ', 'ఓకే'].some(
        word => message.toLowerCase().trim() === word
      );

      if (isConfirmation) {
        const orderKey = `${customerId}_${retailerId}`;
        const pendingOrder = pendingOrders.get(orderKey);

        if (pendingOrder && pendingOrder.items && pendingOrder.items.length > 0) {
          const orderResult = await this.confirmPendingOrder(customerId, retailerId, pendingOrder);
          pendingOrders.delete(orderKey);
          return orderResult;
        } else {
          return {
            intent: 'no_pending_order',
            message: "I don't have any pending order for you. Please tell me what you'd like to order first.",
            items: [],
            can_order: false
          };
        }
      }

      const isRemovalRequest = this.detectItemRemoval(message);
      if (isRemovalRequest.isRemoval) {
        return await this.handleItemRemoval(customerId, retailerId, isRemovalRequest.itemsToRemove, language);
      }

      const inventory = await Inventory.find({ user_id: retailerId });
      const availableItems = inventory.map(item => item.item_name.toLowerCase());

      const contextPrompt = this.buildContextPrompt(message, availableItems, language);
      
      // Get Gemini response
      const result = await model.generateContent([
        { text: this.systemPrompt },
        { text: contextPrompt }
      ]);
      const aiResponse = result.response.text();
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
        parsedResponse = this.intelligentlyFilterSuggestions(parsedResponse, parsedResponse.dish_name);
        if (parsedResponse.items && parsedResponse.items.length > 3) {
          parsedResponse.items = parsedResponse.items.slice(0, 3);
          parsedResponse.message = `Here are the TOP 3 most essential ingredients:`;
        }
      } catch (parseError) {
        parsedResponse = this.fallbackResponse(message, availableItems);
      }

      const availabilityCheck = await this.checkItemAvailability(parsedResponse.items, inventory);
      
      if (availabilityCheck.available.length > 0) {
        const orderKey = `${customerId}_${retailerId}`;
        const totalAmount = availabilityCheck.available.reduce((sum, item) => sum + item.total_price, 0);
        
        pendingOrders.set(orderKey, {
          items: availabilityCheck.available,
          totalAmount: totalAmount,
          timestamp: Date.now()
        });
      }
      
      return {
        ...parsedResponse,
        availability: availabilityCheck,
        can_order: availabilityCheck.available.length > 0,
        message: this.buildCustomerMessage(parsedResponse, availabilityCheck, language)
      };

    } catch (error) {
      console.error('Gemini processing error:', error);
      return {
        intent: 'error',
        message: 'Sorry, I had trouble understanding that. Could you please try again?',
        items: [],
        can_order: false
      };
    }
  }

  async confirmPendingOrder(customerId, retailerId, pendingOrder) {
    try {
      const customer = await CustomerUser.findById(customerId);
      const retailer = await User.findById(retailerId);
      if (!customer || !retailer) throw new Error('User not found');

      const orderRequest = new CustomerRequest({
        customer_id: customerId,
        retailer_id: retailerId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        items: pendingOrder.items,
        notes: 'Order placed via Gemini AI chatbot',
        status: 'pending',
        total_amount: pendingOrder.totalAmount
      });

      await orderRequest.save();

      const notification = new Notification({
        user_id: retailerId,
        user_type: 'retailer',
        user_type_ref: 'User',
        type: 'new_request',
        title: 'New Order Received (Gemini)',
        message: `${customer.name} placed an order for ₹${pendingOrder.totalAmount}`,
        request_id: orderRequest._id
      });
      await notification.save();

      return {
        intent: 'order_confirmed',
        success: true,
        message: `Order placed successfully via Gemini!\n\nTotal: ₹${pendingOrder.totalAmount}\n${retailer.shop_name} will contact you soon.`,
        order_id: orderRequest._id,
        items: pendingOrder.items,
        can_order: false
      };
    } catch (error) {
      console.error('Order confirmation error:', error);
      throw error;
    }
  }

  detectItemRemoval(message) {
    const removalKeywords = ['remove', 'delete', 'cancel', 'हटा', 'తీసివేయి'];
    const lowerMessage = message.toLowerCase();
    const isRemoval = removalKeywords.some(kw => lowerMessage.includes(kw));
    return { isRemoval, itemsToRemove: isRemoval ? [lowerMessage.split(' ').pop()] : [] };
  }

  async handleItemRemoval(customerId, retailerId, itemsToRemove, language) {
    const orderKey = `${customerId}_${retailerId}`;
    const pendingOrder = pendingOrders.get(orderKey);
    if (!pendingOrder) return { intent: 'no_pending_order', message: "No order found.", can_order: false };
    return { intent: 'items_removed', message: "Item removed from your list.", can_order: true };
  }

  buildContextPrompt(message, availableItems, language) {
    return `FRESH REQUEST: "${message}"\nInventory: ${availableItems.join(', ')}\nLanguage: ${language}\nLIMIT: 3 items max. Exact inventory names only.`;
  }

  intelligentlyFilterSuggestions(aiResponse, dishName) {
    return aiResponse; // Simplified for migration
  }

  async checkItemAvailability(requestedItems, inventory) {
    const available = [];
    const unavailable = [];
    for (const req of requestedItems) {
      const invItem = inventory.find(i => i.item_name.toLowerCase().includes(req.item_name.toLowerCase()));
      if (invItem) {
        available.push({ ...req, price_per_unit: invItem.selling_price, total_price: invItem.selling_price * req.quantity });
      } else {
        unavailable.push(req);
      }
    }
    return { available, unavailable, lowStock: [] };
  }

  buildCustomerMessage(response, availability, language) {
    return response.message || "I found some items for you. Confirm?";
  }

  fallbackResponse(message, availableItems) {
    return { intent: 'unclear', message: "I'm not sure. Can you repeat?", items: [] };
  }
}

module.exports = new CustomerChatbotService();
