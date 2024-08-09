const { sendSuccess, sendError } = require("../../helper/responce");

const HistoryCandleData = async(req ,res) => {
try {
let apiInstance = new UpstoxClient.HistoryApi();

let apiVersion = "2.0"; 
let {instrumentKey , interval , to_date , from_date} = req.params

apiInstance.getHistoricalCandleData1(instrumentKey, interval, to_date, from_date ,apiVersion, (error, data, response) => {
    if (error) {
      console.error(error);
      return sendError(res ,"HistoryCandleData" , JSON.parse(response.text) )
    } else {
        // return sendSuccess(res , data)
        console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    }
    if(response){
        sendSuccess(res ,JSON.parse(response.text))
    }
});

} catch (error) {
    console.log(error)
    sendError(res , "HistoryCandleData" , error.message)
}
}

module.exports = {
    HistoryCandleData
}