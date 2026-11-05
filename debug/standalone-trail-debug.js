/**
 * Standalone Trailing Stop Debug Utility
 * Works without MongoDB connection - perfect for VS Code debugging
 */

console.log('🚀 Standalone Trailing Stop Debug Tool\n');

// Configuration matching the main app
const SCALPING_CONFIG = {
    targetPercent: 0.3,     // 0.3% target
    stopLossPercent: 0.2,   // 0.2% stop loss
    trailStopPercent: 0.1,  // 0.1% trailing stop
    minVolumeRatio: 0.8,    // Minimum volume ratio
    minConfidence: 40,      // Minimum confidence threshold
};

// Mock trade class that doesn't require database
class MockTrade {
    constructor(data) {
        this.symbol = data.symbol;
        this.tradeType = data.tradeType;
        this.entryPrice = data.entryPrice;
        this.targetPrice = data.targetPrice;
        this.stopLoss = data.stopLoss;
        this.quantity = data.quantity || 1;
        this.status = 'OPEN';
        this.createdAt = new Date();
    }

    async save() {
        console.log(`💾 Trade updated: ${this.symbol} ${this.tradeType} - Stop Loss: ${this.stopLoss.toFixed(2)}`);
        return this;
    }
}

// Simulate trailing stop update logic (extracted from main code)
function updateTrailingStop(trade, currentPrice, velocity = 0) {
    console.log(`\n📊 Updating trailing stop for ${trade.symbol}`);
    console.log(`   Trade Type: ${trade.tradeType}`);
    console.log(`   Entry Price: ${trade.entryPrice}`);
    console.log(`   Current Price: ${currentPrice}`);
    console.log(`   Current Stop: ${trade.stopLoss.toFixed(2)}`);

    // Dynamic trailing stop based on price velocity (matching main logic)
    const trailStop = Math.abs(velocity) > 1 
        ? SCALPING_CONFIG.trailStopPercent * 1.5 
        : SCALPING_CONFIG.trailStopPercent;

    console.log(`   Trail Stop %: ${trailStop}% (velocity: ${velocity.toFixed(2)})`);

    let updated = false;

    if (trade.tradeType === 'CALL' && currentPrice > trade.entryPrice) {
        const newStop = currentPrice * (1 - trailStop / 100);
        console.log(`   Calculated Stop: ${newStop.toFixed(2)}`);
        
        if (newStop > trade.stopLoss) {
            const oldStop = trade.stopLoss;
            trade.stopLoss = newStop;
            console.log(`   ✅ Updated trailing stop from ${oldStop.toFixed(2)} to ${newStop.toFixed(2)}`);
            updated = true;
        } else {
            console.log(`   ❌ New stop (${newStop.toFixed(2)}) not higher than current (${trade.stopLoss.toFixed(2)})`);
        }
    } else if (trade.tradeType === 'PUT' && currentPrice < trade.entryPrice) {
        const newStop = currentPrice * (1 + trailStop / 100);
        console.log(`   Calculated Stop: ${newStop.toFixed(2)}`);
        
        if (newStop < trade.stopLoss) {
            const oldStop = trade.stopLoss;
            trade.stopLoss = newStop;
            console.log(`   ✅ Updated trailing stop from ${oldStop.toFixed(2)} to ${newStop.toFixed(2)}`);
            updated = true;
        } else {
            console.log(`   ❌ New stop (${newStop.toFixed(2)}) not lower than current (${trade.stopLoss.toFixed(2)})`);
        }
    } else {
        console.log(`   ⏸️ No update - price not favorable for ${trade.tradeType} trade`);
    }

    return updated;
}

// Check if stop loss is hit
function checkStopLoss(trade, currentPrice) {
    const stopHit = (
        (trade.tradeType === 'CALL' && currentPrice <= trade.stopLoss) ||
        (trade.tradeType === 'PUT' && currentPrice >= trade.stopLoss)
    );

    if (stopHit) {
        trade.status = 'CLOSED';
        trade.exitPrice = currentPrice;
        trade.pnl = trade.tradeType === 'CALL'
            ? (currentPrice - trade.entryPrice) * trade.quantity
            : (trade.entryPrice - currentPrice) * trade.quantity;
        
        console.log(`🛑 STOP LOSS HIT for ${trade.symbol}!`);
        console.log(`   Exit Price: ${currentPrice}`);
        console.log(`   P&L: ${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}`);
        return true;
    }
    return false;
}

