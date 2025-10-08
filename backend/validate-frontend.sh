#!/bin/bash

# CrisisLink 2.0 - Comprehensive Syntax and Error Check Script
# This script validates all frontend files for syntax errors and runtime issues

echo "🔍 CrisisLink 2.0 - Comprehensive Error Detection"
echo "================================================"

PUBLIC_DIR="/c/Users/ntoam/Desktop/Projects/CrisisLink2.0/backend/public"
cd "$PUBLIC_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERROR_COUNT=0
WARNING_COUNT=0

echo -e "${BLUE}📁 Scanning directory: $PUBLIC_DIR${NC}"
echo

# Function to check HTML validation
check_html_syntax() {
    local file=$1
    echo -e "${BLUE}🔍 Checking HTML syntax: $file${NC}"
    
    # Basic HTML structure checks
    if ! grep -q "<!DOCTYPE\|<!doctype" "$file"; then
        echo -e "${RED}❌ Missing DOCTYPE declaration${NC}"
        ((ERROR_COUNT++))
    fi
    
    if ! grep -q "<html" "$file"; then
        echo -e "${RED}❌ Missing <html> tag${NC}"
        ((ERROR_COUNT++))
    fi
    
    if ! grep -q "</html>" "$file"; then
        echo -e "${RED}❌ Missing closing </html> tag${NC}"
        ((ERROR_COUNT++))
    fi
    
    # Check for unclosed tags (basic check)
    if grep -q "<[^/>]*>[^<]*$" "$file"; then
        echo -e "${YELLOW}⚠️ Potential unclosed tags detected${NC}"
        ((WARNING_COUNT++))
    fi
    
    echo -e "${GREEN}✅ HTML structure check completed${NC}"
}

# Function to check JavaScript syntax
check_js_syntax() {
    local file=$1
    echo -e "${BLUE}🔍 Checking JavaScript syntax: $file${NC}"
    
    # Extract JavaScript from script tags and validate
    if grep -q "<script>" "$file"; then
        # Check for common syntax issues
        if grep -q "function.*{.*}.*{" "$file"; then
            echo -e "${YELLOW}⚠️ Potential nested function syntax issue${NC}"
            ((WARNING_COUNT++))
        fi
        
        # Check for unclosed brackets
        OPEN_BRACES=$(grep -o "{" "$file" | wc -l)
        CLOSE_BRACES=$(grep -o "}" "$file" | wc -l)
        
        if [ $OPEN_BRACES -ne $CLOSE_BRACES ]; then
            echo -e "${RED}❌ Mismatched braces: $OPEN_BRACES open, $CLOSE_BRACES close${NC}"
            ((ERROR_COUNT++))
        fi
        
        # Check for unclosed parentheses in script sections
        SCRIPT_CONTENT=$(sed -n '/<script>/,/<\/script>/p' "$file")
        OPEN_PARENS=$(echo "$SCRIPT_CONTENT" | grep -o "(" | wc -l)
        CLOSE_PARENS=$(echo "$SCRIPT_CONTENT" | grep -o ")" | wc -l)
        
        if [ $OPEN_PARENS -ne $CLOSE_PARENS ]; then
            echo -e "${YELLOW}⚠️ Potential parentheses mismatch: $OPEN_PARENS open, $CLOSE_PARENS close${NC}"
            ((WARNING_COUNT++))
        fi
    fi
    
    echo -e "${GREEN}✅ JavaScript syntax check completed${NC}"
}

# Function to check for runtime errors
check_runtime_errors() {
    local file=$1
    echo -e "${BLUE}🔍 Checking for potential runtime errors: $file${NC}"
    
    # Check for common runtime error patterns
    if grep -q "undefined" "$file"; then
        echo -e "${YELLOW}⚠️ References to 'undefined' found - may indicate runtime issues${NC}"
        ((WARNING_COUNT++))
    fi
    
    if grep -q "null\." "$file"; then
        echo -e "${YELLOW}⚠️ Potential null reference access found${NC}"
        ((WARNING_COUNT++))
    fi
    
    # Check for missing variable declarations
    if grep -q "^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=" "$file" && ! grep -q "var\|let\|const" "$file"; then
        echo -e "${YELLOW}⚠️ Potential undeclared variables found${NC}"
        ((WARNING_COUNT++))
    fi
    
    echo -e "${GREEN}✅ Runtime error check completed${NC}"
}

# Function to check file accessibility
check_file_accessibility() {
    local file=$1
    echo -e "${BLUE}🔍 Checking file accessibility: $file${NC}"
    
    if [ ! -r "$file" ]; then
        echo -e "${RED}❌ File is not readable${NC}"
        ((ERROR_COUNT++))
    fi
    
    if [ ! -s "$file" ]; then
        echo -e "${RED}❌ File is empty${NC}"
        ((ERROR_COUNT++))
    fi
    
    echo -e "${GREEN}✅ File accessibility check completed${NC}"
}

# Main validation loop
echo -e "${BLUE}🔍 Starting comprehensive validation...${NC}"
echo

for file in *.html; do
    if [ -f "$file" ]; then
        echo -e "${BLUE}📄 Validating: $file${NC}"
        echo "----------------------------------------"
        
        check_file_accessibility "$file"
        check_html_syntax "$file"
        check_js_syntax "$file"
        check_runtime_errors "$file"
        
        echo
    fi
done

# Summary
echo "========================================"
echo -e "${BLUE}📊 VALIDATION SUMMARY${NC}"
echo "========================================"

if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All files passed validation!${NC}"
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️ No errors found, but $WARNING_COUNT warnings detected${NC}"
else
    echo -e "${RED}❌ Found $ERROR_COUNT errors and $WARNING_COUNT warnings${NC}"
fi

echo
echo -e "${BLUE}📋 Files checked:${NC}"
ls -1 *.html | sed 's/^/  - /'

echo
echo -e "${BLUE}🔗 Quick Access URLs:${NC}"
echo "  - Agent Dashboard: http://localhost:5000/agent-dashboard.html"
echo "  - Test Console: http://localhost:5000/test-console.html"
echo "  - Service Management: http://localhost:5000/service-management.html"
echo "  - Rescue Tracker: http://localhost:5000/rescue-tracker.html"

echo
echo -e "${GREEN}✅ Validation completed!${NC}"

exit $ERROR_COUNT