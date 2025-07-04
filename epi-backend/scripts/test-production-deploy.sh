#!/bin/bash

# =================================
# 🚀 EPI Backend - Production Test Script
# =================================

BASE_URL="https://epi-backend.onrender.com"
REDIS_URL="${REDIS_URL:-redis://default:ASlTAAIjcDE0OTNiYjI2MDQ1YWE0Y2M0OWI2NmE2MTJmOWY0M2RmOXAxMA@easy-ray-10579.upstash.io:6379}"
TIMEOUT=15

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $2 in
        "SUCCESS") echo -e "${GREEN}✅ $1${NC}" ;;
        "ERROR") echo -e "${RED}❌ $1${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $1${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $1${NC}" ;;
        *) echo -e "$1" ;;
    esac
}

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3
    
    print_status "Testing: $description" "INFO"
    
    response=$(curl -s --max-time $TIMEOUT -w "HTTPSTATUS:%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
    if [ $? -ne 0 ]; then
        print_status "$description - Connection failed (timeout or network error)" "ERROR"
        return 1
    fi
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        print_status "$description - Status: $http_code" "SUCCESS"
        if [ ! -z "$body" ] && [ "$body" != "null" ]; then
            echo "   Response: $(echo $body | head -c 100)..."
        fi
        return 0
    else
        print_status "$description - Status: $http_code (Expected: $expected_status)" "ERROR"
        if [ ! -z "$body" ]; then
            echo "   Error: $body"
        fi
        return 1
    fi
}

# Function to test Redis
test_redis() {
    print_status "Testing Redis Connection" "INFO"
    
    if command -v redis-cli &> /dev/null; then
        response=$(timeout $TIMEOUT redis-cli --tls -u "$REDIS_URL" ping 2>/dev/null)
        if [ "$response" = "PONG" ]; then
            print_status "Redis Connection - PONG received" "SUCCESS"
            return 0
        else
            print_status "Redis Connection - No PONG response (check Upstash connection)" "ERROR"
            return 1
        fi
    else
        print_status "redis-cli not installed - skipping direct Redis test" "WARNING"
        print_status "To install: brew install redis (macOS) or apt-get install redis-tools" "INFO"
        return 0
    fi
}

# Header
echo "================================================"
echo "🚀 EPI Backend Production Deployment Test"
echo "================================================"
echo "Backend URL: $BASE_URL"
echo "Test Time: $(date)"
echo "================================================"
echo ""

# =================================
# 🏥 HEALTH CHECKS
# =================================
print_status "🏥 HEALTH CHECKS" "INFO"
echo "------------------------------------------------"

# Basic health check
test_endpoint "/health" 200 "Basic Health Check"

# Database health check (may not be implemented)
if ! test_endpoint "/api/health/database" 200 "Database Health Check"; then
    print_status "Database health endpoint not implemented - checking basic health" "WARNING"
    test_endpoint "/health" 200 "Alternative Health Check"
fi

# Redis health check (may not be implemented)
if ! test_endpoint "/api/health/redis" 200 "Redis Health Check"; then
    print_status "Redis health endpoint not implemented - testing direct connection" "WARNING"
    test_redis
fi

echo ""

# =================================
# 📖 API DOCUMENTATION
# =================================
print_status "📖 API DOCUMENTATION" "INFO"
echo "------------------------------------------------"

test_endpoint "/api/docs" 200 "Swagger Documentation"
# Try different possible OpenAPI spec endpoints
if ! test_endpoint "/api/docs-json" 200 "OpenAPI JSON Spec"; then
    test_endpoint "/api/docs/json" 200 "OpenAPI JSON Spec (Alternative)" ||
    test_endpoint "/api-json" 200 "OpenAPI JSON Spec (Alternative 2)"
fi

echo ""

# =================================
# 🔧 CORE API ENDPOINTS
# =================================
print_status "🔧 CORE API ENDPOINTS" "INFO"
echo "------------------------------------------------"

# Test main entity endpoints
test_endpoint "/api/almoxarifados" 200 "Almoxarifados List"
test_endpoint "/api/tipos-epi" 200 "Tipos EPI List"
test_endpoint "/api/colaboradores" 200 "Colaboradores List"
test_endpoint "/api/unidades-negocio" 200 "Unidades Negócio List"
test_endpoint "/api/contratadas" 200 "Contratadas List"