// Test scenarios
async function runTrailingStopScenarios() {
    console.log('📈 Running Trailing Stop Test Scenarios\n');

    // Scenario 1: CALL trade with favorable price movement
    console.log('=== Scenario 1: CALL Trade (Bullish Movement) ===');
    const callTrade = new MockTrade({
        symbol: 'NIFTY50',
        tradeType: 'CALL',
        entryPrice: 45000,
        targetPrice: 45135, // +0.3%
        stopLoss: 44910,    // -0.2%
        quantity: 1
    });

    const callPrices = [45000, 45020, 45050, 45080, 45100, 45120, 45110, 45090];
    const velocities = [0, 0.5, 1.2, 0.8, 0.6, 0.9, -0.4, -0.8];

    for (let i = 0; i < callPrices.length; i++) {
        updateTrailingStop(callTrade, callPrices[i], velocities[i]);
        if (checkStopLoss(callTrade, callPrices[i])) break;
        if (callTrade.status === 'CLOSED') break;
    }

    console.log('\n=== Scenario 2: PUT Trade (Bearish Movement) ===');
    const putTrade = new MockTrade({
        symbol: 'BANKNIFTY',
        tradeType: 'PUT',
        entryPrice: 44000,
        targetPrice: 43868,  // -0.3%
        stopLoss: 44088,     // +0.2%
        quantity: 1
    });

    const putPrices = [44000, 43980, 43950, 43920, 43900, 43880, 43890, 43910];
    const putVelocities = [0, -0.5, -1.2, -0.8, -0.6, -0.9, 0.4, 0.8];

    for (let i = 0; i < putPrices.length; i++) {
        updateTrailingStop(putTrade, putPrices[i], putVelocities[i]);
        if (checkStopLoss(putTrade, putPrices[i])) break;
        if (putTrade.status === 'CLOSED') break;
    }

    console.log('\n=== Scenario 3: Adverse Movement (Stop Loss Test) ===');
    const adverseTrade = new MockTrade({
        symbol: 'NIFTY50',
        tradeType: 'CALL', 
        entryPrice: 45000,
        targetPrice: 45135,
        stopLoss: 44910,
        quantity: 1
    });

    // Price drops below stop loss
    const adversePrices = [45000, 44980, 44950, 44920, 44900];
    for (const price of adversePrices) {
        updateTrailingStop(adverseTrade, price, -1.5);
        if (checkStopLoss(adverseTrade, price)) break;
    }
}

// Interactive debugging function (set breakpoint here for step-by-step debugging)
function debugTrailingStopStep() {
    const trade = new MockTrade({
        symbol: 'DEBUG_SYMBOL',
        tradeType: 'CALL',
        entryPrice: 1000,
        targetPrice: 1003,
        stopLoss: 998,
        quantity: 1
    });

    // Set a breakpoint on the next line and step through
    const currentPrice = 1010;
    const velocity = 0.5;
    
    // You can inspect these variables in VS Code debugger
    updateTrailingStop(trade, currentPrice, velocity);
    
    return trade;
}

// Main execution
if (require.main === module) {
    runTrailingStopScenarios()
        .then(() => {
            console.log('\n🎯 All scenarios completed!');
            console.log('\n💡 For VS Code debugging:');
            console.log('1. Set breakpoint in debugTrailingStopStep() function');
            console.log('2. Use F5 to start "Debug Trailing Stop (Standalone)" configuration');
            console.log('3. Step through with F10/F11 to see trailing stop logic');
            console.log('4. Check Variables panel to inspect trade objects');
            
            // Call the debug function for breakpoint testing
            debugTrailingStopStep();
        })
        .catch(console.error);
}

module.exports = {
    updateTrailingStop,
    checkStopLoss,
    MockTrade,
    SCALPING_CONFIG,
    debugTrailingStopStep
};