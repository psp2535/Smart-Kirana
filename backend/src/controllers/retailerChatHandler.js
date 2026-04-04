const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');
const User = require('../models/User');
const CustomerRequest = require('../models/CustomerRequest');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { normalize, isValidQuantity } = require('../utils/quantityHelper');
const healthScoreService = require('../services/healthScoreService');
const festivalForecastService = require('../services/festivalForecastService');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
    }
});
const pendingOrders = new Map();
const conversationHistory = new Map(); // Store last 5 messages per user

/**
 * Enhanced Retailer Business Assistant
 * Handles: Sales/Billing, Inventory Management, Expense Tracking, Business Insights, Analytics
 */
const handleRetailerChat = async (userId, message, language) => {
    try {
        // Ensure userId is a string for consistent key matching
        const userIdStr = userId.toString();
        console.log(`🛍️ Retailer chat: "${message}" from userId: ${userIdStr}`);

        // Handle confirmations for pending operations
        if (['yes', 'confirm', 'ok', 'proceed', 'हाँ', 'ठीक है', 'అవును', 'సరే'].some(word => message.toLowerCase().trim() === word)) {
            const result = await handleConfirmation(userIdStr);
            // Add to conversation history
            addToConversationHistory(userIdStr, message, result.message);
            return result;
        }

        // Handle cancellations for pending operations
        if (['no', 'cancel', 'नहीं', 'रद्द करें', 'కాదు', 'రద్దు'].some(word => message.toLowerCase().trim() === word)) {
            const result = await handleCancellation(userIdStr);
            addToConversationHistory(userIdStr, message, result.message);
            return result;
        }

        // Get comprehensive business data
        const businessData = await getBusinessData(userId);

        // Get conversation history for context
        const history = getConversationHistory(userIdStr);

        // Use enhanced AI to understand and process the request
        const aiResponse = await processRetailerRequest(message, businessData, language, history);

        // Execute the determined action (pass original message for auto-confirm detection and language)
        const result = await executeAction(userIdStr, aiResponse, businessData, message, language);

        // Add to conversation history
        addToConversationHistory(userIdStr, message, result.message);

        return result;

    } catch (error) {
        console.error('Retailer chat error:', error);
        return {
            success: false,
            message: "I encountered an error processing your request. Please try again or be more specific.",
            data: null
        };
    }
};

/**
 * Get comprehensive business data for context
 */
const getBusinessData = async (userId) => {
    try {
        // Calculate date ranges first
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        // Fetch data with date-based queries for better performance
        const [inventory, allSales, allExpenses, customerRequests, retailer, healthScore, festivalForecast] = await Promise.all([
            Inventory.find({ user_id: userId }),
            Sale.find({ user_id: userId }).sort({ date: -1 }),
            Expense.find({ user_id: userId }).sort({ date: -1 }),
            CustomerRequest.find({ retailer_id: userId }).sort({ createdAt: -1 }).limit(5),
            User.findById(userId),
            healthScoreService.calculateHealthScore(userId),
            festivalForecastService.getFestivalDemandForecast(userId)
        ]);

        // Filter sales by date ranges using 'date' field (not createdAt)
        const todaySales = allSales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= today && saleDate < tomorrow;
        });

        const yesterdaySales = allSales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= yesterday && saleDate < today;
        });

        const weeklySales = allSales.filter(s => new Date(s.date) >= startOfWeek);
        const monthlySales = allSales.filter(s => new Date(s.date) >= startOfMonth);

        // Filter expenses by date ranges using 'date' field
        const todayExpenses = allExpenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= today && expenseDate < tomorrow;
        });

        const yesterdayExpenses = allExpenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= yesterday && expenseDate < today;
        });

        const monthlyExpenses = allExpenses.filter(e => new Date(e.date) >= startOfMonth);

        // Calculate totals
        const totalRevenue = allSales.reduce((sum, s) => sum + s.total_amount, 0);
        const totalCogs = allSales.reduce((sum, s) => sum + (s.total_cogs || 0), 0);
        const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalRevenue - totalCogs - totalExpenses;

        const todayRevenue = todaySales.reduce((sum, s) => sum + s.total_amount, 0);
        const todayCogs = todaySales.reduce((sum, s) => sum + (s.total_cogs || 0), 0);
        const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const todayProfit = todayRevenue - todayCogs - todayExpensesTotal;

        const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.total_amount, 0);
        const yesterdayCogs = yesterdaySales.reduce((sum, s) => sum + (s.total_cogs || 0), 0);
        const yesterdayExpensesTotal = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const yesterdayProfit = yesterdayRevenue - yesterdayCogs - yesterdayExpensesTotal;

        const lowStockItems = inventory.filter(item => item.stock_qty <= (item.min_stock_level || 5));
        const outOfStockItems = inventory.filter(item => item.stock_qty <= 0);

        return {
            inventory: inventory.slice(0, 100), // Increase visibility to 100 items for better accuracy
            sales: allSales.slice(0, 50), // Return recent sales for context
            expenses: allExpenses.slice(0, 50), // Return recent expenses for context
            customerRequests,
            retailer,
            healthScore,
            festivalForecast,
            metrics: {
                totalRevenue,
                totalCogs,
                totalExpenses,
                netProfit,
                grossProfit: totalRevenue - totalCogs,
                profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0,
                todayRevenue,
                todayCogs,
                todayExpenses: todayExpensesTotal,
                todayProfit,
                todaySalesCount: todaySales.length,
                yesterdayRevenue,
                yesterdayCogs,
                yesterdayExpenses: yesterdayExpensesTotal,
                yesterdayProfit,
                yesterdaySalesCount: yesterdaySales.length,
                weeklyRevenue: weeklySales.reduce((sum, s) => sum + s.total_amount, 0),
                monthlyRevenue: monthlySales.reduce((sum, s) => sum + s.total_amount, 0),
                monthlyExpenses: monthlyExpenses.reduce((sum, e) => sum + e.amount, 0),
                lowStockCount: lowStockItems.length,
                outOfStockCount: outOfStockItems.length,
                pendingOrders: customerRequests.filter(r => r.status === 'pending').length
            },
            lowStockItems,
            outOfStockItems
        };
    } catch (error) {
        console.error('Error getting business data:', error);
        throw error;
    }
};

/**
 * Fallback message parsing when AI fails
 */
