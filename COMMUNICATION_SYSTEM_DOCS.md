# CrisisLink User-Agent Communication System

## 🚨 System Overview

The CrisisLink Communication System provides real-time bidirectional communication between emergency users and response agents. The system features live location tracking, emergency alerts, agent assignment, and secure messaging.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Frontend │◄──►│  Backend Server │◄──►│ Agent Dashboard │
│                 │    │                 │    │                 │
│ • Emergency UI  │    │ • Socket.IO     │    │ • Alert Center  │
│ • Location GPS  │    │ • MongoDB       │    │ • Messaging     │
│ • Messaging     │    │ • Event Routing │    │ • Assignment    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📡 Real-time Communication Events

### User → Backend Events

- `user-register`: User connects to system
- `user-location-update`: Live location sharing
- `emergency-alert`: Emergency SOS alerts
- `user-message-to-agent`: Messages to agents
- `cancel-alert`: Alert cancellation

### Agent → Backend Events

- `agent-message-to-user`: Messages to users
- `agent-assign-to-alert`: Alert assignment
- `agent-request-location`: Location requests
- `resolve-alert`: Alert resolution

### Backend → User Events

- `agent-message-to-user`: Incoming agent messages
- `agent-assigned`: Agent assignment notification
- `alert-update`: Alert status changes
- `location-request`: Location sharing requests

### Backend → Agent Events

- `new-emergency-alert`: New user emergencies
- `user-message`: Incoming user messages
- `user-location-update`: User location updates
- `user-online`: User connection status

## 🌐 User Emergency Interface

**URL:** `http://localhost:5000/user-emergency` or `http://localhost:5000/emergency`

### Features

#### 🚨 Emergency Alert System

- **Emergency Button**: Large, prominent SOS button
- **Alert Types**: Medical, Fire, Police, General emergencies
- **Severity Levels**: Automatic severity assessment
- **Location Integration**: GPS coordinates automatically included

#### 📍 Live Location Tracking

- **GPS Integration**: Browser geolocation API
- **Real-time Updates**: Continuous location broadcasting
- **Privacy Controls**: User can enable/disable sharing
- **Accuracy Display**: Shows GPS accuracy in meters

#### 💬 Agent Communication

- **Message Display**: Real-time message history
- **Input Interface**: Text input with send functionality
- **Agent Status**: Shows assigned agent information
- **Response Time**: Displays estimated response time

#### 📱 Mobile-Responsive Design

- **Touch-Friendly**: Large buttons for emergency situations
- **Dark Theme**: Easy viewing in various conditions
- **Status Indicators**: Clear connection and GPS status
- **Notifications**: Toast notifications for important updates

### User Interface Components

```html
<!-- Emergency Alert Button -->
<button id="emergencyBtn" class="emergency-btn">
  <i class="fas fa-exclamation-triangle"></i>
  EMERGENCY ALERT
</button>

<!-- Emergency Type Selection -->
<div class="emergency-type-selection">
  <button data-type="medical">Medical</button>
  <button data-type="fire">Fire</button>
  <button data-type="police">Police</button>
  <button data-type="general">General</button>
</div>

<!-- Location Display -->
<div id="locationCard">
  <h3>Current Location</h3>
  <div id="locationDetails">
    <!-- Location info populated here -->
  </div>
</div>

<!-- Agent Communication -->
<div id="messagesContainer">
  <!-- Messages appear here -->
</div>
<input type="text" id="messageInput" placeholder="Type your message..." />
<button id="sendMessage">Send</button>
```

## 🚓 Agent Dashboard Integration

**URL:** `http://localhost:5000/agent-dashboard`

### User Communication Center

The agent dashboard now includes a dedicated "User Communication Center" panel with:

#### 🚨 Emergency Alerts Section

- **Real-time Alerts**: New user emergencies appear instantly
- **Alert Details**: Type, location, severity, timestamp
- **Quick Actions**: Assign to self, message user
- **Status Tracking**: Alert lifecycle management

#### 💬 User Messages Section

- **Message History**: All user communications
- **Unread Counter**: Number of pending messages
- **Quick Reply**: Click to respond to users
- **User Selection**: Select active communication partner

#### ⚡ Quick Response Panel

- **User Selection**: Shows currently selected user
- **Template Responses**: Pre-configured quick messages
- **Custom Messages**: Free-form message input
- **Status Display**: User communication status

### Agent Interface Components

```html
<!-- User Communication Center -->
<div class="user-communication-center">
  <!-- Emergency Alerts -->
  <div id="userEmergencyAlerts">
    <!-- Alert cards populated here -->
  </div>

  <!-- User Messages -->
  <div id="userMessages">
    <!-- Message cards populated here -->
  </div>

  <!-- Quick Response Panel -->
  <div class="quick-response-panel">
    <button data-message="Help is on the way!">Help Coming</button>
    <button data-message="Please share your location.">Need Location</button>
    <input type="text" id="userResponseInput" placeholder="Type message..." />
    <button id="sendUserMessageBtn">Send</button>
  </div>
</div>
```

## 🔧 Backend Implementation

### Socket.IO Event Handlers

```javascript
// User registration and location tracking
socket.on('user-register', (data) => {
  socket.join(`user-${data.userId}`)
  socket.join('users')
  // Notify agents about new user
})

socket.on('user-location-update', (data) => {
  // Store location and broadcast to agents
  socket.broadcast.to('agents').emit('user-location-update', data)
})

// Emergency alert handling
socket.on('emergency-alert', async (alertData) => {
  // Create alert record
  const alert = new SosAlert(alertData)
  await alert.save()

  // Broadcast to all agents
  socket.broadcast.to('agents').emit('new-emergency-alert', alert)
})

// Bidirectional messaging
socket.on('user-message-to-agent', (data) => {
  // Route message to agents
  socket.broadcast.to('agents').emit('user-message', data)
})

socket.on('agent-message-to-user', (data) => {
  // Send to specific user
  socket.broadcast.to(`user-${data.userId}`).emit('agent-message-to-user', data)
})
```

