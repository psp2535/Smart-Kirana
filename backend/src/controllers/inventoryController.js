const Inventory = require('../models/Inventory');

// Get all inventory items for user
const getInventory = async (req, res) => {
  try {
    const items = await Inventory.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: { items, count: items.length }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch inventory', 
      error: error.message 
    });
  }
};

// Add new inventory item
const addItem = async (req, res) => {
  try {
    const { item_name, stock_qty, unit, cost_price, selling_price, min_stock_level, category, description } = req.body;

    // Check if item already exists
    const existingItem = await Inventory.findOne({ 
      user_id: req.user._id, 
      item_name: item_name.trim() 
    });

    if (existingItem) {
      return res.status(400).json({ 
        success: false, 
        message: 'Item already exists in inventory' 
      });
    }

    const item = await Inventory.create({
      user_id: req.user._id,
      item_name,
      stock_qty,
      unit,
      cost_price,
      selling_price,
      min_stock_level,
      category,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Item added successfully',
      data: { item }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add item', 
      error: error.message 
    });
  }
};

// Update inventory item
const updateItem = async (req, res) => {
  try {
    const item = await Inventory.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found' 
      });
    }

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: { item }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update item', 
      error: error.message 
    });
  }
};

// Delete inventory item
const deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findOneAndDelete({ 
      _id: req.params.id, 
      user_id: req.user._id 
    });

    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found' 
      });
    }

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete item', 
      error: error.message 
    });
  }
};

// Get low stock items
const getLowStock = async (req, res) => {
  try {
    const items = await Inventory.find({ user_id: req.user._id });
    const lowStockItems = items.filter(item => item.stock_qty <= item.min_stock_level);
    
    res.json({
      success: true,
      data: { items: lowStockItems, count: lowStockItems.length }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch low stock items', 
      error: error.message 
    });
  }
};

module.exports = { getInventory, addItem, updateItem, deleteItem, getLowStock };
