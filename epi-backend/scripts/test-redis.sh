#!/bin/bash

# =================================
# 🔴 Redis/Upstash Connection Test
# =================================

# Read Redis URL from environment or use default
REDIS_URL="${REDIS_URL:-redis://default:ASlTAAIjcDE0OTNiYjI2MDQ1YWE0Y2M0OWI2NmE2MTJmOWY0M2RmOXAxMA@easy-ray-10579.upstash.io:6379}"

echo "🔴 Testing Redis/Upstash Connection..."
# Hide sensitive URL details  
echo "URL: $(echo $REDIS_URL | sed 's/:[^@]*@/:***@/')"
echo ""

# Test 1: Direct Redis Connection
if command -v redis-cli &> /dev/null; then
    echo "1️⃣ Direct Redis Test:"
    response=$(redis-cli --tls -u "$REDIS_URL" ping 2>/dev/null)
    if [ "$response" = "PONG" ]; then
        echo "✅ Redis PING successful - Connection working!"
        
        # Test SET/GET
        echo ""
        echo "2️⃣ Redis SET/GET Test:"
        redis-cli --tls -u "$REDIS_URL" set test_key "EPI_Backend_$(date +%s)" > /dev/null
        value=$(redis-cli --tls -u "$REDIS_URL" get test_key)
        if [ ! -z "$value" ]; then
            echo "✅ Redis SET/GET working - Value: $value"
            redis-cli --tls -u "$REDIS_URL" del test_key > /dev/null
        else
            echo "❌ Redis SET/GET failed"
        fi
        
    else
        echo "❌ Redis PING failed - Check connection"
        echo "Response: $response"
    fi
else
    echo "⚠️ redis-cli not installed"
    echo "To install: brew install redis (macOS) or apt-get install redis-tools (Ubuntu)"
fi

echo ""
echo "3️⃣ Backend Redis Test (via API):"
response=$(curl -s "https://epi-backend.onrender.com/api/health/redis" 2>/dev/null)
if echo "$response" | grep -q "ok\|success"; then
    echo "✅ Backend Redis connection working"
else
    echo "❌ Backend Redis connection failed"
    echo "Response: $response"
fi

echo ""
echo "🎯 Redis test complete!"