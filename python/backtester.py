# strategy_engine.py
import pandas as pd
import numpy as np
import talib
from datetime import datetime
import json

class StrategyEngine:
    def __init__(self, config):
        self.config = config
        self.data_buffer = pd.DataFrame()
        self.position = None
        self.signals = []
        
    def on_new_data(self, tick):
        """Process incoming tick data"""
        # Append to buffer
        new_row = pd.DataFrame([tick])
        self.data_buffer = pd.concat([self.data_buffer, new_row], ignore_index=True)
        
        # Keep only recent data (e.g., last 200 candles)
        if len(self.data_buffer) > 200:
            self.data_buffer = self.data_buffer.iloc[-200:]
        
        # Calculate indicators
        self.calculate_indicators()
        
        # Generate signals
        signal = self.generate_signal()
        
        if signal:
            self.signals.append(signal)
            return signal
        
        return None
    
    def calculate_indicators(self):
        """Calculate all technical indicators"""
        df = self.data_buffer
        
        # EMAs
        df['EMA_9'] = talib.EMA(df['close'], timeperiod=9)
        df['EMA_21'] = talib.EMA(df['close'], timeperiod=21)
        df['EMA_50'] = talib.EMA(df['close'], timeperiod=50)
        
        # VWAP (requires full session data)
        df['VWAP'] = (df['volume'] * (df['high'] + df['low'] + df['close']) / 3).cumsum() / df['volume'].cumsum()
        
        # RSI
        df['RSI'] = talib.RSI(df['close'], timeperiod=14)
        
        # MACD
        df['MACD'], df['MACD_signal'], df['MACD_hist'] = talib.MACD(
            df['close'], 
            fastperiod=12, 
            slowperiod=26, 
            signalperiod=9
        )
        
        # ATR for stops
        df['ATR'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=14)
        
        # Candlestick patterns
        df['HAMMER'] = talib.CDLHAMMER(df['open'], df['high'], df['low'], df['close'])
        df['ENGULFING'] = talib.CDLENGULFING(df['open'], df['high'], df['low'], df['close'])
        df['SHOOTING_STAR'] = talib.CDLSHOOTINGSTAR(df['open'], df['high'], df['low'], df['close'])
        
        self.data_buffer = df
    
    def generate_signal(self):
        """Generate trading signals"""
        if len(self.data_buffer) < 50:
            return None
        
        df = self.data_buffer
        idx = -1  # Latest candle
        
        # Don't trade if already in position
        if self.position:
            return self.check_exit_signal()
        
        # Entry conditions
        bullish_score = 0
        bearish_score = 0
        
        # Trend
        if df['EMA_9'].iloc[idx] > df['EMA_21'].iloc[idx] > df['EMA_50'].iloc[idx]:
            bullish_score += 2
        elif df['EMA_9'].iloc[idx] < df['EMA_21'].iloc[idx] < df['EMA_50'].iloc[idx]:
            bearish_score += 2
        
        # VWAP
        if df['close'].iloc[idx] > df['VWAP'].iloc[idx]:
            bullish_score += 1
        elif df['close'].iloc[idx] < df['VWAP'].iloc[idx]:
            bearish_score += 1
        
        # RSI
        rsi = df['RSI'].iloc[idx]
        if 40 < rsi < 70:
            bullish_score += 1
        elif 30 < rsi < 60:
            bearish_score += 1
        
        # MACD
        if df['MACD'].iloc[idx] > df['MACD_signal'].iloc[idx]:
            bullish_score += 1
        elif df['MACD'].iloc[idx] < df['MACD_signal'].iloc[idx]:
            bearish_score += 1
        
        # Candlestick patterns
        if df['HAMMER'].iloc[idx] == 100 or df['ENGULFING'].iloc[idx] == 100:
            bullish_score += 1
        elif df['SHOOTING_STAR'].iloc[idx] == -100 or df['ENGULFING'].iloc[idx] == -100:
            bearish_score += 1
        
        # Generate signal if score >= 4
        if bullish_score >= 4:
            return self.create_signal('BUY_CALL', df.iloc[idx])
        elif bearish_score >= 4:
            return self.create_signal('BUY_PUT', df.iloc[idx])
        
        return None
    
    def create_signal(self, signal_type, candle):
        """Create structured signal object"""
        atr = candle['ATR']
        entry_price = candle['close']
        
        if signal_type == 'BUY_CALL':
            stop_loss = entry_price - (1.5 * atr)
            target = entry_price + (2 * (entry_price - stop_loss))
        else:
            stop_loss = entry_price + (1.5 * atr)
            target = entry_price - (2 * (stop_loss - entry_price))
        
        signal = {
            'type': signal_type,
            'timestamp': datetime.now().isoformat(),
            'entry_price': entry_price,
            'stop_loss': stop_loss,
            'target': target,
            'atr': atr,
            'indicators': {
                'ema_9': candle['EMA_9'],
                'ema_21': candle['EMA_21'],
                'rsi': candle['RSI'],
                'macd': candle['MACD'],
                'vwap': candle['VWAP']
            }
        }
        
        return signal
    
    def check_exit_signal(self):
        """Check if exit conditions are met"""
        df = self.data_buffer
        current_price = df['close'].iloc[-1]
        
        # Check stop loss
        if self.position['type'] == 'LONG':
            if current_price <= self.position['stop_loss']:
                return {'action': 'EXIT', 'reason': 'STOP_LOSS'}
            elif current_price >= self.position['target']:
                return {'action': 'EXIT', 'reason': 'TARGET'}
        
        # Time-based exit (3:20 PM)
        now = datetime.now().time()
        if now >= datetime.strptime('15:20', '%H:%M').time():
            return {'action': 'EXIT', 'reason': 'EOD'}
        
        return None

# Integration with Node.js via REST API or message queue
