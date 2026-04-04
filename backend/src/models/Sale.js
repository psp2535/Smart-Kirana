const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    item_name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    price_per_unit: {
      type: Number,
      required: true,
      min: 0
    },
    cost_price: {
      type: Number,
      default: 0
    },
    unit: {
      type: String,
      default: 'piece'
    }
  }],
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  payment_method: {
    type: String,
    enum: ['Cash', 'UPI', 'Credit', 'Card'],
    default: 'Cash'
  },
  customer_name: {
    type: String,
    trim: true
  },
  customer_phone: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for user and date queries
saleSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
