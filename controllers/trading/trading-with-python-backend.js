// controllers/trading/trading.js - DIRECT PROXY TO PYTHON
// This version proxies all requests directly to Python backend at http://127.0.0.1:8000

const axios = require('axios');

// Configuration
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
const mongoose = require('mongoose');

// Standard approved default configuration for paper trading
const FALLBACK_CONFIG = {
    strategy_version: 'strategy-v2026.10.15',
    paper_only: true,
    risk_engine: {
        enabled: true,
        can_disable: false,
        max_risk_per_trade: 0.02,
        max_daily_loss: 0.05
    },
    defaults: {
        capital: 100000,
        trade_mode: 'PAPER',
        DEBUG_MODE: false,
        USE_AI_VALIDATION: false,
        ENABLE_MARKET_DATA_RECORDER: true,
        RECORDER_OUTPUT_PATH: 'data/market_data',
        target_symbol: 'NSE_INDEX|Nifty Bank',
        lots: 1,
        risk_per_trade: 0.02,
        max_daily_loss: 0.05,
        sl_cooldown_minutes: 5,
        direction_flip_cooldown_minutes: 2.0,
        post_exit_cooldown_minutes: 2.0,
        ENABLE_DYNAMIC_COOLDOWN: false,
        ENABLE_DEPTH_GATING: true,
        REQUIRE_DEPTH_TO_ENTER: false,
        MIN_DEPTH_QTY: 30,
        MAX_SPREAD_WIDTH: 5.0,
        ENABLE_OFI_DEPTH_GATING: true,
        MAX_DEPTH_IMBALANCE_RATIO: 3.0,
        ENABLE_L2_DUAL_GUARD: false,
        MAX_L2_SPREAD: 3.5,
        MIN_L2_BID_IMBALANCE: 0.15,
        WATCHDOG_INTERVAL_SEC: 60,
        TICK_GAP_THRESHOLD_SEC: 120.0,
        EVAL_GAP_THRESHOLD_SEC: 180.0,
        RECORDER_BUFFER_SIZE: 50000,
        RECORDER_FLUSH_INTERVAL_SEC: 0.5,
        RECORDER_FLUSH_BATCH_SIZE: 1000,
        RECORDER_MIN_DISK_FREE_GB: 2.0,
        RECORDER_MAX_RECOVERY_ATTEMPTS: 3
    },
    strategy: {
        editable: false,
        min_score: 7,
        no_new_entry_after: '15:15',
        force_exit_all_at: '15:20',
        eod_audit_at: '15:30'
    },
    frozen_strategy: {
        setups: [
            'MOMENTUM_ENTRY',
            'VWAP_BOUNCE',
            'EMA_CROSSOVER',
            'BREAKOUT',
            'RANGE_BOUNCE',
            'SQUEEZE_BREAKOUT',
            'REVERSAL_EXHAUSTION',
            'MULTI_TF_CONFLUENCE',
            'ORB_BREAKOUT',
            'DIVERGENCE_REVERSAL',
            'PULLBACK_CONTINUATION'
        ]
    },
    backend_connected: false
};

function getMarketSchedule() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const istDate = new Date(utcTime + istOffset);
    const day = istDate.getDay();
    const totalMinutes = istDate.getHours() * 60 + istDate.getMinutes();
    const isWeekend = day === 0 || day === 6;
    const isMarketHours = !isWeekend && totalMinutes >= 555 && totalMinutes <= 930;

    let statusText = 'Market open';
    if (isWeekend) {
        statusText = 'Market closed (Weekend)';
    } else if (totalMinutes < 555) {
        statusText = 'Market opens at 09:15 IST';
    } else if (totalMinutes > 930) {
        statusText = 'Market closed (Post-market)';
    }

    return {
        isMarketHours,
        isWeekend,
        statusText,
        istDate
    };
}