const parseMessageFallback = (message) => {
    const lowerMessage = message.toLowerCase();

    // Inventory addition patterns
    if (lowerMessage.includes('add') && (lowerMessage.includes('item') || lowerMessage.includes('inventory') || lowerMessage.includes('product'))) {
        // Enhanced regex patterns to handle various message formats
        let itemMatch, quantityMatch, costMatch, sellingMatch, categoryMatch;

        // Pattern 1: "add a item to inventory laptop under electronics category"
        const pattern1 = /add.*?(?:item|product).*?(?:to\s+)?inventory\s+([^,\s]+).*?under\s+([^,\s]+)\s+category/i;
        const match1 = message.match(pattern1);
        if (match1) {
            itemMatch = [null, match1[1]];
            categoryMatch = [null, match1[2]];
        }

        // Pattern 2: "add a item to inventory of 100 keyboards each of 100 rupee and selling price 200 and electronics category"
        const pattern2 = /add.*?(?:item|product).*?inventory.*?of\s+(\d+)\s+([^,\s]+).*?each.*?of\s+(\d+).*?rupee.*?selling.*?price\s+(\d+).*?and\s+([^,\s]+)\s+category/i;
        const match2 = message.match(pattern2);
        if (match2) {
            quantityMatch = [null, match2[1]];
            itemMatch = [null, match2[2]];
            costMatch = [null, match2[3]];
            sellingMatch = [null, match2[4]];
            categoryMatch = [null, match2[5]];
        }

        // Fallback patterns for individual components
        if (!itemMatch) {
            itemMatch = message.match(/add.*?(?:item|product).*?:?\s*([^,]+)/i) ||
                message.match(/inventory\s+([^,\s]+)/i) ||
                message.match(/(\w+)\s+under/i);
        }
        if (!quantityMatch) {
            quantityMatch = message.match(/(\d+)\s*(?:pieces?|units?|items?|keyboards?|laptops?)/i) ||
                message.match(/of\s+(\d+)\s+/i);
        }
        if (!costMatch) {
            costMatch = message.match(/cost.*?₹?(\d+)/i) ||
                message.match(/each.*?of\s+(\d+)/i) ||
                message.match(/(\d+).*?rupee/i);
        }
        if (!sellingMatch) {
            sellingMatch = message.match(/selling.*?price\s+(\d+)/i) ||
                message.match(/price.*?₹?(\d+)/i) ||
                message.match(/selling.*?₹?(\d+)/i);
        }
        if (!categoryMatch) {
            categoryMatch = message.match(/category\s+([^,\n]+)/i) ||
                message.match(/under\s+([^,\s]+)/i) ||
                message.match(/and\s+([^,\s]+)\s+category/i);
        }

        // Enhanced category mapping with more variations
        let validCategory = "Other";
        if (categoryMatch) {
            const categoryInput = categoryMatch[1].trim().toLowerCase();
            const categoryMap = {
                'food': 'Food & Beverages',
                'foods': 'Food & Beverages',
                'beverages': 'Food & Beverages',
                'electronics': 'Electronics',
                'electronic': 'Electronics',
                'electornics': 'Electronics', // Handle typo
                'tech': 'Electronics',
                'technology': 'Electronics',
                'clothing': 'Clothing',
                'clothes': 'Clothing',
                'apparel': 'Clothing',
                'books': 'Books',
                'book': 'Books',
                'home': 'Home & Garden',
                'garden': 'Home & Garden',
                'household': 'Home & Garden',
                'sports': 'Sports',
                'sport': 'Sports',
                'fitness': 'Sports',
                'beauty': 'Beauty & Health',
                'health': 'Beauty & Health',
                'healthcare': 'Beauty & Health',
                'cosmetics': 'Beauty & Health',
                'automotive': 'Automotive',
                'auto': 'Automotive',
                'car': 'Automotive',
                'office': 'Office Supplies',
                'supplies': 'Office Supplies',
                'stationery': 'Office Supplies',
                'other': 'Other'
            };
            validCategory = categoryMap[categoryInput] || 'Other';
        }

        // Check if we have enough information
        if (itemMatch && quantityMatch && costMatch && sellingMatch) {
            return {
                action: "add_inventory",
                item_name: itemMatch[1].trim(),
                quantity: parseInt(quantityMatch[1]),
                cost_per_unit: parseInt(costMatch[1]),
                price_per_unit: parseInt(sellingMatch[1]),
                category: validCategory,
                min_stock_level: 5
            };
        } else if (itemMatch && categoryMatch) {
            // If we have item and category but missing other details, ask for them
            const missing = [];
            if (!quantityMatch) missing.push("quantity");
            if (!costMatch) missing.push("cost_price");
            if (!sellingMatch) missing.push("selling_price");

            return {
                action: "clarify",
                missing: missing,
                response: `I found item "${itemMatch[1].trim()}" in category "${validCategory}". Please provide: ${missing.join(', ')}.\n\nExample: "Add 100 units, cost ₹50 each, selling ₹80 each"`
            };
        } else {
            return {
                action: "clarify",
                missing: ["item_name", "quantity", "cost_price", "selling_price"],
                response: "To add inventory, I need: item name, quantity, cost price, and selling price.\n\nExamples:\n• 'Add item: Chocolate, 50 pieces, cost ₹20, selling ₹30'\n• 'Add 100 keyboards, cost ₹100 each, selling ₹200, electronics category'"
            };
        }
    }

    // Sales patterns
    if (lowerMessage.includes('bill') || lowerMessage.includes('sale') || lowerMessage.includes('sell')) {
        return {
            action: "clarify",
            missing: ["items", "quantities", "customer_name"],
            response: "To create a sale, please specify: items to sell, quantities, and customer name (optional). Example: 'Bill 2 chocolates for John'"
        };
    }

    // Expense patterns
    if (lowerMessage.includes('expense') || lowerMessage.includes('cost') || lowerMessage.includes('spent')) {
        return {
            action: "clarify",
            missing: ["description", "amount", "category"],
            response: "To add an expense, I need: description, amount, and category. Example: 'Add expense: Office rent ₹5000, category Rent'"
        };
    }

    // Insights patterns
    if (lowerMessage.includes('sales') || lowerMessage.includes('profit') || lowerMessage.includes('revenue') || lowerMessage.includes('report')) {
        return {
            action: "insights",
            type: "overview",
            response: "Here's your business overview with key metrics and recommendations."
        };
    }

    return null;
};

/**
 * Add message to conversation history (last 5 messages)
 */
const addToConversationHistory = (userId, userMessage, assistantMessage) => {
    const key = `retailer_${userId}`;
    if (!conversationHistory.has(key)) {
        conversationHistory.set(key, []);
    }
    
    const history = conversationHistory.get(key);
    history.push({
        user: userMessage,
        assistant: assistantMessage,
        timestamp: new Date()
    });
    
    // Keep only last 5 conversations
    if (history.length > 5) {
        history.shift();
    }
    
    conversationHistory.set(key, history);
};

/**
 * Get conversation history for user
 */
const getConversationHistory = (userId) => {
    const key = `retailer_${userId}`;
    return conversationHistory.get(key) || [];
};

/**
 * Enhanced AI processing for retailer requests
 */
