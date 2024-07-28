// upstoxRoutes.js
const express = require('express');
const router = express.Router();
const upstoxController = require('../controller.js/upstoxController');

router.get('/login', upstoxController.getLoginUrl);
router.get('/callback', upstoxController.handleCallback);
router.get('/user', upstoxController.getUserProfile);
router.get('/fund', upstoxController.getUserFunds);
router.get('/place', upstoxController.placeOrder);
router.get('/candle', upstoxController.getCandleData);
router.post("/getFullMarketQuote" , upstoxController.getFullMarketQuote);
router.post("/getMarketQuoteOHLC" , upstoxController.getMarketQuoteOHLC);
router.post("/ltp" , upstoxController.ltp);
router.post("/putCall" , upstoxController.putCall);

module.exports = router;
