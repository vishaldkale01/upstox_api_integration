# Debugging Trailing Stops in VS Code

This guide explains how to use the **trailing stop** ("tril") functionality with VS Code debugging tools.

## Quick Start

1. **Open VS Code**: Open this project in VS Code
2. **Install Extensions**: VS Code will prompt you to install recommended extensions
3. **Run Debug Test**: Press `Ctrl+Shift+P` → "Tasks: Run Task" → "Test Trailing Stop Logic"

## VS Code Configuration Overview

This repository now includes complete VS Code configuration for debugging trailing stop logic:

### 📁 `.vscode/` Directory Contains:

- **`settings.json`**: Optimized VS Code settings for Node.js trading app development
- **`launch.json`**: Debug configurations specifically for trailing stop testing
- **`tasks.json`**: Automated tasks for testing and running trailing stop logic
- **`extensions.json`**: Recommended extensions for trading app development
- **`javascript.code-snippets`**: Code snippets for common trailing stop patterns

## 🔧 Debug Configurations Available

### 1. **Debug Trailing Stop Logic** 
- Launches the main analysis engine with debugging enabled
- Breakpoints work in `services/anylyser/analyzeTrend.js`
- Perfect for debugging live market data processing

### 2. **Debug Trading Analysis (Step Mode)**
- Uses the standalone debug utility (`debug/standalone-trail-debug.js`)
- No MongoDB required - works with mock data
- Ideal for understanding trailing stop calculations step by step

### 3. **Debug with MongoDB**
- Full application debugging with database connection
- Use when testing with real trade data

## 🚀 How to Debug Trailing Stops

### Method 1: Using the Standalone Debugger (Recommended for Learning)

1. **Open Debug File**: `debug/standalone-trail-debug.js`
2. **Set Breakpoints**: Click on line numbers around line 150 (`debugTrailingStopStep` function)
3. **Start Debug**: Press `F5` → Select "Debug Trading Analysis (Step Mode)"
4. **Step Through Code**: Use `F10` (Step Over) and `F11` (Step Into)

### Method 2: Using Live Market Analysis

1. **Open Main File**: `services/anylyser/analyzeTrend.js`  
2. **Set Breakpoints**: Around lines 400-420 (trailing stop update logic)
3. **Start Debug**: Press `F5` → Select "Debug Trailing Stop Logic"
4. **Feed Market Data**: The debugger will pause when trailing stop logic executes

### Method 3: Using Tasks (No Debugging)

1. **Run Quick Test**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Test Trailing Stop Logic"
2. **Analyze Code**: Use "Analyze Trading Code" task to find all trail-related code
3. **Check Dependencies**: Use "Check Trading Dependencies" to verify setup

## 📊 Understanding Trailing Stop Logic

### Key Concepts

**Trailing Stop Percentage**: Currently set to `0.1%` (configurable in `SCALPING_CONFIG.trailStopPercent`)

**Dynamic Adjustment**: Trail stop adjusts based on price velocity:
- High velocity (>1): Trail stop becomes `0.15%` (more aggressive)
- Normal velocity: Trail stop remains `0.1%`

### For CALL Trades:
```javascript
// Trail stop moves UP with favorable price movement
if (currentPrice > entryPrice) {
    newStop = currentPrice * (1 - trailStopPercent/100);
    if (newStop > currentStopLoss) {
        // Update to the higher stop loss
        trade.stopLoss = newStop;
    }
}
```

### For PUT Trades:
```javascript
// Trail stop moves DOWN with favorable price movement  
if (currentPrice < entryPrice) {
    newStop = currentPrice * (1 + trailStopPercent/100);
    if (newStop < currentStopLoss) {
        // Update to the lower stop loss
        trade.stopLoss = newStop;
    }
}
```

## 🔍 Debugging Tips

### Essential Breakpoints to Set:

1. **Line ~400** in `analyzeTrend.js`: Where trailing stop calculation begins
2. **Line ~406** in `analyzeTrend.js`: Dynamic trail stop percentage calculation  
3. **Line ~409** in `analyzeTrend.js`: CALL trade trail stop update
4. **Line ~415** in `analyzeTrend.js`: PUT trade trail stop update

### Variables to Watch:

- `currentPrice`: Current market price
- `trade.entryPrice`: Original entry price  
- `trade.stopLoss`: Current stop loss level
- `trailStop`: Calculated trailing stop percentage
- `newStop`: Newly calculated stop loss level
- `signals.velocity`: Price velocity affecting trail stop

### Debug Console Commands:

When paused in debugger, try these in the Debug Console:

```javascript
// Check current trade details
trade

// Calculate what the new stop should be
currentPrice * (1 - 0.001)  // For CALL
currentPrice * (1 + 0.001)  // For PUT

// Check if trailing stop should update
newStop > trade.stopLoss    // For CALL
newStop < trade.stopLoss    // For PUT
```

## 🧪 Test Scenarios

The standalone debugger includes these test scenarios:

1. **Bullish CALL Trade**: Price moves up, trailing stop follows
2. **Bearish PUT Trade**: Price moves down, trailing stop follows  
3. **Adverse Movement**: Price moves against trade, stop loss triggered

## 🎯 Code Snippets

Use these VS Code snippets (type the prefix and press `Tab`):

- `tril-call`: Generate CALL trailing stop logic
- `tril-put`: Generate PUT trailing stop logic
- `tril-dynamic`: Generate dynamic trailing stop with velocity
- `debug-tril`: Generate debug output for trailing stop
- `mock-trade`: Create mock trade for testing

## 🛠 Troubleshooting

### "Cannot find module" errors:
```bash
npm install
```

### MongoDB connection errors in debug:
Use the standalone debugger instead:
```bash
node debug/standalone-trail-debug.js
```

### VS Code not stopping at breakpoints:
1. Make sure you're using the right debug configuration
2. Check that source maps are enabled
3. Verify the file you're debugging is the one being executed

## 📚 Additional Resources

- **Main trailing stop logic**: `services/anylyser/analyzeTrend.js` (lines 54-58, 399-458)
- **Configuration options**: `SCALPING_CONFIG` object
- **Test utilities**: `debug/` directory
- **VS Code workspace**: `upstox-trading.code-workspace`

---

**Happy Debugging!** 🐛🔧

You can now effectively debug and understand trailing stop logic using VS Code's powerful debugging features.