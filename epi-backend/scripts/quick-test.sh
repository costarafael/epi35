#!/bin/bash

# =================================
# 🚀 Quick Production Test
# =================================

BASE_URL="https://epi-backend.onrender.com"
TIMEOUT=10

echo "🚀 Testing EPI Backend Production..."
echo "URL: $BASE_URL"
echo "Time: $(date)"
echo ""

# Test 1: Health Check
echo "1️⃣ Health Check:"
health_response=$(curl -s --max-time $TIMEOUT "$BASE_URL/health" 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$health_response" ]; then
    echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
    if echo "$health_response" | grep -q '"status":"ok"'; then
        echo "✅ Health check passed"
    else
        echo "⚠️ Health check response unexpected"
    fi
else
    echo "❌ Health check failed or timed out"
fi
echo ""

# Test 2: API Docs
echo "2️⃣ API Documentation:"
docs_status=$(curl -s --max-time $TIMEOUT -o /dev/null -w "%{http_code}" "$BASE_URL/api/docs" 2>/dev/null)
if [ "$docs_status" = "200" ]; then
    echo "✅ Swagger UI accessible - Status: $docs_status"
elif [ "$docs_status" = "302" ] || [ "$docs_status" = "301" ]; then
    echo "✅ Swagger UI redirected - Status: $docs_status"
else
    echo "❌ Swagger UI not accessible - Status: $docs_status"
fi
echo ""

# Test 3: Main Endpoints
echo "3️⃣ Core Endpoints:"
endpoints=("/api/almoxarifados" "/api/tipos-epi" "/api/colaboradores" "/api/unidades-negocio" "/api/contratadas")

for endpoint in "${endpoints[@]}"; do
    status=$(curl -s --max-time $TIMEOUT -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
    if [ "$status" = "200" ]; then
        echo "✅ $endpoint - Status: $status"
    elif [ "$status" = "401" ] || [ "$status" = "403" ]; then
        echo "⚠️ $endpoint - Authentication required: $status"
    elif [ "$status" = "000" ]; then
        echo "❌ $endpoint - Connection failed (timeout)"
    else
        echo "❌ $endpoint - Status: $status"
    fi
done

echo ""
echo "🎯 Quick test complete!"
echo "For detailed tests, run: ./test-production-deploy.sh"