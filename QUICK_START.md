# Quick Start Guide - Trading Dashboard

## Installation & Setup

### 1. Ensure Dependencies are Installed
```bash
npm install
```

Make sure these packages are in `package.json`:
- `express`
- `axios` (for HTTP requests)
- `dotenv` (for environment variables)
- `body-parser`
- `upstox-js-sdk`

### 2. Environment Configuration
Create/Update `.env` file:
```env
UPSTOX_API_KEY=your_upstox_api_key
UPSTOX_API_SECRET=your_upstox_api_secret
UPSTOX_REDIRECT_URI=http://localhost:3000/callback
PYTHON_BACKEND_URL=http://127.0.0.1:8000
PORT=3000
```

### 3. Start the Server
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

Server should start on `http://localhost:3000`

## Test the Flow

### Step 1: Test Login Redirect
Visit: `http://localhost:3000/login`
- Should redirect to Upstox login page

### Step 2: Test with Python Backend
Using a Python backend at `http://127.0.0.1:8000/start-trading`, use the integrated version:

**Replace** `controllers/trading/trading.js` with `controllers/trading/trading-with-python-backend.js`:
```bash
cp controllers/trading/trading-with-python-backend.js controllers/trading/trading.js
```

### Step 3: Test API Endpoints

#### Test Start Trading
```bash
curl -X POST http://localhost:3000/start-trading \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "DEV0",
    "access_token": "token_here",
    "trade_mode": "VIRTUAL",
    "capital": 50000,
    "USE_AI_VALIDATION": false,
    "DEBUG_MODE": true
  }'
```

#### Test Stop Trading
```bash
curl -X POST http://localhost:3000/stop-trading \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "DEV0",
    "access_token": "token_here"
  }'
```

#### Test Get Status
```bash
curl http://localhost:3000/trading-status?user_id=DEV0
```

### Step 4: Test Via Browser
1. Visit: `http://localhost:3000/login`
2. Complete Upstox authentication
3. Dashboard should load automatically
4. Configure settings:
   - Capital: 50000
   - Trade Mode: VIRTUAL
   - Check/Uncheck AI Validation
   - Check/Uncheck Debug Mode
5. Click "Start Trading"
6. Observe status message
7. Click "Stop Trading"
8. Click "Logout"

## Files Modified/Created

### New Files
- `public/trading-dashboard.html` - UI dashboard
- `controllers/trading/trading.js` - Backend logic
- `controllers/trading/trading-with-python-backend.js` - Python integration

### Modified Files
- `routes/router.js` - Added trading routes
- `controllers/Login/Auth/LoginAuth.js` - Redirect to dashboard
- `loaders/express.js` - Static file serving

### Documentation
- `TRADING_DASHBOARD_GUIDE.md` - Comprehensive guide
- `QUICK_START.md` - This file

## Troubleshooting

### Dashboard Not Loading After Login
1. Check that static files are being served:
   - Visit `http://localhost:3000/trading-dashboard.html` directly
   - Should show the dashboard UI

2. Check express.js configuration:
   - Verify `static()` middleware is set up
   - Path should be `../public`

### API Calls Returning 404
1. Verify routes are imported in `routes/router.js`
2. Check controller is properly exported
3. Restart server after changes

### Python Backend Integration Not Working
1. Ensure Python backend is running on `http://127.0.0.1:8000`
2. Check `PYTHON_BACKEND_URL` in `.env`
3. Use `trading-with-python-backend.js` version
4. Enable `DEBUG_MODE` to test without backend

### CORS Errors in Browser Console
Add CORS middleware to `loaders/express.js`:
```javascript
const cors = require('cors');
app.use(cors());
```

## Next Steps

1. **Database Integration**
   ```javascript
   // Replace in-memory sessions with MongoDB
   const Trading = require('../models/Trading');
   ```

2. **Real Market Data**
   - Connect WebSocket for live prices
   - Update P&L in real-time

3. **Trading Execution**
   - Integrate with order placement API
   - Implement risk management

4. **Monitoring**
   - Add logging to database
   - Create analytics dashboard

5. **Production Deployment**
   - Use process manager (PM2)
   - Set up reverse proxy (Nginx)
   - Configure SSL certificates

## Common Curl Examples

### Full Trading Cycle
```bash
# 1. Start trading
SESSION=$(curl -s -X POST http://localhost:3000/start-trading \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "DEV0",
    "access_token": "token",
    "trade_mode": "VIRTUAL",
    "capital": 50000,
    "USE_AI_VALIDATION": false,
    "DEBUG_MODE": true
  }' | jq -r '.sessionId')

echo "Session: $SESSION"

# 2. Check status
curl http://localhost:3000/trading-status?user_id=DEV0

# 3. Stop trading
curl -X POST http://localhost:3000/stop-trading \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "DEV0",
    "access_token": "token"
  }'
```

## Support

For issues or questions:
1. Check logs in terminal
2. Verify environment variables
3. Check browser console for frontend errors
4. Review this guide step-by-step
