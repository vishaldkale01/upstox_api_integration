# Local setup: TradeStack dashboard and gateway

## 1. Prerequisites

Use Node.js **22 or later**, MongoDB, Redis, and the Python 3.12 engine.
You need your own Upstox developer application, API key/secret, and Upstox account ID.
Register this exact redirect URI in the Upstox developer console:

`http://localhost:3000/callback`

Use `localhost` consistently in the browser; mixing it with `127.0.0.1` breaks the login cookie.

## 2. Install and configure

```bash
git clone https://github.com/vishaldkale01/upstox_api_integration.git
cd upstox_api_integration
npm ci
cp .env.example .env
```

On Windows use `Copy-Item .env.example .env`. Edit the resulting file:

| Variable | Local value / requirement |
|---|---|
| `APP_ORIGIN` | `http://localhost:3000`, with no trailing slash |
| `HOST` / `PORT` | `127.0.0.1` / `3000` |
| `MONGO_DB` | `mongodb://127.0.0.1:27017/upstox_trading` |
| `REDIS_URL` | `redis://127.0.0.1:6379` |
| `PYTHON_BACKEND_URL` | `http://127.0.0.1:8000` |
| `SESSION_SECRET` | Random secret of at least 32 characters |
| `ENGINE_API_TOKEN` | Different random secret; must match the Python engine |
| `UPSTOX_API_KEY` / `UPSTOX_API_SECRET` | Your application's credentials |
| `UPSTOX_REDIRECT_URI` | `http://localhost:3000/callback` |
| `ALLOWED_UPSTOX_USER_IDS` | Your actual Upstox account ID; comma-separate additional authorized accounts |
| `TRUST_PROXY` | `0` locally; `1` only behind exactly one trusted reverse proxy |

Generate each secret separately:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not commit generated values. The gateway does not require a broker token in `.env`;
it obtains one through OAuth and retains it server-side.

## 3. Start the services

Start MongoDB and Redis using your local installation. Configure and start the
[Python engine](https://github.com/vishaldkale01/algo-execution-service) following its `SETUP.md`.
Use the same database: Python's `DATABASE_NAME=upstox_trading` corresponds to the database suffix
in Node's `MONGO_DB` URI.

Then run:

```bash
npm start
```

For auto-reload, use `npm run dev`. The gateway waits for MongoDB and Redis before listening.
It defaults to loopback and port 3000.

## 4. Verify the complete local flow

1. Open `http://localhost:3000/health`; expect `{"status":"ok"}`.
2. Open `http://localhost:3000/login` and complete Upstox authorization.
3. Expect a redirect to `/trading-dashboard.html` **without token or account data in the URL**.
4. Confirm your account appears in the dashboard.
5. Configure and start a **Paper** session; the Python service must be running.
6. During market hours, check tick/session updates. Outside market hours, no fresh ticks may arrive.
7. Stop the session, then sign out.

Unapproved account IDs receive 403. Anonymous history/control requests receive 401.
A browser POST must carry its session cookie and `X-CSRF-Token`; the dashboard handles this automatically.
Old curl examples that pass only a `user_id` and broker token are no longer supported.

## 5. Automated tests

```bash
npm test
npx playwright install chromium
npm run test:browser
```

On Linux, Playwright may require `npx playwright install --with-deps chromium`.
Alternatively set `CHROME_PATH` to your installed Chrome/Chromium executable.
The browser smoke uses a mock HTTP backend. These checks do not validate real Upstox login or real market data.

## Troubleshooting

- **Startup configuration error:** fill every required variable and replace both secret placeholders.
- **Redis/MongoDB unavailable:** verify both services are running and the URIs are correct.
- **OAuth state failure:** restart at `/login`; use the same hostname as the configured callback.
- **403 after Upstox login:** add your real account ID to `ALLOWED_UPSTOX_USER_IDS` and restart.
- **401 from the engine:** compare `ENGINE_API_TOKEN` in both local environment files.
- **No history:** ensure Node and Python use the same MongoDB database.
- **Expired Upstox token:** stop your session if possible, then sign in again.
- **Wrong port:** use uppercase `PORT`.

## Deployment boundary

Public source code does not make this a hosted trading service.
Keep the engine, MongoDB, and Redis on private interfaces. Use HTTPS for a non-local gateway;
set `APP_ORIGIN` and the registered OAuth callback accordingly. Secure cookies are enabled for HTTPS.
Only enable `TRUST_PROXY=1` behind a trusted single-hop proxy that cannot be bypassed.
Protect Redis with authentication/TLS as appropriate: it holds broker tokens.
Do not log cookies, authorization headers, OAuth codes, connection credentials, or request bodies.
Existing logs and Git history require a separate review; this patch cannot erase past exposure.

## Migrating an existing installation

Deploy the gateway and engine changes together. Set the new session secret, shared engine secret, and
allowed account IDs before restarting. Existing browser-token sessions must sign in again.
Stop paper sessions before restarting either service. Database formats and trading strategies are unchanged.
