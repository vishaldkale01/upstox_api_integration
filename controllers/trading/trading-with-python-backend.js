// controllers/trading/trading.js - DIRECT PROXY TO PYTHON
// This version proxies all requests directly to Python backend at http://127.0.0.1:8000

const axios = require('axios');

// Configuration
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

// Start trading session - Direct proxy to Python backend
const startTrading = async (req, res) => {
    try {
        const requestData = req.body;


        console.log(`[Trading] Proxying start-trading to Python backend:`, {
            url: `${PYTHON_BACKEND_URL}/start-trading`,
            user_id: requestData.user_id,
            trade_mode: requestData.trade_mode,
            timestamp: new Date().toISOString()
        });

        // Forward request directly to Python backend
        const pythonResponse = await axios.post(
            `${PYTHON_BACKEND_URL}/start-trading`,
            requestData,
            {
                timeout: 30000 // 30 second timeout
            }
        );

        console.log('[Trading] Python backend response:', pythonResponse.data);

        // Log session locally for tracking
        if (!global.tradingSessions) {
            global.tradingSessions = {};
        }

        const sessionId = `session_${requestData.user_id}_${Date.now()}`;
        global.tradingSessions[sessionId] = {
            user_id: requestData.user_id,
            trade_mode: requestData.trade_mode,
            capital: requestData.capital,
            USE_AI_VALIDATION: requestData.USE_AI_VALIDATION,
            DEBUG_MODE: requestData.DEBUG_MODE,
            ENABLE_MARKET_DATA_RECORDER: requestData.ENABLE_MARKET_DATA_RECORDER,
            RECORDER_OUTPUT_PATH: requestData.RECORDER_OUTPUT_PATH,
            status: 'ACTIVE',
            startTime: new Date(),
            pythonBackendResponse: pythonResponse.data
        };

        // Return Python's response directly
        return res.status(pythonResponse.status).json(pythonResponse.data);

    } catch (error) {
        console.error('[Trading] Proxy error for start-trading:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            code: error.code
        });

        // Return error from Python or connection error
        if (error.response) {
            // Python backend responded with error
            return res.status(error.response.status).json({
                success: false,
                message: error.response.statusText || 'Python backend error',
                error: error.response.data
            });
        } else {
            // Connection error
            return res.status(503).json({
                success: false,
                message: 'Cannot connect to Python trading backend',
                error: error.message,
                hint: `Make sure Python backend is running at ${PYTHON_BACKEND_URL}`
            });
        }
    }
};

// Stop trading session - Direct proxy to Python backend
const stopTrading = async (req, res) => {
    try {
        const requestData = req.body || {};
        const userId = requestData.user_id || req.query?.user_id;

        console.log(`[Trading] Proxying stop-trading to Python backend:`, {
            url: `${PYTHON_BACKEND_URL}/stop-trading`,
            data: requestData,
            params: userId ? { user_id: userId } : undefined,
            timestamp: new Date().toISOString()
        });

        // Forward request directly to Python backend
        const pythonResponse = await axios.post(
            `${PYTHON_BACKEND_URL}/stop-trading`,
            requestData,
            {
                params: userId ? { user_id: userId } : undefined,
                timeout: 30000 // 30 second timeout
            }
        );

        console.log('[Trading] Python backend stop response:', pythonResponse.data);

        // Update local session tracking
        if (global.tradingSessions) {
            for (const [sessionId, session] of Object.entries(global.tradingSessions)) {
                if (session.user_id === requestData.user_id && session.status === 'ACTIVE') {
                    session.status = 'STOPPED';
                    session.endTime = new Date();
                    break;
                }
            }
        }

        // Return Python's response directly
        return res.status(pythonResponse.status).json(pythonResponse.data);

    } catch (error) {
        console.error('[Trading] Proxy error for stop-trading:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            code: error.code
        });

        // Return error from Python or connection error
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: error.response.statusText || 'Python backend error',
                error: error.response.data
            });
        } else {
            return res.status(503).json({
                success: false,
                message: 'Cannot connect to Python trading backend',
                error: error.message,
                hint: `Make sure Python backend is running at ${PYTHON_BACKEND_URL}`
            });
        }
    }
};

// Get trading session status - Check local tracking
const getSessionStatus = async (req, res) => {
    try {
        const user_id = req.params.user_id || req.query.user_id;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'user_id is required'
            });
        }

        const pythonResponse = await axios.get(
            `${PYTHON_BACKEND_URL}/trading-status/${encodeURIComponent(user_id)}`,
            { timeout: 10000 }
        );
        return res.status(pythonResponse.status).json(pythonResponse.data);

    } catch (error) {
        console.error('[Trading] Error getting session status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting session status',
            error: error.message
        });
    }
};

const getMarketSnapshot = async (req, res) => {
    const user_id = req.params.user_id || req.query.user_id;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required' });
    try {
        const response = await axios.get(`${PYTHON_BACKEND_URL}/market-snapshot/${encodeURIComponent(user_id)}`, { timeout: 10000 });
        return res.status(response.status).json(response.data);
    } catch (error) {
        return res.status(error.response?.status || 503).json({ success: false, message: 'Market snapshot unavailable' });
    }
};

// Describe only the controls supported and validated by the Python service.
const getControlPanelConfig = async (_req, res) => {
    try {
        const pythonResponse = await axios.get(
            `${PYTHON_BACKEND_URL}/control-panel/config`,
            { timeout: 10000 }
        );
        return res.status(pythonResponse.status).json(pythonResponse.data);
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        return res.status(503).json({
            success: false,
            message: 'Cannot connect to Python trading backend'
        });
    }
};

// Get all sessions for a user
const getUserSessions = async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'user_id is required'
            });
        }

        if (!global.tradingSessions) {
            global.tradingSessions = {};
        }

        const userSessions = [];
        for (const [sessionId, session] of Object.entries(global.tradingSessions)) {
            if (session.user_id === user_id) {
                userSessions.push({
                    sessionId,
                    ...session,
                    uptime: session.status === 'ACTIVE' 
                        ? Math.round((Date.now() - session.startTime.getTime()) / 1000)
                        : Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)
                });
            }
        }

        res.status(200).json({
            success: true,
            count: userSessions.length,
            data: userSessions
        });

    } catch (error) {
        console.error('[Trading] Error getting user sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting user sessions',
            error: error.message
        });
    }
};

// Get trading dashboard page
const getTradingDashboard = (req, res) => {
    try {
        const { userId, userName, email, userType, exchanges, accessToken } = req.query;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <script>
                    const userSession = {
                        userId: '${userId || 'DEV0'}',
                        userName: '${userName || 'User'}',
                        email: '${email || ''}',
                        userType: '${userType || ''}',
                        exchanges: '${exchanges || ''}',
                        accessToken: '${accessToken || ''}'
                    };
                    sessionStorage.setItem('userSession', JSON.stringify(userSession));
                    window.location.href = '/trading-dashboard.html?' + new URLSearchParams(userSession).toString();
                </script>
            </head>
            <body>
                <p>Redirecting to trading dashboard...</p>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('[Trading] Error loading dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading dashboard',
            error: error.message
        });
    }
};

module.exports = {
    startTrading,
    stopTrading,
    getSessionStatus,
    getMarketSnapshot,
    getControlPanelConfig,
    getUserSessions,
    getTradingDashboard
};
