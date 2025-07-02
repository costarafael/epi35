#!/bin/bash

# 🤖 Claude-Flow Error Resolution Script
# Implements conservative parallel strategy for fixing 493 compilation errors

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

# Function to count compilation errors
count_errors() {
    npm run build 2>&1 | grep "Found.*error" | grep -o '[0-9]\+' | head -1 || echo "0"
}

# Function to check if claude-flow is available
check_claude_flow() {
    if ! command -v ./claude-flow &> /dev/null; then
        print_error "claude-flow not found. Please run: npx claude-flow@latest init --sparc"
        exit 1
    fi
}

# Function to setup memory bank
setup_memory() {
    print_status "Setting up Claude-Flow memory bank..."
    
    # Store migration patterns from CLAUDE.md
    ./claude-flow memory store "migration_patterns" "$(cat CLAUDE.md | grep -A 100 'GUIA DE MIGRAÇÃO' | head -50)"
    
    # Store file groups
    ./claude-flow memory store "files_group_1" "src/application/use-cases/fichas/"
    ./claude-flow memory store "files_group_2" "src/application/use-cases/estoque/"
    ./claude-flow memory store "files_group_3" "src/application/use-cases/queries/"
    ./claude-flow memory store "files_group_4" "src/presentation/"
    ./claude-flow memory store "files_group_5" "src/domain/interfaces/,src/infrastructure/"
    ./claude-flow memory store "files_group_6" "test/"
    
    # Store baseline
    INITIAL_ERRORS=$(count_errors)
    ./claude-flow memory store "baseline_errors" "$INITIAL_ERRORS"
    
    print_success "Memory bank initialized with baseline: $INITIAL_ERRORS errors"
}

# Function to execute Wave 1 (parallel low-conflict groups)
execute_wave_1() {
    print_status "🚀 Executing Wave 1: Parallel Low-Conflict Groups"
    
    # Create background jobs for parallel execution
    print_status "Starting fichas group agent..."
    ./claude-flow sparc run coder "Fix all compilation errors in src/application/use-cases/fichas/ by updating to single-ficha-per-collaborator model. Use migration patterns from memory. Focus on: 1) Remove tipoEpiId from fichas 2) Update queries to use colaboradorId unique constraint 3) Fix include clauses" &
    FICHAS_PID=$!
    
    print_status "Starting queries group agent..."  
    ./claude-flow sparc run coder "Fix all compilation errors in src/application/use-cases/queries/ by updating Prisma queries. Use migration patterns from memory. Focus on: 1) Update field names (createdAt→dataMovimentacao) 2) Fix include clauses 3) Remove non-existent fields" &
    QUERIES_PID=$!
    
    print_status "Starting tests group agent..."
    ./claude-flow sparc run tdd "Fix compilation errors in test/ by updating to new schema structure. Use migration patterns from memory. Focus on: 1) Update test data creation 2) Fix assertion field names 3) Update include clauses in test queries" &
    TESTS_PID=$!
    
    # Wait for all background jobs
    print_status "Waiting for Wave 1 agents to complete..."
    wait $FICHAS_PID
    FICHAS_RESULT=$?
    wait $QUERIES_PID  
    QUERIES_RESULT=$?
    wait $TESTS_PID
    TESTS_RESULT=$?
    
    # Check results
    if [ $FICHAS_RESULT -eq 0 ] && [ $QUERIES_RESULT -eq 0 ] && [ $TESTS_RESULT -eq 0 ]; then
        print_success "Wave 1 completed successfully"
    else
        print_warning "Some Wave 1 agents had issues (non-fatal)"
    fi
}

