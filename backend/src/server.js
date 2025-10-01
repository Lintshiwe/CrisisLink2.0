const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const { createServer } = require('http')
const { Server } = require('socket.io')
const path = require('path')
require('dotenv').config()

const logger = require('./utils/logger')
const errorHandler = require('./middleware/errorHandler')
const { connectDB } = require('./config/database')

// Import models to set up associations
require('./models')

// Import routes
const authRoutes = require('./routes/auth')
const sosRoutes = require('./routes/sos')
const weatherRoutes = require('./routes/weather')
const agentRoutes = require('./routes/agent')
const communicationRoutes = require('./routes/communication')
const adminRoutes = require('./routes/admin')
const notificationRoutes = require('./routes/notifications')
const systemRoutes = require('./routes/system')

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

// When behind a proxy (like CRA dev server), trust X-Forwarded-* headers
app.set('trust proxy', 1)

// Connect to database
connectDB()

// Security middleware with CSP configuration for agent dashboard
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-hashes'",
          'https://cdn.tailwindcss.com',
          'https://cdn.socket.io',
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.tailwindcss.com',
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com',
          'https://unpkg.com',
        ],
        fontSrc: [
          "'self'",
          'https://cdnjs.cloudflare.com',
          'https://fonts.gstatic.com',
          'https://fonts.googleapis.com',
        ],
        connectSrc: [
          "'self'",
          'ws://localhost:5000',
          'http://localhost:5000',
          'https://cdn.socket.io',
          'https://api.openweathermap.org',
          'wss://localhost:5000',
          'https://unpkg.com',
          'https://cdnjs.cloudflare.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https://*.tile.openstreetmap.org',
          'https://unpkg.com',
        ],
      },
    },
  })
)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
)

// Rate limiting (exclude Socket.IO endpoints)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.path && req.path.startsWith('/socket.io'),
})
app.use(limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  )
}

// Enhanced health check endpoint with service monitoring
app.get('/health', async (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('../package.json').version || '1.0.0',
    services: {
      database: {
        status: 'unknown',
        message: 'Not checked',
      },
      notifications: {
        status: 'unknown',
        firebase: false,
        sms: false,
      },
      weather: {
        status: 'unknown',
        monitoring: false,
      },
      socket: {
        status: 'active',
        connections: io.engine.clientsCount || 0,
      },
    },
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
    },
    endpoints: {
      agent: '/agent-dashboard',
      admin: '/api/admin/stats',
      auth: '/api/auth',
      sos: '/api/sos',
      weather: '/api/weather',
      rescue: '/rescue-tracker',
    },
  }

  // Check database connection
  try {
    const { sequelize } = require('./config/database')
    await sequelize.authenticate()
    healthData.services.database.status = 'connected'
    healthData.services.database.message = 'Database connection active'
  } catch (error) {
    healthData.services.database.status = 'disconnected'
    healthData.services.database.message =
      process.env.ALLOW_DB_OFFLINE === 'true'
        ? 'Database offline (allowed in development)'
        : error.message
  }

  // Check notification services
  try {
    const notificationService = require('./services/notificationService')
    if (notificationService.firebaseReady) {
      healthData.services.notifications.firebase = true
      healthData.services.notifications.status = 'active'
    }
    if (notificationService.twilioReady) {
      healthData.services.notifications.sms = true
    }
    if (
      !notificationService.firebaseReady &&
      !notificationService.twilioReady
    ) {
      healthData.services.notifications.status = 'disabled'
    }
  } catch (error) {
    healthData.services.notifications.status = 'error'
    healthData.services.notifications.message = error.message
  }

  // Check weather service
  try {
    const WeatherService = require('./services/weatherService')
    if (!WeatherService.disabled) {
      healthData.services.weather.status = 'active'
      healthData.services.weather.monitoring = true
    } else {
      healthData.services.weather.status = 'disabled'
      healthData.services.weather.message = 'No API key configured'
    }
  } catch (error) {
    healthData.services.weather.status = 'error'
    healthData.services.weather.message = error.message
  }

  // Set overall status based on critical services
  const criticalServices = [healthData.services.socket.status]
  if (criticalServices.some((status) => status === 'error')) {
    healthData.status = 'DEGRADED'
  }

  res.status(200).json(healthData)
})