const processRetailerRequest = async (message, businessData, language, conversationHistory = []) => {
    // Language mapping for response instructions
    const languageNames = {
        'en': 'English',
        'hi': 'Hindi (हिंदी)',
        'te': 'Telugu (తెలుగు)',
        'ta': 'Tamil (தமிழ்)',
        'kn': 'Kannada (ಕನ್ನಡ)'
    };

    const languageName = languageNames[language] || 'English';

    // Build conversation history context
    let historyContext = '';
    if (conversationHistory.length > 0) {
        historyContext = '\n\nCONVERSATION HISTORY (Last ' + conversationHistory.length + ' exchanges):\n';
        conversationHistory.forEach((conv, idx) => {
            historyContext += `${idx + 1}. User: "${conv.user}"\n   Assistant: "${conv.assistant.substring(0, 150)}${conv.assistant.length > 150 ? '...' : ''}"\n`;
        });
        historyContext += '\nUse this context to provide more relevant and contextual responses.\n';
    }

    const prompt = `
You are an advanced business assistant for a retail store in India. Analyze this request: "${message}"

CRITICAL LANGUAGE INSTRUCTION:
- User's language preference: ${languageName}
- You MUST respond in ${languageName} language ONLY
- All text in the "response" field must be in ${languageName}
- ALWAYS use ₹ (Rupee symbol), NEVER use $ (Dollar)
- Numbers and JSON structure remain the same
- Item names from inventory can stay in their original language
${historyContext}
CURRENT BUSINESS STATUS:
📊 FINANCIAL METRICS:
- Total Revenue: ₹${businessData.metrics.totalRevenue}
- Total COGS: ₹${businessData.metrics.totalCogs}
- Total Expenses: ₹${businessData.metrics.totalExpenses}
- Net Profit: ₹${businessData.metrics.netProfit}
- Profit Margin: ${businessData.metrics.profitMargin}%

📅 TODAY'S PERFORMANCE:
- Revenue: ₹${businessData.metrics.todayRevenue}
- COGS: ₹${businessData.metrics.todayCogs}
- Expenses: ₹${businessData.metrics.todayExpenses}
- Profit: ₹${businessData.metrics.todayProfit}
- Sales Count: ${businessData.metrics.todaySalesCount}

📅 YESTERDAY'S PERFORMANCE:
- Revenue: ₹${businessData.metrics.yesterdayRevenue}
- COGS: ₹${businessData.metrics.yesterdayCogs}
- Expenses: ₹${businessData.metrics.yesterdayExpenses}
- Profit: ₹${businessData.metrics.yesterdayProfit}
- Sales Count: ${businessData.metrics.yesterdaySalesCount}

📆 MONTHLY PERFORMANCE:
- Revenue: ₹${businessData.metrics.monthlyRevenue}
- Expenses: ₹${businessData.metrics.monthlyExpenses}

📦 INVENTORY STATUS (${businessData.inventory.length} items):
${businessData.inventory.slice(0, 15).map(item =>
        `${item.item_name}: ${item.stock_qty} units @ ₹${item.price_per_unit} (cost: ₹${item.cost_per_unit || 0})`
    ).join('\n')}
${businessData.inventory.length > 15 ? `... and ${businessData.inventory.length - 15} more items` : ''}

⚠️ STOCK ALERTS:
- Low Stock: ${businessData.metrics.lowStockCount} items
- Out of Stock: ${businessData.metrics.outOfStockCount} items
${businessData.lowStockItems.slice(0, 5).map(item => `  • ${item.item_name}: ${item.stock_qty} left`).join('\n')}

💰 RECENT SALES (${businessData.sales.length}):
${businessData.sales.slice(0, 5).map(sale =>
        `₹${sale.total_amount} - ${sale.items?.length || 0} items (${new Date(sale.createdAt).toLocaleDateString()})`
    ).join('\n')}

💸 RECENT EXPENSES (${businessData.expenses.length}):
${businessData.expenses.slice(0, 5).map(expense =>
        `₹${expense.amount} - ${expense.description} (${expense.category})`
    ).join('\n')}

🏨 BUSINESS HEALTH:
- Health Score: ${businessData.healthScore.score}/100
- Status: ${businessData.healthScore.status}
- Tips: ${businessData.healthScore.tips.join(' | ')}

🎉 UPCOMING FESTIVALS:
- Next Festival: ${businessData.festivalForecast.festival_name || 'None'}
- Demand: ${businessData.festivalForecast.demand_level || 'Normal'}
- Stock Suggestions: ${businessData.festivalForecast.forecast_items?.slice(0, 3).map(i => i.item_name).join(', ') || 'None'}

📋 PENDING ORDERS: ${businessData.metrics.pendingOrders}

DETERMINE THE ACTION AND RESPOND WITH JSON:

FOR BILLING/SALES (creating a sale):
{"action": "create_sale", "items": [{"item_name": "exact_name_from_inventory", "quantity": number, "price_per_unit": number}], "customer_name": "Walk-in Customer", "payment_method": "Cash"}
NOTE: Always use "Walk-in Customer" as default customer name. Do NOT ask for customer name.

FOR ADDING INVENTORY:
{"action": "add_inventory", "item_name": "name", "quantity": number, "cost_per_unit": number, "price_per_unit": number, "category": "category", "min_stock_level": number}

FOR UPDATING INVENTORY:
{"action": "update_inventory", "item_name": "exact_name", "quantity": number, "price_per_unit": number}

FOR ADDING EXPENSE:
{"action": "add_expense", "description": "description", "amount": number, "category": "Rent|Utilities|Supplies|Marketing|Transportation|Equipment|Maintenance|Insurance|Professional Services|Other", "is_sales_expense": boolean}

FOR BUSINESS INSIGHTS/ANALYTICS (when user asks about sales, profit, inventory status, etc.):
{"action": "insights", "type": "sales|inventory|expenses|profit|overview", "response": "MUST be in ${languageName} with specific numbers from business data above. Be conversational and helpful, not generic. Use ₹ symbol."}

CRITICAL FOR INSIGHTS:
- If user asks about today's or yesterday's sales/profit, use the EXACT numbers from TODAY'S/YESTERDAY'S PERFORMANCE sections above.
- PROACTIVELY MENTION HEALTH SCORE: When summarizing the business or giving an overview, always mention the Health Score (e.g., "Your Business Health is 85/100 (Excellent)!") and give AT LEAST ONE tip from the tips list.
- FESTIVAL ALERTS: If a festival is imminent (months_away <= 1), proactively warn the user: "With ${businessData.festivalForecast.festival_name} coming up soon, I recommend stocking up on ${businessData.festivalForecast.forecast_items?.slice(0, 3).map(i => i.item_name).join(', ')}."
- If today's revenue is 0, DO NOT just say "0 sales". Say "You haven't made any sales today yet. Your current top items in stock are [list 3 items with prices]." 
- If asking about profit, show REAL numbers: "Today's profit is ₹X (Revenue ₹Y - Expenses ₹Z)".
- If asking about inventory, list ACTUAL items with their EXACT stock levels.
- ALWAYS compare with yesterday if relevant: "This is [better/worse] than yesterday's profit of ₹A".
- Be specific, helpful, and actionable - NOT generic.
- Use conversation history to provide contextual responses.
- ALWAYS use ₹ symbol, NEVER $.
- DO NOT use asterisks (*) for bold or emphasis - use plain text only.
- DO NOT use markdown formatting in responses - just plain text with emojis.

FOR MISSING INFORMATION:
{"action": "clarify", "missing": ["field1", "field2"], "response": "ask_for_specific_missing_information_in_${languageName}"}

FOR UNCLEAR REQUESTS:
{"action": "help", "response": "helpful_guidance_in_${languageName}_about_what_i_can_do"}

IMPORTANT RULES:
1. Use EXACT item names from inventory for sales/updates.
2. For insights, provide SPECIFIC numbers from the business data above - NEVER give generic or "perfect" sounding answers if the data shows 0.
3. If information is missing, ask for clarification in ${languageName}.
4. For sales, validate stock availability.
5. Suggest improvements based on ACTUAL current metrics.
6. ALWAYS use ₹ (Rupee), NEVER $ (Dollar).
7. Be conversational and helpful, not robotic.
8. If the user asks in ${languageName}, the entire "response" MUST be in ${languageName}.

Return ONLY valid JSON, no markdown or extra text.
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error('Gemini processing error:', error);

        // Fallback: Try to parse the message manually for common patterns
        const fallbackResponse = parseMessageFallback(message);
        if (fallbackResponse) {
            return fallbackResponse;
        }

        return {
            action: "help",
            response: "I can help you with sales, inventory management, expense tracking, and business insights. What would you like to do?"
        };
    }
};

/**
 * Execute the determined action
 */
const executeAction = async (userId, aiResponse, businessData, originalMessage, language = 'en') => {
    try {
        // Always require confirmation for sales
        const isDirectBillCommand = false;

        switch (aiResponse.action) {
            case 'create_sale':
                // Removed auto-confirm: all sales now show a preview first
                return await createSalePreview(userId, aiResponse, businessData, false, language);
            case 'add_inventory':
                return await addInventoryItem(userId, aiResponse);
            case 'update_inventory':
                return await updateInventoryItem(userId, aiResponse, businessData);
            case 'add_expense':
                return await addExpense(userId, aiResponse);
            case 'insights':
                const insightsResult = await generateBusinessInsights(aiResponse, businessData);
                // Remove asterisks from insights response
                if (insightsResult.message) {
                    insightsResult.message = insightsResult.message.replace(/\*\*/g, '').replace(/\*/g, '');
                }
                return insightsResult;
            case 'clarify':
                return {
                    success: true,
                    message: (aiResponse.response || '').replace(/\*\*/g, '').replace(/\*/g, ''),
                    data: { type: 'clarification_needed', missing_fields: aiResponse.missing }
                };
            default:
                const defaultMessage = aiResponse.response || "I can help you with sales, inventory, expenses, and business insights. What would you like to do?";
                return {
                    success: true,
                    message: defaultMessage.replace(/\*\*/g, '').replace(/\*/g, ''),
                    data: null
                };
        }
    } catch (error) {
        console.error('Action execution error:', error);
        return {
            success: false,
            message: "Error executing your request. Please try again.",
            data: null
        };
    }
};

/**
 * Handle confirmations for pending operations
 */
const handleConfirmation = async (userId) => {
    console.log(`🔍 handleConfirmation called for userId: ${userId}`);
    console.log(`🔍 Looking for key: retailer_${userId}`);
    console.log(`🔍 Available keys:`, Array.from(pendingOrders.keys()));
    
    const pendingOperation = pendingOrders.get(`retailer_${userId}`);
    console.log(`🔍 Found pending operation:`, !!pendingOperation);
    
    if (!pendingOperation) {
        return {
            success: false,
            message: "No pending operation to confirm. Please make a new request.",
            data: null
        };
    }

    switch (pendingOperation.type) {
        case 'sale':
            return await confirmSale(userId, pendingOperation);
        case 'inventory':
            return await confirmInventoryAdd(userId, pendingOperation);
        case 'expense':
            return await confirmExpense(userId, pendingOperation);
        default:
            pendingOrders.delete(`retailer_${userId}`);
            return {
                success: false,
                message: "Unknown pending operation. Please try again.",
                data: null
            };
    }
};

/**
 * Handle cancellations for pending operations
 */
const handleCancellation = async (userId) => {
    const pendingOperation = pendingOrders.get(`retailer_${userId}`);
    if (!pendingOperation) {
        const messages = {
            'en': "No pending operation to cancel. What else can I help you with?",
            'hi': "रद्द करने के लिए कोई लंबित ऑपरेशन नहीं है। मैं आपकी और कैसे मदद कर सकता हूं?",
            'te': "రద్దు చేయడానికి పెండింగ్ ఆపరేషన్ లేదు. నేను మీకు ఇంకా ఎలా సహాయం చేయగలను?"
        };

        const language = pendingOperation?.language || 'en';

        return {
            success: true,
            message: messages[language] || messages['en'],
            data: null
        };
    }

    const language = pendingOperation.language || 'en';

    // Clear the pending operation
    pendingOrders.delete(`retailer_${userId}`);

    const messages = {
        'en': "✅ Order cancelled. What else can I help you with?",
        'hi': "✅ ऑर्डर रद्द कर दिया गया। मैं आपकी और कैसे मदद कर सकता हूं?",
        'te': "✅ ఆర్డర్ రద్దు చేయబడింది. నేను మీకు ఇంకా ఎలా సహాయం చేయగలను?"
    };

    return {
        success: true,
        message: messages[language] || messages['en'],
        data: { type: 'operation_cancelled' }
    };
};

/**
 * Create sale preview with enhanced validation
 */
const createSalePreview = async (userId, aiResponse, businessData, autoConfirm = false, language = 'en') => {
    if (!aiResponse.items || aiResponse.items.length === 0) {
        const messages = {
            'en': "Please specify which items you want to sell. For example: 'Sell 2 rice bags at ₹50 each'",
            'hi': "कृपया बताएं कि आप कौन सी वस्तुएं बेचना चाहते हैं। उदाहरण: '2 चावल के बैग ₹50 प्रत्येक पर बेचें'",
            'te': "దయచేసి మీరు ఏ వస్తువులను అమ్మాలనుకుంటున్నారో పేర్కొనండి. ఉదాహరణ: '2 బియ్యం సంచులు ₹50 చొప్పున అమ్మండి'"
        };

        return {
            success: false,
            message: messages[language] || messages['en'],
            data: null
        };
    }

    const saleItems = [];
    let totalAmount = 0;
    let totalCogs = 0;
    const stockIssues = [];

    for (const item of aiResponse.items) {
        const inventoryItem = businessData.inventory.find(inv =>
            inv.item_name.toLowerCase() === item.item_name.toLowerCase()
        );

        if (!inventoryItem) {
            const messages = {
                'en': `"${item.item_name}" not found in inventory.\n\nAvailable items:\n${businessData.inventory.slice(0, 10).map(i => `• ${i.item_name}`).join('\n')}${businessData.inventory.length > 10 ? '\n... and more' : ''}`,
                'hi': `"${item.item_name}" इन्वेंटरी में नहीं मिला।\n\nउपलब्ध वस्तुएं:\n${businessData.inventory.slice(0, 10).map(i => `• ${i.item_name}`).join('\n')}${businessData.inventory.length > 10 ? '\n... और अधिक' : ''}`,
                'te': `"${item.item_name}" ఇన్వెంటరీలో కనుగొనబడలేదు।\n\nఅందుబాటులో ఉన్న వస్తువులు:\n${businessData.inventory.slice(0, 10).map(i => `• ${i.item_name}`).join('\n')}${businessData.inventory.length > 10 ? '\n... మరియు మరిన్ని' : ''}`
            };

            return {
                success: false,
                message: messages[language] || messages['en'],
                data: { type: 'item_not_found', available_items: businessData.inventory.map(i => i.item_name) }
            };
        }

        if (inventoryItem.stock_qty < item.quantity) {
            stockIssues.push({
                item_name: item.item_name,
                requested: item.quantity,
                available: inventoryItem.stock_qty
            });
        }

        const itemTotal = item.quantity * item.price_per_unit;
        const itemCogs = item.quantity * (inventoryItem.cost_per_unit || inventoryItem.cost_price || 0);

        saleItems.push({
            item_name: inventoryItem.item_name,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            cost_per_unit: inventoryItem.cost_per_unit || inventoryItem.cost_price || 0,
            total: itemTotal,
            inventory_id: inventoryItem._id,
            current_stock: inventoryItem.stock_qty,
            new_stock: inventoryItem.stock_qty - item.quantity
        });

        totalAmount += itemTotal;
        totalCogs += itemCogs;
    }

    if (stockIssues.length > 0) {
        const issueText = stockIssues.map(issue =>
            `• ${issue.item_name}: Need ${issue.requested}, only ${issue.available} available`
        ).join('\n');

        const messages = {
            'en': `Insufficient stock:\n\n${issueText}\n\nPlease adjust quantities or restock items.`,
            'hi': `अपर्याप्त स्टॉक:\n\n${issueText}\n\nकृपया मात्रा समायोजित करें या वस्तुओं को फिर से स्टॉक करें।`,
            'te': `తగినంత స్టాక్ లేదు:\n\n${issueText}\n\nదయచేసి పరిమాణాలను సర్దుబాటు చేయండి లేదా వస్తువులను తిరిగి స్టాక్ చేయండి.`
        };

        return {
            success: false,
            message: messages[language] || messages['en'],
            data: { type: 'insufficient_stock', issues: stockIssues }
        };
    }

    // Store pending sale with language
    const pendingSale = {
        type: 'sale',
        userId: userId.toString(), // Ensure string
        items: saleItems,
        totalAmount,
        totalCogs,
        grossProfit: totalAmount - totalCogs,
        customer_name: aiResponse.customer_name || 'Walk-in Customer',
        payment_method: aiResponse.payment_method || 'Cash',
        timestamp: Date.now(),
        language: language  // Store language for later use
    };

    // If autoConfirm is true, create the sale immediately
    if (autoConfirm) {
        return await confirmSale(userId.toString(), pendingSale);
    }

    const userIdStr = userId.toString();
    pendingOrders.set(`retailer_${userIdStr}`, pendingSale);
    console.log(`✅ Stored pending sale for retailer_${userIdStr}`);
    console.log(`✅ Total pending orders:`, pendingOrders.size);
    console.log(`✅ All keys:`, Array.from(pendingOrders.keys()));

    // Language-specific preview messages
    const previewHeaders = {
        'en': '📋 Sale Preview:\n\n',
        'hi': '📋 बिक्री पूर्वावलोकन:\n\n',
        'te': '📋 అమ్మకం ప్రివ్యూ:\n\n'
    };

    const labels = {
        'en': { qty: 'Qty', total: 'Total', customer: 'Customer', payment: 'Payment', confirm: "Click 'Yes' button or reply 'yes' to confirm." },
        'hi': { qty: 'मात्रा', total: 'कुल', customer: 'ग्राहक', payment: 'भुगतान', confirm: "'हाँ' बटन क्लिक करें या 'हाँ' लिखें।" },
        'te': { qty: 'పరిమాణం', total: 'మొత్తం', customer: 'కస్టమర్', payment: 'చెల్లింపు', confirm: "'అవును' బటన్ క్లిక్ చేయండి లేదా 'అవును' అని రాయండి." }
    };

    const label = labels[language] || labels['en'];

    let messageText = previewHeaders[language] || previewHeaders['en'];
    saleItems.forEach((item, idx) => {
        messageText += `${idx + 1}. ${item.item_name}\n`;
        messageText += `   ${label.qty}: ${item.quantity} × ₹${item.price_per_unit} = ₹${item.total}\n\n`;
    });

    messageText += `💰 ${label.total}: ₹${totalAmount}\n`;
    messageText += `� ${label.customer}: ${pendingSale.customer_name}\n`;
    messageText += `� ${label.payment}: ${pendingSale.payment_method}\n\n`;
    messageText += label.confirm;

    return {
        success: true,
        message: messageText,
        data: {
            type: 'sale_preview',
            items: saleItems,
            total_amount: totalAmount,
            gross_profit: totalAmount - totalCogs,
            pending: true
        }
    };
};

/**
 * Confirm and create sale
 */
const confirmSale = async (userId, pendingSale) => {
    try {
        // Validate stock again
        for (const item of pendingSale.items) {
            const inventoryItem = await Inventory.findById(item.inventory_id);
            if (!inventoryItem || inventoryItem.stock_qty < item.quantity) {
                return {
                    success: false,
                    message: `Stock changed for ${item.item_name}. Please create a new sale.`,
                    data: null
                };
            }
        }

        // Update inventory and create sale
        const saleItems = [];
        for (const item of pendingSale.items) {
            const inventoryItem = await Inventory.findById(item.inventory_id);
            inventoryItem.stock_qty -= item.quantity;
            await inventoryItem.save();

            saleItems.push({
                item_name: item.item_name,
                quantity: item.quantity,
                price_per_unit: item.price_per_unit,
                cost_per_unit: item.cost_per_unit
            });
        }

        // Create sale record
        const sale = new Sale({
            user_id: userId,
            items: saleItems,
            total_amount: pendingSale.totalAmount,
            total_cogs: pendingSale.totalCogs,
            gross_profit: pendingSale.grossProfit,
            payment_method: pendingSale.payment_method,
            customer_name: pendingSale.customer_name
        });

        await sale.save();
        pendingOrders.delete(`retailer_${userId}`);

        const retailer = await User.findById(userId);

        // Get language from pending sale or default to English
        const language = pendingSale.language || 'en';

        // Language-specific success messages
        const messages = {
            'en': `✅ Sale completed successfully!\n\n📋 Bill #${sale._id.toString().slice(-6).toUpperCase()}\n💰 Total: ₹${pendingSale.totalAmount}\n📈 Profit: ₹${pendingSale.grossProfit}\n🏪 ${retailer?.shop_name || 'Store'}\n📅 ${new Date().toLocaleString()}`,
            'hi': `✅ बिक्री सफलतापूर्वक पूर्ण हुई!\n\n📋 बिल #${sale._id.toString().slice(-6).toUpperCase()}\n💰 कुल: ₹${pendingSale.totalAmount}\n📈 लाभ: ₹${pendingSale.grossProfit}\n🏪 ${retailer?.shop_name || 'स्टोर'}\n📅 ${new Date().toLocaleString()}`,
            'te': `✅ అమ్మకం విజయవంతంగా పూర్తయింది!\n\n📋 బిల్ #${sale._id.toString().slice(-6).toUpperCase()}\n💰 మొత్తం: ₹${pendingSale.totalAmount}\n📈 లాభం: ₹${pendingSale.grossProfit}\n🏪 ${retailer?.shop_name || 'స్టోర్'}\n📅 ${new Date().toLocaleString()}`
        };

        return {
            success: true,
            message: messages[language] || messages['en'],
            data: {
                type: 'sale_completed',
                sale_id: sale._id,
                total_amount: pendingSale.totalAmount,
                gross_profit: pendingSale.grossProfit,
                items: saleItems
            }
        };
    } catch (error) {
        console.error('Sale confirmation error:', error);
        return {
            success: false,
            message: "Error completing sale. Please try again.",
            data: null
        };
    }
};

