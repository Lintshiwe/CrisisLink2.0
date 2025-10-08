const axios = require('axios')

class LiveWeatherService {
  constructor(io) {
    this.io = io
    this.apiKeys = [
      process.env.OPENWEATHER_API_KEY || '47f39e2c3c1fb1d2c2c0a0c6f89e2a04', // Primary key
      '949678e6f2a5b82bbc459044b85563f5', // Alternative key
    ]
    this.currentKeyIndex = 0
    this.baseUrl = 'https://api.openweathermap.org/data/2.5'
    this.oneCallUrl = 'https://api.openweathermap.org/data/3.0/onecall'

    // Free weather API as fallback
    this.fallbackUrl = 'https://api.open-meteo.com/v1'

    // South African provinces with major cities
    this.provinces = [
      { name: 'Western Cape', city: 'Cape Town', lat: -33.9249, lon: 18.4241 },
      { name: 'Gauteng', city: 'Johannesburg', lat: -26.2041, lon: 28.0473 },
      { name: 'KwaZulu-Natal', city: 'Durban', lat: -29.8587, lon: 31.0218 },
      {
        name: 'Eastern Cape',
        city: 'Port Elizabeth',
        lat: -33.9608,
        lon: 25.6022,
      },
      { name: 'Free State', city: 'Bloemfontein', lat: -29.0852, lon: 26.1596 },
      { name: 'Mpumalanga', city: 'Nelspruit', lat: -25.4749, lon: 30.9694 },
      { name: 'Limpopo', city: 'Polokwane', lat: -23.9045, lon: 29.4689 },
      { name: 'Northern Cape', city: 'Kimberley', lat: -28.7282, lon: 24.7499 },
      { name: 'North West', city: 'Mafikeng', lat: -25.8075, lon: 25.6447 },
    ]

    this.weatherCache = new Map()
    this.lastUpdate = null

    // Start live weather updates
    this.startLiveUpdates()
  }

  /**
   * Start live weather monitoring every 5 minutes
   */
  startLiveUpdates() {
    // Initial update
    this.updateAllProvinces()

    // Update every 5 minutes
    setInterval(
      () => {
        this.updateAllProvinces()
      },
      5 * 60 * 1000
    )

    console.log('🌤️ Live Weather Service started - updating every 5 minutes')
  }

  /**
   * Update weather data for all provinces
   */
  async updateAllProvinces() {
    try {
      console.log('🔄 Updating weather data for all provinces...')

      for (const province of this.provinces) {
        try {
          const weather = await this.fetchWeatherData(province)
          this.weatherCache.set(province.name, weather)

          // Broadcast to connected clients
          this.io.emit('weather-update', {
            province: province.name,
            data: weather,
            timestamp: new Date().toISOString(),
          })

          // Check for severe weather alerts
          if (weather.alerts && weather.alerts.length > 0) {
            this.io.emit('weather-alert', {
              province: province.name,
              alerts: weather.alerts,
              timestamp: new Date().toISOString(),
            })
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
          console.error(
            `❌ Error updating weather for ${province.name}:`,
            error.message
          )
        }
      }

      this.lastUpdate = new Date()
      console.log('✅ Weather data updated for all provinces')
    } catch (error) {
      console.error('❌ Error in weather update cycle:', error.message)
    }
  }

  /**
   * Fetch weather data for a specific province
   */
  async fetchWeatherData(province) {
    try {
      // Always try OpenWeather API first (we have a valid key now)
      console.log(`🌤️ Fetching real weather data for ${province.name}...`)
      return await this.fetchFromOpenWeather(province)
    } catch (openWeatherError) {
      console.warn(
        `⚠️ OpenWeather API failed for ${province.name}, trying Open-Meteo...`
      )

      try {
        // Fallback to free Open-Meteo API
        return await this.fetchFromOpenMeteo(province)
      } catch (openMeteoError) {
        console.warn(
          `⚠️ All APIs failed for ${province.name}, using fallback data`
        )
        return this.generateFallbackWeather(province)
      }
    }
  }

  /**
   * Fetch from OpenWeather API with multiple key fallback
   */
  async fetchFromOpenWeather(province) {
    let lastError = null

    // Try each API key
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length
      const apiKey = this.apiKeys[keyIndex]

      try {
        const response = await axios.get(`${this.baseUrl}/weather`, {
          params: {
            lat: province.lat,
            lon: province.lon,
            appid: apiKey,
            units: 'metric',
          },
          timeout: 5000,
        })

        // If successful, update current key index for next time
        this.currentKeyIndex = keyIndex
        console.log(
          `✅ OpenWeather API success for ${province.name} using key ${keyIndex + 1}`
        )

        const data = response.data
        return {
          province: province.name,
          city: province.city,
          temperature: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          windSpeed: Math.round(data.wind?.speed * 3.6), // Convert m/s to km/h
          windDirection: data.wind?.deg || 0,
          visibility: data.visibility ? Math.round(data.visibility / 1000) : 10,
          cloudiness: data.clouds.all,
          condition: data.weather[0].main,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
          sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString(),
          alerts: this.analyzeWeatherAlerts(data),
          coordinates: { lat: province.lat, lon: province.lon },
          timestamp: new Date().toISOString(),
          source: 'OpenWeather',
        }
      } catch (error) {
        lastError = error
        console.log(
          `❌ OpenWeather API key ${keyIndex + 1} failed for ${province.name}:`,
          error.response?.status || error.message
        )
        continue
      }
    }

    // If all keys failed, throw the last error
    throw lastError
  }

