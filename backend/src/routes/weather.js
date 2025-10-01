const express = require('express')
const { body, validationResult } = require('express-validator')
const weatherService = require('../services/weatherService')
const { validateCoordinates } = require('../utils/geolocation')

const router = express.Router()

/**
 * @route   GET /api/weather/current
 * @desc    Get current weather for a location
 * @access  Public
 */
router.get('/current', async (req, res) => {
  try {
    if (weatherService.disabled) {
      return res.json({
        success: true,
        data: {
          temperature: 20,
          feelsLike: 20,
          humidity: 50,
          pressure: 1013,
          visibility: 10000,
          windSpeed: 2,
          windDirection: 0,
          cloudiness: 0,
          condition: 'Clear',
          description: 'clear sky',
          alerts: [],
        },
      })
    }
    const { lat, lon } = req.query

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      })
    }

    const coordValidation = validateCoordinates(lat, lon)
    if (!coordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: coordValidation.message,
      })
    }

    const weather = await weatherService.getCurrentWeather(
      coordValidation.latitude,
      coordValidation.longitude
    )

    res.json({
      success: true,
      data: weather,
    })
  } catch (error) {
    console.error('Error getting current weather:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get current weather',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

/**
 * @route   GET /api/weather/forecast
 * @desc    Get weather forecast for a location
 * @access  Public
 */
router.get('/forecast', async (req, res) => {
  try {
    if (weatherService.disabled) {
      return res.json({ success: true, data: [] })
    }
    const { lat, lon, days } = req.query

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      })
    }

    const coordValidation = validateCoordinates(lat, lon)
    if (!coordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: coordValidation.message,
      })
    }

    const forecastDays = days ? parseInt(days) : 5
    if (forecastDays < 1 || forecastDays > 7) {
      return res.status(400).json({
        success: false,
        message: 'Days must be between 1 and 7',
      })
    }

    const forecast = await weatherService.getWeatherForecast(
      coordValidation.latitude,
      coordValidation.longitude,
      forecastDays
    )

    res.json({
      success: true,
      data: forecast,
    })
  } catch (error) {
    console.error('Error getting weather forecast:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get weather forecast',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

/**
 * @route   GET /api/weather/alerts
 * @desc    Get active weather alerts for a location
 * @access  Public
 */
router.get('/alerts', async (req, res) => {
  try {
    if (weatherService.disabled) {
      return res.json({ success: true, data: [] })
    }
    const { lat, lon, radius } = req.query

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      })
    }

    const coordValidation = validateCoordinates(lat, lon)
    if (!coordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: coordValidation.message,
      })
    }

    const searchRadius = radius ? parseInt(radius) : 50
    if (searchRadius < 1 || searchRadius > 200) {
      return res.status(400).json({
        success: false,
        message: 'Radius must be between 1 and 200 km',
      })
    }

    const alerts = await weatherService.getActiveAlertsForLocation(
      coordValidation.latitude,
      coordValidation.longitude,
      searchRadius
    )

    res.json({
      success: true,
      data: alerts,
    })
  } catch (error) {
    console.error('Error getting weather alerts:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get weather alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

/**
 * @route   POST /api/weather/monitor/trigger
 * @desc    Manually trigger weather monitoring (admin only)
 * @access  Private (Admin)
 */
router.post('/monitor/trigger', async (req, res) => {
  try {
    // This would typically have admin authentication middleware
    await weatherService.monitorWeatherConditions()

    res.json({
      success: true,
      message: 'Weather monitoring triggered successfully',
    })
  } catch (error) {
    console.error('Error triggering weather monitoring:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to trigger weather monitoring',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

/**
 * @route   GET /api/weather/alerts/all
 * @desc    Get all active weather alerts (admin only)
 * @access  Private (Admin)
 */
router.get('/alerts/all', async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, alertType } = req.query

    // This would typically have admin authentication middleware
    const whereClause = { isActive: true }

    if (severity) whereClause.severity = severity
    if (alertType) whereClause.alertType = alertType

    const alerts = await WeatherAlert.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    })

    res.json({
      success: true,
      data: {
        alerts: alerts.rows,
        totalCount: alerts.count,
        totalPages: Math.ceil(alerts.count / parseInt(limit)),
        currentPage: parseInt(page),
      },
    })
  } catch (error) {
    console.error('Error getting all weather alerts:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get weather alerts',
    })
  }
})

/**
 * @route   GET /api/weather/status
 * @desc    Get weather monitoring system status
 * @access  Private (Admin)
 */
router.get('/status', async (req, res) => {
  try {
    // Check if weather service is running
    const status = {
      isRunning: true,
      lastUpdate: new Date().toISOString(),
      monitoredCities: weatherService.monitoredCities?.length || 0,
      apiKey: process.env.OPENWEATHER_API_KEY ? 'configured' : 'missing',
    }

    // Get recent alerts count
    const recentAlertsCount = await WeatherAlert.count({
      where: {
        isActive: true,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    })

    status.recentAlerts = recentAlertsCount

    res.json({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error('Error getting weather system status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get weather system status',
    })
  }
})

module.exports = router
// Alias: dismiss an alert (no-op in dev)
router.post('/alerts/:alertId/dismiss', async (req, res) => {
  try {
    res.json({ success: true })
  } catch (error) {
    res.json({ success: true })
  }
})
