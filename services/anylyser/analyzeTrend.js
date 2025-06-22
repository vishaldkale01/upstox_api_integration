const VirtualTrade = require('../../models/virtualTrade');

// Cache for recent calculations
const calculationCache = new Map();
const CACHE_EXPIRY = 1 * 60 * 1000; // 1 minute for scalping

// Add signal history cache
const previousSignalsCache = new Map();

// In-memory candle storage for each symbol
const candleStore = {};

// Function to store and validate signal consistency
const validateSignalConsistency = (symbol, currentSignals) => {
    const previousSignals = previousSignalsCache.get(symbol);
    const now = Date.now();
    
    // Store current signals for next comparison
    previousSignalsCache.set(symbol, {
        signals: currentSignals,
        timestamp: now
    });

    if (!previousSignals || (now - previousSignals.timestamp) > CACHE_EXPIRY) {
        console.log('No previous signals or signals expired, waiting for next candle...');
        return false;
    }

    // Compare current signals with previous signals
    const signalChecks = {
        emaTrend: currentSignals.ema === previousSignals.signals.ema,
        supertrendConsistent: currentSignals.supertrend === previousSignals.signals.supertrend,
        rsiTrending: (currentSignals.ema === 'BULLISH' && currentSignals.rsi > previousSignals.signals.rsi) ||
                    (currentSignals.ema === 'BEARISH' && currentSignals.rsi < previousSignals.signals.rsi),
        momentumContinuation: (currentSignals.ema === 'BULLISH' && currentSignals.momentum > previousSignals.signals.momentum) ||
                            (currentSignals.ema === 'BEARISH' && currentSignals.momentum < previousSignals.signals.momentum),
        velocityAligned: (currentSignals.velocity * previousSignals.signals.velocity) > 0 // Same direction
    };

    console.log('\nSignal Consistency Check:', signalChecks);
    
    // Allow trade if both emaTrend and supertrendConsistent are true, or if majority of checks pass
    const consistentSignals = (signalChecks.emaTrend && signalChecks.supertrendConsistent) ||
        Object.values(signalChecks).filter(v => v).length >= 3;
    
    if (!consistentSignals) {
        console.log('Signal consistency check failed. Waiting for stronger trend...');
    }
    
    return consistentSignals;
};

// Scalping configuration
const SCALPING_CONFIG = {
    targetPercent: 0.3,     // 0.3% target (~165 points on BankNifty)
    stopLossPercent: 0.2,   // 0.2% stop loss (~110 points)
    trailStopPercent: 0.1,  // 0.1% trailing stop
    minVolumeRatio: 0.8,    // Further reduced volume requirement
    minConfidence: 40,      // Lower confidence threshold for more trades
    minCandles: {
        oneMin: 5,          // Minimum 1-minute candles needed
        thirtyMin: 3        // Minimum 30-minute candles needed
    }
};

// === Technical Indicators for Scalping ===
const calculateSuperTrend = (candles, period = 10, multiplier = 3) => {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);

    // Calculate ATR
    const tr = highs.map((h, i) => {
        if (i === 0) return h - lows[i];
        const previousClose = closes[i - 1];
        return Math.max(h - lows[i], Math.abs(h - previousClose), Math.abs(lows[i] - previousClose));
    });

    const atr = tr.reduce((acc, curr) => acc + curr, 0) / period;

    // Current SuperTrend
    const upperBand = closes[closes.length - 1] + (multiplier * atr);
    const lowerBand = closes[closes.length - 1] - (multiplier * atr);

    return {
        upperBand,
        lowerBand,
        trend: closes[closes.length - 1] > lowerBand ? 'UP' : 'DOWN'
    };
};

const calculateMomentum = (prices, period = 10) => {
    if (prices.length < period) return 0;
    return ((prices[prices.length - 1] - prices[prices.length - period]) / prices[prices.length - period]) * 100;
};

