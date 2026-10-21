# Trading Dashboard - Installation Checklist

## Pre-Installation Requirements
- [ ] Node.js installed (v14 or higher)
- [ ] npm or yarn available
- [ ] Upstox API credentials (API Key & Secret)
- [ ] Python backend running (if integrating)

## Installation Steps

### Step 1: Install Dependencies
```bash
cd "c:\Users\VAIBHAV\New folder (5)\upstox"
npm install
```
- [ ] No errors during installation
- [ ] All packages installed successfully

### Step 2: Environment Configuration
Create `.env` file in the upstox directory:
```env
UPSTOX_API_KEY=your_upstox_api_key_here
UPSTOX_API_SECRET=your_upstox_api_secret_here
UPSTOX_REDIRECT_URI=http://localhost:3000/callback
PYTHON_BACKEND_URL=http://127.0.0.1:8000
PORT=3000
```

Checklist:
- [ ] `.env` file created
- [ ] All environment variables filled in
- [ ] `.env` added to `.gitignore` (if using git)

### Step 3: Verify Files Created
Check that these files exist:
- [ ] `public/trading-dashboard.html`
- [ ] `controllers/trading/trading.js`
- [ ] `controllers/trading/trading-with-python-backend.js`
- [ ] Modified: `controllers/Login/Auth/LoginAuth.js`
- [ ] Modified: `routes/router.js`
- [ ] Modified: `loaders/express.js`
- [ ] `test-trading-api.js`
- [ ] `TRADING_DASHBOARD_GUIDE.md`
- [ ] `QUICK_START.md`
- [ ] `IMPLEMENTATION_SUMMARY.md`

### Step 4: Start the Server
```bash
npm run dev
```

Expected output:
- [ ] Server listening on port 3000
- [ ] No error messages
- [ ] WebSocket initialized
- [ ] MongoDB connected (if configured)

### Step 5: Test API Endpoints
```bash
node test-trading-api.js
```

Expected results:
- [ ] Start Trading: PASS
- [ ] Get Status: PASS
- [ ] Stop Trading: PASS
- [ ] Dashboard: PASS

### Step 6: Test in Browser

**Test 1: Dashboard Page**
```
http://localhost:3000/trading-dashboard.html
```
- [ ] Page loads successfully
- [ ] All UI elements visible
- [ ] No console errors

**Test 2: Login Flow**
```
http://localhost:3000/login
```
- [ ] Redirects to Upstox login
- [ ] Can authenticate (if you have real credentials)
- [ ] Callback works (redirects back)

**Test 3: Manual API Test (curl)**
```bash
curl -X POST http://localhost:3000/start-trading \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "DEV0",
    "access_token": "test",
    "trade_mode": "VIRTUAL",
    "capital": 50000,
    "USE_AI_VALIDATION": false,
    "DEBUG_MODE": true
  }'
```
- [ ] Returns 200 status
- [ ] Response includes sessionId
- [ ] Success message present

## Configuration Options

### For Python Backend Integration
If you want to forward requests to Python backend:
1. [ ] Rename `controllers/trading/trading-with-python-backend.js` to `controllers/trading/trading.js`
2. [ ] OR replace the existing trading.js content with the integration version
3. [ ] Ensure Python backend is running on the URL specified in `.env`
4. [ ] Test again with `node test-trading-api.js`

### For Database Integration (MongoDB)
1. [ ] Install mongoose: `npm install mongoose`
2. [ ] Create models in `models/` directory
3. [ ] Update trading.js to use models instead of global sessions
4. [ ] Update `.env` with MongoDB connection string

## Troubleshooting

### Issue: Port 3000 Already in Use
```bash
# Windows: Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change PORT in .env to 3001
```
- [ ] Server starts successfully
- [ ] No port conflict

### Issue: Cannot Find Module 'express'
```bash
# Reinstall dependencies
rm -r node_modules package-lock.json
npm install
```
- [ ] Dependencies reinstalled
- [ ] No missing module errors

### Issue: Upstox Callback Failing
- [ ] Check UPSTOX_API_KEY is correct
- [ ] Check UPSTOX_API_SECRET is correct
- [ ] Check UPSTOX_REDIRECT_URI matches registered URI
- [ ] Restart server after changing .env

### Issue: Dashboard Not Loading After Login
- [ ] Check that `/public` folder exists
- [ ] Verify `trading-dashboard.html` is in `/public`
- [ ] Check express.js has static file serving configured
- [ ] Check browser console for JavaScript errors

## Performance Verification

After setup, verify performance:
- [ ] Dashboard loads in < 1 second
- [ ] API responses < 500ms
- [ ] No console warnings
- [ ] Smooth animations/interactions
- [ ] Mobile responsive on various screen sizes

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Sensitive data not logged to console
- [ ] Access tokens not stored in localStorage permanently
- [ ] HTTPS will be used in production
- [ ] CORS configuration will be done for production

## Documentation Review

- [ ] Read `QUICK_START.md` for quick reference
- [ ] Review `TRADING_DASHBOARD_GUIDE.md` for full details
- [ ] Check `IMPLEMENTATION_SUMMARY.md` for overview
- [ ] Bookmark test commands for future use

## Next Steps After Installation

1. **Test the Complete Flow**
   - [ ] Login to Upstox
   - [ ] View dashboard
   - [ ] Start trading
   - [ ] View status
   - [ ] Stop trading
   - [ ] Logout

2. **Integrate with Python Backend**
   - [ ] Ensure Python backend is running
   - [ ] Use `trading-with-python-backend.js` version
   - [ ] Test forwarding of requests

3. **Add Persistence**
   - [ ] Set up MongoDB
   - [ ] Create models
   - [ ] Update controllers

4. **Deploy to Production**
   - [ ] Set up PM2 process manager
   - [ ] Configure reverse proxy (Nginx)
   - [ ] Set up SSL certificates
   - [ ] Configure domain name
   - [ ] Update environment variables

## Support Resources

- **API Documentation:** `TRADING_DASHBOARD_GUIDE.md`
- **Quick Setup:** `QUICK_START.md`
- **Testing Script:** `node test-trading-api.js`
- **Example Requests:** See QUICK_START.md curl section
- **Browser DevTools:** Inspect network requests and console

## Final Verification

Run this checklist one more time before considering installation complete:

- [ ] Server starts without errors
- [ ] Test suite passes (all 4 tests)
- [ ] Dashboard page loads
- [ ] API endpoints respond correctly
- [ ] Environment variables are set
- [ ] No console warnings or errors
- [ ] Documentation is reviewed

**Status:** ✅ Installation Complete!

---

**Estimated Installation Time:** 5-10 minutes
**Last Updated:** May 29, 2026
**Version:** 1.0.0
