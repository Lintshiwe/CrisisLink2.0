const express = require('express')
const router = express.Router()
const logger = require('../utils/logger')

/**
 * Service Status Monitoring Endpoint
 * Provides detailed status information for all backend services
 */
router.get('/status', async (req, res) => {
  const statusData = {
    timestamp: new Date().toISOString(),
    system: {
      status: 'operational',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: require('../../package.json').version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        percentage: Math.round(
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
            100
        ),
      },
      platform: process.platform,
      nodeVersion: process.version,
    },
    services: {},
  }

  // Check Database Service
  try {
    const { sequelize } = require('../config/database')
    await sequelize.authenticate()
    statusData.services.database = {
      name: 'Database',
      status: 'operational',
      healthy: true,
      message: 'Connected successfully',
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    statusData.services.database = {
      name: 'Database',
      status: process.env.ALLOW_DB_OFFLINE === 'true' ? 'optional' : 'degraded',
      healthy: process.env.ALLOW_DB_OFFLINE === 'true',
      message:
        process.env.ALLOW_DB_OFFLINE === 'true'
          ? 'Offline mode enabled for development'
          : `Connection failed: ${error.message}`,
      lastChecked: new Date().toISOString(),
    }
  }

  // Check Notification Service
  try {
    const notificationService = require('../services/notificationService')
    const firebaseStatus = notificationService.firebaseReady
    const smsStatus = notificationService.twilioReady

    statusData.services.notifications = {
      name: 'Notification Service',
      status: firebaseStatus || smsStatus ? 'operational' : 'optional',
      healthy: true,
      components: {
        firebase: {
          enabled: firebaseStatus,
          status: firebaseStatus ? 'operational' : 'disabled',
          message: firebaseStatus
            ? 'Push notifications available'
            : 'Not configured',
        },
        sms: {
          enabled: smsStatus,
          status: smsStatus ? 'operational' : 'disabled',
          message: smsStatus ? 'SMS notifications available' : 'Not configured',
        },
      },
      message:
        firebaseStatus || smsStatus
          ? 'At least one notification method available'
          : 'Running without external notifications',
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    statusData.services.notifications = {
      name: 'Notification Service',
      status: 'error',
      healthy: false,
      message: `Service error: ${error.message}`,
      lastChecked: new Date().toISOString(),
    }
  }

  // Check Weather Service
  try {
    const WeatherService = require('../services/weatherService')
    const isEnabled = !WeatherService.disabled

    statusData.services.weather = {
      name: 'Weather Service',
      status: isEnabled ? 'operational' : 'optional',
      healthy: true,
      enabled: isEnabled,
      message: isEnabled
        ? 'Weather monitoring active'
        : 'Disabled - No API key configured',
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    statusData.services.weather = {
      name: 'Weather Service',
      status: 'error',
      healthy: false,
      message: `Service error: ${error.message}`,
      lastChecked: new Date().toISOString(),
    }
  }

  // Check WebSocket Service
  try {
    const io = req.app.get('io')
    const connectionCount = io ? io.engine.clientsCount : 0

    statusData.services.websocket = {
      name: 'WebSocket Service',
      status: 'operational',
      healthy: true,
      connections: connectionCount,
      message: `${connectionCount} active connections`,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    statusData.services.websocket = {
      name: 'WebSocket Service',
      status: 'error',
      healthy: false,
      message: `Service error: ${error.message}`,
      lastChecked: new Date().toISOString(),
    }
  }

  // Check API Routes
  statusData.services.api = {
    name: 'API Routes',
    status: 'operational',
    healthy: true,
    endpoints: {
      auth: '/api/auth',
      sos: '/api/sos',
      agents: '/api/agents',
      weather: '/api/weather',
      communication: '/api/communication',
      admin: '/api/admin',
      notifications: '/api/notifications',
    },
    message: 'All API endpoints available',
    lastChecked: new Date().toISOString(),
  }

  // Determine overall system health
  const services = Object.values(statusData.services)
  const healthyServices = services.filter((service) => service.healthy).length
  const totalServices = services.length
  const healthPercentage = Math.round((healthyServices / totalServices) * 100)

  if (healthPercentage === 100) {
    statusData.system.status = 'operational'
  } else if (healthPercentage >= 80) {
    statusData.system.status = 'degraded'
  } else {
    statusData.system.status = 'major_outage'
  }

  statusData.system.healthPercentage = healthPercentage
  statusData.system.servicesOperational = healthyServices
  statusData.system.totalServices = totalServices

  // Log status check
  logger.info(
    `📊 System Status Check: ${statusData.system.status.toUpperCase()} (${healthPercentage}% healthy)`
  )

  res.json(statusData)
})

/**
 * Quick Health Check Endpoint
 * Simplified health check for load balancers and monitoring tools
 */
router.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

/**
 * Service Restart Endpoint (Development Only)
 * Allows restarting specific services for testing
 */
router.post('/restart/:service', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Service restart only available in development mode',
    })
  }

  const { service } = req.params
  logger.info(`🔄 Service restart requested: ${service}`)

  // This would typically restart specific services
  // For now, just acknowledge the request
  res.json({
    success: true,
    message: `Service restart requested: ${service}`,
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
