const { sendError, sendSuccess } = require("../../helper/responce");
const axios = require('axios');

const placeOrder = async(req , res)=>{
    try {

let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications['OAUTH2'];
OAUTH2.accessToken = access_token;

let apiInstance = new UpstoxClient.OrderApi();
const {
    quantity ,
    product ,
    validity ,
    price ,
    tag ,
    instrument_token ,
    order_type ,
    transaction_type ,
    disclosed_quantity ,
    trigger_price ,
    is_amo } = req.body
let body = new UpstoxClient.PlaceOrderRequest(quantity, UpstoxClient.PlaceOrderRequest.ProductEnum[product], UpstoxClient.PlaceOrderRequest.ValidityEnum[validity], price, instrument_token,UpstoxClient.PlaceOrderRequest.OrderTypeEnum[order_type],UpstoxClient.PlaceOrderRequest.TransactionTypeEnum[transaction_type], disclosed_quantity, trigger_price, is_amo); 
let apiVersion = "2.0"; 

apiInstance.placeOrder(body, apiVersion, (error, data, response) => {
  if (error) {
      console.error(error.response.text);
      sendError(res , "placeOrder" ,error.response.text ,error.stack , 400 )
    } else {
        console.log('API called successfully. Returned data: ' + data);
        sendSuccess(res , data)
  }
});
    } catch (error) {
        sendError(res , "placeOrder" ,error.message ,error.stack , 400 )
    }
}

const getOrderBook = async(req , res)=>{
    try {
let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications['OAUTH2'];
OAUTH2.accessToken = access_token;
let apiInstance = new UpstoxClient.OrderApi();

let apiVersion = "2.0"; 

apiInstance.getOrderBook(apiVersion, (error, data, response) => {
  if (error) {
    sendError(res , "getOrderBook" , error.message , error.stack)
  } else {
    sendSuccess(res , data)
  }
});
    } catch (error) {
        sendError(res , "getOrderBook" , error.message , error.stack , 500)
    }
}


const modifyOrder = async(req , res)=>{
  try {
    let defaultClient = UpstoxClient.ApiClient.instance;
    var OAUTH2 = defaultClient.authentications['OAUTH2'];
    OAUTH2.accessToken = access_token;
    let apiInstance = new UpstoxClient.OrderApi();
    const {
      quantity , 
      validity,
      price,
      order_id,
      order_type,
      disclosed_quantity,
      trigger_price
    } = req.body
    let body = new UpstoxClient.ModifyOrderRequest(UpstoxClient.ModifyOrderRequest.ValidityEnum[validity],0,order_id,UpstoxClient.ModifyOrderRequest.OrderTypeEnum[order_type],disclosed_quantity,UpstoxClient.ModifyOrderRequest.order); 
    let apiVersion = "2.0"; // String | API Version Header
    
    apiInstance.modifyOrder(body, apiVersion, (error, data, response) => {
      if (error) {
        return sendError(res , "getOrderHistory" , error.text , error.stack)
      } else {
        console.log('API called successfully. Returned data: ' + data);
        sendSuccess(res , data)
      }
    });
  } catch (error) {
      sendError(res , "" , "InterNal Server Error" , error.stack)
  }

  }


const cancelOrder = async()=>{
    try {
      let defaultClient = UpstoxClient.ApiClient.instance;
      var OAUTH2 = defaultClient.authentications['OAUTH2'];
      OAUTH2.accessToken = access_token;
      let apiInstance = new UpstoxClient.OrderApi();
      
      let orderId = req.body.orderId; 
      let apiVersion = "2.0"; 
      
      apiInstance.cancelOrder(orderId, apiVersion, (error, data, response) => {
        if (error) {
          console.error(error);
          sendError(req ,cancelOrder , error , error.stack)
        } else {
          console.log('API called successfully. Returned data: ' + data);
          sendSuccess(res , data)
        }
      });
    } catch (error) {
        sendError(res , cancelOrder , error.message , error.stack , 500)
    }
}

const getOrderHistory = async()=>{
   try {
    const axios = require('axios');

const url = 'https://api.upstox.com/v2/order/details';
const headers = {
  'Accept': 'application/json',
  'Authorization': `Bearer ${access_token}`
};

  order_id = req.params.order_id

axios.get(url, { headers, params })
  .then(response => {
    setInterval(res , response.data )
    
  })
  .catch(error => {
    sendError(res , "getOrderHistory" , error.message , error.stack)
  });
  
} catch (error) {
     sendError(res , "getOrderHistory" , error.message , error.stack)
    
   }
}

const getTradeHistory = (req , res) =>{
  try {
let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications['OAUTH2'];
OAUTH2.accessToken = access_token;
let apiInstance = new UpstoxClient.OrderApi();

let apiVersion = "2.0"; 

apiInstance.getTradeHistory(apiVersion, (error, data, response) => {
    if (error) {
      sendError(res , "getTradeHistory" , error.message , error.stack)
      
    } else {
      sendSuccess(res , data)
    }
  });
} catch (error) {
    sendError(res , "getTradeHistory" , error.message , error.stack)
  }
}

const getTradesByOrder = (req, res) =>{
try {
  let UpstoxClient = require('upstox-js-sdk');
let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications['OAUTH2'];
OAUTH2.accessToken = access_token;
let apiInstance = new UpstoxClient.OrderApi();

let orderId = req.query.params; 
let apiVersion = "2.0"; 

apiInstance.getTradesByOrder(orderId, apiVersion, (error, data, response) => {
  if (error) {
    sendError(res , "getTradesByOrder" , error.message , error.stack)
  } else {
    sendSuccess(res , response.data)
    console.log('API called successfully. Returned data: ' + JSON.stringify(data));
  }
});
} catch (error) {
  sendError(res , "getTradesByOrder" , error.message , error.stack)
}
}

const historicalTrades = (req , res) =>{
  try {

const url = 'https://api.upstox.com/v2/charges/historical-trades';
const headers = {
  'Accept': 'application/json',
  'Authorization': `Bearer ${access_token}`
};


const  {segment , 
  start_date , 
  end_date , 
  page_number , 
  page_size , } = req.query
const params = {
  'segment': segment,
  'start_date': start_date,
  'end_date': end_date,
  'page_number': page_number ,
  'page_size': page_size
};

const data = {
  'segment': segment , 
  'start_date': start_date , 
  'end_date': end_date , 
  'page_number': page_number , 
  'page_size': page_size , }

axios.get(url, { headers, params })
  .then(response => {
    sendSuccess(res , data)
  })
  .catch(error => {
    sendError(res , "historicalTrades" , error.message , error.stack )

  });
  
} catch (error) {
    sendError(res , "historicalTrades" , error.message , error.stack )
    
  }
}

module.exports = {
    placeOrder ,getOrderBook , getOrderHistory , getOrderHistory , cancelOrder , modifyOrder , getTradeHistory , 
    getTradesByOrder , historicalTrades
}