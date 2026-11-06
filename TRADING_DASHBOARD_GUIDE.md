# Trading dashboard

Complete [SETUP.md](SETUP.md), then sign in at `http://localhost:3000/login`.

- **Overview:** current paper-session status, market snapshot, risk status, and latest position.
- **Configuration:** paper capital, lots, risk limits, recorder and supported controls. Review settings before starting.
- **Sessions / Trades / Signals:** stored history restricted to your signed-in Upstox account.
- **Analytics:** date-filtered results from MongoDB, not Redis.

Start and stop sessions through the dashboard. The Python engine must be available for control requests. No broker token needs to be pasted into the UI or a URL. Stop an active paper session before signing out.

The application may show standby outside market hours. Stored history requires both services to select the same MongoDB database. Recordings and replay tools live in the Python repository.

The browser sends its HttpOnly session cookie automatically and attaches a CSRF token for changes. Anonymous or cross-account requests are denied. This dashboard does not enable live orders.
