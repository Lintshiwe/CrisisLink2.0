# 🚨 CrisisLink – One-Tap Disaster Rescue System

**Theme**: Technology for Good | **Core Focus**: SOS Activation + Agent Communication

## 🧭 Mission

CrisisLink is a mobile-first disaster rescue platform built for South Africans facing extreme weather emergencies. With one tap on a glowing SOS button, users instantly send their live location and alert status to 24/7 emergency agents. The system also monitors local weather conditions and triggers visual warnings when danger is imminent—helping users prepare and respond faster.

## 📱 User Experience Overview

**Design Philosophy**: Urgent. Minimal. Responsive.

### 1. Home Screen

- 🆘 Central SOS button (glowing, animated)
- 📍 Auto GPS detection
- 🚀 Sends request + location to backend
- 🌩️ Weather-triggered alert (screen glow + vibration)
- ⚠️ Message: "Extreme weather approaching. Prepare now."

### 2. Rescue Status Screen

- ✅ "Rescue Confirmed" message
- ⏱ ETA countdown
- 🚗 Agent name, vehicle plate
- 🗺 Live map tracking
- 📞 In-app call button
- 💬 In-app chat interface

### 3. Offline Mode

- Stores location and alert locally
- Sends when connection resumes

## 🔧 Backend System Overview

**Stack**: Node.js + IBM Z + Firebase + PostgreSQL + Mapbox

### Core Modules

| Module                 | Function                                         |
| ---------------------- | ------------------------------------------------ |
| 🆘 SOS Dispatcher      | Receives alert + location, matches nearest agent |
| 🌩️ Weather Monitor     | Uses OpenWeatherMap API to detect local threats  |
| 🔔 Visual Alert Engine | Triggers screen glow + vibration on danger       |
| 📞 Call & Chat Engine  | Enables secure in-app communication              |
| 🗺️ Live Tracker        | Updates agent location every 30s                 |
| 🔐 Verification        | Validates user identity and location             |
| 🧑‍💼 Admin Dashboard     | Map view, request logs, chat/call transcripts    |

## 📊 Key Features

- **SOS Button Interface**: One-tap alert with auto-location
- **Weather Danger Detection**: Real-time monitoring with visual alerts
- **In-App Communication**: Secure VoIP call and real-time chat
- **Live Tracking**: Map view of agent en route with ETA
- **Admin Controls**: Monitor all requests and interactions

## 🛠️ Technical Stack

| Layer         | Technology           | Purpose                     |
| ------------- | -------------------- | --------------------------- |
| Weather       | OpenWeatherMap API   | Detect local threats        |
| Alerts        | CSS + Vibration API  | Trigger visual warnings     |
| Backend       | IBM Z + Node.js      | Secure, scalable processing |
| Communication | Twilio / Firebase    | In-app calls and messages   |
| Mapping       | Mapbox / Leaflet.js  | Live tracking               |
| Frontend      | React.js             | Responsive UI               |
| Database      | PostgreSQL + PostGIS | Store spatial/user data     |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL with PostGIS extension
- API keys for OpenWeatherMap, Twilio, Mapbox

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up database
cd ../database
psql -U postgres -f schema.sql
```

### Running the Application

```bash
# Start backend server
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm start
```

## 🧪 MVP Development Progress

- [x] Project structure and documentation
- [ ] Backend infrastructure setup
- [ ] SOS dispatcher system
- [ ] Weather monitoring service
- [ ] Frontend React application
- [ ] Communication features
- [ ] Live tracking and mapping
- [ ] Admin dashboard
- [ ] Testing and optimization

## 📄 License

MIT License - Built for social impact and disaster response.
