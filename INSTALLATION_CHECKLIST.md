# Installation checklist

Use [SETUP.md](SETUP.md) for commands and environment values.

- [ ] Node.js 22+ and Python 3.12 installed.
- [ ] `npm ci` completed; Python dependencies installed from its requirements file.
- [ ] Local MongoDB and Redis are running.
- [ ] `.env.example` copied and all required values set.
- [ ] Node and Python point to the same MongoDB database.
- [ ] Separate random session and engine secrets generated; engine secret matches both services.
- [ ] Upstox callback registered exactly; permitted account IDs configured.
- [ ] Python authenticated health check and Node `/health` succeed.
- [ ] OAuth redirects to a clean dashboard URL.
- [ ] Paper session starts, reports status, stops, and signs out.
- [ ] `npm test`, browser smoke, and Python suite pass.
- [ ] Full Git history, binaries, and old logs reviewed before public release.
