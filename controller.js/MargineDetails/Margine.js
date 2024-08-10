// Margin Details
// This API provides the functionality to retrieve the margin for an instrument.
// It accepts input parameters like the instrument, quantity, transaction_type and product.

const { sendSuccess, sendError } = require('../../helper/responce');

const marginDetails = async (req , res)=>{
    try {
        const axios = require('axios');

const url = 'https://api.upstox.com/v2/charges/margin';
const headers = {
  'accept': 'application/json',
  'Authorization': access_token,
  'Content-Type': 'application/json'
};
// const data = {
//   instruments: [
//     {
//       instrument_key: 'NCD_FO|15758',
//       quantity: 1,
//       transaction_type: 'BUY',
//       product: 'D'
//     }
//   ]
// };
const data = req.body.instruments

axios.post(url, data, { headers })
  .then(response => {
    console.log(response.status);
    console.log(response.data);
    sendSuccess(res , response.data)
  })
  .catch(error => {
    console.error(error);
    sendError(res , "Margin Details" ,error)
});
} catch (error) {
        sendError(res , "Margin Details" ,error)
    }
}

module.exports = marginDetails