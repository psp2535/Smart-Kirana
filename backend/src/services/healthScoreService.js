/**
 * Business Health Score Service
 * Calculates a dynamic score (0-100) based on real-time business metrics
 * Provides actionable tips for improvement
 */

const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');

class HealthScoreService {
    /**
     * Calculate comprehensive business health score
     * @param {string} userId - Retailer ID
     */
    async calculateHealthScore(userId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Fetch required data
            const [inventory, sales, expenses] = await Promise.all([
                Inventory.find({ user_id: userId }),
                Sale.find({ user_id: userId, createdAt: { $gte: sevenDaysAgo } }),
                Expense.find({ user_id: userId, createdAt: { $gte: sevenDaysAgo } })
            ]);

            if (inventory.length === 0) {
                return {
                    score: 0,
                    status: 'N/A',
                    message: "Welcome! Add items to your inventory to start tracking your business health.",
                    tips: ["Add at least 5 products to get started", "Set cost prices for accurate profit tracking"]
                };
            }

            // 1. Profitability Score (40%)
            let profitScore = 0;
            const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
            const totalCogs = sales.reduce((sum, s) => sum + (s.total_cogs || 0), 0);
            const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;
            
            if (grossMargin >= 25) profitScore = 40;
            else if (grossMargin >= 15) profitScore = 30;
            else if (grossMargin >= 5) profitScore = 15;
            else if (totalRevenue > 0) profitScore = 5;

            // 2. Stock Health Score (30%)
            let stockScore = 0;
            const lowStockCount = inventory.filter(i => i.stock_qty <= (i.min_stock_level || 5)).length;
            const stockHealthRatio = (inventory.length - lowStockCount) / inventory.length;
            stockScore = stockHealthRatio * 30;

            // 3. Sales Consistency (20%)
            let consistencyScore = 0;
            const daysWithSales = new Set(sales.map(s => new Date(s.createdAt).toDateString())).size;
            consistencyScore = (daysWithSales / 7) * 20;

            // 4. Inventory Value Efficiency (10%)
            // Simple ratio of weekly revenue to total retail stock value
            const totalRetailValue = inventory.reduce((sum, i) => sum + (i.stock_qty * i.price_per_unit), 0);
            const efficiency = totalRetailValue > 0 ? (totalRevenue / totalRetailValue) : 0;
            const efficiencyScore = Math.min(efficiency * 50, 10); // Capped at 10

            const finalScore = Math.min(Math.round(profitScore + stockScore + consistencyScore + efficiencyScore), 100);

            // Determine status and message
            let status = 'Fair';
            let color = '#EAB308'; // Yellow
            if (finalScore >= 80) { status = 'Excellent'; color = '#22C55E'; }
            else if (finalScore >= 60) { status = 'Good'; color = '#3B82F6'; }
            else if (finalScore < 40) { status = 'Critical'; color = '#EF4444'; }

            // Generate Tips
            const tips = [];
            if (lowStockCount > 0) tips.push(`Restock ${lowStockCount} low items to avoid losing revenue.`);
            if (grossMargin < 15 && totalRevenue > 0) tips.push("Review your margins; consider a 5% price adjustment on top items.");
            if (daysWithSales < 3) tips.push("Run a daily promotion to improve sales consistency.");
            if (efficiency < 0.1 && totalRetailValue > 5000) tips.push("You have high stock but low sales. Try a bundle offer.");
            if (tips.length === 0) tips.push("Business is stable! Consider adding new categories to scale.");

            return {
                score: finalScore,
                status,
                color,
                metrics: {
                    margin: grossMargin.toFixed(1) + '%',
                    lowStockCount,
                    weeklyRevenue: totalRevenue
                },
                tips: tips.slice(0, 3)
            };
        } catch (error) {
            console.error('HealthScore calculation error:', error);
            return { score: 50, status: 'Error', tips: ["Ensure all items have cost prices set"] };
        }
    }
}

module.exports = new HealthScoreService();
