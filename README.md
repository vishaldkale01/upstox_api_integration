# Upstox API Integration in Node.js

This project integrates the Upstox WebLink API into a Node.js application, providing a comprehensive trading platform with real-time market data, order management, and portfolio tracking capabilities.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Setup](#setup)
- [MongoDB Setup](#mongodb-setup)
- [API Endpoints](#api-endpoints)
- [WebSocket Integration](#websocket-integration)
- [AI/ML Features](#aiml-features)
- [Error Handling](#error-handling)
- [Future Plans](#future-plans)

## Features

- **Authentication & Authorization**
  - OAuth 2.0 integration with Upstox
  - Secure token management
  - Session handling

- **Trading Operations**
  - Place, modify, and cancel orders
  - View order history and trade book
  - Real-time order status updates
  - Portfolio management

- **Market Data**
  - Real-time market quotes via WebSocket
  - Historical candle data with pattern recognition
  - OHLC data access
  - Option chain data

- **Account Management**
  - User profile management
  - Fund and margin details
  - Holdings and positions tracking
  - Brokerage calculation

- **Advanced Features**
  - Technical analysis with candlestick pattern recognition
  - Real-time WebSocket market data feed
  - Protobuf message encoding/decoding
  - Sentiment analysis for market news (FinBERT integration)

## Installation

```bash
git clone https://github.com/vishaldkale01/upstox-api-integration.git
cd upstox-api-integration
npm install
```

## Setup

1. Create an Upstox Developer Account and obtain API credentials
2. Configure environment variables:

```bash
# .env file
UPSTOX_API_KEY=your_api_key
UPSTOX_API_SECRET=your_api_secret
UPSTOX_REDIRECT_URI=your_redirect_uri
MONGO_DB=your_mongodb_uri
PORT=3000
```

3. Start the server:
```bash
npm start
```

## MongoDB Setup

### Prerequisites
- MongoDB server installed and running
- MongoDB URI for connection
- Mongoose ODM version 8.5.1 or higher

### Configuration

1. **Environment Variables**
   Create or update your `.env` file with the MongoDB connection string:
   ```
   MONGO_DB=mongodb://localhost:27017/your_database_name
   ```

2. **Connection Options**
   The application uses the following Mongoose connection options:
   ```javascript
   {
     useNewUrlParser: true
   }
   ```

### Implementation Details

#### Connection Management
The MongoDB connection is automatically established in `loaders/mongodb`:
- Auto-executing connection function
- Connection string loaded from environment variables
- Mongoose as the ODM (Object Document Mapper)
- Synchronous connection with proper error handling

The connection is established as soon as the module is loaded, ensuring database availability before the application starts:

```javascript
// Connection is automatically established when the module loads
mongoConnect();
```

#### Error Handling
The application implements robust error handling for MongoDB:

1. **Connection Errors**
   - Failed connections are logged with detailed error messages
   - Application exits with status code 1 on connection failure
   - Error stack traces are preserved for debugging

2. **Global Error Handlers**
   - Unhandled Promise Rejections
   - Uncaught Exceptions
   - Type Errors during execution

#### Logging and Monitoring
The MongoDB connection includes comprehensive logging:

- **Connection Attempts**: 
  ```
  "trying to connect with mongo......"
  ```

- **Success Messages**: 
  ```
  "Connected successfully to MongoDB"
  ```

- **Error Messages**:
  ```
  "Failed to connect to MongoDB" + detailed error information
  ```

### Integration with Express

The MongoDB connection is automatically established when the application starts:

1. Module loading triggers connection
2. MongoDB connection establishment
3. Express server startup
4. Port binding and listening

This sequence ensures that the database is available before handling any API requests.

### Best Practices

1. **Environment Configuration**
   - Keep MongoDB URI in environment variables
   - Never commit credentials to version control
   - Use different databases for development and production

2. **Error Recovery**
   - Application fails fast on connection errors
   - Clear error messages for troubleshooting
   - Proper cleanup on connection failures

3. **Security**
   - Use authentication for database access
   - Configure proper database user permissions
   - Enable SSL/TLS for production deployments

### Troubleshooting

If you encounter connection issues:

1. Verify MongoDB is running:
   ```bash
   mongod --version
   ```

2. Check connection string format:
   ```
   mongodb://[username:password@]host[:port]/database
   ```

3. Ensure network connectivity:
   - Check MongoDB port accessibility (default: 27017)
   - Verify firewall settings
   - Check network configuration

4. Review application logs:
   - Check for connection errors
   - Verify environment variables
   - Monitor MongoDB server logs

## API Endpoints

### Authentication
- GET `/login` - Initiate Upstox login
- GET `/callback` - OAuth callback handler

### User & Account
- GET `/user/profile` - Get user profile
- GET `/user/get-funds-and-margin` - Get fund and margin details

### Trading
- POST `/order/place` - Place new order
- PUT `/order/modify` - Modify existing order
- GET `/order/retrieve-all` - Get order book
- GET `/order/trades/get-trades-for-day` - Get day's trades

### Market Data
- GET `/historical-candle/:instrumentKey/:interval/:to_date/:from_date` - Get historical candles
- GET `/historical-candle/intraday/:instrumentKey/:interval` - Get intraday data
- GET `/charges/brokerage` - Calculate brokerage charges

### Portfolio
- GET `/portfolio/long-term-holdings` - Get holdings

## WebSocket Integration

The application includes real-time market data streaming via WebSocket:
- Auto-reconnection handling
- Protobuf message encoding/decoding
- Support for multiple market data subscriptions
- Real-time updates for various market data types

## AI/ML Features

### Market News Sentiment Analysis
- Integration with FinBERT model
- Real-time sentiment scoring
- Support for custom confidence thresholds
- Preprocessing pipeline for financial news

## Error Handling

The application implements comprehensive error handling:
- Global error handlers for unhandled rejections and exceptions
- Structured error responses
- Detailed error logging
- HTTP status code mapping

## Future Plans

### Virtual Trading Platform
Our primary goal is to develop a sophisticated virtual trading platform where users can:
- Trade on live market conditions using virtual currency
- Practice trading strategies without financial risk
- Experience real-time market conditions and order execution
- Learn trading mechanics in a safe environment
- Track virtual portfolio performance
- Access historical performance analytics

The virtual trading features will include:
- Virtual wallet management with mock currency
- Real-time profit/loss tracking
- Risk-free trading experience
- Paper trading with live market data
- Performance analytics and reports
- Trading strategy validation

### Database Implementation
The MongoDB configuration is reserved for future implementation, where we plan to:
- Store user trading history
- Save user preferences and configurations
- Maintain portfolio tracking data
- Record trading statistics and analytics

### Redis Integration
We plan to implement Redis for:
- High-performance caching
- Real-time market data caching
- Session management
- Rate limiting
- Temporary data storage for improved performance

These database implementations will enhance the platform's capabilities by providing:
- Persistent data storage
- Improved performance
- Better user experience
- Historical data analysis
- Advanced trading features

## Development

```bash
# Run in development mode with nodemon
npm run dev

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

ISC

