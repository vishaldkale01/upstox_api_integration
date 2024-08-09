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

const getIntraDayCandleData = async(req , res) =>{
    try {

let apiInstance = new UpstoxClient.HistoryApi();

 apiVersion = "2.0"; 
const {instrumentKey  , interval} = req.params  

apiInstance.getIntraDayCandleData(instrumentKey, interval, apiVersion, (error, data, response) => {
    if (error) {
      console.error(error);
      return sendError(res ,"getIntraDayCandleData" , JSON.parse(response.text) )
    } else {
        console.log('API called successfully. Returned data: ' + JSON.stringify(data));
        sendSuccess(res , JSON.parse(response.text) )
    }
});
} catch (error) {
        console.error(error);
        sendError(res ,"getIntraDayCandleData" , error.message) 

    }
}

module.exports = {
    HistoryCandleData , getIntraDayCandleData
}