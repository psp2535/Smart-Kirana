const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Google Gemini Service
 * Provides AI-powered business insights using Google Gemini 1.5 Pro
 */

// Initialize Gemini with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
    }
});

class GeminiService {
  /**
   * Generate AI response with context
   */
  async generateResponse(prompt, context = {}) {
    try {
      const fullPrompt = this.buildPromptWithContext(prompt, context);
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('Failed to generate AI response: ' + error.message);
    }
  }

  /**
   * Demand Forecasting Analysis
   */
  async analyzeDemandForecast(salesData, inventoryData, expiringItems = []) {
    const expiryContext = expiringItems.length > 0 
      ? `\n\nEXPIRING ITEMS (within 30 days):\n${JSON.stringify(expiringItems, null, 2)}\n\n⚠️ CRITICAL: Include discount recommendations for expiring items to sell them fast!`
      : '';

    const prompt = `
You are a business analytics AI assistant. Analyze the following sales and inventory data to provide demand forecasting insights for a retail store.

SALES DATA:
${JSON.stringify(salesData, null, 2)}

INVENTORY DATA:
${JSON.stringify(inventoryData, null, 2)}${expiryContext}

CRITICAL: Structure your response EXACTLY in this order with clear HEADINGS and TABLES:

# 📊 Demand Forecasting Report

## 🎯 Quick Actions (Today)
| Priority | Action Item | Target Item | Reason |
| :--- | :--- | :--- | :--- |
| 🔴 High | [Action] | [Item] | [Reason] |
| 🟡 Medium | [Action] | [Item] | [Reason] |
| 🟢 Low | [Action] | [Item] | [Reason] |

## 💰 Visual Summary
| Metric | Value | Status |
| :--- | :--- | :--- |
| Total Revenue | ₹${salesData.reduce((sum, s) => sum + s.total_amount, 0)} | 📈 Trending |
| Top Selling | [Top Item Name] | 🔥 Hot Item |
| Stock Alerts | ${inventoryData.filter(i => i.stock_qty < 10).length} Items | ⚠️ Critical |
${expiringItems.length > 0 ? `| Expiring Soon | ${expiringItems.length} Items | 🔴 Urgent |` : ''}

## 📊 Detailed Demand Analysis
- **Top 5 Items**: [List them with their sales velocity]
- **Sales Trends**: Identify which product categories are growing vs shrinking.
- **Stock Recommendations**: For each high-demand item, recommend a specific reorder quantity.

## 💡 Strategic Recommendations
1. **Growth Strategy**: [Strategic advice based on top categories]
2. **Stock Optimization**: [Advice on how to manage current inventory levels]

Use clear formatting, bold text, and specific numbers from the data. Respond in English.
`;

    return await this.generateResponse(prompt);
  }

  /**
   * Revenue Optimization Analysis
   */
  async analyzeRevenueOptimization(salesData, inventoryData, profitData) {
    const prompt = `
You are a pricing strategy AI assistant. Analyze the following business data to maximize revenue and profitability.

PROFITS & MARGINS:
${JSON.stringify(profitData, null, 2)}

CRITICAL: Structure your response EXACTLY in this order with clear HEADINGS and TABLES:

# 💸 Revenue Optimization Analysis

## 🎯 Immediate Pricing Actions
| Item Name | Current Price | Recommended Price | Potential Profit Increase |
| :--- | :--- | :--- | :--- |
| [Item] | ₹[Price] | ₹[New Price] | +₹[Amount] |
| [Item] | ₹[Price] | ₹[New Price] | +₹[Amount] |

## 💰 Profitability Summary
| Metric | Current Value | Optimal Target |
| :--- | :--- | :--- |
| Average Margin | ${profitData.avgProfitMargin || 'X'}% | [Target]% |
| Revenue Velocity | ₹[Amount]/day | ₹[Target]/day |
| High-Margin Inventory | [Count] Items | [Count] Items |

## 💡 Pricing Strategy Recommendations
1. **Bundle Opportunity**: [Suggest a bundle of two related items at a discount]
2. **Upsell Strategy**: [Which items should be pushed at the counter?]
3. **Discount Logic**: [Strategy for clearing slow-moving stock]

## 📊 Revenue Detail Analysis
- **Margin Opportunities**: Identify products where prices are too low relative to demand.
- **Customer Value**: Which customer segments are contributing most to high-margin sales?
- **Competitor Response**: Recommended price levels to stay competitive while maximizing profit.

Use clear formatting and specific numbers. Respond in English.
`;

    return await this.generateResponse(prompt);
  }

