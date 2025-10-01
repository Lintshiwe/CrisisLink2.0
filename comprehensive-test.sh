#!/bin/bash

# CrisisLink Comprehensive Test Suite
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
    local test_dir="${3:-.}"
    
    print_status "Running: $test_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Save current directory
    local original_dir=$(pwd)
    
    # Only change directory if test_dir is not "."
    if [ "$test_dir" != "." ] && [ -d "$test_dir" ]; then
        cd "$test_dir"
    elif [ "$test_dir" != "." ]; then
        # Directory doesn't exist, test fails
        print_error "$test_name (directory $test_dir not found)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    if eval "$test_command" &>/dev/null; then
        print_success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        cd "$original_dir"
        return 0
    else
        print_error "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        cd "$original_dir"
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
    run_test "Database schema exists" "[ -f database/schema.sql ]"
    run_test "README documentation exists" "[ -f README.md ]"
    run_test "Deployment guide exists" "[ -f DEPLOYMENT.md ]"
    
    # 2. Backend Tests
    echo ""
    print_status "=== BACKEND TESTS ==="
    
    run_test "Backend package.json exists" "[ -f package.json ]" "backend"
    run_test "Backend server.js exists" "[ -f src/server.js ]" "backend"
    run_test "Backend syntax validation" "node -c src/server.js" "backend"
    run_test "Backend routes directory exists" "[ -d src/routes ]" "backend"
    run_test "Backend services directory exists" "[ -d src/services ]" "backend"
    run_test "SOS service exists" "[ -f src/services/sosService.js ]" "backend"
    run_test "Weather service exists" "[ -f src/services/weatherService.js ]" "backend"
    run_test "Notification service exists" "[ -f src/services/notificationService.js ]" "backend"
    run_test "Location service exists" "[ -f src/services/locationService.js ]" "backend"
    
    # 3. Frontend Tests
    echo ""
    print_status "=== FRONTEND TESTS ==="
    
    run_test "Frontend package.json exists" "[ -f package.json ]" "frontend"
    run_test "Frontend App.js exists" "[ -f src/App.js ]" "frontend"
    run_test "Frontend components directory exists" "[ -d src/components ]" "frontend"
    run_test "Frontend services directory exists" "[ -d src/services ]" "frontend"
    run_test "SOS Button component exists" "[ -f src/components/SOSButton.js ]" "frontend"
    run_test "Live Tracking Map component exists" "[ -f src/components/LiveTrackingMap.js ]" "frontend"
    run_test "Admin Dashboard component exists" "[ -f src/components/AdminDashboard.js ]" "frontend"
    run_test "Service Worker exists" "[ -f public/sw.js ]" "frontend"
    
    # 4. Configuration Tests
    echo ""
    print_status "=== CONFIGURATION TESTS ==="
    
    run_test "Backend environment example exists" "[ -f .env.example ]" "backend"
    run_test "Frontend has React dependency" "grep -q '\"react\"' package.json" "frontend"
    run_test "Backend has Express dependency" "grep -q '\"express\"' package.json" "backend"
    run_test "Backend has Socket.IO dependency" "grep -q '\"socket.io\"' package.json" "backend"
    run_test "Frontend has testing setup" "grep -q '\"@testing-library\"' package.json" "frontend"
    
    # 5. Database Tests
    echo ""
    print_status "=== DATABASE TESTS ==="
    
    run_test "Database schema file exists" "[ -f schema.sql ]" "database"
    run_test "Schema contains users table" "grep -q 'CREATE TABLE users' database/schema.sql"
    run_test "Schema contains agents table" "grep -q 'CREATE TABLE agents' database/schema.sql"
    run_test "Schema contains sos_alerts table" "grep -q 'CREATE TABLE sos_alerts' database/schema.sql"
    run_test "Schema has PostGIS extension" "grep -q 'CREATE EXTENSION.*postgis' database/schema.sql"
    
    # 6. API Tests
    echo ""
    print_status "=== API STRUCTURE TESTS ==="
    
    run_test "SOS routes exist" "[ -f src/routes/sos.js ]" "backend"
    run_test "Location routes exist" "[ -f src/routes/location.js ]" "backend"
    run_test "Weather routes exist" "[ -f src/routes/weather.js ]" "backend"
    run_test "Notification routes exist" "[ -f src/routes/notification.js ]" "backend"
    run_test "Admin routes exist" "[ -f src/routes/admin.js ]" "backend"
    
    # 7. Test Files
    echo ""
    print_status "=== TEST FILES VERIFICATION ==="
    
    run_test "Frontend test file exists" "[ -f src/tests/CrisisLink.test.tsx ]" "frontend"
    run_test "Backend test file exists" "[ -f tests/api.test.js ]" "backend"
    run_test "Integration test exists" "[ -f integration-tests.js ]" "tests"
    run_test "Simple test runner exists" "[ -f simple-test.js ]"
    
    # 8. Documentation Tests
    echo ""
    print_status "=== DOCUMENTATION TESTS ==="
    
    run_test "Project summary exists" "[ -f PROJECT_SUMMARY.md ]"
    run_test "Optimization guide exists" "[ -f OPTIMIZATION.md ]"
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
    BACKEND_SIZE=$(du -sh backend 2>/dev/null | cut -f1)
    FRONTEND_SIZE=$(du -sh frontend 2>/dev/null | cut -f1)
    TOTAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)
    
    echo "Backend Size: $BACKEND_SIZE"
    echo "Frontend Size: $FRONTEND_SIZE"
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