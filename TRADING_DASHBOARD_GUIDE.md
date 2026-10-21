# Trading Dashboard Implementation Guide

## Overview
This implementation provides a complete web-based trading dashboard that integrates with the Upstox authentication flow. After users login via Upstox, they are redirected to an interactive dashboard where they can start/stop automated trading sessions.

## Architecture

### Components Created

#### 1. **Trading Dashboard UI** (`public/trading-dashboard.html`)
A modern, responsive web page with:
- **User Information Display**: Shows logged-in user details (ID, name, email, account type)
- **Trading Settings**: Capital amount, trade mode (Virtual/Live), AI validation toggle, debug mode
- **Action Buttons**: Start Trading, Stop Trading, Logout
- **Status Display**: Real-time feedback on trading operations
- **Session Management**: Display active trading status

**Features:**
- Gradient UI with smooth animations
- Responsive design (works on desktop, tablet, mobile)
- Real-time status updates
- Form validation for capital input (minimum ₹1000)
- Settings disable while trading is active

#### 2. **Trading Controller** (`controllers/trading/trading.js`)
Backend logic for handling trading operations:

**Functions:**
- `startTrading()` - Initializes a trading session
  - Validates user input
  - Creates session record
  - Returns session ID and status
  
- `stopTrading()` - Terminates active trading session
  - Finds and stops active session
  - Returns final session statistics
  
- `getSessionStatus()` - Retrieves current session status
  - Returns active session details or "NO_ACTIVE_SESSION"
  
- `getTradingDashboard()` - Redirector endpoint
  - Receives data from login callback
  - Passes data to frontend via URL params

#### 3. **Updated Authentication** (`controllers/Login/Auth/LoginAuth.js`)
Modified callback handler:
- After successful Upstox authentication
- Redirects to `/trading-dashboard?userParams` instead of JSON response
- Passes access token and user info to dashboard

#### 4. **Routes** (`routes/router.js`)
New endpoints added:
- `GET /trading-dashboard` - Dashboard page handler
- `POST /start-trading` - Start trading session
- `POST /stop-trading` - Stop trading session
- `GET /trading-status` - Check session status

#### 5. **Express Configuration** (`loaders/express.js`)
- Added static file serving from `/public` directory
- Enables serving HTML, CSS, and JavaScript files

## API Endpoints

### 1. Start Trading
**Endpoint:** `POST /start-trading`

**Request:**
```json
{
    "user_id": "DEV0",
    "access_token": "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ...",
    "trade_mode": "VIRTUAL",
    "capital": 50000,
    "USE_AI_VALIDATION": false,
    "DEBUG_MODE": true
}
```

**Response:**
```json
{
    "success": true,
    "message": "Trading session started successfully",
    "sessionId": "session_DEV0_1234567890",
    "data": {
        "user_id": "DEV0",
        "trade_mode": "VIRTUAL",
        "capital": 50000,
        "USE_AI_VALIDATION": false,
        "DEBUG_MODE": true,
        "status": "ACTIVE",
        "startTime": "2026-05-29T12:00:00.000Z"
    }
}
```

### 2. Stop Trading
**Endpoint:** `POST /stop-trading`

**Request:**
```json
{
    "user_id": "DEV0",
    "access_token": "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ..."
}
```

**Response:**
```json
{
    "success": true,
    "message": "Trading session stopped successfully",
    "data": {
        "user_id": "DEV0",
        "status": "STOPPED",
        "endTime": "2026-05-29T12:30:00.000Z",
        "totalTrades": 15,
        "totalPnL": 2500
    }
}
```

### 3. Get Session Status
**Endpoint:** `GET /trading-status?user_id=DEV0`

**Response:**
```json
{
    "success": true,
    "data": {
        "user_id": "DEV0",
        "status": "ACTIVE",
        "capital": 50000,
        "totalTrades": 5,
        "pnl": 1200
    }
}
```

## User Flow

1. **Login**
   - User visits `/login`
   - Redirected to Upstox authentication
   - User authenticates with Upstox credentials

