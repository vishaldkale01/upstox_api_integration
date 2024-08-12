const { sendError, sendSuccess } = require("../../helper/responce");



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
    console.error(error);
    sendError(res , "getOrderBook" , error.message , error.stack)
  } else {
    console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    sendSuccess(res , data)
  }
});
    } catch (error) {
        sendError(res , "getOrderBook" , error.message , error.stack , 500)
    }
}

const getOrderHistory = async()=>{
    try {
        
    } catch (error) {
        
    }
}
const modifyOrder = async()=>{
    try {
let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications['OAUTH2'];
OAUTH2.accessToken = access_token;
let apiInstance = new UpstoxClient.OrderApi();

let body = new UpstoxClient.ModifyOrderRequest(UpstoxClient.ModifyOrderRequest.ValidityEnum.DAY,0,"240111010331447",UpstoxClient.ModifyOrderRequest.OrderTypeEnum.MARKET,0); 
let apiVersion = "2.0"; // String | API Version Header

apiInstance.modifyOrder(body, apiVersion, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
    } catch (error) {
        
    }
}

const cancelOrder = async()=>{
    try {
        
    } catch (error) {
        
    }
}

module.exports = {
    placeOrder ,getOrderBook , getOrderHistory , getOrderHistory , cancelOrder ,
}