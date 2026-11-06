# Python backend verification

See [SETUP.md](SETUP.md) for the coordinated setup and migration instructions.

Verify the authenticated Python `/health` endpoint first. Then log into the dashboard and test a paper start/stop cycle. A successful command submission is not proof of a market feed or profitable execution; inspect session status and market-data timestamps.

`npm test` verifies gateway authentication, CSRF, account ownership, server-side broker-token injection, and rejection of direct live order placement. The Python suite verifies service authentication and paper-only requests.

A clean install requires the tested Python dependencies. The browser smoke test uses mock services and does not validate real OAuth or live broker connectivity.
