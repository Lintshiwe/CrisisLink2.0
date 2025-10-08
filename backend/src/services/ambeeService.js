const axios = require('axios')
const logger = require('../utils/logger')

class AmbeeDisasterService {
  constructor() {
    this.apiKey =
      '47d5c87e426158ff259d42439a41a28a630852877aa63d8d174c11e8998592da'
    this.baseURL = 'https://api.ambeedata.com'
    this.monitoringActive = false
    this.lastUpdate = null
    this.cachedAlerts = new Map()

    // South African provinces coordinates for monitoring
    this.monitoringLocations = [
      { name: 'Western Cape', lat: -33.9249, lng: 18.4241, code: 'WC' },
      { name: 'Eastern Cape', lat: -33.2277, lng: 26.806, code: 'EC' },
      { name: 'Northern Cape', lat: -28.7282, lng: 24.7499, code: 'NC' },
      { name: 'Free State', lat: -29.0852, lng: 26.1596, code: 'FS' },
      { name: 'KwaZulu-Natal', lat: -29.601, lng: 30.3794, code: 'KZN' },
      { name: 'North West', lat: -25.8601, lng: 25.6402, code: 'NW' },
      { name: 'Gauteng', lat: -26.2041, lng: 28.0473, code: 'GP' },
      { name: 'Mpumalanga', lat: -25.5653, lng: 30.5279, code: 'MP' },
      { name: 'Limpopo', lat: -23.4013, lng: 29.4179, code: 'LP' },
    ]
  }

  /**
   * Initialize disaster monitoring service
   */
  async initialize() {
    try {
      logger.info('🌪️ Initializing Ambee Natural Disaster Monitoring Service')

      // Test API connection
      const testResult = await this.testConnection()
      if (!testResult.success) {
        logger.error('Failed to connect to Ambee API:', testResult.error)
        return false
      }

      if (testResult.fallbackMode) {
        logger.info(
          '⚠️ Ambee service running in fallback mode - limited disaster monitoring'
        )
        this.monitoringActive = false
        return true
      }

      logger.info('✅ Ambee API connection successful')
      this.monitoringActive = true
      this.workingEndpoint = testResult.endpoint

      // Start initial monitoring
      await this.startMonitoring()

      return true
    } catch (error) {
      logger.error('Error initializing Ambee service:', error)
      return false
    }
  }

