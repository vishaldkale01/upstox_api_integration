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


router.get('/login', getLoginUrl);
router.get('/callback', handleCallback);
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