// Calculate price velocity (rate of change)
const calculateVelocity = (prices, period = 5) => {
    if (prices.length < period) return 0;
    const changes = [];
    for (let i = 1; i < period; i++) {
        changes.push(prices[prices.length - i] - prices[prices.length - i - 1]);
    }
    return changes.reduce((acc, curr) => acc + curr, 0) / period;
};

// === Optimized Technical Indicator Functions ===

const calculateEMA = (prices, period) => {
    const cacheKey = `ema_${period}_${prices.join('')}`;
    if (calculationCache.has(cacheKey)) {
        const cached = calculationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
            return cached.value;
        }
    }

    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }

    calculationCache.set(cacheKey, { value: ema, timestamp: Date.now() });
    return ema;
};

const calculateRSI = (prices, period = 14) => {
    const cacheKey = `rsi_${period}_${prices.join('')}`;
    if (calculationCache.has(cacheKey)) {
        const cached = calculationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
            return cached.value;
        }
    }

    if (prices.length < period + 1) return 50;

    let avgGain = 0;
    let avgLoss = 0;

    // Initial RSI calculation
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) avgGain += diff;
        else avgLoss -= diff;
    }

    avgGain /= period;
    avgLoss /= period;

    // Wilder's smoothing for remaining periods
    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        avgGain = (avgGain * 13 + (diff > 0 ? diff : 0)) / 14;
        avgLoss = (avgLoss * 13 + (diff < 0 ? -diff : 0)) / 14;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    calculationCache.set(cacheKey, { value: rsi, timestamp: Date.now() });
    return rsi;
};

const calculateMACD = (prices) => {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    return ema12 - ema26;
};

const calculateSupportResistance = (candles) => {
    const pivotPoints = [];
    const lookback = 5; // Number of candles to look back/forward

    // Find pivot points using price action
    for (let i = lookback; i < candles.length - lookback; i++) {
        const currentHigh = candles[i].high;
        const currentLow = candles[i].low;
        
        let isHighPivot = true;
        let isLowPivot = true;

        // Check if it's a high pivot
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j === i) continue;
            if (candles[j].high > currentHigh) {
                isHighPivot = false;
                break;
            }
        }

        // Check if it's a low pivot
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j === i) continue;
            if (candles[j].low < currentLow) {
                isLowPivot = false;
                break;
            }
        }

        if (isHighPivot) pivotPoints.push({ price: currentHigh, type: 'resistance' });
        if (isLowPivot) pivotPoints.push({ price: currentLow, type: 'support' });
    }

    // Cluster analysis to find strong levels
    const levels = pivotPoints.reduce((acc, point) => {
        const tolerance = point.price * 0.001; // 0.1% tolerance
        const cluster = acc.find(c => Math.abs(c.price - point.price) <= tolerance);
        
        if (cluster) {
            cluster.count++;
            cluster.price = (cluster.price + point.price) / 2;
        } else {
            acc.push({ price: point.price, count: 1, type: point.type });
        }
        return acc;
    }, []);

    // Sort by strength (count) and get strongest levels
    const strongLevels = levels.sort((a, b) => b.count - a.count);
    
    return {
        resistance: strongLevels.find(l => l.type === 'resistance')?.price || Math.max(...candles.map(c => c.high)),
        support: strongLevels.find(l => l.type === 'support')?.price || Math.min(...candles.map(c => c.low))
    };
};

