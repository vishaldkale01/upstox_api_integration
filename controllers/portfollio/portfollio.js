const { sendError, sendSuccess } = require("../../helper/responce");

const convertPosition = ()=>{
    try {
        
    } catch (error) {
        
    }
}

const getPosition = async ()=>{
    try {
        
    } catch (error) {
        
    }
}

const getHolding = async (req , res)=>{
    try {
let defaultClient = new UpstoxClient.ApiClient();
var OAUTH2 = defaultClient.authentications['OAUTH2'];
OAUTH2.accessToken = req.session.brokerAccessToken;

let apiInstance = new UpstoxClient.PortfolioApi(defaultClient);
let apiVersion = "2.0";
apiInstance.getHoldings(apiVersion,(error,data,response)=>{
  if(error) {
    sendError(res , "getHolding" , error.text , error.stack )
}
else{

    sendSuccess(res , data)
}
});
} catch (error) {
    sendError(res , "getHolding" , error.text , error.stack )
    }
}

module.exports = {
    convertPosition , getPosition , getHolding
}
