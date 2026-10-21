# Trading Dashboard - Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User's Browser                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐         ┌──────────────────────────────────┐ │
│  │  Login Page      │         │   Trading Dashboard HTML         │ │
│  │  /login          │────────▶│   /trading-dashboard.html        │ │
│  │  (Redirect)      │         │                                  │ │
│  └──────────────────┘         │  - User Info Display             │ │
│         │                      │  - Settings Form                 │ │
│         │                      │  - Status Updates                │ │
│         ▼                      │  - Start/Stop Buttons            │ │
│  ┌──────────────────┐         └──────────────────────────────────┘ │
│  │  Upstox OAuth    │                      │                       │
│  │  Login Page      │                      │                       │
│  │  (External)      │                      ▼                       │
│  └──────────────────┘         ┌──────────────────────────────────┐ │
│         │                      │    JavaScript Client-side        │ │
│         │                      │                                  │ │
│         ▼                      │  - Fetch Calls                   │ │
│  ┌──────────────────┐         │  - Form Submission               │ │
│  │  User Auth       │         │  - Status Polling                │ │
│  │  /callback       │         │  - Error Handling                │ │
│  │  with code       │         └──────────────────────────────────┘ │
│  └──────────────────┘                      │                       │
└──────────────┬───────────────────────────────┼───────────────────────┘
               │                               │
               │  HTTP POST/GET                │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│            Node.js/Express Backend (Port 3000)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Route Layer (routes/router.js)                             │   │