const analyzeVolume = (candles) => {
    const periods = 20;
    const recentCandles = candles.slice(-periods);
    
    // Filter out candles with invalid volume and ensure we have valid data
    const validCandles = recentCandles.filter(c => typeof c.volume === 'number' && !isNaN(c.volume) && c.volume > 0);
    
    if (validCandles.length === 0) {
        return {
            profile: 'NORMAL',
            ratio: 1
        };
    }

    const avgVolume = validCandles.reduce((sum, c) => sum + c.volume, 0) / validCandles.length;
    const lastCandle = candles[candles.length - 1];
    const lastVolume = typeof lastCandle.volume === 'number' && !isNaN(lastCandle.volume) && lastCandle.volume > 0 
        ? lastCandle.volume 
        : avgVolume;

    // Prevent division by zero and handle edge cases
    const volumeRatio = avgVolume === 0 ? 1 : lastVolume / avgVolume;

    // Ensure ratio is a valid number
    const safeRatio = !isFinite(volumeRatio) ? 1 : volumeRatio;

    return {
        profile: safeRatio > 1.5 ? 'VERY_HIGH' : 
                safeRatio > 1.2 ? 'HIGH' : 
                safeRatio < 0.8 ? 'LOW' : 'NORMAL',
        ratio: safeRatio
    };
};

const shouldOpenNewTrade = async (symbol) => {
    const openTrade = await VirtualTrade.findOne({ symbol, status: 'OPEN' });
    return !openTrade;
};

const calculateTradeConfidence = (signals, currentPrice, support, resistance, volumeRatio) => {
    let score = 0;
    const priceRange = resistance - support;
    
    // Technical signals (50%)
    if (signals.ema === 'BULLISH') score += 15;
    if (signals.macd === 'BULLISH') score += 15;
    if (signals.rsi === 'OVERSOLD') score += 10;
    if (signals.volumeProfile === 'VERY_HIGH') score += 10;
    else if (signals.volumeProfile === 'HIGH') score += 5;

    // Price action (30%)
    const pricePosition = (currentPrice - support) / priceRange;
    if (signals.overallTrend === 'CALL') {
        if (pricePosition < 0.3) score += 30; // Good entry point for long
    } else {
        if (pricePosition > 0.7) score += 30; // Good entry point for short
    }

    // Trend strength (20%)
    if (volumeRatio > 1.5) score += 20;
    else if (volumeRatio > 1.2) score += 15;
    else if (volumeRatio > 1) score += 10;

    return Math.min(score, 100);
};

const analyzeScalpingSignals = (candles, currentPrice) => {
    const prices = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);

    // Short-term indicators
    const ema9 = calculateEMA(prices, 9);
    const ema20 = calculateEMA(prices, 20);
    const rsi = calculateRSI(prices, 14);
    const supertrend = calculateSuperTrend(candles);
    const momentum = calculateMomentum(prices);
    const velocity = calculateVelocity(prices);

    // Price action analysis
    const lastThreeCandles = candles.slice(-3);
    const priceAction = analyzePriceAction(lastThreeCandles);

    return {
        ema: ema9 > ema20 ? 'BULLISH' : 'BEARISH',
        supertrend: supertrend.trend,
        rsi,
        momentum,
        velocity,
        priceAction,
        ema9Value: ema9,
        ema20Value: ema20
    };
};

const analyzePriceAction = (candles) => {
    if (candles.length < 3) return 'NEUTRAL';

    const [prev2, prev1, current] = candles;
    const bodySize = Math.abs(current.close - current.open);
    const wickSize = Math.abs(Math.max(current.high - current.close, current.open - current.low));

    // Detect price action patterns
    if (current.close > prev1.high && current.close > prev2.high) return 'BREAKOUT';
    if (current.close < prev1.low && current.close < prev2.low) return 'BREAKDOWN';
    if (bodySize > wickSize * 2) return current.close > current.open ? 'STRONG_BULL' : 'STRONG_BEAR';
    
    return 'NEUTRAL';
};

