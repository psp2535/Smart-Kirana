/**
 * Festival Demand Forecasting Service
 * Server-side processing for context-aware demand prediction
 * NO RAW DATA sent to LLM - only structured insights
 */

const fs = require('fs');
const path = require('path');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');

const festivalsCsvPath = path.join(__dirname, '../../smartkirana_festival_dataset_150.csv');

class FestivalForecastService {
  constructor() {
    this.festivalsData = [];
    this.loadFestivalData();
  }

  /**
   * Load and parse festival dataset (one-time on startup)
   */
  loadFestivalData() {
    try {
      if (fs.existsSync(festivalsCsvPath)) {
        const fileContent = fs.readFileSync(festivalsCsvPath, 'utf8');
        const results = [];
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',');

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = this.parseCSVLine(lines[i]);
          const obj = {};
          headers.forEach((header, index) => {
            obj[header.trim()] = values[index]?.trim();
          });
          results.push(obj);
        }

        // Map to structured data
        this.festivalsData = results.map(values => ({
          festival_name: values.festival_name,
          region: values.region,
          month: values.month,
          date_2026: values.date_2026,
          type: values.type,
          public_holiday: values.public_holiday,
          top_selling_items: values.top_selling_items ? values.top_selling_items.split(',').map(item => item.trim()) : [],
          demand_level: values.demand_level,
          estimated_demand_score: parseInt(values.estimated_demand_score || 0)
        }));

        // Remove duplicates
        const uniqueFestivals = new Map();
        this.festivalsData.forEach(festival => {
          const key = `${festival.festival_name}_${festival.month}`;
          if (!uniqueFestivals.has(key)) {
            uniqueFestivals.set(key, festival);
          }
        });
        this.festivalsData = Array.from(uniqueFestivals.values());
        console.log(`✅ Loaded ${this.festivalsData.length} festival records from CSV`);
      } else {
        console.error('❌ Festival CSV dataset not found at:', festivalsCsvPath);
      }
    } catch (error) {
      console.error('❌ Failed to load festival data:', error);
      this.festivalsData = [];
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Get month number from month string
   */
  getMonthNumber(monthStr) {
    if (!monthStr) return null;
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };

    // Handle ranges like "Oct-Nov" or "Aug-Sep"
    if (monthStr.includes('-')) {
      const [start] = monthStr.split('-');
      return monthMap[start.trim()] ?? null;
    }

    // Handle single month
    const month = monthStr.trim();
    return monthMap[month] ?? null;
  }

  /**
   * Find nearest upcoming festival
   */
  findUpcomingFestival() {
    if (!this.festivalsData || this.festivalsData.length === 0) {
        console.warn('⚠️ No festival data available to search');
        return { festival: null };
    }

    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    console.log(`🔍 Searching for upcoming festivals from: ${currentYear}-${currentMonth + 1}-${currentDay}`);

    let closestFestival = null;
    let minDistance = 13; // Max distance in months

    this.festivalsData.forEach(festival => {
      const festivalMonth = this.getMonthNumber(festival.month);
      if (festivalMonth === null) return;

      const festivalDayMatch = festival.date_2026.match(/\d+/);
      const festivalDay = festivalDayMatch ? parseInt(festivalDayMatch[0]) : 1;

      let distance;
      if (festivalMonth > currentMonth) {
        distance = festivalMonth - currentMonth;
      } else if (festivalMonth === currentMonth) {
        // Only count as current month if the date hasn't passed (using a 1-day buffer)
        if (festivalDay >= currentDay - 1) {
          distance = 0;
        } else {
          distance = 12; // Already passed this month, look at next year
        }
      } else {
        distance = 12 - (currentMonth - festivalMonth);
      }

      // Special case: if we are late in the month (>25th) and it's this month's festival
      if (distance === 0 && currentDay > 25 && festivalDay < currentDay) {
        distance = 12;
      }

      if (distance < minDistance) {
        minDistance = distance;
        closestFestival = festival;
      }
    });

    if (closestFestival) {
        console.log(`🎯 Closest festival found: ${closestFestival.festival_name} in ${minDistance} months`);
    } else {
        console.warn('⚠️ No upcoming festival found within 12 months');
    }

    return {
      festival: closestFestival,
      months_away: minDistance,
      is_imminent: minDistance <= 1
    };
  }

  /**
   * Calculate sales velocity for items (last 30-60 days)
   */
  async calculateSalesVelocity(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sales = await Sale.find({
        user_id: userId,
        createdAt: { $gte: startDate }
      });

      const itemVelocity = {};

      sales.forEach(sale => {
        sale.items.forEach(item => {
          const itemName = item.item_name.toLowerCase();
          if (!itemVelocity[itemName]) {
            itemVelocity[itemName] = {
              total_quantity: 0,
              total_revenue: 0,
              sales_count: 0
            };
          }
          itemVelocity[itemName].total_quantity += item.quantity;
          itemVelocity[itemName].total_revenue += item.quantity * item.price_per_unit;
          itemVelocity[itemName].sales_count += 1;
        });
      });

      // Calculate velocity score (sales per day)
      for (const item in itemVelocity) {
        const data = itemVelocity[item];
        data.velocity_score = data.total_quantity / days;
        data.avg_daily_sales = data.total_quantity / days;
      }

      return itemVelocity;
    } catch (error) {
      console.error('Sales velocity calculation error:', error);
      return {};
    }
  }

  /**
   * Generate confidence level based on signals
   */
  calculateConfidence(signals) {
    let score = 0;
    let maxScore = 0;

    // Festival proximity (0-40 points)
    maxScore += 40;
    if (signals.is_imminent) {
      score += 40;
    } else if (signals.months_away <= 2) {
      score += 30;
    } else if (signals.months_away <= 3) {
      score += 20;
    }

    // Sales velocity (0-30 points)
    maxScore += 30;
    if (signals.has_recent_sales) {
      if (signals.velocity_score > 1) {
        score += 30; // Selling more than 1 unit per day
      } else if (signals.velocity_score > 0.5) {
        score += 20;
      } else {
        score += 10;
      }
    }

    // Stock availability (0-20 points)
    maxScore += 20;
    if (signals.in_stock) {
      score += 20;
    } else {
      score += 5; // Still relevant even if out of stock
    }

    // Demand level (0-10 points)
    maxScore += 10;
    if (signals.demand_level === 'High') {
      score += 10;
    } else if (signals.demand_level === 'Medium') {
      score += 5;
    }

    const percentage = (score / maxScore) * 100;

    if (percentage >= 70) return 'High';
    if (percentage >= 40) return 'Medium';
    return 'Low';
  }

  /**
   * Main forecasting function
   */
  async getFestivalDemandForecast(userId) {
    try {
      const { festival, months_away, is_imminent } = this.findUpcomingFestival();

      if (!festival) {
        return {
          has_forecast: false,
          message: 'No upcoming festivals found in dataset'
        };
      }

      const inventory = await Inventory.find({ user_id: userId });
      const salesVelocity = await this.calculateSalesVelocity(userId, 30);
      const forecastItems = [];

      for (const festivalItem of festival.top_selling_items) {
        const festivalItemLower = festivalItem.toLowerCase();
        
        const inventoryItem = inventory.find(inv => {
          const invItemLower = inv.item_name.toLowerCase();
          if (invItemLower === festivalItemLower) return true;
          if (invItemLower.includes(festivalItemLower) || festivalItemLower.includes(invItemLower)) return true;
          const keywords = festivalItemLower.split(' ');
          return keywords.some(keyword => keyword.length > 3 && invItemLower.includes(keyword));
        });

        const itemNameLower = inventoryItem ? inventoryItem.item_name.toLowerCase() : festivalItemLower;
        const velocity = salesVelocity[itemNameLower] || { velocity_score: 0, sales_count: 0, total_quantity: 0 };

        const signals = {
          is_imminent,
          months_away,
          has_recent_sales: velocity.sales_count > 0,
          velocity_score: velocity.velocity_score,
          in_stock: inventoryItem ? inventoryItem.stock_qty > 0 : false,
          demand_level: festival.demand_level,
          in_inventory: !!inventoryItem
        };

        const confidence = this.calculateConfidence(signals);
        const reasons = [];
        if (is_imminent) reasons.push('Festival approaching soon');
        else if (months_away <= 2) reasons.push(`Festival in ${months_away} month(s)`);
        if (festival.demand_level === 'High') reasons.push('High seasonal demand');

        if (inventoryItem) {
          if (velocity.sales_count > 0) reasons.push(`Recent sales: ${velocity.total_quantity.toFixed(1)} units`);
          if (inventoryItem.stock_qty === 0) reasons.push('Currently out of stock');
          else if (inventoryItem.stock_qty < 10) reasons.push('Low stock');
        } else {
          reasons.push('Not in inventory - consider adding');
        }

        let action;
        if (!inventoryItem) action = 'Add to inventory';
        else if (inventoryItem.stock_qty === 0) action = 'Restock urgently';
        else if (inventoryItem.stock_qty < 10) action = 'Restock recommended';
        else action = 'Monitor stock';

        forecastItems.push({
          item_name: inventoryItem ? inventoryItem.item_name : festivalItem,
          current_stock: inventoryItem ? inventoryItem.stock_qty : 0,
          recent_sales_velocity: velocity.velocity_score.toFixed(2),
          confidence: confidence,
          reasoning: reasons.join(' • '),
          action: action,
          in_inventory: !!inventoryItem
        });
      }

      const confidenceOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      forecastItems.sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence]);

      return {
        has_forecast: true,
        festival_name: festival.festival_name,
        festival_type: festival.type,
        months_away: months_away,
        is_imminent: is_imminent,
        demand_level: festival.demand_level,
        forecast_items: forecastItems.slice(0, 10),
        total_matched_items: forecastItems.length,
        summary: {
          high_confidence: forecastItems.filter(i => i.confidence === 'High').length,
          medium_confidence: forecastItems.filter(i => i.confidence === 'Medium').length,
          low_confidence: forecastItems.filter(i => i.confidence === 'Low').length
        }
      };
    } catch (error) {
      console.error('Festival forecast error:', error);
      return { has_forecast: false, error: error.message };
    }
  }
}

module.exports = new FestivalForecastService();