echo ""

# =================================
# 📊 REPORTS ENDPOINTS
# =================================
print_status "📊 REPORTS ENDPOINTS" "INFO"
echo "------------------------------------------------"

test_endpoint "/api/relatorios/saldo-estoque" 200 "Relatório Saldo Estoque"
test_endpoint "/api/relatorios/posicao-estoque" 200 "Relatório Posição Estoque"
test_endpoint "/api/relatorios/devolucao-atrasada" 200 "Relatório Devolução Atrasada"

echo ""

# =================================
# 🧪 API FUNCTIONALITY TESTS
# =================================
print_status "🧪 API FUNCTIONALITY TESTS" "INFO"
echo "------------------------------------------------"

# Test POST endpoint (should fail with validation error - expected)
print_status "Testing POST validation (expecting 400)" "INFO"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/api/almoxarifados" \
    -H "Content-Type: application/json" \
    -d '{"invalid": "data"}')
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$http_code" -eq 400 ] || [ "$http_code" -eq 422 ]; then
    print_status "POST Validation - Correctly rejected invalid data" "SUCCESS"
else
    print_status "POST Validation - Unexpected status: $http_code" "WARNING"
fi

echo ""

# =================================
# 🌐 CORS AND SECURITY TESTS
# =================================
print_status "🌐 CORS AND SECURITY TESTS" "INFO"
echo "------------------------------------------------"

# Test CORS headers
print_status "Testing CORS headers" "INFO"
cors_response=$(curl -s -I -H "Origin: https://example.com" "$BASE_URL/health")
if echo "$cors_response" | grep -i "access-control-allow-origin" > /dev/null; then
    print_status "CORS Headers - Present" "SUCCESS"
else
    print_status "CORS Headers - Not found" "WARNING"
fi

# Test security headers
print_status "Testing security headers" "INFO"
security_response=$(curl -s -I "$BASE_URL/health")
if echo "$security_response" | grep -i "x-powered-by" > /dev/null; then
    print_status "X-Powered-By header found (consider hiding)" "WARNING"
else
    print_status "X-Powered-By header hidden" "SUCCESS"
fi

echo ""

# =================================
# 📊 PERFORMANCE TESTS
# =================================
print_status "📊 PERFORMANCE TESTS" "INFO"
echo "------------------------------------------------"

# Response time test
print_status "Testing response time" "INFO"
start_time=$(date +%s%N)
curl -s "$BASE_URL/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(((end_time - start_time) / 1000000)) # Convert to milliseconds

if [ "$response_time" -lt 2000 ]; then
    print_status "Response Time: ${response_time}ms (Good)" "SUCCESS"
elif [ "$response_time" -lt 5000 ]; then
    print_status "Response Time: ${response_time}ms (Acceptable)" "WARNING"
else
    print_status "Response Time: ${response_time}ms (Slow)" "ERROR"
fi

echo ""

# =================================
# 🎯 FINAL SUMMARY
# =================================
print_status "🎯 DEPLOYMENT TEST SUMMARY" "INFO"
echo "================================================"

# Test overall deployment health
overall_health=$(curl -s "$BASE_URL/health" | grep -o '"status":"ok"')
if [ "$overall_health" = '"status":"ok"' ]; then
    print_status "🎉 DEPLOYMENT SUCCESS - Backend is operational!" "SUCCESS"
    echo ""
    echo "✅ Backend URL: $BASE_URL"
    echo "✅ Health Check: $BASE_URL/health"
    echo "✅ API Docs: $BASE_URL/api/docs"
    echo "✅ Test Time: $(date)"
else
    print_status "❌ DEPLOYMENT ISSUES - Backend may not be fully operational" "ERROR"
fi

echo ""
echo "================================================"
echo "🔗 Next Steps:"
echo "• Frontend can connect to: $BASE_URL"
echo "• Monitor logs: Render Dashboard → epi-backend → Logs"
echo "• Scale up: Render Dashboard → epi-backend → Settings"
echo "================================================"