// Root endpoint with professional backend dashboard
app.get('/', (req, res) => {
  const uptime = process.uptime()
  const uptimeFormatted = new Date(uptime * 1000).toISOString().substr(11, 8)

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CrisisLink Backend Console</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; }
            .gradient-bg { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); }
            .glass-card { 
                backdrop-filter: blur(16px); 
                background: rgba(31, 41, 55, 0.8); 
                border: 1px solid rgba(75, 85, 99, 0.3); 
            }
            .status-indicator { 
                width: 12px; 
                height: 12px; 
                border-radius: 50%; 
                animation: pulse 2s infinite; 
            }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            .metric-card { 
                transition: all 0.3s ease; 
                border: 1px solid rgba(59, 130, 246, 0.2); 
            }
            .metric-card:hover { 
                transform: translateY(-2px); 
                border-color: rgba(59, 130, 246, 0.4); 
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); 
            }
            .nav-link { 
                transition: all 0.3s ease; 
                border-radius: 8px; 
                padding: 12px 16px; 
            }
            .nav-link:hover { 
                background: rgba(59, 130, 246, 0.1); 
                transform: translateX(4px); 
            }
        </style>
    </head>
    <body class="gradient-bg min-h-screen text-white">
        <!-- Header -->
        <header class="glass-card border-b border-gray-700">
            <div class="max-w-7xl mx-auto px-6 py-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                            <i class="fas fa-shield-alt text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                CrisisLink Backend Console
                            </h1>
                            <p class="text-gray-400">Emergency Response System Control Center</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center space-x-2">
                            <div class="status-indicator bg-green-500"></div>
                            <span class="text-green-400 font-semibold">OPERATIONAL</span>
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-gray-400">Environment</p>
                            <p class="font-semibold text-blue-300">${process.env.NODE_ENV || 'development'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Dashboard -->
        <main class="max-w-7xl mx-auto px-6 py-8">
            <!-- System Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="glass-card metric-card rounded-xl p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">Server Uptime</p>
                            <p class="text-2xl font-bold text-green-400">${uptimeFormatted}</p>
                        </div>
                        <i class="fas fa-clock text-green-400 text-2xl"></i>
                    </div>
                </div>
                <div class="glass-card metric-card rounded-xl p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">API Status</p>
                            <p class="text-2xl font-bold text-blue-400">ACTIVE</p>
                        </div>
                        <i class="fas fa-network-wired text-blue-400 text-2xl"></i>
                    </div>
                </div>
                <div class="glass-card metric-card rounded-xl p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">WebSocket</p>
                            <p class="text-2xl font-bold text-purple-400">LIVE</p>
                        </div>
                        <i class="fas fa-bolt text-purple-400 text-2xl"></i>
                    </div>
                </div>
                <div class="glass-card metric-card rounded-xl p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">Security</p>
                            <p class="text-2xl font-bold text-yellow-400">SECURED</p>
                        </div>
                        <i class="fas fa-shield-alt text-yellow-400 text-2xl"></i>
                    </div>
                </div>
            </div>

            <!-- Navigation Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Main Services -->
                <div class="glass-card rounded-xl p-6">
                    <h2 class="text-xl font-bold mb-6 flex items-center">
                        <i class="fas fa-cogs text-blue-400 mr-3"></i>
                        Core Services
                    </h2>
                    <div class="space-y-3">
                        <a href="/agent-dashboard" class="nav-link block text-white hover:text-blue-400 border border-gray-600 hover:border-blue-500">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-users-cog text-blue-400"></i>
                                    <div>
                                        <p class="font-semibold">Agent Dashboard</p>
                                        <p class="text-sm text-gray-400">Real-time emergency response interface</p>
                                    </div>
                                </div>
                                <i class="fas fa-arrow-right text-gray-400"></i>
                            </div>
                        </a>
                        <a href="/health" class="nav-link block text-white hover:text-green-400 border border-gray-600 hover:border-green-500">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-heartbeat text-green-400"></i>
                                    <div>
                                        <p class="font-semibold">Health Monitor</p>
                                        <p class="text-sm text-gray-400">System health and diagnostics</p>
                                    </div>
                                </div>
                                <i class="fas fa-arrow-right text-gray-400"></i>
                            </div>
                        </a>
                        <a href="/api/admin/stats" class="nav-link block text-white hover:text-purple-400 border border-gray-600 hover:border-purple-500">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-chart-line text-purple-400"></i>
                                    <div>
                                        <p class="font-semibold">System Statistics</p>
                                        <p class="text-sm text-gray-400">Performance metrics and analytics</p>
                                    </div>
                                </div>
                                <i class="fas fa-arrow-right text-gray-400"></i>
                            </div>
                        </a>
                        <a href="/service-management" class="nav-link block text-white hover:text-yellow-400 border border-gray-600 hover:border-yellow-500">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-cogs text-yellow-400"></i>
                                    <div>
                                        <p class="font-semibold">Service Management</p>
                                        <p class="text-sm text-gray-400">Real-time service monitoring and control</p>
                                    </div>
                                </div>
                                <i class="fas fa-arrow-right text-gray-400"></i>
                            </div>
                        </a>
                        <a href="/rescue-tracker" class="nav-link block text-white hover:text-emerald-400 border border-gray-600 hover:border-emerald-500">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <i class="fas fa-map-marked-alt text-emerald-400"></i>
                                    <div>
                                        <p class="font-semibold">Rescue Tracker</p>
                                        <p class="text-sm text-gray-400">Live rescuer locations and navigation</p>
                                    </div>
                                </div>
                                <i class="fas fa-arrow-right text-gray-400"></i>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- API Endpoints -->
                <div class="glass-card rounded-xl p-6">
                    <h2 class="text-xl font-bold mb-6 flex items-center">
                        <i class="fas fa-code text-green-400 mr-3"></i>
                        API Endpoints
                    </h2>
                    <div class="space-y-3">
                        <div class="border border-gray-600 rounded-lg p-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-semibold text-green-400">/api/auth</p>
                                    <p class="text-sm text-gray-400">Authentication services</p>
                                </div>
                                <span class="px-2 py-1 bg-green-900 text-green-300 text-xs rounded">ACTIVE</span>
                            </div>
                        </div>
                        <div class="border border-gray-600 rounded-lg p-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-semibold text-red-400">/api/sos</p>
                                    <p class="text-sm text-gray-400">Emergency alert system</p>
                                </div>
                                <span class="px-2 py-1 bg-red-900 text-red-300 text-xs rounded">ACTIVE</span>
                            </div>
                        </div>
                        <div class="border border-gray-600 rounded-lg p-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-semibold text-blue-400">/api/agents</p>
                                    <p class="text-sm text-gray-400">Agent management</p>
                                </div>
                                <span class="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded">ACTIVE</span>
                            </div>
                        </div>
                        <div class="border border-gray-600 rounded-lg p-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-semibold text-yellow-400">/api/weather</p>
                                    <p class="text-sm text-gray-400">Weather monitoring</p>
                                </div>
                                <span class="px-2 py-1 bg-yellow-900 text-yellow-300 text-xs rounded">ACTIVE</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- System Information -->
            <div class="glass-card rounded-xl p-6 mt-8">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                    <i class="fas fa-info-circle text-gray-400 mr-3"></i>
                    System Information
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div>
                        <p class="text-gray-400 mb-2">Server Details</p>
                        <p>Node.js Runtime</p>
                        <p>Express.js Framework</p>
                        <p>Socket.IO WebSockets</p>
                    </div>
                    <div>
                        <p class="text-gray-400 mb-2">Security Features</p>
                        <p>Helmet Security Headers</p>
                        <p>CORS Protection</p>
                        <p>Rate Limiting</p>
                    </div>
                    <div>
                        <p class="text-gray-400 mb-2">Monitoring</p>
                        <p>Real-time Logging</p>
                        <p>Health Checks</p>
                        <p>Performance Metrics</p>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="glass-card border-t border-gray-700 mt-12">
            <div class="max-w-7xl mx-auto px-6 py-4">
                <div class="flex items-center justify-between">
                    <p class="text-gray-400 text-sm">
                        © 2025 CrisisLink Emergency Response System
                    </p>
                    <p class="text-gray-400 text-sm">
                        Last started: ${new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </footer>

        <script>
            // Auto-refresh timestamp every minute
            setInterval(() => {
                location.reload();
            }, 60000);
        </script>
    </body>
    </html>
  `)
})

// In-memory storage for active users (in production, use database)
const activeUsers = new Map()
const threatAssessments = new Map()
const activeMissions = new Map()

// API endpoints for real user tracking
app.get('/api/users/active', (req, res) => {
  const users = Array.from(activeUsers.values())
  res.json({
    success: true,
    data: users,
    count: users.length,
    timestamp: new Date().toISOString(),
  })
})

app.post('/api/users/register', (req, res) => {
  const { userId, name, avatar, company, location, deviceInfo } = req.body

  const userData = {
    id: userId,
    name,
    avatar:
      avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    company: company || 'Citizen',
    location,
    deviceInfo: deviceInfo || 'Unknown Device',
    status: 'active',
    threatLevel: 'Low',
    battery: Math.round(50 + Math.random() * 50),
    lastUpdate: new Date(),
    registeredAt: new Date(),
  }

  activeUsers.set(userId, userData)

  // Notify admin dashboards via Socket.IO
  const io = req.app.get('io')
  if (io) {
    io.to('admin-dashboards').emit('new-user-registered', userData)
  }

  res.json({
    success: true,
    message: 'User registered successfully',
    data: userData,
  })
})

app.put('/api/users/:userId/location', (req, res) => {
  const { userId } = req.params
  const { location, battery, threatLevel } = req.body

  const user = activeUsers.get(userId)
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    })
  }

  const updatedUser = {
    ...user,
    location,
    battery: battery || user.battery,
    threatLevel: threatLevel || user.threatLevel,
    lastUpdate: new Date(),
  }

  activeUsers.set(userId, updatedUser)

  // Notify admin dashboards via Socket.IO
  const io = req.app.get('io')
  if (io) {
    io.to('admin-dashboards').emit('user-location-update', updatedUser)
  }

  res.json({
    success: true,
    message: 'Location updated successfully',
    data: updatedUser,
  })
})

// Live weather API with fallback
app.get('/api/weather/live/:province', async (req, res) => {
  const { province } = req.params

  // South African provinces coordinates
  const provinces = {
    'western-cape': { lat: -33.9249, lng: 18.4241, name: 'Western Cape' },
    gauteng: { lat: -26.2041, lng: 28.0473, name: 'Gauteng' },
    'kwazulu-natal': { lat: -29.8587, lng: 31.0218, name: 'KwaZulu-Natal' },
    'eastern-cape': { lat: -33.9608, lng: 25.6022, name: 'Eastern Cape' },
    limpopo: { lat: -23.9045, lng: 29.4689, name: 'Limpopo' },
    mpumalanga: { lat: -25.4753, lng: 30.9696, name: 'Mpumalanga' },
    'north-west': { lat: -25.8069, lng: 25.6441, name: 'North West' },
    'northern-cape': { lat: -28.7282, lng: 24.7499, name: 'Northern Cape' },
    'free-state': { lat: -29.0852, lng: 26.1596, name: 'Free State' },
  }

  const provinceData = provinces[province.toLowerCase()]
  if (!provinceData) {
    return res.status(404).json({
      success: false,
      message: 'Province not found',
    })
  }

  try {
    // Try OpenWeatherMap API (free tier)
    const API_KEY = '47f39e2c3c1fb1d2c2c0a0c6f89e2a04' // Free API key
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${provinceData.lat}&lon=${provinceData.lng}&appid=${API_KEY}&units=metric`

    const fetch = require('node-fetch')
    const response = await fetch(weatherUrl)

    if (response.ok) {
      const data = await response.json()

      const weatherData = {
        province: provinceData.name,
        temperature: Math.round(data.main.temp),
        condition: mapWeatherCondition(data.weather[0].main),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind?.speed * 3.6 || 0),
        pressure: data.main.pressure,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        source: 'OpenWeatherMap API',
        timestamp: new Date().toISOString(),
      }

      res.json({
        success: true,
        data: weatherData,
      })
    } else {
      throw new Error('Weather API request failed')
    }
  } catch (error) {
    // Fallback to simulated realistic data
    const weatherData = {
      province: provinceData.name,
      temperature: Math.round(18 + Math.random() * 15),
      condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][
        Math.floor(Math.random() * 4)
      ],
      humidity: Math.round(30 + Math.random() * 50),
      windSpeed: Math.round(Math.random() * 25),
      pressure: Math.round(1000 + Math.random() * 50),
      description: 'Simulated weather data',
      source: 'Simulated Data',
      timestamp: new Date().toISOString(),
    }

    res.json({
      success: true,
      data: weatherData,
      note: 'Using simulated data due to API limitations',
    })
  }
})

