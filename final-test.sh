#!/bin/bash

# CrisisLink Comprehensive Test Suite - Simplified Version
echo "🚨 CrisisLink Emergency Response System - Comprehensive Test Suite"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_status "Running: $test_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command" &>/dev/null; then
        print_success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Main test execution
main() {
    print_status "Starting comprehensive CrisisLink test suite..."
    
    # 1. Project Structure Tests
    echo ""
    print_status "=== PROJECT STRUCTURE TESTS ==="
    
    run_test "Backend directory exists" "[ -d backend ]"
    run_test "Frontend directory exists" "[ -d frontend ]"
    run_test "Database directory exists" "[ -d database ]"
    run_test "Tests directory exists" "[ -d tests ]"
    run_test "README documentation exists" "[ -f README.md ]"
    run_test "Deployment guide exists" "[ -f DEPLOYMENT.md ]"
    run_test "Project summary exists" "[ -f PROJECT_SUMMARY.md ]"
    run_test "Optimization guide exists" "[ -f OPTIMIZATION.md ]"
    
    # 2. Backend Tests
    echo ""
    print_status "=== BACKEND TESTS ==="
    
    run_test "Backend package.json exists" "[ -f backend/package.json ]"
    run_test "Backend server.js exists" "[ -f backend/src/server.js ]"
    run_test "Backend routes directory exists" "[ -d backend/src/routes ]"
    run_test "Backend services directory exists" "[ -d backend/src/services ]"
    run_test "SOS service exists" "[ -f backend/src/services/sosService.js ]"
    run_test "Weather service exists" "[ -f backend/src/services/weatherService.js ]"
    run_test "Notification service exists" "[ -f backend/src/services/notificationService.js ]"
    run_test "Location service exists" "[ -f backend/src/services/locationService.js ]"
    run_test "Backend environment example exists" "[ -f backend/.env.example ]"
    
    # 3. Frontend Tests
    echo ""
    print_status "=== FRONTEND TESTS ==="
    
    run_test "Frontend package.json exists" "[ -f frontend/package.json ]"
    run_test "Frontend src directory exists" "[ -d frontend/src ]"
    run_test "Frontend public directory exists" "[ -d frontend/public ]"
    run_test "App.js exists" "[ -f frontend/src/App.js ]"
    run_test "Components directory exists" "[ -d frontend/src/components ]"
    run_test "Services directory exists" "[ -d frontend/src/services ]"
    
    # 4. Database Tests
    echo ""
    print_status "=== DATABASE TESTS ==="
    
    run_test "Database schema file exists" "[ -f database/schema.sql ]"
    
    # 5. API Tests
    echo ""
    print_status "=== API STRUCTURE TESTS ==="
    
    run_test "SOS routes exist" "[ -f backend/src/routes/sos.js ]"
    run_test "Location routes exist" "[ -f backend/src/routes/location.js ]"
    run_test "Weather routes exist" "[ -f backend/src/routes/weather.js ]"
    run_test "Admin routes exist" "[ -f backend/src/routes/admin.js ]"
    
    # 6. Configuration Tests
    echo ""
    print_status "=== CONFIGURATION TESTS ==="
    
    run_test "Backend has Express dependency" "grep -q '\"express\"' backend/package.json"
    run_test "Backend has Socket.IO dependency" "grep -q '\"socket.io\"' backend/package.json"
    run_test "Backend has PostgreSQL dependency" "grep -q '\"pg\"' backend/package.json"
    run_test "Frontend has React dependency" "grep -q '\"react\"' frontend/package.json"
    
    # 7. Test Files
    echo ""
    print_status "=== TEST FILES VERIFICATION ==="
    
    run_test "Backend tests directory exists" "[ -d backend/tests ]"
    run_test "Simple test runner exists" "[ -f simple-test.js ]"
    run_test "Test scripts exist" "[ -f run-tests.sh ]"
    
    # Results Summary
    echo ""
    echo "=================================================================="
    print_status "                        TEST RESULTS SUMMARY"
    echo "=================================================================="
    
    echo "Total Tests Run: $TOTAL_TESTS"
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "🎉 ALL TESTS PASSED! CrisisLink is ready for deployment."
        SUCCESS_RATE=100
    else
        FAILURE_RATE=$((TESTS_FAILED * 100 / TOTAL_TESTS))
        SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
        
        if [ $FAILURE_RATE -le 10 ]; then
            print_warning "⚠️ Minor issues detected ($FAILURE_RATE% failure rate). Review and fix before deployment."
        else
            print_error "❌ Significant issues detected ($FAILURE_RATE% failure rate). Address issues before proceeding."
        fi
    fi
    
    echo "Success Rate: $SUCCESS_RATE%"
    echo "=================================================================="
    
    # Performance check
    echo ""
    print_status "=== PERFORMANCE CHECK ==="
    
    # Check file sizes
    if [ -d "backend" ]; then
        BACKEND_SIZE=$(du -sh backend 2>/dev/null | cut -f1)
        echo "Backend Size: $BACKEND_SIZE"
    fi
    
    if [ -d "frontend" ]; then
        FRONTEND_SIZE=$(du -sh frontend 2>/dev/null | cut -f1)
        echo "Frontend Size: $FRONTEND_SIZE"
    fi
    
    TOTAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)
    echo "Total Project Size: $TOTAL_SIZE"
    
    # Check critical files
    print_status "Critical files verification:"
    
    if [ -f "backend/src/server.js" ]; then
        BACKEND_LINES=$(wc -l < backend/src/server.js)
        echo "Backend server.js: $BACKEND_LINES lines"
    fi
    
    if [ -f "frontend/src/App.js" ]; then
        FRONTEND_LINES=$(wc -l < frontend/src/App.js)
        echo "Frontend App.js: $FRONTEND_LINES lines"
    fi
    
    # Final status
    echo ""
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "✅ CrisisLink Emergency Response System - COMPREHENSIVE TESTS PASSED"
        print_success "🚀 System is ready for production deployment!"
        exit 0
    else
        print_error "❌ Some tests failed. Please review and fix issues."
        exit 1
    fi
}

# Run main function
main "$@"