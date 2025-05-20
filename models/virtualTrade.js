const mongoose = require('mongoose');

const virtualTradeSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true
    },
    tradeType: {
        type: String,
        enum: ['CALL', 'PUT'],
        required: true
    },
    entryPrice: {
        type: Number,
        required: true
    },
    targetPrice: Number,
    stopLoss: Number,
    quantity: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['OPEN', 'CLOSED', 'STOPPED'],
        default: 'OPEN'
    },
    entryTime: {
        type: Date,
        default: Date.now
    },
    exitTime: Date,
    exitPrice: Number,
    pnl: Number,
    signals: {
        ema: String,
        sma: String,
        macd: String,
        rsi: Number,
        overallTrend: String
    },
    thirtyMinData: [{
        timestamp: Date,
        open: Number,
        high: Number,
        low: Number,
        close: Number,
        volume: Number
    }]
});

module.exports = mongoose.model('VirtualTrade', virtualTradeSchema);
