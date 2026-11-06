'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const session = require('express-session');
const Upstox = require('upstox-js-sdk');
const { readConfig } = require('../security/config');
const { sameSecret } = require('../security/session');

test('configuration fails closed and comparisons reject non-string inputs', () => {
  assert.throws(() => readConfig({}), /SESSION_SECRET/);
  assert.equal(sameSecret(undefined, undefined), false);
  assert.equal(sameSecret(['x'], 'x'), false);
  assert.equal(sameSecret('a', 'aa'), false);
  assert.equal(sameSecret('x', 'x'), true);
});

test('OAuth session, ownership, CSRF, token isolation, and logout', async t => {
  let forwarded;
  const upstream = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    forwarded = { path: req.url, header: req.headers['x-engine-token'], body: body ? JSON.parse(body) : null };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'success' }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  Object.assign(process.env, {
    SESSION_SECRET: 's'.repeat(64), ENGINE_API_TOKEN: 'e'.repeat(64),
    MONGO_DB: 'mongodb://127.0.0.1/test', APP_ORIGIN: 'http://localhost:3000',
    UPSTOX_API_KEY: 'test-key', UPSTOX_API_SECRET: 'test-secret',
    UPSTOX_REDIRECT_URI: 'http://localhost:3000/callback', ALLOWED_UPSTOX_USER_IDS: 'ACCOUNT_A',
    PYTHON_BACKEND_URL: 'http://127.0.0.1:' + upstream.address().port
  });
  require('../loaders/module')();
  const app = require('../loaders/express')({ config: readConfig(), store: new session.MemoryStore() });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const base = 'http://127.0.0.1:' + server.address().port;
  let cookie = '';
  const request = async (path, options = {}) => {
    const response = await fetch(base + path, { ...options, redirect: 'manual',
      headers: { Cookie: cookie, ...options.headers } });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  };
  for (const path of ['/auth/session', '/paper-trades?user_id=ACCOUNT_A', '/trading-dashboard.html']) {
    assert.equal((await request(path)).status, 401);
  }
  let response = await request('/login');
  assert.equal(response.status, 302);
  const pendingCookie = cookie;
  const oauthState = new URL(response.headers.get('location')).searchParams.get('state');
  assert.equal(oauthState.length, 64);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(response.headers.get('set-cookie'), /SameSite=Lax/i);
  assert.equal((await request('/callback?code=fake&state=wrong')).status, 400);
  let exchanged = 0;
  const original = Upstox.LoginApi.prototype.token;
  Upstox.LoginApi.prototype.token = (_version, _data, callback) => {
    exchanged++;
    callback(null, { userId: 'ACCOUNT_A', userName: 'Alice', accessToken: 'broker-secret-for-test' });
  };
  t.after(() => { Upstox.LoginApi.prototype.token = original; });
  response = await request('/callback?code=fake&state=' + oauthState);
  assert.equal(exchanged, 1);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/trading-dashboard.html');
  assert.notEqual(cookie, pendingCookie);
  assert.equal((await request('/callback?code=fake&state=' + oauthState)).status, 400);
  response = await request('/auth/session');
  const publicSession = await response.json();
  assert.deepEqual(publicSession.user, { id: 'ACCOUNT_A', name: 'Alice' });
  assert.equal(JSON.stringify(publicSession).includes('broker-secret-for-test'), false);
  const csrf = publicSession.csrfToken;
  assert.equal((await request('/paper-trades?user_id=ACCOUNT_B')).status, 403);
  assert.equal((await request('/trading-status/ACCOUNT_B')).status, 403);
  assert.equal((await request('/paper-trades?user_id[x]=ACCOUNT_A')).status, 403);
  const post = { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ user_id: 'ACCOUNT_A', access_token: 'attacker-token', trade_mode: 'PAPER' }) };
  assert.equal((await request('/start-trading', { ...post, headers: { 'Content-Type': 'application/json' } })).status, 403);
  assert.equal((await request('/start-trading', { ...post, headers: { ...post.headers, Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await request('/start-trading', { ...post, body: JSON.stringify({ user_id: 'ACCOUNT_B' }) })).status, 403);
  response = await request('/start-trading', post);
  assert.equal(response.status, 200);
  assert.equal(forwarded.header, process.env.ENGINE_API_TOKEN);
  assert.equal(forwarded.body.user_id, 'ACCOUNT_A');
  assert.equal(forwarded.body.access_token, 'broker-secret-for-test');
  assert.equal((await request('/order/place', post)).status, 403);
  response = await request('/trading-dashboard?userName=' + encodeURIComponent("';alert(1);//"));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/trading-dashboard.html');
  assert.equal((await response.text()).includes('alert(1)'), false);
  assert.equal((await request('/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrf } })).status, 200);
  assert.equal((await request('/auth/session')).status, 401);
  // An authenticated broker account still needs installation authorization.
  response = await request('/login');
  const state2 = new URL(response.headers.get('location')).searchParams.get('state');
  Upstox.LoginApi.prototype.token = (_v, _d, cb) => cb(null, { userId: 'ACCOUNT_B', accessToken: 'other-broker-token' });
  assert.equal((await request('/callback?code=fake&state=' + state2)).status, 403);
  assert.equal((await request('/auth/session')).status, 401);
});
