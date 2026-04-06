const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const { validationResult } = require('express-validator');

/**
 * Customers Controller - Customer Management with CRUD Operations
 * Handles customer database management and analytics
 * Future: Integration with WhatsApp for customer communication and loyalty programs
 */

const customersController = {
  // Get all customers for authenticated user
  getAllCustomers: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, search } = req.query;
      
      // Build filter object
      const filter = { user_id: userId };
      
      if (search) {
        filter.$or = [
          { name: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') }
        ];
      }

      const customers = await Customer.find(filter)
        .sort({ name: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user_id', 'name shop_name');

      const total = await Customer.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Customers retrieved successfully',
        data: customers,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customers',
        error: error.message
      });
    }
  },

  // Get customer by ID
  getCustomerById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const customer = await Customer.findOne({ _id: id, user_id: userId })
        .populate('user_id', 'name shop_name');

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
          error: 'Customer does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Customer retrieved successfully',
        data: customer
      });
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customer',
        error: error.message
      });
    }
  },

  // Create new customer
  createCustomer: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user._id;
      const { name, phone, credit_balance } = req.body;

      // Check if customer already exists for this user
      const existingCustomer = await Customer.findOne({ 
        user_id: userId, 
        phone 
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Customer already exists',
          error: 'A customer with this phone number already exists'
        });
      }

      // Create new customer
      const customer = new Customer({
        user_id: userId,
        name,
        phone,
        credit_balance: credit_balance || 0
      });

      await customer.save();
      await customer.populate('user_id', 'name shop_name');

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating customer',
        error: error.message
      });
    }
  },

  // Update customer
  updateCustomer: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user._id;
      const { name, phone, credit_balance } = req.body;

      const customer = await Customer.findOneAndUpdate(
        { _id: id, user_id: userId },
        { name, phone, credit_balance },
        { new: true, runValidators: true }
      ).populate('user_id', 'name shop_name');

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
          error: 'Customer does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: customer
      });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating customer',
        error: error.message
      });
    }
  },

  // Delete customer
  deleteCustomer: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const customer = await Customer.findOneAndDelete({ _id: id, user_id: userId });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
          error: 'Customer does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully',
        data: { deletedCustomerId: id }
      });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting customer',
        error: error.message
      });
    }
  },

  // Get customer analytics
  getCustomerAnalytics: async (req, res) => {
    try {
      const userId = req.user._id;
      const { start_date, end_date } = req.query;

      // Build date filter for sales
      const dateFilter = { user_id: userId };
      if (start_date || end_date) {
        dateFilter.date = {};
        if (start_date) dateFilter.date.$gte = new Date(start_date);
        if (end_date) dateFilter.date.$lte = new Date(end_date);
      }

      // Get total customers
      const totalCustomers = await Customer.countDocuments({ user_id: userId });

      // Get new customers in period
      const newCustomersFilter = { user_id: userId };
      if (start_date) {
        newCustomersFilter.createdAt = { $gte: new Date(start_date) };
      }
      const newCustomers = await Customer.countDocuments(newCustomersFilter);

      // Get customers with credit balance
      const customersWithCredit = await Customer.countDocuments({
        user_id: userId,
        credit_balance: { $gt: 0 }
      });

      // Get top customers by total sales (if we had customer tracking in sales)
      const topCustomers = await Customer.find({ user_id: userId })
        .sort({ credit_balance: -1 })
        .limit(5)
        .select('name phone credit_balance');

      res.status(200).json({
        success: true,
        message: 'Customer analytics retrieved successfully',
        data: {
          totalCustomers,
          newCustomers,
          customersWithCredit,
          topCustomers,
          period: { start_date, end_date }
        }
      });
    } catch (error) {
      console.error('Customer analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customer analytics',
        error: error.message
      });
    }
  },

  // Get rich AI insights for a specific customer by phone
  getCustomerInsights: async (req, res) => {
    try {
      const userId = req.user._id;
      const { phone } = req.query;

      if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }

      // 1. Fetch all sales for this customer phone
      const sales = await Sale.find({ user_id: userId, customer_phone: phone }).sort({ date: -1 });

      const insights = {
        name: sales.length > 0 ? (sales[0].customer_name || 'Walk-in Customer') : 'New Customer',
        phone: phone,
        last_visit_date: sales.length > 0 ? sales[0].date : null,
        total_spend: 0,
        memory_score: 0,
        bought_often: [],
        due_for_refill: [],
        try_this: [],
        combos: []
      };

      if (sales.length === 0) {
        return res.status(200).json({ success: true, data: insights });
      }

      // Aggregate data
      let totalSpend = 0;
      const itemFrequencies = {}; // { "Item Name": { count: 3, qty: 5, lastBought: Date, firstBought: Date } }

      sales.forEach(sale => {
        totalSpend += (sale.total_amount || 0);

        sale.items.forEach(item => {
          if (!itemFrequencies[item.item_name]) {
             itemFrequencies[item.item_name] = { 
               count: 0, 
               qty: 0, 
               lastBought: sale.date, 
               firstBought: sale.date 
             };
          }
          itemFrequencies[item.item_name].count += 1;
          itemFrequencies[item.item_name].qty += item.quantity;
          
          if (new Date(sale.date) > new Date(itemFrequencies[item.item_name].lastBought)) {
             itemFrequencies[item.item_name].lastBought = sale.date;
          }
          if (new Date(sale.date) < new Date(itemFrequencies[item.item_name].firstBought)) {
             itemFrequencies[item.item_name].firstBought = sale.date;
          }
        });
      });

      insights.total_spend = totalSpend;

      // 2. Memory Score
      // Heuristic: Max 100. Based on total sales count + unique items variety
      const uniqueItemsCount = Object.keys(itemFrequencies).length;
      let rawScore = (sales.length * 5) + (uniqueItemsCount * 3) + (totalSpend > 5000 ? 20 : totalSpend > 1000 ? 10 : 0);
      insights.memory_score = Math.min(100, Math.round(rawScore));

      // Fetch active inventory for price attachment and availability
      const inventory = await Inventory.find({ user_id: userId, stock_qty: { $gt: 0 } });
      const inventoryMap = {};
      inventory.forEach(inv => inventoryMap[inv.item_name] = inv);

      // 3. Bought Often
      const sortedFreqs = Object.entries(itemFrequencies)
        .filter(([name, data]) => inventoryMap[name]) // Ensure it's in stock
        .sort((a, b) => b[1].count - a[1].count);

      insights.bought_often = sortedFreqs.slice(0, 5).map(([name, data]) => ({
        item_name: name,
        price: inventoryMap[name].selling_price || inventoryMap[name].price_per_unit || 0,
        frequency: data.count
      }));

      // 4. Due for refill
      const now = new Date();
      Object.entries(itemFrequencies).forEach(([name, data]) => {
        const invItem = inventoryMap[name];
        if (!invItem) return;

        const daysSinceLastBought = (now - new Date(data.lastBought)) / (1000 * 60 * 60 * 24);

        // Fallback hierarchy: Calculate personal velocity first, then fall back to static lifecycle
        let effectiveCycleDays = null;
        let isUsingPersonalVelocity = false;

        // 1. Try to establish personal velocity if they've bought it multiple times
        if (data.count > 1) {
           const daysBetweenFirstAndLast = (new Date(data.lastBought) - new Date(data.firstBought)) / (1000 * 60 * 60 * 24);
           const avgDaysBetweenBuys = daysBetweenFirstAndLast / (data.count - 1);
           
           // Ensure it's a meaningful gap, not just two purchases on the same exact day
           if (avgDaysBetweenBuys > 0.5) {
               effectiveCycleDays = avgDaysBetweenBuys;
               isUsingPersonalVelocity = true;
           }
        }

        // 2. If no personal velocity exists, fall back to global expected cycle
        if (!isUsingPersonalVelocity && invItem.expected_usage_days && invItem.expected_usage_days > 0) {
            effectiveCycleDays = invItem.expected_usage_days;
        }

        // 3. Trigger Recommendation if passed 80% of the effective cycle
        if (effectiveCycleDays !== null && effectiveCycleDays > 0) {
           if (daysSinceLastBought >= effectiveCycleDays * 0.8) {
             insights.due_for_refill.push({
               item_name: name,
               price: invItem.selling_price || invItem.price_per_unit || 0,
               days_overdue: Math.round(daysSinceLastBought - effectiveCycleDays),
               cycle_type: isUsingPersonalVelocity ? 'personal' : 'global'
             });
           }
        }
      });
      insights.due_for_refill = insights.due_for_refill.sort((a, b) => b.days_overdue - a.days_overdue).slice(0, 3);

      // 5. Try This (Category-Aware Upsells)
      const boughtNames = new Set(Object.keys(itemFrequencies));
      
      // Calculate favorite categories based on past purchases
      const categoryFreqs = {};
      Object.entries(itemFrequencies).forEach(([name, data]) => {
          if (inventoryMap[name] && inventoryMap[name].category) {
              const cat = inventoryMap[name].category;
              categoryFreqs[cat] = (categoryFreqs[cat] || 0) + data.count;
          }
      });
      // Sort favorite categories descending
      const topCategories = Object.entries(categoryFreqs)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0]);

      let notBought = inventory.filter(inv => !boughtNames.has(inv.item_name));
      
      // If customer has a strong favorite category, prioritize upsells there
      if (topCategories.length > 0) {
          const favoriteCat = topCategories[0];
          const matchedCategoryItems = notBought.filter(inv => inv.category === favoriteCat);
          
          if (matchedCategoryItems.length >= 3) {
             notBought = matchedCategoryItems;
          } else if (matchedCategoryItems.length > 0 && topCategories.length > 1) {
             // Fallback to top 2 categories
             const topTwoCats = new Set([topCategories[0], topCategories[1]]);
             notBought = notBought.filter(inv => topTwoCats.has(inv.category));
          }
      }

      // Recommend premium items (higher price) within their preferred sphere
      insights.try_this = notBought
        .sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0))
        .slice(0, 3)
        .map(inv => ({
          item_name: inv.item_name,
          price: inv.selling_price || inv.price_per_unit || 0,
          reason: topCategories.length > 0 && inv.category === topCategories[0] ? `Top pick in ${inv.category}` : 'Premium Quality'
        }));

      // 6. Combos (Multi-Seed Market Basket Analysis)
      if (insights.bought_often.length > 0) {
        // Extract up to top 3 usual items to use as basket seeds
        const seedItems = insights.bought_often.slice(0, 3).map(i => i.item_name);
        
        // Find recent global sales containing ANY of these top seeds
        const comboSales = await Sale.find({ 
          user_id: userId, 
          'items.item_name': { $in: seedItems }
        }).sort({ date: -1 }).limit(100);
        
        const comboFreqs = {}; // { 'Sugar': { count: 5, bought_with: 'Tea' } }
        
        comboSales.forEach(s => {
          // Identify which seed item(s) triggered this basket
          const basketSeeds = s.items.map(i => i.item_name).filter(name => seedItems.includes(name));
          if (basketSeeds.length === 0) return;
          const drivingSeed = basketSeeds[0]; // pick the strongest association in basket

          s.items.forEach(i => {
            // Count items that are NOT seeds and NOT already bought by this user
            if (!seedItems.includes(i.item_name) && inventoryMap[i.item_name] && !boughtNames.has(i.item_name)) {
               if (!comboFreqs[i.item_name]) {
                   comboFreqs[i.item_name] = { count: 0, bought_with: drivingSeed };
               }
               comboFreqs[i.item_name].count += 1;
            }
          });
        });
        
        insights.combos = Object.entries(comboFreqs)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3)
          .map(([name, data]) => ({
             item_name: name,
             price: inventoryMap[name].selling_price || inventoryMap[name].price_per_unit || 0,
             bought_with: data.bought_with
          }));
      }

      res.status(200).json({
        success: true,
        message: 'Insights retrieved successfully',
        data: insights
      });

    } catch (error) {
      console.error('Customer insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customer insights',
        error: error.message
      });
    }
  }
};

module.exports = customersController;
