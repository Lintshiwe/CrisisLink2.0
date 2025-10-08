const axios = require('axios')
const logger = require('../utils/logger')

class EarthquakeMonitoringService {
  constructor() {
    this.usgsEndpoint =
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson'
    this.monitoringInterval = null
    this.lastUpdate = null
    this.globalQuakes = []
    this.southAfricaQuakes = []
    this.io = null // Will be set by server

    // South Africa bounding box
    this.southAfricaBounds = {
      north: -22.0,
      south: -35.0,
      west: 16.0,
      east: 33.0,
    }

    // Alert thresholds for South Africa
    this.alertThresholds = {
      low: 3.0, // Green - Minor
      medium: 4.5, // Yellow - Moderate
      high: 6.0, // Orange - Strong
      critical: 7.0, // Red - Major/Great
    }
  }

  // Set socket.io instance for broadcasting
  setSocketIO(io) {
    this.io = io
  }

  // Check if coordinates are within South Africa
  isInSouthAfrica(lat, lon) {
    return (
      lat >= this.southAfricaBounds.south &&
      lat <= this.southAfricaBounds.north &&
      lon >= this.southAfricaBounds.west &&
      lon <= this.southAfricaBounds.east
    )
  }

  // Determine alert level based on magnitude
  getAlertLevel(magnitude) {
    if (magnitude >= this.alertThresholds.critical) return 'critical'
    if (magnitude >= this.alertThresholds.high) return 'high'
    if (magnitude >= this.alertThresholds.medium) return 'medium'
    return 'low'
  }

  // Get alert color for UI
  getAlertColor(level) {
    const colors = {
      low: '#4CAF50', // Green
      medium: '#FF9800', // Yellow
      high: '#FF5722', // Orange
      critical: '#F44336', // Red
    }
    return colors[level] || '#9E9E9E'
  }

  // Format earthquake data for CrisisLink
  formatEarthquakeData(quake) {
    const coords = quake.geometry.coordinates
    const props = quake.properties

    const magnitude = props.mag || 0
    const alertLevel = this.getAlertLevel(magnitude)
    const isInSA = this.isInSouthAfrica(coords[1], coords[0])

    return {
      id: quake.id,
      magnitude: magnitude,
      location: {
        latitude: coords[1],
        longitude: coords[0],
        depth: coords[2] || 0,
      },
      place: props.place || 'Unknown location',
      time: new Date(props.time),
      updated: new Date(props.updated),
      alertLevel: alertLevel,
      alertColor: this.getAlertColor(alertLevel),
      isInSouthAfrica: isInSA,
      tsunamiRisk: props.tsunami === 1,
      significance: props.sig || 0,
      felt: props.felt || 0,
      cdi: props.cdi || 0,
      mmi: props.mmi || 0,
      status: props.status || 'automatic',
      type: props.type || 'earthquake',
      url: props.url,
      detail: props.detail,
    }
  }

  // Fetch latest earthquake data from USGS
  async fetchEarthquakeData() {
    try {
      logger.info('🌍 Fetching latest earthquake data from USGS...')

      const response = await axios.get(this.usgsEndpoint, {
        timeout: 10000,
        headers: {
          'User-Agent': 'CrisisLink-EarthquakeMonitor/1.0',
        },
      })

      const data = response.data
      this.lastUpdate = new Date()

      // Reset arrays
      this.globalQuakes = []
      this.southAfricaQuakes = []

      // Process each earthquake
      for (const quake of data.features) {
        const formattedQuake = this.formatEarthquakeData(quake)

        this.globalQuakes.push(formattedQuake)

        // Check if it's in South Africa
        if (formattedQuake.isInSouthAfrica) {
          this.southAfricaQuakes.push(formattedQuake)

          // Trigger CrisisLink alert for South African earthquakes
          await this.triggerCrisisLinkAlert(formattedQuake)
        }
      }

      // Broadcast to all connected clients
      this.broadcastEarthquakeUpdate()

      logger.info(
        `📊 Processed ${this.globalQuakes.length} earthquakes (${this.southAfricaQuakes.length} in South Africa)`
      )

      return {
        success: true,
        totalQuakes: this.globalQuakes.length,
        southAfricaQuakes: this.southAfricaQuakes.length,
        lastUpdate: this.lastUpdate,
      }
    } catch (error) {
      logger.error('❌ Failed to fetch earthquake data:', error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Trigger CrisisLink alert for South African earthquakes
  async triggerCrisisLinkAlert(quake) {
    try {
      // Only alert for significant earthquakes (magnitude 3.0+)
      if (quake.magnitude < this.alertThresholds.low) {
        return
      }

      const alertData = {
        id: `EARTHQUAKE-${quake.id}`,
        type: 'earthquake',
        severity: quake.alertLevel,
        magnitude: quake.magnitude,
        location: quake.location,
        place: quake.place,
        time: quake.time,
        tsunamiRisk: quake.tsunamiRisk,
        depth: quake.location.depth,
        significance: quake.significance,
        alertColor: quake.alertColor,
        isEmergency:
          quake.alertLevel === 'critical' || quake.alertLevel === 'high',
      }

      // Log the alert
      const severityEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴',
      }[quake.alertLevel]

      logger.warn(`${severityEmoji} EARTHQUAKE ALERT - South Africa`)
      logger.warn(`   Magnitude: ${quake.magnitude}`)
      logger.warn(`   Location: ${quake.place}`)
      logger.warn(`   Depth: ${quake.location.depth}km`)
      logger.warn(`   Alert Level: ${quake.alertLevel.toUpperCase()}`)

      if (quake.tsunamiRisk) {
        logger.error('🌊 TSUNAMI RISK DETECTED!')
      }

      // Broadcast to agents, admin dashboards, and emergency interfaces
      if (this.io) {
        // Alert agents
        this.io.to('agents').emit('earthquake-alert', alertData)

        // Alert admin dashboards
        this.io.to('admin-dashboards').emit('earthquake-alert', alertData)

        // Alert emergency interfaces for critical earthquakes
        if (alertData.isEmergency) {
          this.io.emit('critical-earthquake-alert', alertData)
        }

        // Send to natural disaster monitoring
        this.io.emit('natural-disaster-alert', {
          type: 'earthquake',
          severity: quake.alertLevel,
          data: alertData,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      logger.error('❌ Failed to trigger CrisisLink alert:', error.message)
    }
  }

  // Broadcast earthquake updates to all clients
  broadcastEarthquakeUpdate() {
    if (!this.io) return

    const updateData = {
      totalQuakes: this.globalQuakes.length,
      southAfricaQuakes: this.southAfricaQuakes.length,
      latestQuakes: this.globalQuakes.slice(0, 10), // Latest 10 earthquakes
      southAfricaLatest: this.southAfricaQuakes.slice(0, 5), // Latest 5 SA earthquakes
      lastUpdate: this.lastUpdate,
      critical: this.globalQuakes.filter((q) => q.alertLevel === 'critical')
        .length,
      high: this.globalQuakes.filter((q) => q.alertLevel === 'high').length,
      medium: this.globalQuakes.filter((q) => q.alertLevel === 'medium').length,
      low: this.globalQuakes.filter((q) => q.alertLevel === 'low').length,
    }

    // Broadcast to admin consoles
    this.io.to('admin-dashboards').emit('earthquake-data-update', updateData)

    // Broadcast to agent dashboards
    this.io.to('agents').emit('earthquake-monitoring-update', updateData)
  }

  // Start monitoring earthquakes
  startMonitoring() {
    logger.info('🌍 Starting earthquake monitoring service...')

    // Initial fetch
    this.fetchEarthquakeData()

    // Set up interval to fetch every minute
    this.monitoringInterval = setInterval(() => {
      this.fetchEarthquakeData()
    }, 60000) // 60 seconds = 1 minute

    logger.info('✅ Earthquake monitoring started - checking every minute')
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      logger.info('🛑 Earthquake monitoring stopped')
    }
  }

  // Get current earthquake data
  getCurrentData() {
    return {
      globalQuakes: this.globalQuakes,
      southAfricaQuakes: this.southAfricaQuakes,
      lastUpdate: this.lastUpdate,
      totalCount: this.globalQuakes.length,
      southAfricaCount: this.southAfricaQuakes.length,
      criticalCount: this.globalQuakes.filter(
        (q) => q.alertLevel === 'critical'
      ).length,
      isMonitoring: this.monitoringInterval !== null,
    }
  }

  // Get earthquakes by alert level
  getQuakesByLevel(level) {
    return this.globalQuakes.filter((q) => q.alertLevel === level)
  }

  // Get South African earthquakes only
  getSouthAfricaQuakes() {
    return this.southAfricaQuakes
  }
}

module.exports = EarthquakeMonitoringService
