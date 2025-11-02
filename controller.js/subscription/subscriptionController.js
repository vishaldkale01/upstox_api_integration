const Subscription = require('../../models/subscription');
const { sendSuccess, sendError } = require('../../helper/responce');

// Middleware to check subscription status
const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'] || req.body.userId || 'default-user';
    
    let subscription = await Subscription.findOne({ userId });
    
    // Create free subscription if user doesn't exist
    if (!subscription) {
      subscription = new Subscription({ userId });
      await subscription.save();
    }
    
    // Add subscription info to request
    req.subscription = subscription;
    req.userFeatures = subscription.getAvailableFeatures();
    
    next();
  } catch (error) {
    sendError(res, 'checkSubscription', 'Failed to validate subscription status', error.stack);
  }
};

// Middleware to check if feature is available in current subscription
const requireFeature = (featureName) => {
  return (req, res, next) => {
    if (!req.userFeatures || !req.userFeatures[featureName]) {
      return res.status(403).json({
        status: 'error',
        message: `This feature requires a premium subscription. Your current plan does not include '${featureName}'. Please upgrade your subscription to access this feature.`,
        currentPlan: req.subscription ? req.subscription.planType : 'free',
        upgradeUrl: '/subscription/upgrade'
      });
    }
    next();
  };
};

// Middleware to check order limits
const checkOrderLimit = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'] || req.body.userId || 'default-user';
    const subscription = req.subscription;
    
    if (!subscription) {
      return sendError(res, 'checkOrderLimit', 'Subscription not found', '', 403);
    }
    
    const orderLimit = subscription.getAvailableFeatures().orderLimit;
    
    // Here you would typically count today's orders from database
    // For now, we'll simulate this check
    const todayOrderCount = 0; // This should be fetched from orders collection
    
    if (todayOrderCount >= orderLimit) {
      return res.status(403).json({
        status: 'error',
        message: `Daily order limit exceeded. Your ${subscription.planType} plan allows ${orderLimit} orders per day. Please upgrade your subscription for higher limits.`,
        currentPlan: subscription.planType,
        ordersUsed: todayOrderCount,
        orderLimit: orderLimit,
        upgradeUrl: '/subscription/upgrade'
      });
    }
    
    next();
  } catch (error) {
    sendError(res, 'checkOrderLimit', 'Failed to check order limits', error.stack);
  }
};

// Get current subscription details
const getSubscription = async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.query.userId || 'default-user';
    
    let subscription = await Subscription.findOne({ userId });
    
    if (!subscription) {
      subscription = new Subscription({ userId });
      await subscription.save();
    }
    
    const subscriptionData = {
      userId: subscription.userId,
      planType: subscription.planType,
      isActive: subscription.isSubscriptionActive(),
      features: subscription.getAvailableFeatures(),
      startDate: subscription.startDate,
      endDate: subscription.endDate
    };
    
    sendSuccess(res, subscriptionData);
  } catch (error) {
    sendError(res, 'getSubscription', 'Failed to get subscription details', error.stack);
  }
};

// Upgrade subscription
const upgradeSubscription = async (req, res) => {
  try {
    const { userId, planType, paymentDetails } = req.body;
    
    if (!userId || !planType) {
      return sendError(res, 'upgradeSubscription', 'User ID and plan type are required', '', 400);
    }
    
    // Check if user already has an active subscription of the same or higher tier
    let subscription = await Subscription.findOne({ userId });
    
    if (subscription && subscription.isSubscriptionActive()) {
      const planHierarchy = { 'free': 0, 'basic': 1, 'premium': 2, 'pro': 3 };
      const currentLevel = planHierarchy[subscription.planType] || 0;
      const requestedLevel = planHierarchy[planType] || 0;
      
      if (currentLevel >= requestedLevel) {
        return res.status(400).json({
          status: 'error',
          message: `Could not upgrade subscription: user already has an active ${subscription.planType} subscription which is equal or higher than the requested ${planType} plan.`,
          currentPlan: subscription.planType,
          requestedPlan: planType,
          suggestion: currentLevel > requestedLevel ? 
            'You already have a higher tier subscription.' : 
            'You already have this subscription plan active.'
        });
      }
    }
    
    // Create or update subscription
    if (!subscription) {
      subscription = new Subscription({ userId });
    }
    
    // Set plan features based on type
    const planFeatures = {
      free: { realTimeData: false, advancedAnalytics: false, paperTrading: true, orderLimit: 5 },
      basic: { realTimeData: true, advancedAnalytics: false, paperTrading: true, orderLimit: 25 },
      premium: { realTimeData: true, advancedAnalytics: true, paperTrading: true, orderLimit: 100 },
      pro: { realTimeData: true, advancedAnalytics: true, paperTrading: true, orderLimit: 500 }
    };
    
    subscription.planType = planType;
    subscription.isActive = true;
    subscription.startDate = new Date();
    subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    subscription.features = planFeatures[planType] || planFeatures.free;
    
    // Add payment record
    if (paymentDetails) {
      subscription.paymentHistory.push({
        transactionId: paymentDetails.transactionId || `txn_${Date.now()}`,
        amount: paymentDetails.amount || 0,
        currency: paymentDetails.currency || 'INR',
        date: new Date(),
        status: 'completed'
      });
    }
    
    await subscription.save();
    
    sendSuccess(res, {
      message: `Successfully upgraded to ${planType} plan`,
      subscription: {
        planType: subscription.planType,
        isActive: subscription.isActive,
        features: subscription.features,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    sendError(res, 'upgradeSubscription', 'Failed to upgrade subscription', error.stack);
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.body.userId;
    
    if (!userId) {
      return sendError(res, 'cancelSubscription', 'User ID is required', '', 400);
    }
    
    const subscription = await Subscription.findOne({ userId });
    
    if (!subscription || !subscription.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'No active subscription found to cancel',
        currentPlan: subscription ? subscription.planType : 'none'
      });
    }
    
    subscription.isActive = false;
    subscription.endDate = new Date(); // End subscription immediately
    await subscription.save();
    
    sendSuccess(res, {
      message: 'Subscription cancelled successfully',
      subscription: {
        planType: subscription.planType,
        isActive: subscription.isActive,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    sendError(res, 'cancelSubscription', 'Failed to cancel subscription', error.stack);
  }
};

module.exports = {
  checkSubscription,
  requireFeature,
  checkOrderLimit,
  getSubscription,
  upgradeSubscription,
  cancelSubscription
};