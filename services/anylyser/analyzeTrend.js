const VirtualTrade = require('../../models/virtualTrade');

// Cache for recent calculations to avoid redundant processing
const calculationCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

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
    const avgVolume = recentCandles.reduce((sum, c) => sum + (c.volume || 0), 0) / periods;
    const lastVolume = candles[candles.length - 1].volume || 0;
    const volumeRatio = lastVolume / avgVolume;

    return {
        profile: volumeRatio > 1.5 ? 'VERY_HIGH' : 
                volumeRatio > 1.2 ? 'HIGH' : 
                volumeRatio < 0.8 ? 'LOW' : 'NORMAL',
        ratio: volumeRatio
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

const updateExistingTrades = async (symbol, currentPrice, signals) => {
    const openTrades = await VirtualTrade.find({ symbol, status: 'OPEN' });
    const trailPercent = 0.2;

    for (const trade of openTrades) {
        // Trailing stop-loss logic
        if (trade.tradeType === 'CALL' && currentPrice > trade.entryPrice) {
            const newStop = currentPrice * (1 - trailPercent / 100);
            if (newStop > trade.stopLoss) trade.stopLoss = newStop;
        } else if (trade.tradeType === 'PUT' && currentPrice < trade.entryPrice) {
            const newStop = currentPrice * (1 + trailPercent / 100);
            if (newStop < trade.stopLoss) trade.stopLoss = newStop;
        }

        // Stop loss hit
        const shouldStop = (
            (trade.tradeType === 'CALL' && currentPrice <= trade.stopLoss) ||
            (trade.tradeType === 'PUT' && currentPrice >= trade.stopLoss)
        );

        // Target hit
        const targetHit = (
            (trade.tradeType === 'CALL' && currentPrice >= trade.targetPrice) ||
            (trade.tradeType === 'PUT' && currentPrice <= trade.targetPrice)
        );

        // Trend reversal
        const trendReversed = (
            (trade.tradeType === 'CALL' && signals.ema === 'BEARISH' && signals.macd === 'BEARISH') ||
            (trade.tradeType === 'PUT' && signals.ema === 'BULLISH' && signals.macd === 'BULLISH')
        );

        if (shouldStop || targetHit || trendReversed) {
            trade.status = (shouldStop ? 'STOPPED' : 'CLOSED');
            trade.exitPrice = currentPrice;
            trade.exitTime = new Date();
            trade.pnl = (trade.tradeType === 'CALL')
                ? (currentPrice - trade.entryPrice) * trade.quantity
                : (trade.entryPrice - currentPrice) * trade.quantity;
            await trade.save();
            console.log(`Trade ${trade.status} for ${symbol}: ${trade.pnl}`);
        }
    }
};

const analyzeTrend = async (data) => {
    for (const symbol in data.feeds) {
        const feed = data.feeds[symbol];
        if (!feed.ff?.indexFF?.marketOHLC?.ohlc) continue;

        const candles = feed.ff.indexFF.marketOHLC.ohlc
            .filter(c => c.interval === 'I30')
            .map(c => ({
                timestamp: new Date(Number(c.ts)),
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume || 0
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        if (candles.length < 2) continue;

        const currentPrice = feed.ff.indexFF.ltpc.ltp;
        const prices = candles.map(c => c.close);
        
        // Technical Analysis
        const ema20 = calculateEMA(prices, 20);
        const ema50 = calculateEMA(prices, 50);
        const rsi = calculateRSI(prices);
        const macd = calculateMACD(prices);
        const { support, resistance } = calculateSupportResistance(candles);
        const { profile: volumeProfile, ratio: volumeRatio } = analyzeVolume(candles);

        // Trade signals
        const signals = {
            ema: ema20 > ema50 ? 'BULLISH' : 'BEARISH',
            macd: macd > 0 ? 'BULLISH' : 'BEARISH',
            rsi: rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL',
            volumeProfile,
            priceAction: currentPrice > resistance ? 'BREAKOUT' :
                        currentPrice < support ? 'BREAKDOWN' : 'RANGE'
        };

        // Enhanced trend analysis with volume confirmation
        const bullishSignals = [
            signals.ema === 'BULLISH',
            signals.macd === 'BULLISH',
            signals.rsi === 'OVERSOLD',
            ['HIGH', 'VERY_HIGH'].includes(volumeProfile),
            signals.priceAction === 'BREAKOUT'
        ].filter(Boolean).length;

        const overallTrend = bullishSignals >= 3 ? 'CALL' : 'PUT';
        signals.overallTrend = overallTrend;

        const confidence = calculateTradeConfidence(
            signals, 
            currentPrice, 
            support, 
            resistance, 
            volumeRatio
        );
        signals.confidence = confidence;

        // Trade execution with stricter criteria
        if (await shouldOpenNewTrade(symbol) && 
            confidence >= 75 && 
            volumeRatio > 1.2) {
            
            const targetPercent = 0.5;
            const stopLossPercent = 0.3;

            const newTrade = new VirtualTrade({
                symbol,
                tradeType: overallTrend,
                entryPrice: currentPrice,
                targetPrice: overallTrend === 'CALL'
                    ? currentPrice * (1 + targetPercent / 100)
                    : currentPrice * (1 - targetPercent / 100),
                stopLoss: overallTrend === 'CALL'
                    ? currentPrice * (1 - stopLossPercent / 100)
                    : currentPrice * (1 + stopLossPercent / 100),
                quantity: 1,
                signals: {
                    ...signals,
                    supportLevel: support,
                    resistanceLevel: resistance,
                    volumeRatio
                },
                thirtyMinData: candles
            });

            await newTrade.save();
            console.log(`New trade opened for ${symbol}:`, {
                type: overallTrend,
                price: currentPrice,
                confidence,
                volumeRatio: volumeRatio.toFixed(2)
            });
        }

        await updateExistingTrades(symbol, currentPrice, signals);
    }
};

module.exports = analyzeTrend;
