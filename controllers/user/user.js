const getUserProfile = async (req , res)=>{
    try {
        let defaultClient = UpstoxClient.ApiClient.instance;
        let OAUTH2 = defaultClient.authentications['OAUTH2'];
        OAUTH2.accessToken = access_token;
    
        let apiInstance = new UpstoxClient.UserApi();
        let apiVersion = '2.0';
    
        apiInstance.getProfile(apiVersion, (error, data) => {
          if (error) {
            sendError(res, 'getUserProfile', 'Error fetching user profile.');
          } else {
            sendSuccess(res, data);
          }
        });
      } catch (error) {
        sendError(res, 'getUserProfile', 'Error fetching user profile.');
      }

}

const getUserProfileFundAndMargine =  async (req , res)=>{
    try {
        let OAUTH2 = defaultClient.authentications['OAUTH2'];
        OAUTH2.accessToken = access_token;
    
        let apiInstance = new UpstoxClient.UserApi();
        let apiVersion = '2.0';
    
        apiInstance.getUserFundMargin(apiVersion, null, (error, data) => {
          if (error) {
            sendError(res, 'getUserFunds', 'Error fetching user funds.');
          } else {
            sendSuccess(res, data);
          }
        });
      } catch (error) {
        sendError(res, 'getUserFunds', 'Error fetching user funds.');
      }
}

module.exports = {getUserProfile , getUserProfileFundAndMargine}