  /**
   * Test connection to Ambee API
   */
  async testConnection() {
    try {
      // Try different Ambee API endpoints to find working one
      const endpoints = [
        '/disasters/latest',
        '/disasters',
        '/weather/latest',
        '/latest/by-lat-lng',
      ]

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint}`, {
            headers: {
              'x-api-key': this.apiKey,
              'Content-type': 'application/json',
            },
            params: {
              lat: -26.2041, // Johannesburg coordinates
              lng: 28.0473,
              limit: 1,
            },
            timeout: 5000,
          })

          logger.info(
            `✅ Ambee API connection successful with endpoint: ${endpoint}`
          )
          return { success: true, data: response.data, endpoint }
        } catch (endpointError) {
          logger.warn(
            `❌ Ambee endpoint ${endpoint} failed:`,
            endpointError.response?.status || endpointError.message
          )
          continue
        }
      }

      // If all endpoints fail, return success but with disabled monitoring
      logger.warn(
        '⚠️ All Ambee API endpoints failed - running in fallback mode'
      )
      return {
        success: true,
        fallbackMode: true,
        message: 'Running without real-time disaster monitoring',
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }

  /**
   * Start monitoring natural disasters
   */
  async startMonitoring() {
    if (!this.monitoringActive) return

    try {
      logger.info('🔍 Starting natural disaster monitoring for South Africa')

      // Initial scan
      await this.scanForDisasters()

      // Set up periodic monitoring (every 15 minutes)
      this.monitoringInterval = setInterval(
        async () => {
          await this.scanForDisasters()
        },
        15 * 60 * 1000
      ) // 15 minutes

      logger.info('✅ Natural disaster monitoring started')
    } catch (error) {
      logger.error('Error starting disaster monitoring:', error)
    }
  }

  /**
   * Scan for natural disasters across all monitored locations
   */
  async scanForDisasters() {
    try {
      logger.info('🌍 Scanning for natural disasters...')
      const allAlerts = []

      for (const location of this.monitoringLocations) {
        try {
          const disasters = await this.getDisastersForLocation(location)
          if (disasters && disasters.length > 0) {
            allAlerts.push(...disasters)
            logger.info(
              `⚠️ Found ${disasters.length} disasters in ${location.name}`
            )
          }
        } catch (error) {
          logger.error(`Error scanning ${location.name}:`, error.message)
        }

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      if (allAlerts.length > 0) {
        await this.processDisasterAlerts(allAlerts)
      }

      this.lastUpdate = new Date()
      logger.info(
        `✅ Disaster monitoring cycle completed. Found ${allAlerts.length} active disasters`
      )
    } catch (error) {
      logger.error('Error during disaster scanning:', error)
    }
  }

  /**
   * Get disasters for a specific location
   */
  async getDisastersForLocation(location) {
    try {
      const response = await axios.get(`${this.baseURL}/disasters/latest`, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-type': 'application/json',
        },
        params: {
          lat: location.lat,
          lng: location.lng,
          limit: 10,
        },
      })

      if (response.data && response.data.data) {
        return response.data.data.map((disaster) => ({
          ...disaster,
          locationName: location.name,
          locationCode: location.code,
          coordinates: { lat: location.lat, lng: location.lng },
        }))
      }

      return []
    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn(`Rate limit reached for ${location.name}, skipping...`)
        return []
      }
      throw error
    }
  }

  /**
   * Process and categorize disaster alerts
   */
  async processDisasterAlerts(disasters) {
    const processedAlerts = []

    for (const disaster of disasters) {
      try {
        const alertId = `DISASTER-${disaster.locationCode}-${Date.now()}`
        const severity = this.calculateSeverity(disaster)

        const alert = {
          id: alertId,
          type: 'natural-disaster',
          disasterType: disaster.event || 'Unknown',
          title:
            disaster.title || `${disaster.event} in ${disaster.locationName}`,
          description:
            disaster.description ||
            `Natural disaster detected in ${disaster.locationName}`,
          location: {
            name: disaster.locationName,
            code: disaster.locationCode,
            lat: disaster.coordinates.lat,
            lng: disaster.coordinates.lng,
          },
          severity: severity,
          status: 'active',
          source: 'Ambee API',
          timestamp: new Date(),
          data: disaster,
        }

        // Check if this is a new or updated alert
        if (!this.isDuplicateAlert(alert)) {
          processedAlerts.push(alert)
          this.cachedAlerts.set(alertId, alert)
        }
      } catch (error) {
        logger.error('Error processing disaster alert:', error)
      }
    }

    if (processedAlerts.length > 0) {
      await this.broadcastDisasterAlerts(processedAlerts)
    }

    return processedAlerts
  }

  /**
   * Calculate disaster severity based on type and data
   */
  calculateSeverity(disaster) {
    const disasterType = (disaster.event || '').toLowerCase()

    // High severity disasters
    if (
      disasterType.includes('earthquake') ||
      disasterType.includes('tsunami') ||
      disasterType.includes('volcano') ||
      disasterType.includes('cyclone') ||
      disasterType.includes('hurricane')
    ) {
      return 'critical'
    }

    // Medium severity disasters
    if (
      disasterType.includes('flood') ||
      disasterType.includes('wildfire') ||
      disasterType.includes('drought') ||
      disasterType.includes('storm')
    ) {
      return 'high'
    }

    // Lower severity events
    return 'medium'
  }

  /**
   * Check if alert is duplicate
   */
  isDuplicateAlert(newAlert) {
    for (const [id, existingAlert] of this.cachedAlerts) {
      if (
        existingAlert.location.code === newAlert.location.code &&
        existingAlert.disasterType === newAlert.disasterType &&
        existingAlert.title === newAlert.title
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Broadcast disaster alerts to connected agents
   */
  async broadcastDisasterAlerts(alerts) {
    try {
      if (this.socketServer) {
        for (const alert of alerts) {
          logger.info(`📡 Broadcasting disaster alert: ${alert.title}`)

          // Send to all agents
          this.socketServer.to('agents').emit('natural-disaster-alert', alert)

          // Also send to admin dashboards
          this.socketServer
            .to('admin-dashboards')
            .emit('natural-disaster-alert', alert)
        }
      }
    } catch (error) {
      logger.error('Error broadcasting disaster alerts:', error)
    }
  }

  /**
   * Set socket server for broadcasting
   */
  setSocketServer(io) {
    this.socketServer = io
  }

  /**
   * Get current disaster status summary
   */
  getDisasterSummary() {
    const activeAlerts = Array.from(this.cachedAlerts.values())

    return {
      monitoring: this.monitoringActive,
      lastUpdate: this.lastUpdate,
      totalAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter((a) => a.severity === 'critical')
        .length,
      highAlerts: activeAlerts.filter((a) => a.severity === 'high').length,
      mediumAlerts: activeAlerts.filter((a) => a.severity === 'medium').length,
      alertsByLocation: this.getAlertsByLocation(activeAlerts),
      recentAlerts: activeAlerts.slice(-5), // Last 5 alerts
    }
  }

  /**
   * Group alerts by location
   */
  getAlertsByLocation(alerts) {
    const locationMap = {}

    alerts.forEach((alert) => {
      const location = alert.location.name
      if (!locationMap[location]) {
        locationMap[location] = []
      }
      locationMap[location].push(alert)
    })

    return locationMap
  }

  /**
   * Stop monitoring service
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.monitoringActive = false
    logger.info('🛑 Natural disaster monitoring stopped')
  }

  /**
   * Get disasters for a specific area (for API endpoints)
   */
  async getDisastersForArea(lat, lng, radius = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/disasters/latest`, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-type': 'application/json',
        },
        params: {
          lat: lat,
          lng: lng,
          limit: 20,
        },
      })

      return response.data
    } catch (error) {
      logger.error('Error fetching disasters for area:', error)
      throw error
    }
  }
}

// Export singleton instance
const ambeeService = new AmbeeDisasterService()
module.exports = ambeeService
