#!/bin/bash

# =================================
# 🚀 Quick Production Test
# =================================

BASE_URL="https://epi-backend.onrender.com"

echo "🚀 Testing EPI Backend Production..."
echo "URL: $BASE_URL"
echo "Time: $(date)"
echo ""

# Test 1: Health Check
echo "1️⃣ Health Check:"
curl -s "$BASE_URL/health" | jq '.' 2>/dev/null || curl -s "$BASE_URL/health"
echo ""

# Test 2: API Docs
echo "2️⃣ API Documentation:"
if curl -s "$BASE_URL/api/docs" | grep -q "swagger"; then
    echo "✅ Swagger UI is working"
else
    echo "❌ Swagger UI not accessible"
fi
echo ""

# Test 3: Main Endpoints
echo "3️⃣ Core Endpoints:"
endpoints=("/api/almoxarifados" "/api/tipos-epi" "/api/colaboradores")

for endpoint in "${endpoints[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    if [ "$status" = "200" ]; then
        echo "✅ $endpoint - Status: $status"
    else
        echo "❌ $endpoint - Status: $status"
    fi
done

echo ""
echo "🎯 Quick test complete!"
echo "For detailed tests, run: ./test-production-deploy.sh"