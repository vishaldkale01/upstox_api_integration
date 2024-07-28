// Common function for success response
const sendSuccess = (res, data) => {
    res.status(200).json({ status: 'success', data });
  };
  
  // Common function for error response with function name
  const sendError = (res, functionName, errorMessage, statusCode = 500) => {
    const fullErrorMessage = `Error in ${functionName}: ${errorMessage}`;
    console.error(fullErrorMessage);
    res.status(statusCode).json({ status: 'error', message: errorMessage });
  };
module.exports = {sendSuccess , sendError}  