/**
 * Add new inventory item with validation
 */
const addInventoryItem = async (userId, data) => {
    try {
        // Validate required fields
        const requiredFields = ['item_name', 'quantity', 'cost_per_unit', 'price_per_unit'];
        const missingFields = requiredFields.filter(field => !data[field]);

        if (missingFields.length > 0) {
            return {
                success: false,
                message: `Missing information: ${missingFields.join(', ')}. Please provide: item name, quantity, cost price, and selling price.`,
                data: { type: 'missing_fields', fields: missingFields }
            };
        }

        // Validate that selling price > cost price
        if (data.price_per_unit <= data.cost_per_unit) {
            return {
                success: false,
                message: `Selling price (₹${data.price_per_unit}) must be higher than cost price (₹${data.cost_per_unit}) to ensure profit.`,
                data: { type: 'invalid_pricing' }
            };
        }

        // Check if item already exists
        const existingItem = await Inventory.findOne({
            user_id: userId,
            item_name: { $regex: new RegExp(`^${data.item_name}$`, 'i') }
        });

        if (existingItem) {
            // Store pending update instead of creating duplicate
            const pendingUpdate = {
                type: 'inventory',
                action: 'update_existing',
                userId,
                existing_item: existingItem,
                new_data: data,
                timestamp: Date.now()
            };

            pendingOrders.set(`retailer_${userId}`, pendingUpdate);

            return {
                success: true,
                message: `"${data.item_name}" already exists in inventory.\n\nCurrent: ${existingItem.stock_qty} units @ ₹${existingItem.price_per_unit}\nYou want to add: ${data.quantity} units @ ₹${data.price_per_unit}\n\nReply 'yes' to add to existing stock or specify a different item name.`,
                data: { type: 'item_exists', existing_item: existingItem, new_data: data }
            };
        }

        // Store pending inventory addition (always ask for confirmation)
        const pendingInventory = {
            type: 'inventory',
            action: 'create_new',
            userId,
            data: {
                item_name: data.item_name,
                stock_qty: data.quantity,
                cost_price: data.cost_per_unit,
                selling_price: data.price_per_unit,
                price_per_unit: data.price_per_unit,
                category: data.category || 'Other',
                min_stock_level: data.min_stock_level || 5
            },
            timestamp: Date.now()
        };

        pendingOrders.set(`retailer_${userId}`, pendingInventory);

        const profitPerUnit = data.price_per_unit - data.cost_per_unit;
        const profitMargin = ((profitPerUnit / data.price_per_unit) * 100).toFixed(2);

        return {
            success: true,
            message: `📋 Inventory Preview:\n\n📦 ${data.item_name}\n🔢 Quantity: ${data.quantity} units\n💰 Cost: ₹${data.cost_per_unit} each\n🏷️ Selling Price: ₹${data.price_per_unit} each\n📈 Profit: ₹${profitPerUnit} per unit (${profitMargin}%)\n📂 Category: ${pendingInventory.data.category}\n\nReply 'yes' to confirm adding this item.`,
            data: { type: 'inventory_preview', item: pendingInventory.data, profit_analysis: { profit_per_unit: profitPerUnit, profit_margin: profitMargin } }
        };
    } catch (error) {
        console.error('Add inventory error:', error);
        return {
            success: false,
            message: `Error adding inventory: ${error.message}`,
            data: null
        };
    }
};

