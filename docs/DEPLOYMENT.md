# 🚨 CrisisLink Deployment Guide

This guide will help you deploy and run the CrisisLink emergency response system.

## 📋 Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 13.0 or higher with PostGIS extension
- **npm**: 8.0.0 or higher

### Required API Keys

- **OpenWeatherMap API**: For weather monitoring
- **Twilio Account**: For SMS and voice calls
- **Firebase Project**: For push notifications
- **Mapbox Account**: For mapping and geocoding

## 🔧 Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd CrisisLink2.0

# Install root dependencies
npm run install:all
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb crisislink_db

# Enable PostGIS extension and run schema
psql -d crisislink_db -f database/schema.sql
```

### 3. Environment Configuration

#### Backend Environment Variables

Create `backend/.env` file:

```env
# Environment
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crisislink_db
DB_USER=postgres
DB_PASSWORD=your_database_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=24h

# OpenWeatherMap API
OPENWEATHER_API_KEY=your_openweather_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_firebase_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_CLIENT_ID=your_firebase_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Mapbox
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

#### Frontend Environment Variables

Create `frontend/.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_VAPID_KEY=your_vapid_key
```

### 4. API Keys Setup Guide

#### OpenWeatherMap API

1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for free account
3. Generate API key
4. Add to `OPENWEATHER_API_KEY` in backend/.env

#### Twilio Setup

1. Create account at [Twilio](https://www.twilio.com/)
2. Get Account SID and Auth Token from console
3. Purchase a phone number for SMS/calls
4. Add credentials to backend/.env

#### Firebase Setup

1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore and Authentication
3. Generate service account key (JSON)
4. Extract values for backend/.env
5. Enable Cloud Messaging for push notifications
6. Get web app config for frontend/.env

#### Mapbox Setup

1. Create account at [Mapbox](https://www.mapbox.com/)
2. Generate access token
3. Add to both backend and frontend .env files

## 🚀 Running the Application

### Development Mode

```bash
# Start both backend and frontend
npm run dev

# Or start individually:
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### Production Build

```bash
# Build frontend for production
npm run build

# Start backend in production mode
npm start
```

## 🧪 Testing the System

### 1. User Registration and Login

- Visit `http://localhost:3000`
- Register as a new user
- Verify location permissions work

### 2. Agent Registration

- Register agents with badge numbers
- Set location and status to 'available'

### 3. SOS Alert Testing

- Trigger SOS alert from user interface
- Verify agents receive notifications
- Test agent assignment and status updates

### 4. Weather Monitoring

- Check weather alerts endpoint: `GET /api/weather/alerts`
- Verify weather monitoring cron jobs

## 🔒 Security Considerations

### Production Deployment

1. **Environment Variables**: Never commit .env files
2. **JWT Secret**: Use strong, unique secret
3. **Database**: Configure proper user permissions
4. **HTTPS**: Enable SSL certificates
5. **Firewall**: Restrict database access
6. **Rate Limiting**: Configure appropriate limits

### API Security

- All endpoints use JWT authentication
- Input validation on all routes
- SQL injection protection with Sequelize
- XSS protection with helmet.js

## 📊 Monitoring and Logging

### Backend Logs

- Application logs: `backend/logs/`
- Error tracking: Winston logger
- Database query logging available

### Health Checks

- Backend health: `GET /api/health`
- Weather system status: `GET /api/weather/status`

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Verify PostGIS extension
psql -d crisislink_db -c "SELECT PostGIS_Version();"
```

#### Location Services Not Working

- Ensure HTTPS in production (required for geolocation)
- Check browser permissions
- Verify Mapbox token is valid

#### Push Notifications Not Sending

- Verify Firebase service account key
- Check FCM token registration
- Ensure proper VAPID key configuration

#### Weather Alerts Not Working

- Verify OpenWeatherMap API key
- Check API rate limits
- Verify cron jobs are running

### Performance Optimization

#### Database Indexes

- Spatial indexes are created for location queries
- Regular maintenance recommended

#### Caching

- Implement Redis for session storage in production
- Cache weather data appropriately

## 📱 Mobile App Development

### PWA Features

- Service worker for offline functionality
- App manifest for installation
- Push notification support

### Native App Extension

- Expo/React Native version possible
- Share core logic with web app

## 🌍 South African Specific Configurations

### Geographic Bounds

- System validates coordinates within SA bounds
- Province detection based on location
- Major cities monitored for weather

### Emergency Services Integration

- Designed for SA emergency service structure
- Phone number formats validated for SA
- Time zones configured for SAST

## 📞 Support and Maintenance

### Regular Tasks

- Monitor weather API usage
- Review emergency response times
- Update agent locations and status
- Database backup and maintenance

### Scaling Considerations

- Horizontal scaling for high availability
- Load balancing for API endpoints
- Database read replicas for analytics

---

## 🚨 Emergency Contacts

For system issues affecting emergency services:

- Technical Support: [your-support-email]
- Emergency Coordinator: [emergency-coordinator]

---

**Remember**: This system handles emergency situations. Always maintain high availability and have backup procedures in place.