// Helper function for weather condition mapping
function mapWeatherCondition(apiCondition) {
  const conditionMap = {
    Clear: 'Sunny',
    Clouds: 'Cloudy',
    Rain: 'Rainy',
    Drizzle: 'Light Rain',
    Thunderstorm: 'Thunderstorms',
    Snow: 'Snow',
    Mist: 'Misty',
    Fog: 'Foggy',
    Haze: 'Hazy',
  }
  return conditionMap[apiCondition] || apiCondition
}

// Threat assessment API
app.get('/api/threats/assessment', (req, res) => {
  const threatData = {
    highRisk: [
      { area: 'Johannesburg CBD', type: 'Protest activity', severity: 'high' },
      { area: 'Cape Town N2', type: 'Traffic incident', severity: 'high' },
      {
        area: 'Durban Beachfront',
        type: 'Weather warning',
        severity: 'medium',
      },
    ],
    mediumRisk: [
      { area: 'Pretoria Central', type: 'Crowd gathering', severity: 'medium' },
      {
        area: 'Port Elizabeth Harbor',
        type: 'Security alert',
        severity: 'medium',
      },
      { area: 'Bloemfontein Mall', type: 'Medical emergency', severity: 'low' },
    ],
    safeZones: [
      { area: 'Northern Cape', status: 'All clear' },
      { area: 'Free State Rural', status: 'Normal activity' },
      { area: 'Limpopo Region', status: 'Stable' },
    ],
    lastUpdated: new Date().toISOString(),
  }

  res.json({
    success: true,
    data: threatData,
  })
})

