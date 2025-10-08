#!/bin/bash

echo "========================================="
echo "🚨 CRISISLINK COMMUNICATION SYSTEM DEMO"
echo "========================================="
echo ""

# Check if server is running
echo "📡 Checking server status..."
curl -s http://localhost:5000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Server is running on http://localhost:5000"
else
    echo "❌ Server is not running. Please start with 'npm start'"
    exit 1
fi

echo ""
echo "🎯 AVAILABLE INTERFACES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "👤 USER EMERGENCY INTERFACE:"
echo "   🌐 http://localhost:5000/user-emergency"
echo "   🌐 http://localhost:5000/emergency"
echo ""
echo "   Features:"
echo "   • Emergency alert system with location sharing"
echo "   • Real-time communication with agents"
echo "   • Live GPS tracking"
echo "   • SOS button with emergency type selection"
echo ""

echo "🚓 AGENT DASHBOARD:"
echo "   🌐 http://localhost:5000/agent-dashboard"
echo ""
echo "   Features:"
echo "   • Receive emergency alerts from users"
echo "   • Assign alerts to self"
echo "   • Send messages to users"
echo "   • Track user locations"
echo "   • Quick response templates"
echo ""

echo "🔧 SERVICE MANAGEMENT:"
echo "   🌐 http://localhost:5000/service-management"
echo ""

echo "🗺️ RESCUE TRACKER:"
echo "   🌐 http://localhost:5000/rescue-tracker"
echo ""

echo "🏠 SYSTEM OVERVIEW:"
echo "   🌐 http://localhost:5000"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 TESTING SCENARIOS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🧪 SCENARIO 1: Basic Emergency Flow"
echo "1. Open User Emergency Interface"
echo "2. Allow location access"
echo "3. Click 'EMERGENCY ALERT' button"
echo "4. Open Agent Dashboard in another tab"
echo "5. See alert appear in 'User Communication Center'"
echo "6. Click 'Assign to Me' on the alert"
echo "7. Send message to user using quick responses"
echo ""

echo "🧪 SCENARIO 2: Messaging System"
echo "1. User sends message via emergency interface"
echo "2. Agent receives message in dashboard"
echo "3. Agent clicks 'Reply' and sends response"
echo "4. User receives agent message"
echo ""

echo "🧪 SCENARIO 3: Location Tracking"
echo "1. User enables location sharing"
echo "2. Agent can see location updates in real-time"
echo "3. Agent can request updated location"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 FEATURES IMPLEMENTED:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ Real-time location sharing"
echo "✅ Emergency alert system"
echo "✅ Bidirectional messaging"
echo "✅ Agent assignment system"
echo "✅ Quick response templates"
echo "✅ User activity monitoring"
echo "✅ Socket.IO real-time communication"
echo "✅ MongoDB data persistence"
echo "✅ Mobile-responsive design"
echo "✅ Geolocation integration"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Ready to test! Open the URLs above in your browser."
echo "━━━━━━━━━━━━━━━━━━━━━━━━"