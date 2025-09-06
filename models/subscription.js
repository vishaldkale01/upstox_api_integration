const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  planType: {
    type: String,
    enum: ['free', 'basic', 'premium', 'pro'],
    default: 'free'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  features: {
    realTimeData: {
      type: Boolean,
      default: false
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    paperTrading: {
      type: Boolean,
      default: true // Always available
    },
    orderLimit: {
      type: Number,
      default: 5 // Free tier limit
    }
  },
  paymentHistory: [{
    transactionId: String,
    amount: Number,
    currency: String,
    date: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  }]
}, {
  timestamps: true
});

// Method to check if subscription is active and not expired
subscriptionSchema.methods.isSubscriptionActive = function() {
  if (!this.isActive) return false;
  if (!this.endDate) return true; // Lifetime subscription
  return new Date() <= this.endDate;
};

// Method to get available features based on subscription
subscriptionSchema.methods.getAvailableFeatures = function() {
  const isActive = this.isSubscriptionActive();
  
  if (!isActive || this.planType === 'free') {
    return {
      realTimeData: false,
      advancedAnalytics: false,
      paperTrading: true,
      orderLimit: 5
    };
  }
  
  return this.features;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);