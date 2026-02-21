const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  instrument_key: { type: String, required: true },
  timestamp: { type: Date, required: true, index: -1 },
  strategy: { type: String, required: true },
  direction: { type: String, required: true, enum: ['BUY_CALL', 'BUY_PUT'] },
  confidence_score: { type: Number, required: true },
  status: { 
      type: String, 
      required: true, 
      enum: ['EXECUTED', 'REJECTED_RISK', 'REJECTED_AI', 'IGNORED'] 
  },
  rejection_reason: { type: String },
  
  technical_context: {
    price: { type: Number },
    vwap: { type: Number },
    ema9: { type: Number },
    ema21: { type: Number },
    rsi: { type: Number },
    adx: { type: Number },
    pcr: { type: Number }
  },
  
  ai_validation: {
    requested: { type: Boolean, default: false },
    verdict: { type: String, enum: ['GO', 'NO_GO', 'ERROR'] },
    reason: { type: String },
    latency_ms: { type: Number }
  }
}, { 
  timestamps: true 
});

signalSchema.index({ user_id: 1, strategy: 1 });

module.exports = mongoose.model('Signal', signalSchema);
