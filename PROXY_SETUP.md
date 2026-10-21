# Direct Python Proxy Setup

## ✅ Updated to Direct Proxy Mode

The Node.js server now **proxies all requests directly to Python** without additional validation.

## 🔄 How It Works

### Request Flow
```
Client (Browser/curl)
    ↓
Node.js at http://localhost:3000/start-trading
    ↓
Python Backend at http://127.0.0.1:8000/start-trading
    ↓
Response returned directly to client
```

## 📝 Usage

### Through Node.js (Recommended)
```bash
curl -X POST http://localhost:3000/start-trading \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "DEV0",
    "access_token": "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ...",
    "trade_mode": "VIRTUAL",
    "capital": 50000,
    "USE_AI_VALIDATION": false,
    "DEBUG_MODE": true
  }'
```

**Or directly to Python (for testing)**
```bash
curl --location 'http://127.0.0.1:8000/start-trading' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "DEV0",
    "access_token": "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ...",
    "trade_mode": "VIRTUAL",
    "capital": 50000,
    "USE_AI_VALIDATION": false,
    "DEBUG_MODE": true
  }'
```

## ✅ What Gets Proxied

| Endpoint | Method | Proxy To |
|----------|--------|----------|
| /start-trading | POST | Python /start-trading |
| /stop-trading | POST | Python /stop-trading |
| /trading-status | GET | Local (Node.js) |
| /user-sessions | GET | Local (Node.js) |

## 🔄 Request/Response

### Start Trading - Pass Through
```
Node.js Request
├── Validates JSON
├── Forwards to Python at http://127.0.0.1:8000
└── Returns Python response directly

Python Response → Node.js → Client
```

### What Python Should Return
```json
{
  "success": true,
  "message": "Trading session started",
  "sessionId": "xxx",
  ...
}
```

### Error Handling
- **Python backend down:** Returns 503 with connection error
- **Python returns error:** Returns Python's error response
- **Python returns success:** Returns success with data
- **Timeout:** Returns 503 after 30 seconds

## 🧪 Testing

### Test 1: Python Backend Running
```bash
# Start Python backend first
python app.py  # or your Python server

# Then test proxy
curl -X POST http://localhost:3000/start-trading \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"DEV0", "access_token":"token", ...}'
```

**Expected:** Python's success response

### Test 2: Python Backend Down
```bash
# Don't start Python backend

curl -X POST http://localhost:3000/start-trading \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"DEV0", ...}'
```

**Expected:**
```json
{
  "success": false,
  "message": "Cannot connect to Python trading backend",
  "error": "connect ECONNREFUSED 127.0.0.1:8000",
  "hint": "Make sure Python backend is running at http://127.0.0.1:8000"
}
```

## 📊 Session Tracking

Local tracking (Node.js memory):
- Stores active sessions
- Tracks start/stop times
- Calculates uptime
- Available via `/trading-status` and `/user-sessions`

## 🚀 Configuration

### .env File
```env
PYTHON_BACKEND_URL=http://127.0.0.1:8000
PORT=3000
```

### Timeout
Current timeout: **30 seconds**

To change: Edit line in `startTrading` or `stopTrading`
```javascript
timeout: 30000 // milliseconds
```

## 📋 Endpoints

### POST /start-trading
Proxy directly to Python backend

**Request:**
```json
{
  "user_id": "DEV0",
  "access_token": "token",
  "trade_mode": "VIRTUAL",
  "capital": 50000,
  "USE_AI_VALIDATION": false,
  "DEBUG_MODE": true
}
```

**Response:** Whatever Python returns

### POST /stop-trading
Proxy directly to Python backend

**Request:**
```json
{
  "user_id": "DEV0",
  "access_token": "token"
}
```

**Response:** Whatever Python returns

### GET /trading-status?user_id=DEV0
Check active sessions (local tracking only)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_DEV0_xxx",
    "user_id": "DEV0",
    "status": "ACTIVE",
    "uptime": 120,
    ...
  }
}
```

### GET /user-sessions?user_id=DEV0
List all sessions for user (local tracking)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "sessionId": "session_DEV0_xxx",
      "status": "STOPPED",
      "uptime": 600
    },
    {
      "sessionId": "session_DEV0_yyy",
      "status": "ACTIVE",
      "uptime": 45
    }
  ]
}
```

## 🔧 Files

- **Controller:** `controllers/trading/trading-with-python-backend.js`
- **Routes:** `routes/router.js`
- **Dashboard:** `public/trading-dashboard.html`
- **Loaders:** `loaders/express.js`

## ✅ Setup Checklist

- [ ] Python backend running on http://127.0.0.1:8000
- [ ] Node.js dependencies installed (`npm install`)
- [ ] `.env` configured with correct URL
- [ ] Node.js server started (`npm run dev`)
- [ ] Test proxy with curl
- [ ] Python returns expected response format

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| 503 Connection refused | Python backend not running |
| Timeout (after 30s) | Python backend too slow |
| Invalid JSON | Check Python response format |
| Dashboard not loading | Check static files in `/public` |
| Token/Auth errors | Verify access_token is valid |

## 📝 Logs

Check terminal for proxy logs:
```
[Trading] Proxying start-trading to Python backend:
[Trading] Python backend response: {...}
```

## ✅ Ready to Use

The proxy is now ready. All you need:

1. Python backend running
2. Node.js running
3. Make requests to Node.js at port 3000

Node.js will forward to Python and return responses directly.

---

**Setup Mode:** Direct Proxy (No Additional Validation)
**Timeout:** 30 seconds
**Date:** May 29, 2026
