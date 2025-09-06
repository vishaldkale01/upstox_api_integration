#!/bin/bash

echo "Testing Subscription System Error Messages"
echo "=========================================="

# Test 1: Create a premium subscription
echo "1. Creating premium subscription for test-user..."
curl -s -X POST http://localhost:3001/subscription/upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "planType": "premium",
    "paymentDetails": {
      "transactionId": "txn_123",
      "amount": 999,
      "currency": "INR"
    }
  }' | jq .

echo -e "\n"

# Test 2: Try to downgrade to basic (should show proper error)
echo "2. Attempting to 'purchase' a basic plan when user already has premium..."
curl -s -X POST http://localhost:3001/subscription/upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "planType": "basic"
  }' | jq .

echo -e "\n"

# Test 3: Try to access premium feature without subscription
echo "3. Accessing premium feature (real-time data) without proper subscription..."
curl -s http://localhost:3001/historical-candle/intraday/NSE_EQ\|INE848E01016/1minute \
  -H "user-id: free-user" | jq .

echo -e "\n"

# Test 4: Check subscription status
echo "4. Checking subscription status..."
curl -s http://localhost:3001/subscription/status \
  -H "user-id: test-user" | jq .

echo -e "\n"
echo "Demo completed. Notice the proper, contextual error messages!"