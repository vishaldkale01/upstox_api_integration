const sendSuccess = (res, data) => res.status(200).json({ status: 'success', data });
// Legacy callers may pass sensitive SDK errors/stacks. Do not emit them.
const sendError = (res, _functionName, _message, _stack = '', statusCode = 500) =>
  res.status(statusCode).json({ status: 'error', message: 'Unable to complete broker request' });
module.exports = { sendSuccess, sendError };
