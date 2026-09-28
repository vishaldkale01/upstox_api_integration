const { Initializewebsoket } = require("../../webSocket/websocket_client");

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
          res.status(500).json({ success: false, message: 'Authentication failed' });
        } else {
          console.log('API called successfully. Returned data: ' + JSON.stringify(data.email));
          const data_ =  data
          access_token =  data_.accessToken
          new_data = {
            email : data_.email , 
            exchanges : data_.exchanges , 
            userId : data_.userId , 
            userName : data_.userName , 
            userType : data_.userType,
            accessToken: access_token
          }
          // we connect and process the tick data in oythin so we comment this for now
          // Initializewebsoket(access_token)
          
          // Redirect to trading dashboard with user data
          const params = new URLSearchParams(new_data).toString();
          res.redirect(`/trading-dashboard?${params}`);
        }
    })
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error during authentication.' });
    }
  };

  module.exports = {getLoginUrl , handleCallback}