/**
 * Update existing inventory item
 */
const updateInventoryItem = async (userId, data, businessData) => {
    try {
        const inventoryItem = businessData.inventory.find(item =>
            item.item_name.toLowerCase() === data.item_name.toLowerCase()
        );

        if (!inventoryItem) {
            return {
                success: false,
                message: `"${data.item_name}" not found in inventory.\n\nAvailable items:\n${businessData.inventory.slice(0, 10).map(i => `• ${i.item_name}`).join('\n')}`,
                data: null
            };
        }

        // Update the item
        if (data.quantity !== undefined) {
            inventoryItem.stock_qty = data.quantity;
        }
        if (data.price_per_unit !== undefined) {
            inventoryItem.price_per_unit = data.price_per_unit;
        }
        if (data.cost_per_unit !== undefined) {
            inventoryItem.cost_per_unit = data.cost_per_unit;
        }

        await inventoryItem.save();

        const profitPerUnit = inventoryItem.price_per_unit - (inventoryItem.cost_per_unit || 0);
        const profitMargin = inventoryItem.price_per_unit > 0 ? ((profitPerUnit / inventoryItem.price_per_unit) * 100).toFixed(2) : 0;

        return {
            success: true,
            message: `✅ Updated inventory:\n\n📦 ${inventoryItem.item_name}\n🔢 Stock: ${inventoryItem.stock_qty} units\n🏷️ Price: ₹${inventoryItem.price_per_unit}\n📈 Profit Margin: ${profitMargin}%`,
            data: { type: 'inventory_updated', item: inventoryItem }
        };
    } catch (error) {
        console.error('Update inventory error:', error);
        return {
            success: false,
            message: `Error updating inventory: ${error.message}`,
            data: null
        };
    }
};

