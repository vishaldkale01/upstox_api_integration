const { sendSuccess, sendError } = require('../../helper/responce');

const getBrokerage = async (req , res)=>{
try {
    let UpstoxClient = require('upstox-js-sdk');
let defaultClient = new UpstoxClient.ApiClient();
var OAUTH2 = defaultClient.authentications['OAUTH2'];
OAUTH2.accessToken = req.session.brokerAccessToken;

let apiInstance = new UpstoxClient.ChargeApi(defaultClient);

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

    sendError(res , "getBrokerage" , error , 404)
} else {
    sendSuccess(res , data)

}
});
} catch (error) {
    sendError(res , "getBrokerage" , error , 404)

}
}

module.exports = getBrokerage