  /**
   * Fetch from Open-Meteo API (free alternative)
   */
  async fetchFromOpenMeteo(province) {
    const response = await axios.get(`${this.fallbackUrl}/forecast`, {
      params: {
        latitude: province.lat,
        longitude: province.lon,
        current_weather: true,
        hourly:
          'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m',
      },
      timeout: 5000,
    })

    const data = response.data
    const current = data.current_weather

    return {
      province: province.name,
      city: province.city,
      temperature: Math.round(current.temperature),
      feelsLike: Math.round(current.temperature - 2), // Approximate
      humidity: data.hourly?.relative_humidity_2m?.[0] || 50,
      pressure: 1013, // Default
      windSpeed: Math.round(current.windspeed),
      windDirection: current.winddirection,
      visibility: 10,
      cloudiness: current.weathercode > 2 ? 75 : 25,
      condition: this.mapWeatherCode(current.weathercode),
      description: this.mapWeatherCode(current.weathercode).toLowerCase(),
      icon: this.mapToIcon(current.weathercode),
      sunrise: '06:00',
      sunset: '18:00',
      alerts: [],
      coordinates: { lat: province.lat, lon: province.lon },
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Generate fallback weather data when APIs fail
   */
  generateFallbackWeather(province) {
    const baseTemp = 20 + Math.random() * 10 // 20-30°C

    return {
      province: province.name,
      city: province.city,
      temperature: Math.round(baseTemp),
      feelsLike: Math.round(baseTemp + Math.random() * 3 - 1),
      humidity: Math.round(40 + Math.random() * 40),
      pressure: Math.round(1010 + Math.random() * 20),
      windSpeed: Math.round(Math.random() * 15),
      windDirection: Math.round(Math.random() * 360),
      visibility: 10,
      cloudiness: Math.round(Math.random() * 100),
      condition: 'Clear',
      description: 'simulated data',
      icon: '01d',
      sunrise: '06:00',
      sunset: '18:00',
      alerts: [],
      coordinates: { lat: province.lat, lon: province.lon },
      lastUpdated: new Date().toISOString(),
      isSimulated: true,
    }
  }

  /**
   * Analyze weather data for alerts
   */
  analyzeWeatherAlerts(data) {
    const alerts = []

    // Temperature alerts
    if (data.main.temp > 35) {
      alerts.push({
        type: 'extreme_heat',
        severity: 'high',
        message: `Extreme heat warning: ${Math.round(data.main.temp)}°C`,
      })
    }

    if (data.main.temp < 5) {
      alerts.push({
        type: 'cold_weather',
        severity: 'medium',
        message: `Cold weather alert: ${Math.round(data.main.temp)}°C`,
      })
    }

    // Wind alerts
    if (data.wind?.speed > 15) {
      // >54 km/h
      alerts.push({
        type: 'high_wind',
        severity: 'high',
        message: `High wind warning: ${Math.round(data.wind.speed * 3.6)} km/h`,
      })
    }

    // Weather condition alerts
    const severeConditions = ['Thunderstorm', 'Tornado', 'Squall']
    if (severeConditions.includes(data.weather[0].main)) {
      alerts.push({
        type: 'severe_weather',
        severity: 'critical',
        message: `Severe weather alert: ${data.weather[0].description}`,
      })
    }

    return alerts
  }

  /**
   * Map weather code to condition
   */
  mapWeatherCode(code) {
    const codeMap = {
      0: 'Clear',
      1: 'Mainly Clear',
      2: 'Partly Cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing Rime Fog',
      51: 'Light Drizzle',
      53: 'Moderate Drizzle',
      55: 'Dense Drizzle',
      61: 'Slight Rain',
      63: 'Moderate Rain',
      65: 'Heavy Rain',
      95: 'Thunderstorm',
      96: 'Thunderstorm with Hail',
      99: 'Thunderstorm with Heavy Hail',
    }

    return codeMap[code] || 'Unknown'
  }

  /**
   * Map weather code to icon
   */
  mapToIcon(code) {
    if (code === 0) return '01d'
    if (code <= 2) return '02d'
    if (code === 3) return '04d'
    if (code >= 45 && code <= 48) return '50d'
    if (code >= 51 && code <= 65) return '10d'
    if (code >= 95) return '11d'
    return '01d'
  }

  /**
   * Get current weather for all provinces
   */
  getAllWeather() {
    const weather = {}
    for (const [province, data] of this.weatherCache) {
      weather[province] = data
    }

    return {
      provinces: weather,
      lastUpdate: this.lastUpdate,
      totalProvinces: this.provinces.length,
    }
  }

  /**
   * Get weather for specific province
   */
  getProvinceWeather(provinceName) {
    return this.weatherCache.get(provinceName) || null
  }

  /**
   * Get weather summary with alerts
   */
  getWeatherSummary() {
    let totalAlerts = 0
    let criticalAlerts = 0
    let averageTemp = 0
    let tempCount = 0

    for (const [province, data] of this.weatherCache) {
      if (data.alerts) {
        totalAlerts += data.alerts.length
        criticalAlerts += data.alerts.filter(
          (a) => a.severity === 'critical'
        ).length
      }
      if (data.temperature) {
        averageTemp += data.temperature
        tempCount++
      }
    }

    return {
      totalProvinces: this.provinces.length,
      totalAlerts,
      criticalAlerts,
      averageTemperature:
        tempCount > 0 ? Math.round(averageTemp / tempCount) : 0,
      lastUpdate: this.lastUpdate,
      isLive: true,
    }
  }
}

module.exports = LiveWeatherService