/**
 * Confirm inventory addition for existing items
 */
const confirmInventoryAdd = async (userId, pendingOperation) => {
    try {
        if (pendingOperation.action === 'create_new') {
            const data = pendingOperation.data;
            const newItem = new Inventory({
                user_id: userId,
                item_name: data.item_name,
                stock_qty: data.stock_qty,
                cost_price: data.cost_price,
                selling_price: data.selling_price,
                price_per_unit: data.price_per_unit,
                category: data.category || 'Other',
                min_stock_level: data.min_stock_level || 5
            });

            await newItem.save();
            pendingOrders.delete(`retailer_${userId}`);

            const profitPerUnit = data.selling_price - data.cost_price;
            const profitMargin = ((profitPerUnit / data.selling_price) * 100).toFixed(2);

            return {
                success: true,
                message: `✅ New item added to inventory:\n\n📦 ${data.item_name}\n🔢 Quantity: ${data.stock_qty} units\n💰 Cost: ₹${data.cost_price} each\n🏷️ Selling Price: ₹${data.selling_price} each\n📈 Profit: ₹${profitPerUnit} per unit (${profitMargin}%)\n📂 Category: ${newItem.category}`,
                data: { type: 'inventory_added', item: newItem }
            };
        }

        if (pendingOperation.action === 'update_details') {
            const { existing_item, new_data } = pendingOperation;

            // Apply specific updates
            if (new_data.quantity !== undefined) {
                existing_item.stock_qty = new_data.quantity;
            }
            if (new_data.price_per_unit !== undefined) {
                existing_item.price_per_unit = new_data.price_per_unit;
            }
            if (new_data.cost_per_unit !== undefined) {
                existing_item.cost_per_unit = new_data.cost_per_unit;
            }

            await existing_item.save();
            pendingOrders.delete(`retailer_${userId}`);

            const profitPerUnit = existing_item.price_per_unit - (existing_item.cost_per_unit || 0);
            const profitMargin = existing_item.price_per_unit > 0 ? ((profitPerUnit / existing_item.price_per_unit) * 100).toFixed(2) : 0;

            return {
                success: true,
                message: `✅ Updated inventory details:\n\n📦 ${existing_item.item_name}\n🔢 Stock: ${existing_item.stock_qty} units\n🏷️ Price: ₹${existing_item.price_per_unit}\n📈 Profit Margin: ${profitMargin}%`,
                data: { type: 'inventory_updated', item: existing_item }
            };
        }

        const { existing_item, new_data } = pendingOperation;

        // Update existing item
        existing_item.stock_qty += new_data.quantity;

        // Update price if different
        if (new_data.price_per_unit !== existing_item.price_per_unit) {
            existing_item.price_per_unit = new_data.price_per_unit;
        }

        // Update cost if provided
        if (new_data.cost_per_unit) {
            existing_item.cost_per_unit = new_data.cost_per_unit;
        }

        await existing_item.save();
        pendingOrders.delete(`retailer_${userId}`);

        const profitPerUnit = existing_item.price_per_unit - (existing_item.cost_per_unit || 0);
        const profitMargin = ((profitPerUnit / existing_item.price_per_unit) * 100).toFixed(2);

        return {
            success: true,
            message: `✅ Updated existing inventory:\n\n📦 ${existing_item.item_name}\n🔢 Total Stock: ${existing_item.stock_qty} units\n🏷️ Price: ₹${existing_item.price_per_unit}\n📈 Profit: ₹${profitPerUnit} per unit (${profitMargin}%)`,
            data: { type: 'inventory_updated', item: existing_item }
        };
    } catch (error) {
        console.error('Confirm inventory error:', error);
        return {
            success: false,
            message: "Error updating inventory. Please try again.",
            data: null
        };
    }
};

/**
 * Add expense with enhanced categorization - Creates preview first
 */
const addExpense = async (userId, data) => {
    try {
        // Validate required fields
        if (!data.description || !data.amount) {
            return {
                success: false,
                message: "Please provide expense description and amount. For example: 'Add expense: Electricity bill ₹2000'",
                data: null
            };
        }

        // Create expense preview
        const expenseType = data.is_sales_expense ? '🎯 Sales-related' : '🏢 Operating';
        const category = data.category || 'Other';

        // Store pending expense
        const pendingExpense = {
            type: 'expense',
            userId,
            description: data.description,
            amount: data.amount,
            category: category,
            is_sales_expense: data.is_sales_expense || false,
            timestamp: Date.now()
        };

        pendingOrders.set(`retailer_${userId}`, pendingExpense);

        return {
            success: true,
            message: `📋 Expense Preview:\n\n💸 ${data.description}\n💰 Amount: ₹${data.amount}\n📂 Category: ${category}\n🏷️ Type: ${expenseType}\n📅 Date: ${new Date().toLocaleDateString()}\n\nReply 'yes' to confirm this expense.`,
            data: { 
                type: 'expense_preview', 
                description: data.description,
                amount: data.amount,
                category: category,
                is_sales_expense: data.is_sales_expense || false,
                expense_type: expenseType
            }
        };
    } catch (error) {
        console.error('Add expense error:', error);
        return {
            success: false,
            message: `Error adding expense: ${error.message}`,
            data: null
        };
    }
};

