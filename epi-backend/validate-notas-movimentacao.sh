#!/bin/bash

# =================================
# 🔬 Notas Movimentação API Validator
# =================================
# Tests all 7 endpoints after Bug_Fixer improvements

set -e  # Exit on any error

BASE_URL="http://localhost:3333"
API_URL="$BASE_URL/api"
TIMEOUT=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
echo_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
echo_success() { echo -e "${GREEN}✅ $1${NC}"; TESTS_PASSED=$((TESTS_PASSED + 1)); }
echo_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
echo_error() { echo -e "${RED}❌ $1${NC}"; TESTS_FAILED=$((TESTS_FAILED + 1)); }
echo_test() { echo -e "${BLUE}🧪 Test $1: $2${NC}"; TESTS_TOTAL=$((TESTS_TOTAL + 1)); }

# Test helper function
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local expected_status="$4"
    local description="$5"
    
    echo_test $TESTS_TOTAL "$description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s --max-time $TIMEOUT -w "\n%{http_code}" "$API_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s --max-time $TIMEOUT -X "$method" -H "Content-Type: application/json" -d "$data" -w "\n%{http_code}" "$API_URL$endpoint" 2>/dev/null)
    fi
    
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1 2>/dev/null || echo "$response" | sed '$d')
    
    if [ "$status" = "$expected_status" ]; then
        echo_success "$method $endpoint - Status: $status"
        if [ ! -z "$body" ]; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        fi
        return 0
    else
        echo_error "$method $endpoint - Expected: $expected_status, Got: $status"
        if [ ! -z "$body" ]; then
            echo "$body"
        fi
        return 1
    fi
}

# Store created IDs
NOTA_ID=""
TIPO_EPI_ID=""

echo_info "🚀 Starting Notas Movimentacao API Validation"
echo_info "Base URL: $BASE_URL"
echo_info "Time: $(date)"
echo ""

# Check if server is running
echo_info "Checking server health..."
if ! curl -f -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo_error "Server is not running or not responding at $BASE_URL"
    echo_info "Please start the server with: npm run start:dev"
    exit 1
fi
echo_success "Server is running"
echo ""

# =======================
# 1. DRAFT CREATION TESTS
# =======================
echo_info "📝 1. DRAFT CREATION TESTS"
echo ""

# Get a valid almoxarifado ID first
echo_info "Getting available almoxarifado..."
almox_response=$(curl -s --max-time $TIMEOUT "$API_URL/estoque/almoxarifados" 2>/dev/null)
ALMOX_ID=$(echo "$almox_response" | jq -r '.data[0].id' 2>/dev/null)
if [ "$ALMOX_ID" = "null" ] || [ -z "$ALMOX_ID" ]; then
    echo_warning "No almoxarifado found. Using default ID."
    ALMOX_ID="567a1885-0763-4a13-b9f6-157daa39ddc3"
else
    echo_info "Using almoxarifado ID: $ALMOX_ID"
fi

# Test 1: Create draft note (POST /notas-movimentacao)
if test_endpoint "POST" "/notas-movimentacao" "{
    \"tipo\": \"ENTRADA\",
    \"almoxarifadoDestinoId\": \"$ALMOX_ID\",
    \"observacoes\": \"Test entrada - Validation script\"
}" "201" "Create draft note"; then
    # Extract the note ID for further tests
    NOTA_ID=$(echo "$body" | jq -r '.data.id' 2>/dev/null)
    echo_info "Created note ID: $NOTA_ID"
fi
echo ""

# Test 2: Get note details (GET /notas-movimentacao/:id)
if [ ! -z "$NOTA_ID" ]; then
    test_endpoint "GET" "/notas-movimentacao/$NOTA_ID" "" "200" "Get note details"
    echo ""
fi

# Test 3: Update note observations (PUT /notas-movimentacao/:id)
if [ ! -z "$NOTA_ID" ]; then
    test_endpoint "PUT" "/notas-movimentacao/$NOTA_ID" '{
        "observacoes": "Updated observations - Test validation"
    }' "200" "Update note observations"
    echo ""
fi

# =======================
# 2. ITEM MANAGEMENT TESTS
# =======================
echo_info "📦 2. ITEM MANAGEMENT TESTS"
echo ""

# First, we need to get a valid tipo EPI ID
echo_info "Getting available tipo EPI..."
tipos_response=$(curl -s --max-time $TIMEOUT "$API_URL/tipos-epi?limit=1" 2>/dev/null)
TIPO_EPI_ID=$(echo "$tipos_response" | jq -r '.data[0].id' 2>/dev/null)
if [ "$TIPO_EPI_ID" = "null" ] || [ -z "$TIPO_EPI_ID" ]; then
    echo_warning "No tipo EPI found. Skipping item tests."
