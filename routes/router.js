// upstoxRoutes.js
const express = require('express');
const router = express.Router();
const { getLoginUrl, handleCallback } = require('../controller.js/Login/Auth/LoginAuth');
const { getUserProfile, getUserProfileFundAndMargine } = require('../controller.js/user/user');
const getBrokerage = require('../controller.js/Charge/charges');
const { HistoryCandleData, getIntraDayCandleData } = require('../controller.js/History/history');
const marginDetails = require('../controller.js/MargineDetails/Margine');
const { placeOrder, getOrderBook, getOrderHistory, modifyOrder, historicalTrades } = require('../controller.js/Order/order');
const { getHolding } = require('../controller.js/portfollio/portfollio');
const { 
  checkSubscription, 
  requireFeature, 
  checkOrderLimit, 
  getSubscription, 
  upgradeSubscription, 
  cancelSubscription 
} = require('../controller.js/subscription/subscriptionController');

// Authentication routes (no subscription required)
router.get('/login', getLoginUrl);
router.get('/callback', handleCallback);

// Subscription management routes
router.get('/subscription/status', getSubscription);
router.post('/subscription/upgrade', upgradeSubscription);
router.post('/subscription/cancel', cancelSubscription);

// Apply subscription middleware to protected routes
router.use(checkSubscription);

// User routes (basic subscription features)
router.get('/user/profile', getUserProfile);
router.get('/user/get-funds-and-margin', getUserProfileFundAndMargine);

// Market data routes (require real-time data feature for live data)
router.get('/charges/brokerage', getBrokerage);
router.get('/historical-candle/:instrumentKey/:interval/:to_date/:from_date', HistoryCandleData);
router.get('/historical-candle/intraday/:instrumentKey/:interval', requireFeature('realTimeData'), getIntraDayCandleData);

// Trading routes (require order limits check)
router.post('/margie', marginDetails);
router.post('/order/place', checkOrderLimit, placeOrder);
router.get('/order/retrieve-all', getOrderBook);
router.put('/order/modify', modifyOrder);

// Portfolio routes
router.get('/portfolio/long-term-holdings', getHolding);

// Advanced analytics routes (require premium features)
router.get('/order/trades/get-trades-for-day', requireFeature('advancedAnalytics'), historicalTrades);

module.exports = router;