### Database Schema

```javascript
// SOS Alert Model
const sosAlertSchema = new Schema({
  userId: String,
  type: { type: String, enum: ['medical', 'fire', 'police', 'general'] },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number], // [longitude, latitude]
  },
  description: String,
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  status: {
    type: String,
    enum: ['active', 'in-progress', 'resolved', 'cancelled'],
  },
  assignedAgent: String,
  assignedAt: Date,
  resolvedAt: Date,
  resolution: String,
})
```

## 📱 Testing Scenarios

### Scenario 1: Emergency Alert Flow

1. **User Side:**

   - Open `http://localhost:5000/user-emergency`
   - Allow location access when prompted
   - Select emergency type (e.g., "Medical")
   - Click "EMERGENCY ALERT" button
   - Observe confirmation message

2. **Agent Side:**

   - Open `http://localhost:5000/agent-dashboard` in another tab
   - Navigate to "User Communication Center"
   - See new alert appear in "Emergency Alerts" section
   - Click "Assign to Me" button
   - Send quick response: "Help is on the way!"

3. **User Side:**
   - Receive agent assignment notification
   - See agent message appear in conversation
   - Reply with additional details

### Scenario 2: Location Tracking

1. **User Side:**

   - Ensure "Share live location" is enabled
   - Move device/change location (or simulate)
   - Observe location updates in interface

2. **Agent Side:**
   - See real-time location updates for active users
   - Click "Need Location" quick response
   - Observe user location refresh

### Scenario 3: Messaging System

1. **User Side:**

   - Type message: "I need immediate medical assistance"
   - Click send button

2. **Agent Side:**

   - See message appear in "User Messages" section
   - Click "Reply" button to select user
   - Send custom response via text input

3. **Bidirectional Communication:**
   - Verify messages appear on both interfaces
   - Test multiple message exchange
   - Confirm timestamps and user identification

## 🔒 Security Features

### Authentication

- **User Identification**: Unique user ID generation
- **Session Management**: Socket.IO session tracking
- **Room Isolation**: Separate communication channels

### Data Protection

- **Input Validation**: Message content sanitization
- **Rate Limiting**: Prevent message spam
- **Location Privacy**: User-controlled sharing

### Network Security

- **HTTPS Ready**: SSL/TLS support for production
- **CORS Configuration**: Restricted cross-origin requests
- **Helmet Security**: Security headers implementation

## 🚀 Deployment Considerations

### Production Setup

```bash
# Environment Variables
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/crisislink_db
CORS_ORIGIN=https://your-domain.com

# SSL Configuration (recommended)
SSL_CERT_PATH=/path/to/certificate.pem
SSL_KEY_PATH=/path/to/private-key.pem
```

### Performance Optimization

- **Database Indexing**: Location-based queries optimization
- **Connection Pooling**: Socket.IO connection management
- **Message Limits**: Prevent memory overflow
- **Cleanup Jobs**: Remove old alerts and messages

### Monitoring

- **Connection Tracking**: Active user/agent monitoring
- **Alert Metrics**: Response time measurement
- **Error Logging**: Comprehensive error tracking
- **Health Checks**: System status endpoints

## 📊 System Metrics

The system tracks various metrics for performance monitoring:

- **Active Users**: Currently connected emergency users
- **Active Agents**: Available response agents
- **Alert Response Time**: Time from alert to agent assignment
- **Message Delivery**: Successful message transmission rates
- **Location Accuracy**: GPS precision tracking
- **System Uptime**: Service availability metrics

## 🛠️ Troubleshooting

### Common Issues

#### Location Not Working

- **Browser Permissions**: Ensure geolocation is allowed
- **HTTPS Requirement**: Geolocation requires secure context
- **GPS Timeout**: Check device GPS settings

#### Messages Not Appearing

- **Socket Connection**: Verify WebSocket connectivity
- **Room Assignment**: Confirm user/agent room joining
- **Browser Console**: Check for JavaScript errors

#### Alerts Not Received

- **Database Connection**: Verify MongoDB connectivity
- **Event Emission**: Check Socket.IO event broadcasting
- **Agent Dashboard**: Ensure agents are properly connected

### Debug Commands

```bash
# Check server status
curl http://localhost:5000/health

# Monitor Socket.IO connections
# Open browser console on both interfaces
# Check for "Connected to emergency system" message

# Database inspection
mongo
use crisislink_db
db.sosalerts.find().pretty()
```

## 🎯 Future Enhancements

### Planned Features

- **Video Calling**: WebRTC integration for emergency calls
- **File Sharing**: Photo/document transmission capability
- **Multi-language**: Internationalization support
- **Offline Mode**: Service worker for offline functionality
- **Push Notifications**: Native mobile notifications
- **Advanced Routing**: Intelligent agent assignment algorithms

### Scalability Improvements

- **Redis Integration**: Session clustering for multiple servers
- **Load Balancing**: Horizontal scaling support
- **Microservices**: Service decomposition for larger deployments
- **CDN Integration**: Static asset optimization

## 📞 Support and Documentation

For additional support and detailed API documentation:

- **System Health**: `http://localhost:5000/health`
- **API Endpoints**: `http://localhost:5000/api/`
- **Service Management**: `http://localhost:5000/service-management`
- **GitHub Repository**: [CrisisLink2.0](https://github.com/Lintshiwe/CrisisLink2.0)

---

**Built with ❤️ for emergency response teams worldwide**