2. **Callback**
   - Upstox redirects to `/callback` with authorization code
   - Backend exchanges code for access token
   - User is redirected to `/trading-dashboard` with user info

3. **Dashboard**
   - User data is displayed
   - User configures trading settings (capital, mode, validation)
   - User clicks "Start Trading"

4. **Trading Session**
   - Request sent to `/start-trading` endpoint
   - Session is created and stored
   - Dashboard shows "ACTIVE" status
   - Settings are disabled to prevent changes

5. **Stop Trading**
   - User clicks "Stop Trading"
   - Request sent to `/stop-trading` endpoint
   - Session is terminated and statistics shown
   - Settings are re-enabled

6. **Logout**
   - User clicks "Logout"
   - If trading active, session is stopped
   - User is redirected to login page

## Integration with Python Backend

To connect this dashboard to your Python trading engine at `http://127.0.0.1:8000/start-trading`:

### Option 1: Proxy Requests
Update `controllers/trading/trading.js`:

```javascript
const axios = require('axios');

const startTrading = async (req, res) => {
    try {
        const response = await axios.post(
            'http://127.0.0.1:8000/start-trading',
            req.body
        );
        
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
```

### Option 2: Direct Frontend Requests
Modify dashboard to call Python backend directly (handle CORS):

```javascript
async function startTrading() {
    const response = await fetch('http://127.0.0.1:8000/start-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...})
    });
}
```

## File Structure

```
upstox/
├── public/
│   └── trading-dashboard.html        # Trading UI
├── controllers/
│   ├── Login/Auth/
│   │   └── LoginAuth.js              # Updated with redirect
│   └── trading/
│       └── trading.js                # New trading controller
├── routes/
│   └── router.js                     # Updated with trading routes
├── loaders/
│   └── express.js                    # Updated with static serving
└── app.js
```

## Environment Variables Needed

```env
UPSTOX_API_KEY=your_api_key
UPSTOX_API_SECRET=your_api_secret
UPSTOX_REDIRECT_URI=http://localhost:3000/callback
PORT=3000
```

## Testing

### Test with curl
```bash
curl -X POST http://localhost:3000/start-trading \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "DEV0",
    "access_token": "token",
    "trade_mode": "VIRTUAL",
    "capital": 50000,
    "USE_AI_VALIDATION": false,
    "DEBUG_MODE": true
  }'
```

### Test via Dashboard
1. Start the server: `npm start` or `npm run dev`
2. Visit `http://localhost:3000/login`
3. Complete Upstox authentication
4. Dashboard loads automatically
5. Configure settings and click "Start Trading"

## Production Considerations

1. **Database Integration**: Replace in-memory `global.tradingSessions` with MongoDB
2. **Session Persistence**: Store sessions with timestamps and user data
3. **Error Handling**: Implement comprehensive error logging
4. **Security**: Add rate limiting, input validation, CORS configuration
5. **Real Trading**: Integrate actual market data and order execution
6. **WebSocket**: Connect live price updates for active sessions
7. **Monitoring**: Add analytics and trading metrics tracking
8. **Notifications**: Add email/SMS alerts for important events

## Customization

### Change Dashboard Styling
Edit the `<style>` section in `trading-dashboard.html`

### Add More Trading Settings
Update the form in dashboard and add corresponding fields in `startTrading()`

### Add Trading Status Indicators
Update `updateTradingStatus()` function and dashboard HTML

### Modify Start/Stop Logic
Update `startTrading()` and `stopTrading()` in `controllers/trading/trading.js`

## Troubleshooting

1. **Dashboard not loading**: Check static file path in express.js
2. **API calls failing**: Verify CORS headers and content-type
3. **Session not persisting**: Implement database instead of in-memory storage
4. **Authentication failing**: Check Upstox credentials and redirect URI

## Next Steps

1. Test the complete flow end-to-end
2. Integrate with your Python trading engine
3. Add database for session persistence
4. Implement real market data updates
5. Add trading analytics and reporting
6. Deploy to production