else
    echo_info "Using tipo EPI ID: $TIPO_EPI_ID"
    
    # Test 4: Add item with cost (POST /notas-movimentacao/:id/itens)
    if [ ! -z "$NOTA_ID" ]; then
        test_endpoint "POST" "/notas-movimentacao/$NOTA_ID/itens" "{
            \"tipoEpiId\": \"$TIPO_EPI_ID\",
            \"quantidade\": 10,
            \"custoUnitario\": 25.50
        }" "201" "Add item with unit cost"
        echo ""
    fi
    
    # Test 5: Update item quantity (PUT /notas-movimentacao/:id/itens/:tipoEpiId)
    if [ ! -z "$NOTA_ID" ] && [ ! -z "$TIPO_EPI_ID" ]; then
        test_endpoint "PUT" "/notas-movimentacao/$NOTA_ID/itens/$TIPO_EPI_ID" '{
            "quantidade": 15
        }' "200" "Update item quantity"
        echo ""
    fi
    
    # Test 6: Update item cost (PUT /notas-movimentacao/:id/itens/:tipoEpiId/custo) - NEW ENDPOINT
    if [ ! -z "$NOTA_ID" ] && [ ! -z "$TIPO_EPI_ID" ]; then
        test_endpoint "PUT" "/notas-movimentacao/$NOTA_ID/itens/$TIPO_EPI_ID/custo" '{
            "custoUnitario": 30.00
        }' "200" "Update item unit cost (NEW ENDPOINT)"
        echo ""
    fi
fi

# =======================
# 3. COST PERSISTENCE TEST
# =======================
echo_info "💰 3. COST PERSISTENCE TEST"
echo ""

# Test 7: Verify costs are persisted (GET /notas-movimentacao/:id)
if [ ! -z "$NOTA_ID" ]; then
    echo_test $TESTS_TOTAL "Verify cost persistence"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    response=$(curl -s --max-time $TIMEOUT "$API_URL/notas-movimentacao/$NOTA_ID" 2>/dev/null)
    if echo "$response" | jq -e '.data.itens[0].custoUnitario' > /dev/null 2>&1; then
        cost=$(echo "$response" | jq -r '.data.itens[0].custoUnitario')
        echo_success "Cost persisted correctly: $cost"
        echo "$response" | jq '.data.itens[0]' 2>/dev/null
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo_error "Cost not found in response"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
fi

# =======================
# 4. DRAFT CONCLUSION TEST
# =======================
echo_info "🎯 4. DRAFT CONCLUSION TEST"
echo ""

# Test 8: Conclude draft (POST /notas-movimentacao/:id/concluir)
if [ ! -z "$NOTA_ID" ]; then
    test_endpoint "POST" "/notas-movimentacao/$NOTA_ID/concluir" '{
        "validarEstoque": false
    }' "200" "Conclude draft note"
    echo ""
fi

# =======================
# 5. LIST OPERATIONS TEST
# =======================
echo_info "📋 5. LIST OPERATIONS TEST"
echo ""

# Test 9: List all notes (GET /notas-movimentacao)
test_endpoint "GET" "/notas-movimentacao?limit=5" "" "200" "List all notes"
echo ""

# Test 10: List notes summary (GET /notas-movimentacao/resumo)
test_endpoint "GET" "/notas-movimentacao/resumo?limit=5" "" "200" "List notes summary"
echo ""

# =======================
# 6. ERROR HANDLING TESTS
# =======================
echo_info "⚠️  6. ERROR HANDLING TESTS"
echo ""

# Test 11: Invalid note creation
test_endpoint "POST" "/notas-movimentacao" '{
    "tipo": "INVALID_TYPE",
    "almoxarifadoDestinoId": "invalid-id"
}' "400" "Invalid note creation (should fail)"
echo ""

# Test 12: Get non-existent note
test_endpoint "GET" "/notas-movimentacao/00000000-0000-0000-0000-000000000000" "" "404" "Get non-existent note (should fail)"
echo ""

# Test 13: Add item to non-existent note
test_endpoint "POST" "/notas-movimentacao/00000000-0000-0000-0000-000000000000/itens" '{
    "tipoEpiId": "00000000-0000-0000-0000-000000000000",
    "quantidade": 1
}' "404" "Add item to non-existent note (should fail)"
echo ""

# =======================
# FINAL REPORT
# =======================
echo ""
echo_info "🎯 VALIDATION REPORT"
echo "================================="
echo "Total Tests: $TESTS_TOTAL"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo_success "ALL TESTS PASSED! 🎉"
    echo_success "Bug_Fixer's improvements are working correctly"
    exit 0
else
    echo_error "Some tests failed. Check the output above for details."
    exit 1
fi