const calculateScalpingConfidence = (signals, volumeRatio) => {
    let score = 0;
    
    // Validate signals first
    if (!signals || typeof signals.rsi !== 'number' || !signals.ema || !signals.supertrend || !signals.priceAction) {
        console.log('Invalid or missing technical indicators:', signals);
        return 0;  // Return 0 confidence if indicators are invalid
    }

    // Trend alignment (40 points) - More strict conditions
    if (signals.ema === 'BULLISH' && signals.supertrend === 'UP') {
        score += 40;
        console.log('Strong bullish alignment: EMA and SuperTrend both bullish');
    } else if (signals.ema === 'BEARISH' && signals.supertrend === 'DOWN') {
        score += 40;
        console.log('Strong bearish alignment: EMA and SuperTrend both bearish');
    } else {
        console.log('Trend misalignment: EMA:', signals.ema, 'SuperTrend:', signals.supertrend);
    }

    // RSI (20 points) - More precise conditions
    if (signals.rsi < 30 && signals.ema === 'BULLISH') {
        score += 20;
        console.log('Oversold condition with bullish trend, RSI:', signals.rsi);
    } else if (signals.rsi > 70 && signals.ema === 'BEARISH') {
        score += 20;
        console.log('Overbought condition with bearish trend, RSI:', signals.rsi);
    } else {
        console.log('RSI neutral or misaligned:', signals.rsi);
    }

    // Price action (20 points) - Added validation
    if ((signals.priceAction === 'BREAKOUT' && signals.ema === 'BULLISH') || 
        (signals.priceAction === 'STRONG_BULL' && signals.supertrend === 'UP')) {
        score += 20;
        console.log('Confirmed bullish price action:', signals.priceAction);
    } else if ((signals.priceAction === 'BREAKDOWN' && signals.ema === 'BEARISH') || 
               (signals.priceAction === 'STRONG_BEAR' && signals.supertrend === 'DOWN')) {
        score += 20;
        console.log('Confirmed bearish price action:', signals.priceAction);
    } else {
        console.log('Price action not confirmed by trends:', signals.priceAction);
    }

    // Volume confirmation (20 points)
    if (volumeRatio > SCALPING_CONFIG.minVolumeRatio) {
        const volumeScore = 20 * Math.min(volumeRatio - 1, 1);
        score += volumeScore;
        console.log('Volume confirmation score:', volumeScore, 'Ratio:', volumeRatio);
    } else {
        console.log('Insufficient volume, ratio:', volumeRatio);
    }

    return Math.min(score, 100);
};

const updateExistingTrades = async (symbol, currentPrice, signals) => {
    const openTrades = await VirtualTrade.find({ symbol, status: 'OPEN' });

    for (const trade of openTrades) {
        // Dynamic trailing stop based on price velocity
        const trailStop = Math.abs(signals.velocity) > 1 
            ? SCALPING_CONFIG.trailStopPercent * 1.5 
            : SCALPING_CONFIG.trailStopPercent;

        // Update trailing stop
        if (trade.tradeType === 'CALL' && currentPrice > trade.entryPrice) {
            const newStop = currentPrice * (1 - trailStop);
            if (newStop > trade.stopLoss) {
                trade.stopLoss = newStop;
                console.log(`Updated trailing stop for ${symbol} CALL to ${newStop}`);
            }
        } else if (trade.tradeType === 'PUT' && currentPrice < trade.entryPrice) {
            const newStop = currentPrice * (1 + trailStop);
            if (newStop < trade.stopLoss) {
                trade.stopLoss = newStop;
                console.log(`Updated trailing stop for ${symbol} PUT to ${newStop}`);
            }
        }

        // Check if target is hit
        const targetHit = (
            (trade.tradeType === 'CALL' && currentPrice >= trade.targetPrice) ||
            (trade.tradeType === 'PUT' && currentPrice <= trade.targetPrice)
        );

        // Quick exit conditions for scalping
        const shouldExit = targetHit || (
            (trade.tradeType === 'CALL' && (
                currentPrice <= trade.stopLoss ||
                signals.supertrend === 'DOWN' ||
                (signals.velocity < -0.5 && signals.momentum < -0.5)
            )) ||
            (trade.tradeType === 'PUT' && (
                currentPrice >= trade.stopLoss ||
                signals.supertrend === 'UP' ||
                (signals.velocity > 0.5 && signals.momentum > 0.5)
            ))
        );

        if (shouldExit) {
            trade.status = 'CLOSED';
            trade.exitPrice = currentPrice;
            trade.exitTime = new Date();
            trade.pnl = trade.tradeType === 'CALL'
                ? (currentPrice - trade.entryPrice) * trade.quantity
                : (trade.entryPrice - currentPrice) * trade.quantity;
            trade.exitReason = targetHit ? 'TARGET_HIT' : 'STOP_OR_SIGNAL';
            
            await trade.save();
            console.log(`Scalping trade closed for ${symbol}:`, {
                reason: trade.exitReason,
                pnl: trade.pnl,
                entryPrice: trade.entryPrice,
                exitPrice: currentPrice,
                target: trade.targetPrice
            });
        }
    }
};

