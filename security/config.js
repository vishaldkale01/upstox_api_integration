'use strict';
function readConfig(env = process.env) {
  for (const key of ['SESSION_SECRET', 'ENGINE_API_TOKEN']) {
    if (!env[key] || env[key].length < 32 || env[key].startsWith('replace-')) throw new Error(key + ' must be a random secret of at least 32 characters');
  }
  for (const key of ['MONGO_DB', 'UPSTOX_API_KEY', 'UPSTOX_API_SECRET', 'UPSTOX_REDIRECT_URI', 'APP_ORIGIN', 'ALLOWED_UPSTOX_USER_IDS']) {
    if (!env[key]) throw new Error(key + ' is required; see .env.example');
  }
  const origin = new URL(env.APP_ORIGIN);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== env.APP_ORIGIN) throw new Error('APP_ORIGIN must be an HTTP(S) origin without a trailing slash');
  if (origin.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new Error('Non-local APP_ORIGIN requires HTTPS');
  if (new URL(env.UPSTOX_REDIRECT_URI).origin !== origin.origin) throw new Error('UPSTOX_REDIRECT_URI must use APP_ORIGIN');
  return { origin: origin.origin, secure: origin.protocol === 'https:', secret: env.SESSION_SECRET };
}
module.exports = { readConfig };
