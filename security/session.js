'use strict';
const crypto = require('node:crypto');
const session = require('express-session');
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function sessionMiddleware(config, store) {
  return session({
    name: 'tradestack.sid', secret: config.secret, store,
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.secure, maxAge: 8 * 60 * 60 * 1000 }
  });
}
function requireSession(req, res, next) {
  if (!req.session?.user || !req.session.brokerAccessToken) return res.status(401).json({ success: false, message: 'Sign in to continue' });
  res.set('Cache-Control', 'no-store');
  next();
}
function requireOwner(req, res, next) {
  const supplied = [req.query.user_id, req.body?.user_id, req.params.user_id].filter(v => v !== undefined);
  if (supplied.some(v => typeof v !== 'string' || v !== req.session.user.id)) return res.status(403).json({ success: false, message: 'Account access denied' });
  next();
}
function requireCsrf(origin) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if ((req.get('Origin') && req.get('Origin') !== origin) || !sameSecret(req.get('X-CSRF-Token'), req.session?.csrfToken)) return res.status(403).json({ success: false, message: 'Invalid request verification' });
    next();
  };
}
function getSession(req, res) { res.json({ user: req.session.user, csrfToken: req.session.csrfToken }); }
function logout(req, res, next) {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('tradestack.sid', { path: '/' });
    res.json({ success: true });
  });
}
module.exports = { sameSecret, sessionMiddleware, requireSession, requireOwner, requireCsrf, getSession, logout };