# Function to checkpoint and validate
checkpoint_validation() {
    print_status "📊 Checkpoint: Validating progress..."
    
    CURRENT_ERRORS=$(count_errors)
    BASELINE=$(./claude-flow memory get "baseline_errors" 2>/dev/null || echo "493")
    
    if [ "$CURRENT_ERRORS" -lt "$BASELINE" ]; then
        REDUCTION=$((BASELINE - CURRENT_ERRORS))
        print_success "Progress: $REDUCTION errors fixed ($BASELINE → $CURRENT_ERRORS)"
        ./claude-flow memory store "wave1_progress" "Reduced from $BASELINE to $CURRENT_ERRORS errors"
        return 0
    else
        print_warning "No progress or errors increased ($BASELINE → $CURRENT_ERRORS)"
        return 1
    fi
}

# Function to execute Wave 2 (sequential medium-conflict)
execute_wave_2() {
    print_status "🔄 Executing Wave 2: Sequential Medium-Conflict Group"
    
    ./claude-flow sparc run coder "Fix compilation errors in src/presentation/ controllers and DTOs. Use migration patterns from memory and wave1_progress. Focus on: 1) Update DTO field names 2) Fix enum values in validations 3) Update controller response types"
    
    print_success "Wave 2 completed"
}

# Function to execute Wave 3 (critical dependencies)
execute_wave_3() {
    print_status "🎯 Executing Wave 3: Critical Dependencies"
    
    ./claude-flow sparc run architect "Analyze and fix repository interfaces and implementations in src/domain/interfaces/ and src/infrastructure/. Use migration patterns from memory. Focus on: 1) Update interface method signatures 2) Fix repository implementations 3) Ensure compatibility with new schema"
    
    print_success "Wave 3 completed"
}

# Function to final validation
final_validation() {
    print_status "🏁 Final Validation..."
    
    FINAL_ERRORS=$(count_errors)
    BASELINE=$(./claude-flow memory get "baseline_errors" 2>/dev/null || echo "493")
    
    # Store final results
    ./claude-flow memory store "final_errors" "$FINAL_ERRORS"
    ./claude-flow memory store "total_reduction" "$((BASELINE - FINAL_ERRORS))"
    
    print_status "Final Results:"
    echo "  📊 Initial errors: $BASELINE"
    echo "  📊 Final errors: $FINAL_ERRORS" 
    echo "  📊 Total reduction: $((BASELINE - FINAL_ERRORS))"
    echo "  📊 Success rate: $(((BASELINE - FINAL_ERRORS) * 100 / BASELINE))%"
    
    if [ "$FINAL_ERRORS" -lt 100 ]; then
        print_success "🎉 Target achieved! Less than 100 errors remaining"
    elif [ "$FINAL_ERRORS" -lt $((BASELINE / 2)) ]; then
        print_success "✅ Significant progress! 50%+ errors resolved"
    else
        print_warning "⚠️ Limited progress. Consider manual intervention"
    fi
}

# Main execution
main() {
    print_status "🤖 Starting Claude-Flow Error Resolution Strategy"
    print_status "Target: Reduce 493 compilation errors using parallel AI agents"
    
    # Pre-flight checks
    check_claude_flow
    
    # Ensure we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "src" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Store current state
    git add . && git commit -m "Checkpoint before claude-flow error resolution" || true
    
    # Execute strategy
    setup_memory
    execute_wave_1
    
    if checkpoint_validation; then
        execute_wave_2
        checkpoint_validation
        execute_wave_3
        final_validation
    else
        print_error "Wave 1 failed to make progress. Consider manual review."
        exit 1
    fi
    
    print_success "🎯 Claude-Flow error resolution completed!"
    print_status "💡 Next steps: Review remaining errors manually and run tests"
}

# Help function
show_help() {
    echo "🤖 Claude-Flow Error Resolution Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --dry-run     Show what would be executed without running"
    echo "  --setup-only  Only setup memory bank and exit"
    echo ""
    echo "This script implements a conservative parallel strategy to fix"
    echo "compilation errors using claude-flow AI agents."
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --dry-run)
        print_status "DRY RUN: Would execute claude-flow error resolution strategy"
        print_status "Target: 493 → <100 errors using 3 waves of parallel agents"
        exit 0
        ;;
    --setup-only)
        check_claude_flow
        setup_memory
        print_success "Memory bank setup completed"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac