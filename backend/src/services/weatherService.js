const axios = require('axios')
const cron = require('node-cron')
const { Op } = require('sequelize')
const { WeatherAlert, User, sequelize } = require('../models')
const logger = require('../utils/logger')
const notificationService = require('./notificationService')

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY
    this.baseUrl = 'https://api.openweathermap.org/data/2.5'
    this.oneCallUrl = 'https://api.openweathermap.org/data/3.0/onecall'

    // Disable weather monitoring if no API key is provided (dev-friendly)
    this.disabled = !this.apiKey

    // South African major cities for monitoring
    this.monitoredCities = [
      {
        name: 'Cape Town',
        lat: -33.9249,
        lon: 18.4241,
        province: 'Western Cape',
      },
      {
        name: 'Johannesburg',
        lat: -26.2041,
        lon: 28.0473,
        province: 'Gauteng',
      },
      {
        name: 'Durban',
        lat: -29.8587,
        lon: 31.0218,
        province: 'KwaZulu-Natal',
      },
      { name: 'Pretoria', lat: -25.7479, lon: 28.2293, province: 'Gauteng' },
      {
        name: 'Port Elizabeth',
        lat: -33.9608,
        lon: 25.6022,
        province: 'Eastern Cape',
      },
      {
        name: 'Bloemfontein',
        lat: -29.0852,
        lon: 26.1596,
        province: 'Free State',
      },
      {
        name: 'East London',
        lat: -33.0153,
        lon: 27.9116,
        province: 'Eastern Cape',
      },
      {
        name: 'Nelspruit',
        lat: -25.4749,
        lon: 30.9694,
        province: 'Mpumalanga',
      },
      { name: 'Polokwane', lat: -23.9045, lon: 29.4689, province: 'Limpopo' },
      {
        name: 'Kimberley',
        lat: -28.7282,
        lon: 24.7499,
        province: 'Northern Cape',
      },
      { name: 'Mafikeng', lat: -25.8075, lon: 25.6447, province: 'North West' },
    ]

    if (this.disabled) {
      logger.warn(
        'OpenWeather API key missing; disabling weather monitoring. Set OPENWEATHER_API_KEY to enable.'
      )
    } else {
      this.initializeWeatherMonitoring()
    }
  }

  /**
   * Initialize weather monitoring cron jobs
   */
  initializeWeatherMonitoring() {
    // Skip weather monitoring in development mode when API key is missing
    if (
      process.env.NODE_ENV === 'development' &&
      !process.env.OPENWEATHER_API_KEY
    ) {
      logger.info(
        'Weather monitoring disabled in development mode (no API key)'
      )
      return
    }

    // Weather monitoring temporarily disabled to prevent API errors
    logger.info('Weather monitoring temporarily disabled')
    return

    // Check weather every 15 minutes (disabled)
    // cron.schedule('*/15 * * * *', () => {
    //   this.monitorWeatherConditions()
    // })

    // Clean up old weather alerts daily at midnight
    cron.schedule('0 0 * * *', () => {
      this.cleanupOldAlerts()
    })

    logger.info('Weather monitoring initialized')
  }

  /**
   * Get current weather for a specific location
   */
  async getCurrentWeather(lat, lon) {
    try {
      if (this.disabled) {
        // Return a safe stub to keep app logic flowing in dev
        return {
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
        }
      }
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
        },
      })

      const weather = response.data

      // Check for severe weather conditions
      const alerts = this.analyzeSevereWeather(weather)

      return {
        temperature: weather.main.temp,
        feelsLike: weather.main.feels_like,
        humidity: weather.main.humidity,
        pressure: weather.main.pressure,
        visibility: weather.visibility,
        windSpeed: weather.wind?.speed || 0,
        windDirection: weather.wind?.deg || 0,
        cloudiness: weather.clouds.all,
        condition: weather.weather[0].main,
        description: weather.weather[0].description,
        alerts,
      }
    } catch (error) {
      if (this.disabled) {
        return {
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
        }
      }
      logger.error(
        'Error fetching current weather:',
        error.response?.status || error.message
      )
      throw new Error('Failed to fetch weather data')
    }
  }

  /**
   * Get weather forecast for a location
   */
  async getWeatherForecast(lat, lon, days = 5) {
    try {
      if (this.disabled) {
        return []
      }
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          cnt: days * 8, // 8 forecasts per day (every 3 hours)
        },
      })

      return response.data.list.map((item) => ({
        datetime: new Date(item.dt * 1000),
        temperature: item.main.temp,
        condition: item.weather[0].main,
        description: item.weather[0].description,
        windSpeed: item.wind?.speed || 0,
        humidity: item.main.humidity,
        precipitation: item.rain?.['3h'] || item.snow?.['3h'] || 0,
      }))
    } catch (error) {
      if (this.disabled) {
        return []
      }
      logger.error(
        'Error fetching weather forecast:',
        error.response?.status || error.message
      )
      throw new Error('Failed to fetch weather forecast')
    }
  }

  /**
   * Monitor weather conditions for all tracked cities
   */
  async monitorWeatherConditions() {
    if (
      this.disabled ||
      (process.env.NODE_ENV === 'development' &&
        !process.env.OPENWEATHER_API_KEY)
    ) {
      return // Skip when disabled or in development without API key
    }
    logger.info('Starting weather monitoring cycle')

    for (const city of this.monitoredCities) {
      try {
        await this.checkCityWeather(city)
        // Add small delay between API calls to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        logger.error(`Error monitoring weather for ${city.name}:`, error)
      }
    }

    logger.info('Weather monitoring cycle completed')
  }

  /**
   * Check weather for a specific city and create alerts if needed
   */
  async checkCityWeather(city) {
    try {
      const weather = await this.getCurrentWeather(city.lat, city.lon)
      const forecast = await this.getWeatherForecast(city.lat, city.lon, 2)

      const threats = this.identifyWeatherThreats(weather, forecast)

      for (const threat of threats) {
        await this.createWeatherAlert({
          ...threat,
          location: {
            type: 'Point',
            coordinates: [city.lon, city.lat],
          },
          province: city.province,
          city: city.name,
        })
      }
    } catch (error) {
      logger.error(`Error checking weather for ${city.name}:`, error)
    }
  }

  /**
   * Analyze current weather for severe conditions
   */
  analyzeSevereWeather(weather) {
    const alerts = []
    const condition = weather.weather[0].main.toLowerCase()
    const windSpeed = weather.wind?.speed || 0
    const temp = weather.main.temp
    const humidity = weather.main.humidity

    // High wind alert
    if (windSpeed > 20) {
      // > 72 km/h
      alerts.push({
        type: 'wind',
        severity: windSpeed > 30 ? 'extreme' : 'high',
        message: `Dangerous wind speeds: ${Math.round(windSpeed * 3.6)} km/h`,
      })
    }

    // Extreme temperature alerts
    if (temp > 35) {
      alerts.push({
        type: 'heatwave',
        severity: temp > 40 ? 'extreme' : 'high',
        message: `Extreme heat warning: ${Math.round(temp)}°C`,
      })
    } else if (temp < 0) {
      alerts.push({
        type: 'cold_snap',
        severity: temp < -5 ? 'extreme' : 'high',
        message: `Freezing conditions: ${Math.round(temp)}°C`,
      })
    }

    // Storm conditions
    if (['thunderstorm', 'squall', 'tornado'].includes(condition)) {
      alerts.push({
        type: 'storm',
        severity: 'extreme',
        message: 'Severe thunderstorm conditions detected',
      })
    }

    // Heavy rain/snow
    if (['rain', 'drizzle'].includes(condition) && humidity > 90) {
      alerts.push({
        type: 'flood',
        severity: 'high',
        message: 'Heavy rainfall - flood risk',
      })
    }

    if (condition === 'snow') {
      alerts.push({
        type: 'snow',
        severity: 'high',
        message: 'Snow conditions - travel may be affected',
      })
    }

    return alerts
  }

  /**
   * Identify weather threats from current conditions and forecast
   */
  identifyWeatherThreats(currentWeather, forecast) {
    const threats = []

    // Check current conditions
    const currentAlerts = currentWeather.alerts || []
    for (const alert of currentAlerts) {
      if (['high', 'extreme'].includes(alert.severity)) {
        threats.push({
          alertType: alert.type,
          severity: alert.severity,
          title: `${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert`,
          description: alert.message,
          startTime: new Date(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          weatherData: { current: currentWeather },
        })
      }
    }

    // Analyze forecast for upcoming threats
    const upcomingThreats = this.analyzeForecastThreats(forecast)
    threats.push(...upcomingThreats)

    return threats
  }

  /**
   * Analyze forecast data for potential threats
   */
  analyzeForecastThreats(forecast) {
    const threats = []

    for (let i = 0; i < Math.min(forecast.length, 16); i++) {
      // Next 48 hours
      const item = forecast[i]
      const windSpeedKmh = (item.windSpeed || 0) * 3.6

      // Strong wind forecast
      if (windSpeedKmh > 60) {
        const existingThreat = threats.find((t) => t.alertType === 'wind')
        if (!existingThreat) {
          threats.push({
            alertType: 'wind',
            severity: windSpeedKmh > 80 ? 'extreme' : 'high',
            title: 'Strong Wind Warning',
            description: `Strong winds expected: up to ${Math.round(windSpeedKmh)} km/h`,
            startTime: item.datetime,
            endTime: new Date(item.datetime.getTime() + 6 * 60 * 60 * 1000),
          })
        }
      }

      // Heavy rain forecast
      if (item.precipitation > 20) {
        // > 20mm in 3 hours
        const existingThreat = threats.find((t) => t.alertType === 'rain')
        if (!existingThreat) {
          threats.push({
            alertType: 'rain',
            severity: item.precipitation > 50 ? 'extreme' : 'high',
            title: 'Heavy Rainfall Warning',
            description: `Heavy rain expected: ${item.precipitation}mm in 3 hours`,
            startTime: item.datetime,
            endTime: new Date(item.datetime.getTime() + 6 * 60 * 60 * 1000),
          })
        }
      }

      // Severe weather conditions
      if (['Thunderstorm', 'Squall'].includes(item.condition)) {
        const existingThreat = threats.find((t) => t.alertType === 'storm')
        if (!existingThreat) {
          threats.push({
            alertType: 'storm',
            severity: 'extreme',
            title: 'Severe Storm Warning',
            description: `Severe weather conditions expected: ${item.description}`,
            startTime: item.datetime,
            endTime: new Date(item.datetime.getTime() + 3 * 60 * 60 * 1000),
          })
        }
      }
    }

    return threats
  }

  /**
   * Create a weather alert if it doesn't already exist
   */
  async createWeatherAlert(alertData) {
    try {
      // Check if similar alert already exists
      const existingAlert = await WeatherAlert.findOne({
        where: {
          city: alertData.city,
          alertType: alertData.alertType,
          isActive: true,
          startTime: {
            [Op.gte]: new Date(Date.now() - 6 * 60 * 60 * 1000), // Within last 6 hours
          },
        },
      })

      if (existingAlert) {
        logger.debug(
          `Weather alert already exists for ${alertData.city} - ${alertData.alertType}`
        )
        return existingAlert
      }

      const weatherAlert = await WeatherAlert.create(alertData)

      logger.info(
        `Weather alert created: ${weatherAlert.id} - ${alertData.alertType} in ${alertData.city}`
      )

      // Notify users in the affected area
      await this.notifyUsersInArea(weatherAlert)

      return weatherAlert
    } catch (error) {
      logger.error('Error creating weather alert:', error)
      throw error
    }
  }

  /**
   * Notify users in the affected area about weather threats
   */
  async notifyUsersInArea(weatherAlert) {
    try {
      // Find users within the affected radius
      const users = await User.findAll({
        where: {
          isActive: true,
          fcmToken: {
            [Op.ne]: null,
          },
          lastLocation: {
            [Op.ne]: null,
          },
        },
        attributes: ['id', 'firstName', 'lastName', 'fcmToken', 'lastLocation'],
      })

      const affectedUsers = users.filter((user) => {
        if (!user.lastLocation) return false

        const userLat = user.lastLocation.coordinates[1]
        const userLon = user.lastLocation.coordinates[0]
        const alertLat = weatherAlert.location.coordinates[1]
        const alertLon = weatherAlert.location.coordinates[0]

        const distance = this.calculateDistance(
          userLat,
          userLon,
          alertLat,
          alertLon
        )
        return distance <= weatherAlert.affectedRadius
      })

      if (affectedUsers.length > 0) {
        await notificationService.notifyUsersWeatherAlert(
          affectedUsers,
          weatherAlert
        )

        // Mark alert as having sent notifications
        await weatherAlert.update({ sentNotifications: true })

        logger.info(
          `Weather alert notifications sent to ${affectedUsers.length} users`
        )
      }
    } catch (error) {
      logger.error('Error notifying users about weather alert:', error)
    }
  }

  /**
   * Calculate distance between two points in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in kilometers
    return d
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180)
  }

  /**
   * Get active weather alerts for a location
   */
  async getActiveAlertsForLocation(lat, lon, radius = 50) {
    try {
      const point = `POINT(${lon} ${lat})`

      const alerts = await WeatherAlert.findAll({
        where: {
          isActive: true,
          startTime: {
            [Op.lte]: new Date(),
          },
          [Op.or]: [{ endTime: null }, { endTime: { [Op.gte]: new Date() } }],
        },
        having: sequelize.where(
          sequelize.fn(
            'ST_DWithin',
            sequelize.fn('ST_GeomFromText', point, 4326),
            sequelize.col('location'),
            radius * 1000 // Convert km to meters
          ),
          true
        ),
        order: [
          ['severity', 'DESC'],
          ['startTime', 'ASC'],
        ],
      })

      return alerts
    } catch (error) {
      logger.error('Error getting active weather alerts:', error)
      throw error
    }
  }

  /**
   * Clean up old weather alerts
   */
  async cleanupOldAlerts() {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const result = await WeatherAlert.update(
        { isActive: false },
        {
          where: {
            [Op.or]: [
              { endTime: { [Op.lt]: oneDayAgo } },
              {
                endTime: null,
                startTime: {
                  [Op.lt]: new Date(Date.now() - 12 * 60 * 60 * 1000),
                },
              },
            ],
          },
        }
      )

      logger.info(`Cleaned up ${result[0]} old weather alerts`)
    } catch (error) {
      logger.error('Error cleaning up old weather alerts:', error)
    }
  }
}

module.exports = new WeatherService()