/**
 * Confirm expense addition
 */
const confirmExpense = async (userId, pendingOperation) => {
    try {
        const newExpense = new Expense({
            user_id: userId,
            description: pendingOperation.description,
            amount: pendingOperation.amount,
            category: pendingOperation.category,
            is_sales_expense: pendingOperation.is_sales_expense,
            date: new Date()
        });

        await newExpense.save();
        pendingOrders.delete(`retailer_${userId}`);

        const expenseType = newExpense.is_sales_expense ? '🎯 Sales-related' : '🏢 Operating';

        return {
            success: true,
            message: `✅ Expense added successfully!\n\n💸 ${newExpense.description}\n💰 Amount: ₹${newExpense.amount}\n📂 Category: ${newExpense.category}\n🏷️ Type: ${expenseType}\n📅 Date: ${new Date().toLocaleDateString()}`,
            data: { type: 'expense_added', expense: newExpense }
        };
    } catch (error) {
        console.error('Confirm expense error:', error);
        return {
            success: false,
            message: "Error adding expense. Please try again.",
            data: null
        };
    }
};

/**
 * Generate comprehensive business insights
 */
const generateBusinessInsights = async (aiResponse, businessData) => {
    try {
        let insightMessage = '';

        switch (aiResponse.type) {
            case 'sales':
                insightMessage = generateSalesInsights(businessData);
                break;
            case 'inventory':
                insightMessage = generateInventoryInsights(businessData);
                break;
            case 'expenses':
                insightMessage = generateExpenseInsights(businessData);
                break;
            case 'profit':
                insightMessage = generateProfitInsights(businessData);
                break;
            case 'festival':
                insightMessage = generateFestivalInsights(businessData);
                break;
            case 'overview':
            default:
                insightMessage = generateOverviewInsights(businessData);
                break;
        }

        return {
            success: true,
            message: insightMessage,
            data: {
                type: 'business_insights',
                metrics: businessData.metrics,
                insights_type: aiResponse.type
            }
        };
    } catch (error) {
        console.error('Insights generation error:', error);
        return {
            success: false,
            message: "Error generating insights. Please try again.",
            data: null
        };
    }
};

const generateSalesInsights = (businessData) => {
    const { metrics, sales } = businessData;

    let insights = `### 📊 Sales Insights\n\n`;
    
    insights += `| Metric | Value |\n`;
    insights += `| :--- | :--- |\n`;
    insights += `| **Total Revenue** | ₹${metrics.totalRevenue.toLocaleString()} |\n`;
    insights += `| **Gross Profit** | ₹${metrics.grossProfit.toLocaleString()} |\n`;
    insights += `| **Net Profit** | ₹${metrics.netProfit.toLocaleString()} |\n`;
    insights += `| **Profit Margin** | ${metrics.profitMargin}% |\n\n`;

    insights += `#### 📅 Performance Breakdown\n\n`;
    insights += `| Period | Revenue | Profit | Sales |\n`;
    insights += `| :--- | :--- | :--- | :--- |\n`;
    insights += `| **Today** | ₹${metrics.todayRevenue.toLocaleString()} | ₹${metrics.todayProfit.toLocaleString()} | ${metrics.todaySalesCount} |\n`;
    insights += `| **Yesterday** | ₹${metrics.yesterdayRevenue.toLocaleString()} | ₹${metrics.yesterdayProfit.toLocaleString()} | ${metrics.yesterdaySalesCount} |\n`;
    insights += `| **This Month** | ₹${metrics.monthlyRevenue.toLocaleString()} | - | - |\n\n`;

    // Comparison
    const revenueDiff = metrics.todayRevenue - metrics.yesterdayRevenue;
    if (metrics.yesterdayRevenue > 0) {
        const revenueChange = ((revenueDiff / metrics.yesterdayRevenue) * 100).toFixed(1);
        insights += `> **Analysis:** Your revenue is **${revenueDiff >= 0 ? 'up' : 'down'} ${Math.abs(revenueChange)}%** compared to yesterday.\n\n`;
    }

    if (sales.length > 0) {
        // Top selling items logic
        const itemSales = {};
        sales.forEach(sale => {
            sale.items?.forEach(item => {
                const name = item.item_name;
                if (!itemSales[name]) {
                    itemSales[name] = { quantity: 0, revenue: 0 };
                }
                itemSales[name].quantity += item.quantity;
                itemSales[name].revenue += item.quantity * item.price_per_unit;
            });
        });

        const topItems = Object.entries(itemSales)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5);

        if (topItems.length > 0) {
            insights += `#### 🏆 Top Selling Items\n\n`;
            insights += `| Item | Quantity | Revenue |\n`;
            insights += `| :--- | :--- | :--- |\n`;
            topItems.forEach(([item, data]) => {
                insights += `| ${item} | ${data.quantity} units | ₹${data.revenue.toLocaleString()} |\n`;
            });
            insights += `\n`;
        }
    } else {
        insights += `*No sales recorded yet. Your current top items in stock are listed below.*\n\n`;
    }

    return insights;
};

const generateInventoryInsights = (businessData) => {
    const { inventory, lowStockItems, outOfStockItems, metrics } = businessData;

    let insights = `### 📦 Inventory Insights\n\n`;
    
    insights += `| Metric | Count |\n`;
    insights += `| :--- | :--- |\n`;
    insights += `| **Total Items** | ${inventory.length} |\n`;
    insights += `| **Low Stock Alerts** | ${metrics.lowStockCount} |\n`;
    insights += `| **Out of Stock** | ${metrics.outOfStockCount} |\n\n`;

    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.stock_qty * (item.cost_per_unit || 0)), 0);
    const totalSellingValue = inventory.reduce((sum, item) => sum + (item.stock_qty * item.price_per_unit), 0);

    insights += `#### 💰 Valuation\n\n`;
    insights += `| Type | Value |\n`;
    insights += `| :--- | :--- |\n`;
    insights += `| **Inventory Cost** | ₹${totalInventoryValue.toLocaleString()} |\n`;
    insights += `| **Retail Value** | ₹${totalSellingValue.toLocaleString()} |\n`;
    insights += `| **Potential Profit** | ₹${(totalSellingValue - totalInventoryValue).toLocaleString()} |\n\n`;

    if (lowStockItems.length > 0) {
        insights += `#### ⚠️ Restock Needed\n\n`;
        insights += `| Item | Stock Left |\n`;
        insights += `| :--- | :--- |\n`;
        lowStockItems.slice(0, 5).forEach(item => {
            insights += `| ${item.item_name} | ${item.stock_qty} units |\n`;
        });
        insights += `\n`;
    }

    if (outOfStockItems.length > 0) {
        insights += `#### ❌ Out of Stock\n\n`;
        outOfStockItems.slice(0, 5).forEach(item => {
            insights += `* ${item.item_name}\n`;
        });
        insights += `\n`;
    }

    return insights;
};

