const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');

// Get all sales
const getSales = async (req, res) => {
  try {
    const sales = await Sale.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: { sales, count: sales.length }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch sales', 
      error: error.message 
    });
  }
};

// Create new sale
const createSale = async (req, res) => {
  try {
    const { items, total_amount, payment_method, customer_name, customer_phone } = req.body;

    // Validate stock availability
    for (const item of items) {
      const inventoryItem = await Inventory.findOne({ 
        user_id: req.user._id, 
        item_name: item.item_name 
      });

      if (!inventoryItem) {
        return res.status(400).json({ 
          success: false, 
          message: `Item "${item.item_name}" not found in inventory` 
        });
      }

      if (inventoryItem.stock_qty < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for "${item.item_name}". Available: ${inventoryItem.stock_qty}` 
        });
      }
    }

    // Create sale
    const sale = await Sale.create({
      user_id: req.user._id,
      items,
      total_amount,
      payment_method,
      customer_name,
      customer_phone
    });

    // Update inventory
    for (const item of items) {
      await Inventory.findOneAndUpdate(
        { user_id: req.user._id, item_name: item.item_name },
        { $inc: { stock_qty: -item.quantity } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: { sale }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create sale', 
      error: error.message 
    });
  }
};

// Get today's sales summary
const getTodaySales = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sales = await Sale.find({
      user_id: req.user._id,
      createdAt: { $gte: today }
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalTransactions = sales.length;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalTransactions,
        sales
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch today\'s sales', 
      error: error.message 
    });
  }
};

// Delete sale
const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findOneAndDelete({ 
      _id: req.params.id, 
      user_id: req.user._id 
    });

    if (!sale) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sale not found' 
      });
    }

    // Restore inventory
    for (const item of sale.items) {
      await Inventory.findOneAndUpdate(
        { user_id: req.user._id, item_name: item.item_name },
        { $inc: { stock_qty: item.quantity } }
      );
    }

    res.json({
      success: true,
      message: 'Sale deleted and inventory restored'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete sale', 
      error: error.message 
    });
  }
};

module.exports = { getSales, createSale, getTodaySales, deleteSale };
