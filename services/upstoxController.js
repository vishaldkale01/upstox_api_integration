const {sendError , sendSuccess } = require("../helper/responce")
const getLoginUrl = (req, res) => {
    const url = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${process.env.UPSTOX_API_KEY}&redirect_uri=${encodeURIComponent(process.env.UPSTOX_REDIRECT_URI)}&state=""`;
    res.redirect(url);
  };
  
  const handleCallback = async (req, res) => {
    const { code } = req.query;
    const data = {
      code: code,
      clientId: process.env.UPSTOX_API_KEY,
      clientSecret: process.env.UPSTOX_API_SECRET,
      redirectUri: process.env.UPSTOX_REDIRECT_URI,
      grantType: 'authorization_code',
    };
  try {
    let apiInstance = new UpstoxClient.LoginApi()
    let apiVersion = "2.6.0"; 
    let new_data = {}
    apiInstance.token(apiVersion, data, (error, data, response) => {
        if (error) {
          console.error(error.message);
        } else {
          console.log('API called successfully. Returned data: ' + JSON.stringify(data.email));
          const data_ =  data
          access_token =  data_.accessToken
          new_data = {
            email : data_.email , 
            exchanges : data_.exchanges , 
            userId : data_.userId , 
            userName : data_.userName , 
            userType : data_.userType
          }
        }
        sendSuccess(res, new_data);
    })
    } catch (error) {
        console.log(error);
      sendError(res, 'handleCallback', 'Error during authentication.');
    }
  };
  
  const getUserProfile = async (req, res) => {
    try {
      let defaultClient = UpstoxClient.ApiClient.instance;
      let OAUTH2 = defaultClient.authentications['OAUTH2'];
      OAUTH2.accessToken = access_token;
  
      let apiInstance = new UpstoxClient.UserApi();
      let apiVersion = '2.0';
  
      apiInstance.getProfile(apiVersion, (error, data) => {
        if (error) {
          sendError(res, 'getUserProfile', 'Error fetching user profile.');
        } else {
          sendSuccess(res, data);
        }
      });
    } catch (error) {
      sendError(res, 'getUserProfile', 'Error fetching user profile.');
    }
  };
  
  const getUserFunds = async (req, res) => {
    try {
      let defaultClient = UpstoxClient.ApiClient.instance;
      let OAUTH2 = defaultClient.authentications['OAUTH2'];
      OAUTH2.accessToken = access_token;
  
      let apiInstance = new UpstoxClient.UserApi();
      let apiVersion = '2.0';
  
      apiInstance.getUserFundMargin(apiVersion, null, (error, data) => {
        if (error) {
          sendError(res, 'getUserFunds', 'Error fetching user funds.');
        } else {
          sendSuccess(res, data);
        }
      });
    } catch (error) {
      sendError(res, 'getUserFunds', 'Error fetching user funds.');
    }
  };
  
  const placeOrder = async (req, res) => {
    try {
      let defaultClient = UpstoxClient.ApiClient.instance;
      let OAUTH2 = defaultClient.authentications['OAUTH2'];
      OAUTH2.accessToken = access_token;
  
      let apiInstance = new UpstoxClient.OrderApi();
      let body = new UpstoxClient.PlaceOrderRequest(
        1,
        UpstoxClient.PlaceOrderRequest.ProductEnum.D,
        UpstoxClient.PlaceOrderRequest.ValidityEnum.DAY,
        0.0,
        'NSE_EQ|INE528G01035',
        UpstoxClient.PlaceOrderRequest.OrderTypeEnum.MARKET,
        UpstoxClient.PlaceOrderRequest.TransactionTypeEnum.BUY,
        0,
        0.0,
        false
      );
      let apiVersion = '2.0';
  
      apiInstance.placeOrder(body, apiVersion, (error, data) => {
        if (error) {
          sendError(res, 'placeOrder', 'Error placing order.');
        } else {
          sendSuccess(res, data);
        }
      });
    } catch (error) {
      sendError(res, 'placeOrder', 'Error placing order.');
    }
  };
  
  const getCandleData = async (req, res) => {
    try {
      let apiInstance = new UpstoxClient.HistoryApi();
      let apiVersion = '2.0';
      let instrumentKey = req.query.instrumentKey || 'NSE_EQ|INE669E01016';
      let interval = req.query.interval || '1minute';
      let toDate = req.query.toDate || '2023-11-13';
      let fromDate = req.query.fromDate || '2023-11-12';
  
      apiInstance.getHistoricalCandleData1(
        instrumentKey,
        interval,
        toDate,
        fromDate,
        apiVersion,
        (error, data) => {
          if (error) {
            sendError(res, 'getCandleData', 'API call failed');
          } else {
            const candles = data.data.candles.map(candle => ({
              timestamp: candle[0],
              open: candle[1],
              high: candle[2],
              low: candle[3],
              close: candle[4],
              volume: candle[5],
              turnover: candle[6],
            }));
  
            const pattern = identifyCandlestickPatterns(candles);
            sendSuccess(res, { pattern, candles });
          }
        }
      );
    } catch (error) {
      sendError(res, 'getCandleData', 'An error occurred');
    }
  };

  function identifyCandlestickPatterns(candles) {
    if (candles.length < 2) {
        return "Not enough data";
    }

    const patterns = [];

    // Helper function to identify a Doji
    function isDoji(candle) {
        return Math.abs(candle.close - candle.open) <= (candle.high - candle.low) * 0.1;
    }

    // Helper function to identify a Hammer
    function isHammer(candle) {
        return (candle.close - candle.open) / (candle.high - candle.low) > 0.5 &&
               (candle.high - candle.close) > (candle.open - candle.low) * 2;
    }

    // Helper function to identify a Shooting Star
    function isShootingStar(candle) {
        return (candle.open - candle.close) / (candle.high - candle.low) > 0.5 &&
               (candle.high - candle.open) > (candle.close - candle.low) * 2;
    }

    // Helper function to identify an Engulfing Pattern
    function isEngulfing(current, previous) {
        return (current.open < previous.close && current.close > previous.open) ||
               (current.open > previous.close && current.close < previous.open);
    }

    for (let i = 1; i < candles.length; i++) {
        const current = candles[i];
        const previous = candles[i - 1];

        if (isDoji(current)) {
            patterns.push({ timestamp: current.timestamp, pattern: "Doji" });
        }
        if (isHammer(current)) {
            patterns.push({ timestamp: current.timestamp, pattern: "Hammer" });
        }
        if (isShootingStar(current)) {
            patterns.push({ timestamp: current.timestamp, pattern: "Shooting Star" });
        }
        if (isEngulfing(current, previous)) {
            patterns.push({ timestamp: current.timestamp, pattern: "Engulfing" });
        }
    }

    return patterns.length > 0 ? patterns : "No pattern found";
}
  
  const getFullMarketQuote = async (req, res) => {
    try {
      let defaultClient = UpstoxClient.ApiClient.instance;
      let OAUTH2 = defaultClient.authentications['OAUTH2'];
      OAUTH2.accessToken = accessToken;
      let apiInstance = new UpstoxClient.MarketQuoteApi();
  
      let apiVersion = '2.0';
      let symbol = req.body.symbol;
  
      apiInstance.getFullMarketQuote(symbol, apiVersion, (error, data, response) => {
        if (error) {
          sendError(res, 'getFullMarketQuote', 'Error fetching market quote.');
        } else {
          sendSuccess(res, data);
        }
      });
    } catch (error) {
      sendError(res, 'getFullMarketQuote', 'Error fetching market quote.');
    }
  };
  
  const ltp = async (req, res) => {
    try {
      let defaultClient = UpstoxClient.ApiClient.instance;
      let OAUTH2 = defaultClient.authentications['OAUTH2'];
      OAUTH2.accessToken = access_token;
      let apiInstance = new UpstoxClient.MarketQuoteApi();
  
      let apiVersion = '2.0';
      let symbol = req.body.symbol;
  
      apiInstance.ltp(symbol, apiVersion, (error, data, response) => {
        if (error) {
          sendError(res, 'ltp', 'Error fetching LTP.');
        } else {
          sendSuccess(res, data);
        }
      });
    } catch (error) {
      sendError(res, 'ltp', 'Error fetching LTP.');
    }
  };
  
  const getMarketQuoteOHLC = async (req, res) => {
    try {
      let UpstoxClient = require('upstox-js-sdk');
      let defaultClient = UpstoxClient.ApiClient.instance;
      let OAUTH2 = defaultClient.authentications['OAUTH2'];
      OAUTH2.accessToken = accessToken;
      let apiInstance = new UpstoxClient.MarketQuoteApi();
  
      let apiVersion = '2.0';
      let symbol = req.body.symbol;
      let interval = req.body.interval || '1d';
  
      apiInstance.getMarketQuoteOHLC(symbol, interval, apiVersion, (error, data, response) => {
        if (error) {
          sendError(res, 'getMarketQuoteOHLC', 'Error fetching OHLC market quotes.');
        } else {
          sendSuccess(res, data);
        }
      });
    } catch (error) {
      sendError(res, 'getMarketQuoteOHLC', 'Error fetching OHLC market quotes.');
    }
  };
  
  const putCall = async (req, res) => {
    try {
      const axios = require('axios');
      const url = 'https://api.upstox.com/v2/option/chain';
      const params = {
        instrument_key: req.body.instrument_key,
        expiry_date: req.body.expiry_date
      };
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
  
      axios.get(url, { params, headers })
        .then(response => {
          sendSuccess(res, response.data);
        })
        .catch(error => {
          sendError(res, 'putCall', 'Error fetching option chain.');
        });
    } catch (error) {
      sendError(res, 'putCall', 'Error fetching option chain.');
    }
  };
  
  module.exports = {
    getLoginUrl,
    handleCallback,
    getUserProfile,
    getUserFunds,
    placeOrder,
    getCandleData,
    getFullMarketQuote,
    getMarketQuoteOHLC,
    ltp,
    putCall
  };
  