  /**
   * Expense Forecasting with Seasonal Analysis
   */
  async analyzeExpenseForecast(expensesData, currentMonth, currentSeason) {
    const prompt = `
You are a financial forecasting AI assistant for a business in India. Analyze expenses and predict future costs with seasonal context.

CURRENT DATE: ${new Date().toLocaleDateString('en-IN')}
SEASON: ${currentSeason}

EXPENSE HISTORY:
${JSON.stringify(expensesData, null, 2)}

CRITICAL: Structure your response EXACTLY in this order with clear HEADINGS and TABLES:

# 📉 Expense & Financial Forecast

## 🎯 Immediate Cost Actions
| Priority | Cost Saving Measure | Category | Estimated Savings |
| :--- | :--- | :--- | :--- |
| 🔵 Medium | [Action] | [Category] | ₹[Amount] |
| 🟢 Low | [Action] | [Category] | ₹[Amount] |

## 💰 Expense Summary
| Metric | Monthly Average | Current Trend |
| :--- | :--- | :--- |
| Total Expenses | ₹[Amount] | [Up/Down] |
| Top Category | [Name] | [Value]% |
| Seasonal Variance | ₹[Amount] | ${currentSeason} Impact |

## 💡 Strategic Financial Recommendations
1. **Seasonal Buffer**: [Advice on saving for upcoming peak months]
2. **Category Optimization**: [How to reduce the highest expense category]

## 📊 Detailed Expense Analysis
- **Monthly Trends**: Breakdown of how spending has changed over the last 3 months.
- **Seasonal Forecast**: How the current "${currentSeason}" season will impact next month's utility/logistics bills.
- **Budget Targets**: Recommended spending limits for the next 30 days to maintain profitability.

Use clear formatting and specific numbers. Respond in English.
`;

    return await this.generateResponse(prompt);
  }

  /**
   * General Business Chat
   */
  async chat(message, businessContext) {
    const prompt = `
You are an AI business assistant for Smart Kirana, a business management platform.

BUSINESS CONTEXT:
${JSON.stringify(businessContext, null, 2)}

USER QUESTION: ${message}

Provide a helpful, concise response based on the business data available.
If the user asks about inventory, sales, customers, or expenses, use the context data.
Be professional, friendly, and actionable in your advice.
`;

    return await this.generateResponse(prompt);
  }

  /**
   * Wholesaler Business Insights
   */
  async analyzeWholesalerInsights(inventory, productPerformance, retailerAnalysis) {
    const prompt = `
You are a high-level wholesale business consultant. Analyze the provided wholesale data and generate a professional, actionable report.

PRODUCT PERFORMANCE:
${JSON.stringify(productPerformance, null, 2)}

RETAILER (CUSTOMER) ANALYSIS:
${JSON.stringify(retailerAnalysis, null, 2)}

CRITICAL: Structure your response EXACTLY in this order with clear HEADINGS and TABLES:

# 🏭 Wholesaler Business Analysis

## 🎯 Top Priority Actions
| Priority | Action | Target Product/Retailer | Reason |
| :--- | :--- | :--- | :--- |
| 🔴 Critical | [Action] | [Target] | [Expiry/Stock Issue] |
| 🟡 Warning | [Action] | [Target] | [Low Sales Velocity] |

## 📦 Inventory & Stock Movement
| Product Name | Movement | Stock Status | Recommendation |
| :--- | :--- | :--- | :--- |
| [Item] | [Fast/Slow] | [Low/Over] | [Restock/Clearance] |

## 💰 Pricing & Profit Optimization
| Item Name | Current Price | Recommended | Strategy |
| :--- | :--- | :--- | :--- |
| [Item] | ₹[Price] | ₹[New] | [Bulk Discount / Margin Hike] |

## 🤝 Targeted Retailer Offers
| Retailer Name | Suggested Deal | Product | Campaign Message |
| :--- | :--- | :--- | :--- |
| [Name] | [X]% OFF | [Item] | [Concise Campaign Text] |

## 💡 Strategic Business Advice
1. **Inventory Management**: [Advice on turnover and warehousing]
2. **Retailer Relationship**: [Advice on how to improve loyalty with top retailers]
3. **Growth Opportunity**: [Identify untapped categories]

Use professional, precise language. Respond in English.
`;

    return await this.generateResponse(prompt);
  }

  /**
   * Build prompt with context
   */
  buildPromptWithContext(prompt, context) {
    if (!context || Object.keys(context).length === 0) {
      return prompt;
    }

    let contextStr = '\n\nADDITIONAL CONTEXT:\n';
    for (const [key, value] of Object.entries(context)) {
      contextStr += `${key}: ${JSON.stringify(value)}\n`;
    }

    return prompt + contextStr;
  }
}

module.exports = new GeminiService();
