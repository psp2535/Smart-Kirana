const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Intent Detection Service - Lightweight AI for Tool Selection
 * Using Google Gemini 1.5 Flash for fast classification
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
    }
});

class IntentDetectionService {
  /**
   * Detect user intent and determine which tool(s) to call
   */
  async detectIntent(message, userType = 'retailer') {
    try {
      const prompt = `
You are an intent classifier for a business management system called Smart Kirana.
Analyze this user message and determine what they want: "${message}"

User Type: ${userType}

AVAILABLE TOOLS:
1. getTodaysProfit - Get today's revenue, expenses, and profit
2. getLowStockItems - Get items running low on stock
3. getTopSellingProducts - Get best-selling products
4. getMonthlyRevenue - Get monthly financial summary
5. getExpenseBreakdown - Get expense analysis by category
6. getInventorySummary - Get inventory overview
7. getPendingOrders - Get pending customer orders
8. getBusinessOverview - Get quick business snapshot
9. getFestivalDemandForecast - Get festival-based demand predictions
10. getUpcomingFestivals - Get upcoming festival calendar

ACTIONS (non-query operations):
- create_sale - Create a new sale/bill
- add_inventory - Add new inventory item
- update_inventory - Update existing inventory
- add_expense - Record an expense

INTENT CLASSIFICATION RULES:
- If asking about "today's profit/sales/revenue" → getTodaysProfit
- If asking about "low stock/out of stock/restock" → getLowStockItems
- If asking about "best sellers/top products/popular items" → getTopSellingProducts
- If asking about "monthly/this month" → getMonthlyRevenue
- If asking about "expenses/costs/spending" → getExpenseBreakdown
- If asking about "inventory/stock overview" → getInventorySummary
- If asking about "orders/customer requests" → getPendingOrders
- If asking general "overview/summary/dashboard" → getBusinessOverview
- If asking about "festival/seasonal/demand forecast/upcoming festival" → getFestivalDemandForecast
- If asking about "festival calendar/which festivals" → getUpcomingFestivals
- If creating "bill/sale/sell" → create_sale
- If "add item/new product/add inventory" → add_inventory
- If "add expense/spent money" → add_expense

Return JSON:
{
  "intent_type": "query|action|clarify",
  "tools": ["tool_name1", "tool_name2"],
  "action": "action_name or null",
  "params": {},
  "confidence": 0.0-1.0,
  "needs_clarification": false,
  "clarification_message": "optional message if unclear"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const intent = JSON.parse(response.text());
      
      return {
        intent_type: intent.intent_type || 'clarify',
        tools: intent.tools || [],
        action: intent.action || null,
        params: intent.params || {},
        confidence: intent.confidence || 0.5,
        needs_clarification: intent.needs_clarification || false,
        clarification_message: intent.clarification_message || null
      };
      
    } catch (error) {
      console.error('Gemini Intent detection error:', error);
      return this.fallbackIntentDetection(message);
    }
  }

  /**
   * Fallback intent detection using keyword matching
   */
  fallbackIntentDetection(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.match(/profit|revenue|sales.*today/)) {
      return { intent_type: 'query', tools: ['getTodaysProfit'], action: null, params: {}, confidence: 0.8 };
    }
    if (lowerMessage.match(/low stock|restock/)) {
      return { intent_type: 'query', tools: ['getLowStockItems'], action: null, params: {}, confidence: 0.85 };
    }
    if (lowerMessage.match(/best sell|top product/)) {
      return { intent_type: 'query', tools: ['getTopSellingProducts'], action: null, params: {}, confidence: 0.8 };
    }
    if (lowerMessage.match(/overview|summary|how.*business/)) {
      return { intent_type: 'query', tools: ['getBusinessOverview'], action: null, params: {}, confidence: 0.85 };
    }
    if (lowerMessage.match(/bill|sale|sell/)) {
      return { intent_type: 'action', tools: [], action: 'create_sale', params: {}, confidence: 0.7 };
    }
    
    return {
      intent_type: 'clarify',
      tools: [],
      action: null,
      params: {},
      confidence: 0.3,
      needs_clarification: true,
      clarification_message: "I can help you with sales, inventory, expenses, and business insights. What would you like to know?"
    };
  }
}

module.exports = new IntentDetectionService();