async function getOfflineSessionStatus(user_id) {
    const schedule = getMarketSchedule();
    let todayPnl = 0;
    let lastSessionId = null;
    let strategyVersion = 'strategy-v2026.10.15';
    let lastEvalTime = null;
    let evaluationsCount = 0;
    let targetSymbol = 'NSE_INDEX|Nifty Bank';
    let marketSnapshot = null;

    if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
        try {
            const db = mongoose.connection.db;
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
            const istNow = new Date(utcTime + istOffset);
            istNow.setHours(0, 0, 0, 0);
            const todayUtcStart = new Date(istNow.getTime() - istOffset);

            const todayTrades = await db.collection('trades').find({
                user_id: user_id,
                mode: 'PAPER',
                status: 'CLOSED',
                created_at: { $gte: todayUtcStart }
            }).sort({ created_at: -1 }).toArray();

            if (todayTrades.length > 0) {
                todayPnl = todayTrades.reduce((sum, t) => sum + (Number(t.pnl?.net_pnl) || 0), 0);
                lastSessionId = todayTrades[0].session_id || null;
                strategyVersion = todayTrades[0].strategy_version || strategyVersion;
                lastEvalTime = todayTrades[0].exit?.time || todayTrades[0].created_at || null;
                evaluationsCount = todayTrades.length;
                if (todayTrades[0].symbol) targetSymbol = todayTrades[0].symbol;
            } else {
                const recentTrade = await db.collection('trades').findOne(
                    { user_id: user_id, mode: 'PAPER' },
                    { sort: { created_at: -1 } }
                );
                if (recentTrade) {
                    lastSessionId = recentTrade.session_id || null;
                    strategyVersion = recentTrade.strategy_version || strategyVersion;
                    if (recentTrade.symbol) targetSymbol = recentTrade.symbol;
                }
            }

            const lastSignal = await db.collection('signals').findOne(
                { user_id: user_id },
                { sort: { timestamp: -1 } }
            );

            if (lastSignal) {
                const a = lastSignal.analysis || {};
                const c = lastSignal.candle || {};
                const bias = a.dow_bias || a.tf15_trend || 'NEUTRAL';
                marketSnapshot = {
                    candle: {
                        open: c.open != null ? c.open : null,
                        high: c.high != null ? c.high : null,
                        low: c.low != null ? c.low : null,
                        close: c.close != null ? c.close : (a.vwap || null),
                    },
                    vwap: a.vwap != null ? a.vwap : null,
                    trend: a.tf15_trend || null,
                    regime: a.regime || null,
                    bias: bias,
                    timestamp: c.timestamp || lastSignal.timestamp || null
                };
            }
        } catch (dbErr) {
            console.warn('[Trading] Could not fetch offline status from MongoDB:', dbErr.message);
        }
    }

    return {
        user_id,
        active: false,
        backend_connected: false,
        market_open: schedule.isMarketHours,
        market_schedule_text: schedule.statusText,
        strategy_version: strategyVersion,
        session_id: lastSessionId,
        mode: 'PAPER',
        paper_only: true,
        target_symbol: targetSymbol,
        risk: {
            pnl: todayPnl,
            locked: false,
            reason: schedule.isMarketHours ? 'Execution engine in standby' : schedule.statusText
        },
        telemetry: {
            ticks: null,
            candles: null,
            evaluations: evaluationsCount || null,
            last_tick: null,
            last_evaluation: lastEvalTime
        },
        recorder: {
            enabled: true,
            state: schedule.isMarketHours ? 'STANDBY' : 'CLOSED',
            output_path: 'data/market_data'
        },
        active_trade: null,
        market_snapshot: marketSnapshot
    };
}

// Start/stop are explicit proxies to the Python execution service. Keep the
// Node layer from inventing a local session when the execution service is down.
const startTrading = async (req, res) => {
    const body = req.body || {};
    if (!body.user_id) return res.status(400).json({ success: false, message: 'user_id is required' });
    try {
        const response = await axios.post(`${PYTHON_BACKEND_URL}/start-trading`, body, { timeout: 30000 });
        return res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 503;
        return res.status(status).json({
            success: false,
            message: 'Unable to start trading session through Python execution service',
            error: error.response?.data?.detail || error.message
        });
    }
};

const stopTrading = async (req, res) => {
    const body = req.body || {};
    const userId = body.user_id || req.query.user_id;
    if (!userId) return res.status(400).json({ success: false, message: 'user_id is required' });
    try {
        const response = await axios.post(`${PYTHON_BACKEND_URL}/stop-trading`, body, { timeout: 30000 });
        return res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 503;
        return res.status(status).json({
            success: false,
            message: 'Unable to stop trading session through Python execution service',
            error: error.response?.data?.detail || error.message
        });
    }
};

// Get trading session status - Checks Python service or seamlessly falls back to decoupled MongoDB standby
const getSessionStatus = async (req, res) => {
    try {
        const user_id = req.params.user_id || req.query.user_id;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'user_id is required'
            });
        }

        try {
            const pythonResponse = await axios.get(
                `${PYTHON_BACKEND_URL}/trading-status/${encodeURIComponent(user_id)}`,
                { timeout: 2500 }
            );
            return res.status(pythonResponse.status).json(pythonResponse.data);
        } catch (_) {
            // Python service is offline (outside market hours or before start) - deliver decoupled standby state
            const offlineData = await getOfflineSessionStatus(user_id);
            return res.status(200).json(offlineData);
        }

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
        const response = await axios.get(`${PYTHON_BACKEND_URL}/market-snapshot/${encodeURIComponent(user_id)}`, { timeout: 2500 });
        return res.status(response.status).json(response.data);
    } catch (_) {
        // Fallback to MongoDB latest recorded snapshot
        if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
            try {
                const db = mongoose.connection.db;
                const lastSignal = await db.collection('signals').findOne(
                    { user_id: user_id },
                    { sort: { timestamp: -1 } }
                );
                if (lastSignal) {
                    const a = lastSignal.analysis || {};
                    const c = lastSignal.candle || {};
                    return res.status(200).json({
                        user_id,
                        available: true,
                        source: 'mongodb_persisted',
                        candle: {
                            open: c.open != null ? c.open : null,
                            high: c.high != null ? c.high : null,
                            low: c.low != null ? c.low : null,
                            close: c.close != null ? c.close : (a.vwap || null),
                            timestamp: c.timestamp || lastSignal.timestamp
                        },
                        vwap: a.vwap != null ? a.vwap : null,
                        trend: a.tf15_trend || null,
                        regime: a.regime || null,
                        bias: a.dow_bias || a.tf15_trend || 'NEUTRAL',
                        timestamp: c.timestamp || lastSignal.timestamp
                    });
                }
            } catch (dbErr) {
                console.warn('[Trading] Could not fetch market snapshot from MongoDB:', dbErr.message);
            }
        }
        return res.status(200).json({
            user_id,
            available: false,
            message: 'Market snapshot in standby / market closed'
        });
    }
};

// Return supported controls; returns fallback configuration when Python service is off
const getControlPanelConfig = async (_req, res) => {
    try {
        const pythonResponse = await axios.get(
            `${PYTHON_BACKEND_URL}/control-panel/config`,
            { timeout: 2500 }
        );
        return res.status(pythonResponse.status).json(pythonResponse.data);
    } catch (_) {
        return res.status(200).json(FALLBACK_CONFIG);
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
