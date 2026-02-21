const mongoose = require('mongoose');

const marketSnapshotSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  timestamp: { type: Date, required: true },
  spot_price: { type: Number, required: true },
  
  option_chain_summary: {
    pcr: { type: Number },
    total_ce_oi: { type: Number },
    total_pe_oi: { type: Number },
    atm_iv: { type: Number }
  },
  
  cpr: {
    tc: { type: Number },
    pivot: { type: Number },
    bc: { type: Number }
  }
}, {
  timestamps: true
});

marketSnapshotSchema.index({ symbol: 1, timestamp: -1 });

module.exports = mongoose.model('MarketSnapshot', marketSnapshotSchema);
