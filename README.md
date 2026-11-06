# TradeStack gateway — Upstox API integration

Node.js dashboard and gateway for the Python algorithmic options trading engine.
It provides Upstox OAuth login, paper-session controls, and MongoDB-backed trade/signal history.

**Start here: [SETUP.md](SETUP.md).** The companion engine is
[algo-execution-service](https://github.com/vishaldkale01/algo-execution-service)
(planned public name: `tradestack-algo-engine`).

## Current behavior

- Broker access tokens stay server-side in Redis-backed sessions.
- The browser receives an HttpOnly session cookie and a CSRF token, never the broker token.
- Only configured Upstox account IDs can sign in to an installation.
- History and session requests are restricted to the signed-in account.
- Gateway-to-engine requests use a separate shared secret.
- This gateway supports paper trading; direct live order placement/modification routes are disabled.
- MongoDB stores trade/signal history. Redis stores sessions and supports the Python engine.
- Market-data recording and replay run in the Python repository.

## Quick installation

Requirements: Node.js 22+, MongoDB, Redis, Python engine, and an Upstox developer application.

```bash
git clone https://github.com/vishaldkale01/upstox_api_integration.git
cd upstox_api_integration
npm ci
cp .env.example .env
```

Fill in the environment values using [SETUP.md](SETUP.md), start MongoDB, Redis and the Python engine,
then run `npm start`. Open `http://localhost:3000/login`.

## Verification

```bash
npm test
npx playwright install chromium
npm run test:browser
```

The security tests and browser smoke check use test doubles; they do not submit broker orders.
`npm run dev` uses Node.js built-in watch mode.

## Documentation

- [Setup, environment variables, OAuth, and smoke checks](SETUP.md)
- [Dashboard guide](TRADING_DASHBOARD_GUIDE.md)
- [Proxy and authentication boundary](PROXY_SETUP.md)
- [Installation checklist](INSTALLATION_CHECKLIST.md)

## License

ISC; see [LICENSE](LICENSE). The Python repository has its own licensing status.
