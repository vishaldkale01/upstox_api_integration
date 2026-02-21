const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  trade_id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  symbol: { type: String, required: true },
  trade_type: { type: String, required: true, enum: ['CALL', 'PUT'] },
  mode: { type: String, required: true, enum: ['PAPER', 'LIVE'], default: 'PAPER' },
  status: { 
      type: String, 
      required: true, 
      enum: ['SUBMITTED', 'OPEN', 'PARTIAL', 'CLOSED', 'CANCELLED', 'REJECTED'],
      index: true
  },
  quantity: { type: Number, required: true },
  
  entry: {
    order_id: { type: String },
    price: { type: Number },
    time: { type: Date },
    signal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Signal' }
  },
  
  exit: {
    order_id: { type: String },
    price: { type: Number },
    time: { type: Date },
    reason: { type: String, enum: ['SL_HIT', 'TARGET_HIT', 'RISK_LIMIT', 'MANUAL', 'SQ_OFF'] }
  },
  
  risk_params: {
    initial_sl: { type: Number },
    trailing_sl: { type: Number },
    target: { type: Number }
  },
  
  pnl: {
    absolute: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    brokerage_est: { type: Number, default: 0 },
    net_pnl: { type: Number, default: 0 }
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Compound index for user history queries
tradeSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('Trade', tradeSchema);
