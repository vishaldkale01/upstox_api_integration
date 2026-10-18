/**
 * Debug utility for testing trailing stop logic in isolation
 * This helps developers understand how the trailing stop mechanism works
 * without needing live market data or MongoDB connection
 */

// Mock data generator for testing trailing stop
function generateMockCandles(symbol, count = 50) {
    const candles = [];
    let basePrice = 45000; // Starting price for NIFTY50
    
    for (let i = 0; i < count; i++) {
        const volatility = 0.002; // 0.2% volatility
        const change = (Math.random() - 0.5) * volatility * basePrice;
        
        const open = basePrice;
        const close = Math.max(1, basePrice + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.001);
        const low = Math.min(open, close) * (1 - Math.random() * 0.001);
        
        candles.push({
            timestamp: new Date(Date.now() - (count - i) * 60000), // 1 minute intervals
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: Math.floor(Math.random() * 100000) + 50000,
            interval: 'I1'
        });
        
        basePrice = close;
    }
    
    return candles;
}

// Mock VirtualTrade model for testing without MongoDB
class MockVirtualTrade {
    constructor(data) {
        Object.assign(this, data);
        this.id = Date.now().toString();
        this.createdAt = new Date();
        this.status = 'OPEN';
    }
    
    async save() {
        console.log('Mock trade saved:', {
            symbol: this.symbol,
            tradeType: this.tradeType,
            entryPrice: this.entryPrice,
            targetPrice: this.targetPrice,
            stopLoss: this.stopLoss
        });
        return this;
    }
    
    static async findOne(query) {
        // Return null to simulate no existing trades for testing
        return null;
    }
    
    static async find(query) {
        // Return empty array or mock existing trades for testing trail updates
        return [];
    }
}

// Isolated trailing stop testing function
async function testTrailingStopLogic() {
    console.log('=== Testing Trailing Stop Logic ===\n');
    
    // Generate mock market data
    const symbol = 'NIFTY50';
    const candles = generateMockCandles(symbol, 30);
    
    console.log('Generated', candles.length, 'mock candles');
    console.log('Price range:', Math.min(...candles.map(c => c.low)), '-', Math.max(...candles.map(c => c.high)));
    
    // Import the actual analysis function
    let analyzeTrend;
    try {
        analyzeTrend = require('../services/anylyser/analyzeTrend');
    } catch (error) {
        console.error('Could not load analyzeTrend module:', error.message);
        return;
    }
    
    // Mock the VirtualTrade globally for the analyzer
    global.VirtualTrade = MockVirtualTrade;
    
    // Create mock feed data structure that matches expected format
    const mockFeedData = {
        feeds: {
            [symbol]: {
                ff: {
                    indexFF: {
                        ltpc: {
                            ltp: candles[candles.length - 1].close
                        },
                        marketOHLC: {
                            ohlc: candles.map(c => ({
                                ts: c.timestamp.getTime().toString(),
                                open: c.open,
                                high: c.high,
                                low: c.low,
                                close: c.close,
                                volume: c.volume.toString(),
                                interval: c.interval
                            }))
                        }
                    }
                }
            }
        }
    };
    
    console.log('\n=== Running Trailing Stop Analysis ===');
    
    // Test the trailing stop logic
    try {
        await analyzeTrend(mockFeedData);
        console.log('\nTrailing stop analysis completed successfully!');
    } catch (error) {
        console.error('Error during analysis:', error);
    }
}

// Debug helper to trace trailing stop calculations step by step
function debugTrailingStopCalculation(currentPrice, entryPrice, tradeType, trailStopPercent = 0.1) {
    console.log('\n=== Debugging Trailing Stop Calculation ===');
    console.log('Current Price:', currentPrice);
    console.log('Entry Price:', entryPrice);
    console.log('Trade Type:', tradeType);
    console.log('Trail Stop Percent:', trailStopPercent + '%');
    
    if (tradeType === 'CALL') {
        const newStop = currentPrice * (1 - (trailStopPercent / 100));
        console.log('CALL Trail Stop Formula: currentPrice * (1 - trailStopPercent/100)');
        console.log('Calculated Stop:', newStop.toFixed(2));
        
        if (currentPrice > entryPrice) {
            console.log('✅ Price above entry - trail stop can be updated');
        } else {
            console.log('❌ Price below entry - trail stop not updated');
        }
    } else if (tradeType === 'PUT') {
        const newStop = currentPrice * (1 + (trailStopPercent / 100));
        console.log('PUT Trail Stop Formula: currentPrice * (1 + trailStopPercent/100)');
        console.log('Calculated Stop:', newStop.toFixed(2));
        
        if (currentPrice < entryPrice) {
            console.log('✅ Price below entry - trail stop can be updated');
        } else {
            console.log('❌ Price above entry - trail stop not updated');
        }
    }
}

// Example usage and test scenarios
async function runDebugScenarios() {
    console.log('🚀 Starting Trailing Stop Debug Session\n');
    
    // Scenario 1: Test calculation logic
    console.log('📊 Scenario 1: Testing Trail Stop Calculations');
    debugTrailingStopCalculation(45100, 45000, 'CALL', 0.1);
    debugTrailingStopCalculation(44900, 45000, 'PUT', 0.1);
    
    // Scenario 2: Test with mock data
    console.log('\n📈 Scenario 2: Testing with Mock Market Data');
    await testTrailingStopLogic();
    
    console.log('\n✨ Debug session completed!');
    console.log('\n💡 Tips for VS Code debugging:');
    console.log('1. Set breakpoints in analyzeTrend.js around lines 400-420');
    console.log('2. Use "Debug Trailing Stop Logic" launch configuration');
    console.log('3. Check the Debug Console for detailed trail stop logs');
    console.log('4. Use the Variables panel to inspect trade objects');
}

// Auto-run if this file is executed directly
if (require.main === module) {
    runDebugScenarios().catch(console.error);
}

module.exports = {
    testTrailingStopLogic,
    debugTrailingStopCalculation,
    generateMockCandles,
    MockVirtualTrade,
    runDebugScenarios
};