const analyzeTrend = async (data) => {
    for (const symbol in data.feeds) {
        const feed = data.feeds[symbol];
        if (!feed.ff?.indexFF?.marketOHLC?.ohlc) {
            console.log(`No OHLC data found for ${symbol}`);
            continue;
        }

        // Debug log incoming data
        console.log(`\n=== Analysis for ${symbol} ===`);
        console.log('Current Price:', feed.ff.indexFF.ltpc.ltp);
        console.log('Available Intervals:', feed.ff.indexFF.marketOHLC.ohlc.map(c => c.interval));        // First try to get 1-minute candles, if not enough, include 30-minute candles
        const candles = feed.ff.indexFF.marketOHLC.ohlc
            .filter(c => ['I1', 'I30'].includes(c.interval))
            .map(c => ({
                timestamp: new Date(Number(c.ts)),
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: parseFloat(c.volume) || 0,
                interval: c.interval
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        // Store all candles in memory for this symbol
        if (!candleStore[symbol]) candleStore[symbol] = [];
        // Only add new candles (by timestamp)
        const existingTimestamps = new Set(candleStore[symbol].map(c => c.timestamp.getTime()));
        for (const candle of candles) {
            if (!existingTimestamps.has(candle.timestamp.getTime())) {
                candleStore[symbol].push(candle);
            }
        }
        // Optionally, keep only the last N candles to limit memory usage
        if (candleStore[symbol].length > 500) {
            candleStore[symbol] = candleStore[symbol].slice(-500);
        }

        // Use the in-memory candles for analysis (for perfect entry/exit)
        const uniqueCandles = candleStore[symbol];
        console.log('Number of candles found:', uniqueCandles.length);
        console.log('Candle intervals:', uniqueCandles.map(c => c.interval).join(', '));
        
        // Reduce minimum candles requirement when using 30-minute candles
        const minRequiredCandles = uniqueCandles.some(c => c.interval === 'I30') ? 3 : 5;
        
        if (uniqueCandles.length < minRequiredCandles) {
            console.log(`Insufficient candles for analysis, minimum ${minRequiredCandles} required`);
            continue;
        }

        const currentPrice = feed.ff.indexFF.ltpc.ltp;
        // Use the full in-memory candle history for all analysis
        const signals = analyzeScalpingSignals(uniqueCandles, currentPrice);
        const { ratio: volumeRatio, profile: volumeProfile } = analyzeVolume(uniqueCandles);

        console.log('\nTechnical Signals:', {
            ema: signals.ema,
            supertrend: signals.supertrend,
            rsi: signals.rsi.toFixed(2),
            priceAction: signals.priceAction,
            volumeProfile,
            volumeRatio: volumeRatio.toFixed(2)
        });

        const confidence = calculateScalpingConfidence(signals, volumeRatio);
        console.log('Trade Confidence:', confidence);

        // Check trade conditions and signal consistency
        const canTrade = await shouldOpenNewTrade(symbol);
        const signalsConsistent = validateSignalConsistency(symbol, signals);
        
        console.log('Can open new trade:', canTrade);
        console.log('Signals consistent:', signalsConsistent);
        console.log('Meets confidence threshold:', confidence >= SCALPING_CONFIG.minConfidence);
        console.log('Meets volume threshold:', volumeRatio > SCALPING_CONFIG.minVolumeRatio);

        // Execute scalping trade if conditions are met
        if (confidence >= SCALPING_CONFIG.minConfidence && 
            await shouldOpenNewTrade(symbol) && 
            signalsConsistent) {
            
            const tradeType = signals.supertrend === 'UP' && signals.ema === 'BULLISH' ? 'CALL' : 'PUT';

            // Extra validation before trade with stricter checks
            const validationChecks = {
                priceNotZero: currentPrice > 0,
                signalsValid: signals.ema && signals.supertrend && typeof signals.rsi === 'number',
                indicatorsAligned: (tradeType === 'CALL' && (
                    signals.ema === 'BULLISH' && 
                    signals.supertrend === 'UP' && 
                    signals.ema9Value > signals.ema20Value && // Added EMA crossover validation
                    (signals.rsi < 70 || signals.velocity > 0)
                )) || (tradeType === 'PUT' && (
                    signals.ema === 'BEARISH' && 
                    signals.supertrend === 'DOWN' && 
                    signals.ema9Value < signals.ema20Value && // Added EMA crossover validation
                    (signals.rsi > 30 || signals.velocity < 0)
                )),
                trendAlignment: (tradeType === 'CALL' && (
                    signals.priceAction === 'BREAKOUT' || signals.priceAction === 'STRONG_BULL'
                )) || (tradeType === 'PUT' && (
                    signals.priceAction === 'BREAKDOWN' || signals.priceAction === 'STRONG_BEAR'
                )),
                volumeValid: volumeRatio > SCALPING_CONFIG.minVolumeRatio,
                momentumValid: (tradeType === 'CALL' && signals.momentum > 0) || 
                             (tradeType === 'PUT' && signals.momentum < 0)
            };

            console.log('\nDetailed Trade Validation:', {
                priceCheck: currentPrice,
                ema: signals.ema,
                supertrend: signals.supertrend,
                rsi: signals.rsi,
                momentum: signals.momentum,
                priceAction: signals.priceAction,
                volumeRatio
            });

            if (Object.values(validationChecks).every(check => check)) {
                const newTrade = new VirtualTrade({
                    symbol,
                    tradeType,
                    entryPrice: currentPrice,
                    targetPrice: tradeType === 'CALL'
                        ? currentPrice * (1 + SCALPING_CONFIG.targetPercent / 100)
                        : currentPrice * (1 - SCALPING_CONFIG.targetPercent / 100),
                    stopLoss: tradeType === 'CALL'
                        ? currentPrice * (1 - SCALPING_CONFIG.stopLossPercent / 100)
                        : currentPrice * (1 + SCALPING_CONFIG.stopLossPercent / 100),
                    quantity: 1,
                    signals: {
                        ...signals,
                        confidence,
                        volumeRatio
                    }
                });

                try {
                    await newTrade.save();
                    console.log(`\nNew scalping trade for ${symbol}:`, {
                        type: tradeType,
                        price: currentPrice,
                        confidence,
                        target: newTrade.targetPrice,
                        stopLoss: newTrade.stopLoss
                    });
                } catch (error) {
                    console.error('Error saving trade:', error);
                }
            } else {
                console.log('Trade validation failed:', 
                    Object.entries(validationChecks)
                        .filter(([_, value]) => !value)
                        .map(([key]) => key)
                        .join(', ')
                );
            }
        } else {
            console.log('\nNo trade executed. Reasons:');
            if (!canTrade) console.log('- Existing trade is open');
            if (confidence < SCALPING_CONFIG.minConfidence) console.log('- Confidence too low');
            if (volumeRatio <= SCALPING_CONFIG.minVolumeRatio) console.log('- Insufficient volume');
        }

        // All trade logic below this point now uses the full candle history for more accurate entries/exits
        await updateExistingTrades(symbol, currentPrice, signals);
    }
};

module.exports = analyzeTrend;