// Active missions API
app.get('/api/missions/active', (req, res) => {
  const missionsData = {
    ongoing: [
      {
        id: 'RESCUE-001',
        type: 'Medical Emergency',
        priority: 'CRITICAL',
        location: 'Johannesburg CBD',
        assignedTo: 'Lintshiwe Maluleke',
        progress: 75,
        startTime: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'ASSIST-002',
        type: 'Traffic Assistance',
        priority: 'MEDIUM',
        location: 'Cape Town N2',
        assignedTo: 'Itumeleng Ramokgopa',
        progress: 45,
        startTime: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: 'SUPPORT-003',
        type: 'Community Assistance',
        priority: 'LOW',
        location: 'Durban',
        assignedTo: 'Kagiso Mokwena',
        progress: 20,
        startTime: new Date(Date.now() - 900000).toISOString(),
      },
    ],
    statistics: {
      completedToday: 12,
      inProgress: 5,
      highPriority: 2,
      successRate: 96,
      averageResponseTime: '4.2 min',
      criticalResponseTime: '2.1 min',
      resourceUtilization: '78%',
    },
    lastUpdated: new Date().toISOString(),
  }

  res.json({
    success: true,
    data: missionsData,
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/sos', sosRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/communication', communicationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/system', systemRoutes)
app.use('/api/location', require('./routes/location'))

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')))

// Agent dashboard route
app.get('/agent-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'agent-dashboard.html'))
})

// Service management dashboard route
app.get('/service-management', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'service-management.html'))
})

