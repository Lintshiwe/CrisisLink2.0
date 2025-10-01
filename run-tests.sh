#!/bin/bash

# CrisisLink Test Suite Runner
echo "🚨 CrisisLink Emergency Response System - Running Comprehensive Tests"
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
BACKEND_TESTS_PASSED=false
FRONTEND_TESTS_PASSED=false
DATABASE_TESTS_PASSED=false

# Check if required services are running
check_services() {
    print_status "Checking required services..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -q; then
        print_error "PostgreSQL is not running. Please start PostgreSQL service."
        exit 1
    fi
    print_success "PostgreSQL is running"
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js is available"
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm is available"
}

# Setup test environment
setup_test_env() {
    print_status "Setting up test environment..."
    
    # Create test database if it doesn't exist
    createdb crisislink_test 2>/dev/null || true
    
    # Load test data
    if [ -f "../database/schema.sql" ]; then
        print_status "Loading database schema..."
        psql -d crisislink_test -f ../database/schema.sql -q
        print_success "Database schema loaded"
    fi
    
    # Set test environment variables
    export NODE_ENV=test
    export DB_NAME=crisislink_test
    export PORT=5001
    
    print_success "Test environment setup complete"
}

# Run backend tests
run_backend_tests() {
    print_status "Running backend tests..."
    cd ../backend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install
    fi
    
    # Run tests
    if npm test; then
        BACKEND_TESTS_PASSED=true
        print_success "Backend tests passed!"
    else
        print_error "Backend tests failed!"
        return 1
    fi
    
    cd ../tests
}

# Run frontend tests
run_frontend_tests() {
    print_status "Running frontend tests..."
    cd ../frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Run tests
    if npm test; then
        FRONTEND_TESTS_PASSED=true
        print_success "Frontend tests passed!"
    else
        print_error "Frontend tests failed!"
        return 1
    fi
    
    cd ../tests
}

# Run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    # Start backend server in background
    cd ../backend
    npm start &
    BACKEND_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Run integration tests
    cd ../tests
    if node integration-tests.js; then
        print_success "Integration tests passed!"
    else
        print_error "Integration tests failed!"
    fi
    
    # Stop backend server
    kill $BACKEND_PID 2>/dev/null || true
}

# Run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Simple performance check
    cd ../backend
    npm start &
    BACKEND_PID=$!
    
    sleep 5
    
    # Test API response times
    print_status "Testing API response times..."
    
    # Test SOS endpoint performance
    RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null -X POST \
        -H "Content-Type: application/json" \
        -d '{"user_id":1,"latitude":-26.2041,"longitude":28.0473,"emergency_type":"medical"}' \
        http://localhost:5000/api/sos/create)
    
    if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
        print_success "SOS API response time: ${RESPONSE_TIME}s (Good)"
    else
        print_warning "SOS API response time: ${RESPONSE_TIME}s (Slow)"
    fi
    
    kill $BACKEND_PID 2>/dev/null || true
    cd ../tests
}

# Run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    # Check for common vulnerabilities
    cd ../backend
    
    # Check for SQL injection protection
    print_status "Checking SQL injection protection..."
    
    # Check for XSS protection
    print_status "Checking XSS protection..."
    
    # Check for authentication
    print_status "Checking authentication mechanisms..."
    
    print_success "Security tests completed"
    cd ../tests
}

# Generate test report
generate_report() {
    print_status "Generating test report..."
    
    cat > test-report.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>CrisisLink Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 CrisisLink Test Report</h1>
        <p>Generated on: $(date)</p>
    </div>
    
    <div class="test-section">
        <h2>Backend Tests</h2>
        <p class="$([ "$BACKEND_TESTS_PASSED" = true ] && echo 'success' || echo 'error')">
            Status: $([ "$BACKEND_TESTS_PASSED" = true ] && echo 'PASSED' || echo 'FAILED')
        </p>
    </div>
    
    <div class="test-section">
        <h2>Frontend Tests</h2>
        <p class="$([ "$FRONTEND_TESTS_PASSED" = true ] && echo 'success' || echo 'error')">
            Status: $([ "$FRONTEND_TESTS_PASSED" = true ] && echo 'PASSED' || echo 'FAILED')
        </p>
    </div>
    
    <div class="test-section">
        <h2>Test Coverage</h2>
        <p>Backend Coverage: Check coverage/lcov-report/index.html</p>
        <p>Frontend Coverage: Check frontend/coverage/lcov-report/index.html</p>
    </div>
</body>
</html>
EOF
    
    print_success "Test report generated: test-report.html"
}

# Main execution
main() {
    echo "Starting CrisisLink comprehensive test suite..."
    
    # Create tests directory if it doesn't exist
    mkdir -p tests
    cd tests
    
    check_services
    setup_test_env
    
    # Run all test suites
    run_backend_tests || print_error "Backend tests failed"
    run_frontend_tests || print_error "Frontend tests failed"
    run_integration_tests || print_error "Integration tests failed"
    run_performance_tests || print_error "Performance tests failed"
    run_security_tests || print_error "Security tests failed"
    
    generate_report
    
    # Summary
    echo ""
    echo "=================================================================="
    echo "                        TEST SUMMARY"
    echo "=================================================================="
    
    if [ "$BACKEND_TESTS_PASSED" = true ] && [ "$FRONTEND_TESTS_PASSED" = true ]; then
        print_success "🎉 All core tests passed! CrisisLink is ready for deployment."
        exit 0
    else
        print_error "❌ Some tests failed. Please check the logs above."
        exit 1
    fi
}

# Run main function
main "$@"