const generateExpenseInsights = (businessData) => {
    const { expenses, metrics } = businessData;

    let insights = `### 💸 Expense Insights\n\n`;
    
    insights += `| Metric | Amount |\n`;
    insights += `| :--- | :--- |\n`;
    insights += `| **Total Expenses** | ₹${metrics.totalExpenses.toLocaleString()} |\n`;
    insights += `| **Today's Expenses** | ₹${metrics.todayExpenses.toLocaleString()} |\n`;
    insights += `| **Monthly Expenses** | ₹${metrics.monthlyExpenses.toLocaleString()} |\n\n`;

    if (expenses.length > 0) {
        const categoryExpenses = {};
        expenses.forEach(expense => {
            if (!categoryExpenses[expense.category]) {
                categoryExpenses[expense.category] = 0;
            }
            categoryExpenses[expense.category] += expense.amount;
        });

        const topCategories = Object.entries(categoryExpenses)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        insights += `#### 📊 Category Breakdown\n\n`;
        insights += `| Category | Amount | Share |\n`;
        insights += `| :--- | :--- | :--- |\n`;
        topCategories.forEach(([category, amount]) => {
            const percentage = ((amount / metrics.totalExpenses) * 100).toFixed(1);
            insights += `| ${category} | ₹${amount.toLocaleString()} | ${percentage}% |\n`;
        });
        insights += `\n`;
    }

    return insights;
};

const generateProfitInsights = (businessData) => {
    const { metrics } = businessData;

    let insights = `### 📈 Profit Analysis\n\n`;
    
    insights += `| Financial Stat | Amount |\n`;
    insights += `| :--- | :--- |\n`;
    insights += `| **Total Revenue** | ₹${metrics.totalRevenue.toLocaleString()} |\n`;
    insights += `| **Total COGS** | ₹${metrics.totalCogs.toLocaleString()} |\n`;
    insights += `| **Total Expenses** | ₹${metrics.totalExpenses.toLocaleString()} |\n`;
    insights += `| **Gross Profit** | ₹${metrics.grossProfit.toLocaleString()} |\n`;
    insights += `| **Net Profit** | **₹${metrics.netProfit.toLocaleString()}** |\n`;
    insights += `| **Profit Margin** | ${metrics.profitMargin}% |\n\n`;
    
    insights += `#### 📅 Today's Breakdown\n\n`;
    insights += `* **Revenue:** ₹${metrics.todayRevenue.toLocaleString()}\n`;
    insights += `* **Expenses:** ₹${metrics.todayExpenses.toLocaleString()}\n`;
    insights += `* **Net Profit:** ₹${metrics.todayProfit.toLocaleString()}\n\n`;
    
    // Comparison
    const profitDiff = metrics.todayProfit - metrics.yesterdayProfit;
    if (metrics.yesterdayProfit !== 0) {
        insights += `> **Comparison:** Your profit is **${profitDiff >= 0 ? 'up' : 'down'} ₹${Math.abs(profitDiff).toLocaleString()}** from yesterday.\n\n`;
    }

    // Profit analysis
    if (metrics.netProfit > 0) {
        insights += `✅ **Status:** Your business is currently profitable.\n\n`;
        if (parseFloat(metrics.profitMargin) > 20) {
            insights += `> 🎉 **Excellent!** Your profit margin is high.\n`;
        } else if (parseFloat(metrics.profitMargin) < 10) {
            insights += `> ⚠️ **Caution:** Low profit margin. Consider reducing operational costs.\n`;
        }
    } else {
        insights += `⚠️ **Alert:** Business is currently running at a loss.\n\n`;
    }

    return insights;
};

const generateFestivalInsights = (businessData) => {
    const { festivalForecast } = businessData;

    if (!festivalForecast || !festivalForecast.has_forecast) {
        return `### 📅 Festival Planning\n\nNo upcoming festivals were found in the current dataset for the next 30-60 days. Check back soon for seasonal demand updates!`;
    }

    let insights = `### 🎊 Festival Planning: ${festivalForecast.festival_name}\n\n`;
    
    insights += `> **Status:** ${festivalForecast.is_imminent ? '🔥 URGENT' : '⏳ Approaching'} | **Demand:** ${festivalForecast.demand_level}\n\n`;

    insights += `#### 📦 Recommended Stocking Actions\n\n`;
    insights += `| Item | Stock | Confidence | Recommended Action |\n`;
    insights += `| :--- | :--- | :--- | :--- |\n`;
    
    festivalForecast.forecast_items.forEach(item => {
        insights += `| ${item.item_name} | ${item.current_stock} | ${item.confidence} | ${item.action} |\n`;
    });

    insights += `\n#### 💡 Strategy Highlights\n\n`;
    festivalForecast.forecast_items.slice(0, 3).forEach(item => {
        insights += `* **${item.item_name}**: ${item.reasoning}\n`;
    });

    return insights;
};

const generateOverviewInsights = (businessData) => {
    const { metrics, inventory, sales, expenses } = businessData;

    let insights = `🏪 BUSINESS OVERVIEW\n\n`;
    insights += `📊 FINANCIAL SUMMARY:\n`;
    insights += `💰 Total Revenue: ₹${metrics.totalRevenue.toLocaleString()}\n`;
    insights += `💎 Net Profit: ₹${metrics.netProfit.toLocaleString()}\n`;
    insights += `📈 Profit Margin: ${metrics.profitMargin}%\n\n`;

    insights += `� TODAY vs YESTERDAY:\n`;
    insights += `• Today: ₹${metrics.todayRevenue.toLocaleString()} (${metrics.todaySalesCount} sales)\n`;
    insights += `• Yesterday: ₹${metrics.yesterdayRevenue.toLocaleString()} (${metrics.yesterdaySalesCount} sales)\n`;
    const revenueDiff = metrics.todayRevenue - metrics.yesterdayRevenue;
    if (metrics.yesterdayRevenue > 0) {
        const change = ((revenueDiff / metrics.yesterdayRevenue) * 100).toFixed(1);
        insights += `• Change: ${revenueDiff >= 0 ? '📈' : '📉'} ${change}%\n`;
    }
    insights += `\n`;

    insights += `� INVENTORY STATUS:\n`;
    insights += `• ${inventory.length} total items\n`;
    insights += `• ${metrics.lowStockCount} low stock alerts\n`;
    insights += `• ${metrics.outOfStockCount} out of stock\n\n`;

    insights += `🛒 SALES ACTIVITY:\n`;
    insights += `• ${sales.length} total transactions\n`;
    insights += `• ₹${metrics.monthlyRevenue.toLocaleString()} this month\n\n`;

    insights += `💸 EXPENSES:\n`;
    insights += `• ₹${metrics.totalExpenses.toLocaleString()} total\n`;
    insights += `• ₹${metrics.monthlyExpenses.toLocaleString()} this month\n\n`;

    if (metrics.pendingOrders > 0) {
        insights += `📋 ${metrics.pendingOrders} pending customer orders\n\n`;
    }

    // Quick recommendations
    insights += `💡 QUICK ACTIONS:\n`;
    if (metrics.lowStockCount > 0) {
        insights += `• Restock ${metrics.lowStockCount} low inventory items\n`;
    }
    if (metrics.pendingOrders > 0) {
        insights += `• Process ${metrics.pendingOrders} pending orders\n`;
    }
    if (parseFloat(metrics.profitMargin) < 15 && sales.length > 0) {
        insights += `• Review pricing to improve profit margin\n`;
    }
    if (sales.length === 0 && inventory.length > 0) {
        insights += `• Start recording sales - Try: "Make bill for 2 ${inventory[0]?.item_name}"\n`;
    }
    if (inventory.length === 0) {
        insights += `• Add inventory items first - Try: "Add 100 rice bags, cost ₹50, selling ₹80"\n`;
    }

    return insights;
};

module.exports = { handleRetailerChat };
