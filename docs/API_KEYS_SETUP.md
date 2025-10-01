# 🔑 API Keys Setup Guide for CrisisLink

Your Google API key `AIzaSyDRMaid3NqgUE-mgyGpooyCPSqE_3YeJB8` has been added to the configuration files!

## ✅ Already Configured:

- **Google/Firebase API Key**: `AIzaSyDRMaid3NqgUE-mgyGpooyCPSqE_3YeJB8`

## 🚨 Still Needed (Critical for System Operation):

### 1. **OpenWeatherMap API Key** (Required for Weather Alerts)

**Why needed**: Core feature - weather threat detection and alerts

**Steps to get it**:

1. Visit: https://openweathermap.org/api
2. Click "Sign Up" (it's FREE)
3. Verify your email
4. Go to API Keys section
5. Copy your API key (format: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)
6. Replace `your_openweather_api_key_needed_here` in `backend/.env`

### 2. **Mapbox Access Token** (For Maps and Location)

**Why needed**: Live tracking, agent location display, route optimization

**Steps to get it**:

1. Visit: https://www.mapbox.com/
2. Sign up for free account
3. Go to Account → Access Tokens
4. Copy your default public token
5. Replace `your_mapbox_access_token_here` in both `.env` files

### 3. **Twilio Account** (For SMS Notifications)

**Why needed**: SMS backup notifications for critical alerts

**Steps to get it**:

1. Visit: https://www.twilio.com/
2. Sign up for free trial ($15 credit)
3. Get Account SID and Auth Token from console
4. Get a phone number for SMS
5. Update Twilio settings in `backend/.env`

## 🚀 Quick Test Without All Keys:

You can still test the core SOS system with just the OpenWeatherMap key:

```bash
# 1. Get OpenWeatherMap API key (5 minutes)
# 2. Update backend/.env file
# 3. Install and run:

npm run install:all
npm run dev
```

## 📋 Priority Order:

1. **OpenWeatherMap** (Essential - weather alerts)
2. **Mapbox** (Important - maps and tracking)
3. **Twilio** (Good to have - SMS backup)

## 🔒 Security Note:

- Never commit API keys to version control
- The `.env` files are already in `.gitignore`
- In production, use environment variables or secrets management

---

Once you have the OpenWeatherMap key, your CrisisLink system will be fully operational for emergency response testing!
