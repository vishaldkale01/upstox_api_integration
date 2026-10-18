// upstoxRoutes.js
const express = require('express');
const router = express.Router();
const { getLoginUrl, handleCallback } = require('../controllers/Login/Auth/LoginAuth');
const { getUserProfile, getUserProfileFundAndMargine } = require('../controllers/user/user');
const getBrokerage = require('../controllers/Charge/charges');
const { HistoryCandleData, getIntraDayCandleData } = require('../controllers/History/history');
const marginDetails = require('../controllers/MargineDetails/Margine');
const { placeOrder, getOrderBook, getOrderHistory, modifyOrder, historicalTrades } = require('../controllers/Order/order');
const { getHolding } = require('../controllers/portfollio/portfollio');
const { startTrading, stopTrading, getSessionStatus, getControlPanelConfig, getTradingDashboard } = require('../controllers/trading/trading-with-python-backend');
const { getPaperTrades, getPaperSessions, getPaperSignals, getPaperSignal, getPaperAnalytics } = require('../controllers/trading/paper-history');


router.get('/login', getLoginUrl);
router.get('/callback', handleCallback);
router.get('/trading-dashboard', getTradingDashboard);
router.post('/start-trading', startTrading);
router.post('/stop-trading', stopTrading);
router.get('/trading-status', getSessionStatus);
router.get('/trading-status/:user_id', getSessionStatus);
router.get('/control-panel/config', getControlPanelConfig);
router.get('/user-sessions', getPaperSessions);
router.get('/paper-sessions', getPaperSessions);
router.get('/paper-trades', getPaperTrades);
router.get('/paper-signals', getPaperSignals);
router.get('/paper-signals/:signal_id', getPaperSignal);
router.get('/paper-analytics', getPaperAnalytics);
router.get('/api/analytics', getPaperAnalytics);
router.get('/user/profile', getUserProfile);
router.get('/user/get-funds-and-margin', getUserProfileFundAndMargine);
router.get('/charges/brokerage', getBrokerage);
router.get('/historical-candle/:instrumentKey/:interval/:to_date/:from_date', HistoryCandleData);
router.get('/historical-candle/intraday/:instrumentKey/:interval', getIntraDayCandleData);
router.post('/margie', marginDetails);
router.post('/order/place', placeOrder);
router.get('/order/retrieve-all', getOrderBook);
// portfolio
router.get('/portfolio/long-term-holdings', getHolding);
router.put('/order/modify', modifyOrder);
// trades
router.get('/order/trades/get-trades-for-day', historicalTrades);


module.exports = router;