│  │                                                              │   │
│  │  GET  /login ────────────────────────────────────────────┐  │   │
│  │  GET  /callback ────────────────────────────────────────┐  │   │
│  │  GET  /trading-dashboard ─────────────────────────────┐  │   │
│  │  POST /start-trading ──────────────────────────────┐  │  │   │
│  │  POST /stop-trading ───────────────────────────────┤  │  │   │
│  │  GET  /trading-status ─────────────────────────────┤  │  │   │
│  │  GET  /user-sessions ──────────────────────────────┤  │  │   │
│  └─────────────────────────────────────────────────────┼──┼──┘   │
│                                                        │  │        │
│  ┌─────────────────────────────────────────────────────┘  │        │
│  │                                                         │        │
│  │  ┌──────────────────────────────────────────────────┐  │        │
│  │  │  Controller Layer                                │  │        │
│  │  │                                                  │  │        │
│  │  │  ┌─────────────────────────────────────────┐   │  │        │
│  │  │  │ Login Controller                        │   │  │        │
│  │  │  │ - getLoginUrl()                         │   │  │        │
│  │  │  │ - handleCallback()                      │   │  │        │
│  │  │  └─────────────────────────────────────────┘   │  │        │
│  │  │                                                  │  │        │
│  │  │  ┌─────────────────────────────────────────┐   │  │        │
│  │  │  │ Trading Controller                      │   │  │        │
│  │  │  │ - startTrading()                        │   │  │        │
│  │  │  │ - stopTrading()                         │   │  │        │
│  │  │  │ - getSessionStatus()                    │   │  │        │
│  │  │  │ - getTradingDashboard()                 │   │  │        │
│  │  │  └─────────────────────────────────────────┘   │  │        │
│  │  └──────────────────────────────────────────────────┘  │        │
│  │                                    │                    │        │
│  └────────────────────────────────────┼────────────────────┘        │
│                                       ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Session Management Layer                                   │   │
│  │                                                              │   │
│  │  global.tradingSessions = {                                │   │
│  │    'session_DEV0_123456': {                                │   │
│  │      user_id, status, capital,                             │   │
│  │      startTime, trades[], pnl                              │   │
│  │    }                                                        │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ (Optional: Python Backend Integration)
                          │
                          ▼
        ┌─────────────────────────────────────────┐
        │  Python Trading Engine                  │
        │  (http://127.0.0.1:8000)                │
        │                                         │
        │  - /start-trading (POST)                │
        │  - /stop-trading (POST)                 │
        │  - Market data processing               │
        │  - Order execution                      │
        │  - P&L calculation                      │
        └─────────────────────────────────────────┘
```

## Request-Response Flow

### 1. Login Flow
```
User Browser                    Express Server                Upstox
    │                                │                          │
    ├─ GET /login ─────────────────▶ │                          │
    │                                │                          │
    │  ◀─ Redirect to Upstox URL ─── │  ◀─ OAuth URL ───────────┤
    │                                                             │
    ├─────────────────── User enters credentials ──────────────▶ │
    │                                                             │
    │  ◀─ Redirect to /callback?code=xxxxx ─────────────────────┤
    │
    ├─ GET /callback?code=xxxxx ───▶ │
    │                                │
    │                                ├─ Exchange code for token
    │                                │
    │                                ├─ Get user info
    │                                │
    │  ◀─ Redirect to /trading-dash..─ │
    │     board?userId=X&userName=Y&...
    │
    └─ GET /trading-dashboard.html
                                     ├─ Serve HTML file
                                     │
                                     ◀─ HTML + Session data
```

### 2. Start Trading Flow
```
Dashboard UI                  Express Backend              Python Backend
    │                             │                           │
    ├─ Enter Settings              │                           │
    │                              │                           │
    ├─ POST /start-trading ───────▶│                           │
    │  { user_id, capital, ... }   │                           │
    │                              │                           │
    │                              ├─ Validate Input           │
    │                              │                           │
    │                              ├─ Create Session (Memory)  │
    │                              │                           │
    │                              ├─ Forward to Python ──────▶│
    │                              │                           │
    │                              │◀─ Success Response ───────┤
    │                              │                           │
    │  ◀─ {success, sessionId} ────┤                           │
    │                              │                           │
    ├─ Update UI Status            │                           │
    │  "ACTIVE"                    │                           │
    │                              │                           │
    └─ Enable Stop Button          │
```

### 3. Stop Trading Flow
```
Dashboard UI                  Express Backend              Python Backend
    │                             │                           │
    ├─ POST /stop-trading ────────▶│                           │
    │  { user_id, access_token }   │                           │
    │                              │                           │
    │                              ├─ Find Active Session      │
    │                              │                           │
    │                              ├─ Forward to Python ──────▶│
    │                              │                           │
    │                              │◀─ Session Stats ──────────┤
    │                              │                           │
    │                              ├─ Update Session Status    │
    │                              │  to "STOPPED"             │
    │                              │                           │
    │  ◀─ {success, stats} ────────┤                           │
    │                              │                           │
    ├─ Update UI Status            │                           │
    │  "STOPPED"                   │                           │
    │                              │                           │
    └─ Display Summary             │
       (trades, P&L)               │
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  User Input                                      │
│  (Capital, Mode, AI Validation, Debug)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Validation Layer            │
         │ - Check capital >= 1000       │
         │ - Validate user ID            │
         │ - Check duplicate sessions    │
         └───────────┬───────────────────┘
                     │
                     ▼
         ┌───────────────────────────────┐
         │   Processing Layer            │
         │ - Create session record       │
         │ - Generate session ID         │
         │ - Log activity                │
         └───────────┬───────────────────┘
                     │
                     ├─────────────┬──────────────────┐
                     │             │                  │
                     ▼             ▼                  ▼
          ┌──────────────────┐ ┌──────────┐ ┌───────────────┐
          │ Local Storage    │ │ Python   │ │ Database      │
          │ (Sessions)       │ │ Backend  │ │ (MongoDB)     │
          │                  │ │          │ │               │
          │ In-memory or     │ │ Forward  │ │ Persist       │
          │ MongoDB          │ │ requests │ │ for audit     │
          └──────────────────┘ └──────────┘ └───────────────┘
                     │             │                  │
                     └─────────────┼──────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   Response Generation    │
                    │ - Status: 200/500        │
                    │ - Data: session info     │
                    │ - Message: status text   │
                    └──────────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   Client Receives        │
                    │ - Updates UI status      │
                    │ - Enables/Disables       │
                    │   buttons and forms      │
                    └──────────────────────────┘
```

## State Diagram

```
                    ┌──────────────┐
                    │   NOT LOGGED │
                    │     IN       │
                    └──────┬───────┘
                           │
                           │ User clicks Login
                           ▼
                    ┌──────────────┐
                    │  REDIRECTED  │
                    │  TO UPSTOX   │
                    └──────┬───────┘
                           │
                           │ User authenticates
                           ▼
                    ┌──────────────┐
                    │   CALLBACK   │
                    │  HANDLING    │
                    └──────┬───────┘
                           │
                           │ Token received
                           ▼
                    ┌──────────────┐
                    │  DASHBOARD   │
                    │   LOADED     │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        │ Configure        │                  │
        │ settings         │                  │
        │                  ▼                  │
        │          ┌──────────────┐           │
        │          │   READY TO   │           │
        │          │   TRADE      │           │
        │          └──────┬───────┘           │
        │                 │                   │
        │ Click Start     │                   │
        │                 ▼                   │
        │          ┌──────────────┐           │
        │          │    TRADING   │           │
        │          │    ACTIVE    │           │
        │          └──────┬───────┘           │
        │                 │                   │
        │                 │ Click Stop        │
        │                 ▼                   │
        └────────▶ ┌──────────────┐ ◀─────────┘
                   │  STOPPED /   │
                   │  COMPLETED   │
                   └──────┬───────┘
                          │
                          │ Logout
                          ▼
                   ┌──────────────┐
                   │  NOT LOGGED  │
                   │     IN       │
                   └──────────────┘
```

## API Endpoint Map

```
┌─────────────────────────────────────────────────────────┐
│  Authentication Endpoints                               │
├─────────────────────────────────────────────────────────┤
│  GET  /login ...................... Redirect to Upstox  │
│  GET  /callback ................... Handle OAuth return │
│  GET  /trading-dashboard .......... Load dashboard UI   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Trading Endpoints                                      │
├─────────────────────────────────────────────────────────┤
│  POST /start-trading .............. Begin trading       │
│  POST /stop-trading ............... End trading         │
│  GET  /trading-status ............. Check current status│
│  GET  /user-sessions .............. List all sessions   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Static Content                                         │
├─────────────────────────────────────────────────────────┤
│  GET  /trading-dashboard.html ..... Dashboard UI file   │
│  GET  /*.html ..................... Any HTML files      │
│  GET  /*.css ....................... Any CSS files      │
│  GET  /*.js ........................ Any JS files       │
└─────────────────────────────────────────────────────────┘
```

## Database Schema (When Using MongoDB)

```
┌─────────────────────────────────────────────────────────┐
│  tradingSessions Collection                             │
├─────────────────────────────────────────────────────────┤
│  {                                                      │
│    _id: ObjectId,                                       │
│    sessionId: "session_DEV0_123456",                    │
│    user_id: "DEV0",                                     │
│    trade_mode: "VIRTUAL",                              │
│    capital: 50000,                                      │
│    USE_AI_VALIDATION: false,                           │
│    DEBUG_MODE: true,                                   │
│    status: "ACTIVE" | "STOPPED" | "FAILED",            │
│    startTime: Date,                                     │
│    endTime: Date,                                       │
│    trades: [{                                          │
│      id, symbol, qty, price, type                      │
│    }],                                                  │
│    pnl: 2500,                                          │
│    createdAt: Date,                                    │
│    updatedAt: Date                                     │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌────────────────────────────────────────────────────────────────┐
│                    Trading Dashboard                           │
├────────────────────────────────────────────────────────────────┤
│                         │                                       │
│  ┌─────────────────────┴──────────────────────────────┐        │
│  │                                                    │        │
│  ▼                                                    ▼        │
│  ┌──────────────────┐                      ┌──────────────────┐
│  │  Upstox OAuth    │                      │   Python Trading │
│  │  Integration     │                      │   Engine         │
│  │                  │                      │                  │
│  │ - Login          │                      │ - Start trading  │
│  │ - Callback       │                      │ - Stop trading   │
│  │ - Token Exchange │                      │ - Order exec     │
│  └──────────────────┘                      └──────────────────┘
│                                                    │
│                                                    │
│                                          ┌─────────┴─────────┐
│                                          │                   │
│                                          ▼                   ▼
│                                   ┌──────────────┐  ┌──────────────┐
│                                   │ Market Data  │  │ Risk Mgmt    │
│                                   │ Feed         │  │ Module       │
│                                   └──────────────┘  └──────────────┘
└────────────────────────────────────────────────────────────────┘
```

---

**Last Updated:** May 29, 2026
**Diagram Version:** 1.0
**Status:** Production Ready
