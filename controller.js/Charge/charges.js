const { sendSuccess, sendError } = require('../../helper/responce');

const getBrokerage = async (req , res)=>{
try {
    let UpstoxClient = require('upstox-js-sdk');
let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications['OAUTH2'];
OAUTH2.accessToken = access_token;

let apiInstance = new UpstoxClient.ChargeApi();

let {
instrument_token , 
quantity , 
product , 
transaction_type ,  
price , 
 } = req.query
 let apiVersion = "2.0"; 
apiInstance.getBrokerage(instrument_token, quantity, product, transaction_type, price, apiVersion, (error, data, response) => {
  if (error) {
    console.error(error);
    sendError(res , "getBrokerage" , error , 404)
} else {
    sendSuccess(res , data)
    console.log('API called successfully. Returned data: ' + JSON.stringify(data));
}
});
} catch (error) {
    sendError(res , "getBrokerage" , error , 404)
    console.log(error);
}
}

module.exports = getBrokerage