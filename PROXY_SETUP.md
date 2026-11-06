# Gateway-to-engine boundary

Follow [SETUP.md](SETUP.md) before starting either service.

The browser authenticates using an HttpOnly session cookie. Redis holds the broker token and user identity server-side. `/auth/session` returns only user display information and a CSRF token.

Every state-changing dashboard request requires `X-CSRF-Token`. The gateway checks supplied user IDs against the signed-in account. It supplies the account's broker token to Python itself, ignoring any browser-supplied token.

The gateway sends `X-Engine-Token` on Python requests. Both services must have the same `ENGINE_API_TOKEN`. This is a service credential, never a browser credential. Keep Python's port private.

The router already selects `trading-with-python-backend.js`; no manual controller replacement is needed. `DEBUG_MODE` does not bypass authentication or enable live orders.
