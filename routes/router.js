// upstoxRoutes.js
const express = require('express');
const router = express.Router();
const { getLoginUrl, handleCallback } = require('../controller.js/Login/Auth/LoginAuth');
const { getUserProfile, getUserProfileFundAndMargine } = require('../controller.js/user/user');
const getBrokerage = require('../controller.js/Charge/charges');


router.get('/login', getLoginUrl);
router.get('/callback', handleCallback);
router.get('/user/profile', getUserProfile);
router.get('/user/get-funds-and-margin', getUserProfileFundAndMargine);
router.get('/charges/brokerage', getBrokerage);
// router.get('/place', upstoxController.placeOrder);
// router.get('/candle', upstoxController.getCandleData);
// router.post("/getFullMarketQuote" , upstoxController.getFullMarketQuote);
// router.post("/getMarketQuoteOHLC" , upstoxController.getMarketQuoteOHLC);
// router.post("/ltp" , upstoxController.ltp);
// router.post("/putCall" , upstoxController.putCall);

module.exports = router;