// Rescue tracker dashboard route
app.get('/rescue-tracker', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'rescue-tracker.html'))
})

// Favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end() // No content
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`)

  // Join user/agent to their specific room
  socket.on('join-room', (data) => {
    const { userId, userType } = data
    socket.join(`${userType}-${userId}`)
    logger.info(`${userType} ${userId} joined room`)
  })

  // Handle agent joining the general agents room
  socket.on('join', (data) => {
    const { room, agentId } = data
    if (room === 'agents') {
      socket.join('agents')
      logger.info(`Agent ${agentId} joined agents room`)
    }
  })

  // Handle SOS alerts
  socket.on('sos-alert', (data) => {
    logger.info('🚨 SOS alert received:', data)
    logger.info('📡 Broadcasting to agents room...')

    // Add server timestamp and unique ID if not present
    const alertWithId = {
      ...data,
      alertId: data.alertId || `SOS-${Date.now()}`,
      serverTimestamp: new Date().toISOString(),
    }

    // Broadcast to all available agents
    const result = socket.broadcast
      .to('agents')
      .emit('new-sos-alert', alertWithId)
    logger.info('✅ SOS alert broadcasted to agents')

    // Also emit to all connected sockets as fallback
    socket.broadcast.emit('emergency-alert', alertWithId)
  })

  // Handle agent location updates
  socket.on('agent-location-update', (data) => {
    const { agentId, location } = data
    // Broadcast to users tracking this agent
    socket.broadcast
      .to(`tracking-${agentId}`)
      .emit('agent-location', { agentId, location })
  })

  // Handle chat messages
  socket.on('send-message', (data) => {
    const { conversationId, message, senderId } = data
    socket.broadcast.to(`conversation-${conversationId}`).emit('new-message', {
      message,
      senderId,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle rescuer location updates
  socket.on('rescuer-location-update', (data) => {
    logger.info(`Rescuer location update: ${data.rescuerId}`)
    // Broadcast to all connected rescue tracker clients
    socket.broadcast.emit('rescuer-location-update', data)
  })

  // Handle agent location updates (from agent dashboard)
  socket.on('agent-location-update', (data) => {
    logger.info(`Agent location update: ${data.agentId}`)
    // Broadcast to rescue tracker as rescuer update
    socket.broadcast.emit('rescuer-location-update', {
      rescuerId: data.agentId,
      location: data.location,
      timestamp: new Date(),
    })
  })

  // Handle rescuer status changes
  socket.on('rescuer-status-change', (data) => {
    logger.info(`Rescuer status change: ${data.rescuerId} -> ${data.status}`)
    socket.broadcast.emit('rescuer-status-change', data)
  })

  // Handle agent accepting SOS alert
  socket.on('agent-accept-sos', async (data) => {
    const { alertId, agentId, agentName, estimatedArrival } = data
    logger.info(`Agent ${agentName} (${agentId}) accepted SOS alert ${alertId}`)

    try {
      // Update SOS alert status in database
      const sosService = require('./services/sosService')
      await sosService.assignAgentToSos(alertId, agentId)

      // Notify the user who sent the SOS alert
      socket.broadcast.emit('sos-agent-assigned', {
        alertId,
        agentId,
        agentName,
        estimatedArrival,
        message: `Help is on the way! Agent ${agentName} has been assigned to your emergency.`,
        timestamp: new Date(),
      })

      // Notify other agents that this alert is no longer available
      socket.broadcast
        .to('agents')
        .emit('sos-alert-taken', { alertId, agentId })
    } catch (error) {
      logger.error(`Error assigning agent to SOS: ${error.message}`)
      socket.emit('sos-assignment-error', { alertId, error: error.message })
    }
  })

  // Handle agent sending message to user during SOS
  socket.on('agent-send-sos-message', (data) => {
    const { alertId, agentId, agentName, message, userId } = data
    logger.info(
      `Agent ${agentName} sent message for SOS ${alertId}: ${message}`
    )

    // Send message to the specific user
    socket.broadcast.emit('sos-agent-message', {
      alertId,
      agentId,
      agentName,
      message,
      timestamp: new Date(),
      type: 'agent-message',
    })
  })

  // Handle user responding to agent during SOS
  socket.on('user-send-sos-response', (data) => {
    const { alertId, userId, userName, message, agentId } = data
    logger.info(`User ${userName} responded to SOS ${alertId}: ${message}`)

    // Send message to the assigned agent
    socket.broadcast.to('agents').emit('sos-user-response', {
      alertId,
      userId,
      userName,
      message,
      timestamp: new Date(),
      type: 'user-response',
    })
  })

  // Handle SOS status updates (arrived, resolved, etc.)
  socket.on('sos-status-update', (data) => {
    const { alertId, status, agentId, message } = data
    logger.info(`SOS alert ${alertId} status updated to: ${status}`)

    // Broadcast status update to all relevant parties
    socket.broadcast.emit('sos-status-changed', {
      alertId,
      status,
      agentId,
      message,
      timestamp: new Date(),
    })
  })

  // Handle frontend user registration and tracking
  socket.on('user-register', (userData) => {
    logger.info(`User registered: ${userData.userId} - ${userData.name}`)
    // Store user data in memory (in production, use database)
    socket.userData = userData
    socket.join('frontend-users')

    // Broadcast new user to admin dashboards
    socket.broadcast
      .to('admin-dashboards')
      .emit('new-user-registered', userData)
  })

  // Handle frontend user location updates
  socket.on('user-location-update', (locationData) => {
    const userData = socket.userData
    if (userData) {
      const enrichedData = {
        ...userData,
        location: locationData.location,
        lastUpdate: new Date(),
        battery: locationData.battery || Math.round(Math.random() * 100),
        deviceInfo: locationData.deviceInfo || 'Unknown Device',
        threatLevel: locationData.threatLevel || 'Low',
      }

      logger.info(
        `User location update: ${userData.userId} at ${locationData.location.lat}, ${locationData.location.lng}`
      )

      // Broadcast to admin dashboards for real-time tracking
      socket.broadcast
        .to('admin-dashboards')
        .emit('user-location-update', enrichedData)
    }
  })

  // Handle admin dashboard connection
  socket.on('admin-connect', (adminData) => {
    logger.info(`Admin connected: ${adminData.adminId}`)
    socket.join('admin-dashboards')

    // Send current user list to newly connected admin
    // In production, this would query the database
    socket.emit('current-users-list', {
      message: 'Real user data will be available when frontend users connect',
      timestamp: new Date(),
    })
  })

  // Handle multi-user location updates (for batch updates)
  socket.on('user-locations-update', (users) => {
    logger.info(`Multi-user location update: ${users.length} users`)
    socket.broadcast.to('admin-dashboards').emit('user-locations-update', users)
  })

  // Handle user location tracking request from admin
  socket.on('track-user', (data) => {
    logger.info(`Admin tracking request for user: ${data.userId}`)
    socket.broadcast.to('frontend-users').emit('track-request', data)
    socket.broadcast.to('admin-dashboards').emit('track-user-response', data)
  })

  // Handle emergency alerts from frontend users
  socket.on('emergency-alert', (alertData) => {
    const userData = socket.userData
    if (userData) {
      const emergencyData = {
        ...userData,
        alertType: alertData.type,
        location: alertData.location,
        message: alertData.message,
        timestamp: new Date(),
        severity: alertData.severity || 'high',
      }

      logger.warn(`EMERGENCY ALERT from ${userData.name}: ${alertData.message}`)

      // Broadcast to all admin dashboards and rescue trackers
      socket.broadcast
        .to('admin-dashboards')
        .emit('emergency-alert', emergencyData)
      socket.broadcast.emit('emergency-alert', emergencyData)
    }
  })

  // Handle user status updates (online/offline/emergency)
  socket.on('user-status-update', (statusData) => {
    const userData = socket.userData
    if (userData) {
      const updatedData = {
        ...userData,
        status: statusData.status,
        lastUpdate: new Date(),
      }

      logger.info(
        `User status update: ${userData.name} -> ${statusData.status}`
      )
      socket.broadcast
        .to('admin-dashboards')
        .emit('user-status-update', updatedData)
    }
  })

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Expose io to routes via app instance
app.set('io', io)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  })
})

// Error handling middleware
app.use(errorHandler)

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  logger.info(
    `🚨 CrisisLink server running on port ${PORT} in ${process.env.NODE_ENV} mode`
  )
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
  })
})

module.exports = { app, server }
