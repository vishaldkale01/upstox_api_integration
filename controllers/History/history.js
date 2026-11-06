const { sendSuccess, sendError } = require("../../helper/responce");

const HistoryCandleData = async(req ,res) => {
try {
const defaultClient = new UpstoxClient.ApiClient();
defaultClient.authentications.OAUTH2.accessToken = req.session.brokerAccessToken;
let apiInstance = new UpstoxClient.HistoryApi(defaultClient);

let apiVersion = "2.0"; 
let {instrumentKey , interval , to_date , from_date} = req.params

apiInstance.getHistoricalCandleData1(instrumentKey, interval, to_date, from_date ,apiVersion, (error, data, response) => {
    if (error) {

      return sendError(res ,"HistoryCandleData" , JSON.parse(response.text) )
    } else {
        // return sendSuccess(res , data)

    }
    if(response){
        sendSuccess(res ,JSON.parse(response.text))
    }
});

} catch (error) {

    sendError(res , "HistoryCandleData" , error.message)
}
}

const getIntraDayCandleData = async(req , res) =>{
    try {

const defaultClient = new UpstoxClient.ApiClient();
defaultClient.authentications.OAUTH2.accessToken = req.session.brokerAccessToken;
let apiInstance = new UpstoxClient.HistoryApi(defaultClient);

 apiVersion = "2.0"; 
const {instrumentKey  , interval} = req.params  

apiInstance.getIntraDayCandleData(instrumentKey, interval, apiVersion, (error, data, response) => {
    if (error) {

      return sendError(res ,"getIntraDayCandleData" , JSON.parse(response.text) )
    } else {
        sendSuccess(res , JSON.parse(response.text) )
    }
});
} catch (error) {

        sendError(res ,"getIntraDayCandleData" , error.message) 

    }
}

module.exports = {
    HistoryCandleData , getIntraDayCandleData
}
