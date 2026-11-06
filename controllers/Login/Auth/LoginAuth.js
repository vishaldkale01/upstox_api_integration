'use strict';
const crypto = require('node:crypto');
const UpstoxClient = require('upstox-js-sdk');
const { sameSecret } = require('../../../security/session');
const getLoginUrl = (req, res, next) => {
  req.session.regenerate(error => {
    if (error) return next(error);
    req.session.oauthState = crypto.randomBytes(32).toString('hex');
    req.session.oauthStarted = Date.now();
    const url = new URL('https://api.upstox.com/v2/login/authorization/dialog');
    url.search = new URLSearchParams({ response_type: 'code', client_id: process.env.UPSTOX_API_KEY,
      redirect_uri: process.env.UPSTOX_REDIRECT_URI, state: req.session.oauthState }).toString();
    req.session.save(error => error ? next(error) : res.redirect(url.toString()));
  });
};
const handleCallback = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (typeof req.query.code !== 'string' || !sameSecret(req.query.state, req.session.oauthState) ||
      !req.session.oauthStarted || Date.now() - req.session.oauthStarted > 10 * 60 * 1000) {
    return res.status(400).send('Login expired or invalid. Start again at /login.');
  }
  delete req.session.oauthState;
  delete req.session.oauthStarted;
  req.session.save(error => {
    if (error) return next(error);
    const login = new UpstoxClient.LoginApi(new UpstoxClient.ApiClient());
    login.token('2.0', { code: req.query.code, clientId: process.env.UPSTOX_API_KEY,
      clientSecret: process.env.UPSTOX_API_SECRET, redirectUri: process.env.UPSTOX_REDIRECT_URI,
      grantType: 'authorization_code' }, (error, data) => {
      if (error || !data?.accessToken || !data?.userId) return res.status(502).send('Authentication failed. Start again at /login.');
      const allowed = (process.env.ALLOWED_UPSTOX_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!allowed.includes(data.userId)) return res.status(403).send('This account is not enabled on this installation.');
      req.session.regenerate(error => {
        if (error) return next(error);
        req.session.user = { id: data.userId, name: data.userName || 'Trading account' };
        req.session.brokerAccessToken = data.accessToken;
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        req.session.save(error => error ? next(error) : res.redirect('/trading-dashboard.html'));
      });
    });
  });
};
module.exports = { getLoginUrl, handleCallback };
