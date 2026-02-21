const mongoose = require('mongoose');

const dailyMetricsSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  
  total_trades: { type: Number, default: 0 },
  winning_trades: { type: Number, default: 0 },
  losing_trades: { type: Number, default: 0 },
  win_rate: { type: Number, default: 0 },
  
  gross_pnl: { type: Number, default: 0 },
  net_pnl: { type: Number, default: 0 },
  
  max_drawdown: { type: Number, default: 0 },
  largest_win: { type: Number, default: 0 },
  largest_loss: { type: Number, default: 0 },
  
  starting_capital: { type: Number, default: 0 },
  ending_capital: { type: Number, default: 0 },
  
  tags: [{ type: String }]
}, {
  timestamps: true
});

// Unique compound index per user per day
dailyMetricsSchema.index({ user_id: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('DailyMetric', dailyMetricsSchema);
