const express = require('express')
const router = express.Router()

/**
 * Live Weather API Routes
 * Provides real-time weather data for all South African provinces
 */

// This will be set by the server when initializing routes
let liveWeatherService = null

function setLiveWeatherService(service) {
  liveWeatherService = service
}

/**
 * GET /api/weather/live/all
 * Get current weather for all provinces
 */
router.get('/live/all', async (req, res) => {
  try {
    if (!liveWeatherService) {
      return res.status(503).json({
        success: false,
        error: 'Live weather service not available',
      })
    }

    const weatherData = liveWeatherService.getAllWeather()

    res.json({
      success: true,
      data: weatherData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error fetching all weather data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data',
    })
  }
})

/**
 * GET /api/weather/live/province/:name
 * Get weather for specific province
 */
router.get('/live/province/:name', async (req, res) => {
  try {
    if (!liveWeatherService) {
      return res.status(503).json({
        success: false,
        error: 'Live weather service not available',
      })
    }

    const provinceName = decodeURIComponent(req.params.name)
    const weatherData = liveWeatherService.getProvinceWeather(provinceName)

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        error: `Weather data not found for province: ${provinceName}`,
      })
    }

    res.json({
      success: true,
      data: weatherData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error fetching province weather:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch province weather data',
    })
  }
})

/**
 * GET /api/weather/live/summary
 * Get weather summary with alerts
 */
router.get('/live/summary', async (req, res) => {
  try {
    if (!liveWeatherService) {
      return res.status(503).json({
        success: false,
        error: 'Live weather service not available',
      })
    }

    const summary = liveWeatherService.getWeatherSummary()

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error fetching weather summary:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather summary',
    })
  }
})

/**
 * POST /api/weather/live/refresh
 * Force refresh weather data for all provinces
 */
router.post('/live/refresh', async (req, res) => {
  try {
    if (!liveWeatherService) {
      return res.status(503).json({
        success: false,
        error: 'Live weather service not available',
      })
    }

    // Trigger immediate update
    liveWeatherService.updateAllProvinces()

    res.json({
      success: true,
      message: 'Weather data refresh initiated',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error refreshing weather data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to refresh weather data',
    })
  }
})

/**
 * GET /api/weather/live/alerts
 * Get all current weather alerts
 */
router.get('/live/alerts', async (req, res) => {
  try {
    if (!liveWeatherService) {
      return res.status(503).json({
        success: false,
        error: 'Live weather service not available',
      })
    }

    const allWeather = liveWeatherService.getAllWeather()
    const alerts = []

    for (const [province, data] of Object.entries(allWeather.provinces)) {
      if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach((alert) => {
          alerts.push({
            ...alert,
            province,
            city: data.city,
            coordinates: data.coordinates,
            timestamp: data.lastUpdated,
          })
        })
      }
    }

    res.json({
      success: true,
      data: {
        alerts,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter((a) => a.severity === 'critical').length,
        lastUpdate: allWeather.lastUpdate,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error fetching weather alerts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather alerts',
    })
  }
})

/**
 * GET /api/weather/live/map-data
 * Get weather data formatted for map display
 */
router.get('/live/map-data', async (req, res) => {
  try {
    if (!liveWeatherService) {
      return res.status(503).json({
        success: false,
        error: 'Live weather service not available',
      })
    }

    const allWeather = liveWeatherService.getAllWeather()
    const mapData = []

    for (const [province, data] of Object.entries(allWeather.provinces)) {
      mapData.push({
        id: province.toLowerCase().replace(/\s+/g, '-'),
        province,
        city: data.city,
        coordinates: data.coordinates,
        temperature: data.temperature,
        condition: data.condition,
        description: data.description,
        icon: data.icon,
        windSpeed: data.windSpeed,
        humidity: data.humidity,
        alerts: data.alerts || [],
        hasAlerts: (data.alerts || []).length > 0,
        alertLevel: (data.alerts || []).reduce((max, alert) => {
          const levels = { low: 1, medium: 2, high: 3, critical: 4 }
          return Math.max(max, levels[alert.severity] || 0)
        }, 0),
      })
    }

    res.json({
      success: true,
      data: {
        locations: mapData,
        lastUpdate: allWeather.lastUpdate,
        totalLocations: mapData.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error fetching weather map data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather map data',
    })
  }
})

module.exports = {
  router,
  setLiveWeatherService,
}
