'use strict';
const express = require('express');
const path = require('node:path');
const { sessionMiddleware, requireSession, requireCsrf } = require('../security/session');

module.exports = ({ config, store }) => {
  const app = express();
  app.disable('x-powered-by');
  // Enable only when exactly one trusted reverse proxy sits in front of this process.
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.set({ 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store' });
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.use(sessionMiddleware(config, store));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(requireCsrf(config.origin));
  app.get('/trading-dashboard.html', requireSession);
  app.use(express.static(path.join(__dirname, '../public'), { index: false }));
  app.use('/', require('../routes/router'));
  app.use((_error, _req, res, _next) => res.status(500).json({ success: false, message: 'Request failed' }));
  return app;
};
