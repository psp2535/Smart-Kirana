const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  stock_qty: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'litre', 'piece'],
    default: 'piece'
  },
  cost_price: {
    type: Number,
    required: true,
    min: 0
  },
  selling_price: {
    type: Number,
    required: true,
    min: 0
  },
  min_stock_level: {
    type: Number,
    min: 0,
    default: 5
  },
  category: {
    type: String,
    enum: [
      'Electronics',
      'Clothing',
      'Food & Beverages',
      'Books',
      'Home & Garden',
      'Sports',
      'Beauty & Health',
      'Automotive',
      'Office Supplies',
      'Other'
    ],
    default: 'Other'
  },
  description: {
    type: String,
    maxlength: 255
  }
}, {
  timestamps: true
});

// Compound index for user_id and item_name
inventorySchema.index({ user_id: 1, item_name: 1 }, { unique: true });

// Virtual for profit margin
inventorySchema.virtual('profitMargin').get(function() {
  if (this.cost_price === 0) return 0;
  return ((this.selling_price - this.cost_price) / this.cost_price * 100).toFixed(2);
});

// Virtual for low stock check
inventorySchema.virtual('isLowStock').get(function() {
  return this.stock_qty <= this.min_stock_level;
});

module.exports = mongoose.model('Inventory', inventorySchema);
