// Enhanced Weather Service with Google Weather API Integration
import axios from 'axios';

class WeatherIntegrationService {
  constructor() {
    this.weatherCache = new Map();
    this.alertSubscriptions = new Set();
    this.emergencyThresholds = {
      temperature: { extreme_hot: 40, extreme_cold: 0 },
      wind_speed: { high: 50, extreme: 80 }, // km/h
      rainfall: { heavy: 50, extreme: 100 }, // mm/h
      visibility: { poor: 1000, critical: 500 }, // meters
      humidity: { extreme: 95 }
    };
    this.southAfricaCities = [
      { name: 'Cape Town', lat: -33.9249, lng: 18.4241, priority: 'high' },
      { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, priority: 'high' },
      { name: 'Durban', lat: -29.8587, lng: 31.0218, priority: 'high' },
      { name: 'Pretoria', lat: -25.7479, lng: 28.2293, priority: 'medium' },
      { name: 'Port Elizabeth', lat: -33.9608, lng: 25.6022, priority: 'medium' },
      { name: 'Bloemfontein', lat: -29.0852, lng: 26.1596, priority: 'medium' },
      { name: 'East London', lat: -33.0153, lng: 27.9116, priority: 'low' },
      { name: 'Pietermaritzburg', lat: -29.6132, lng: 30.3794, priority: 'low' },
      { name: 'Polokwane', lat: -23.9045, lng: 29.4689, priority: 'low' },
      { name: 'Kimberley', lat: -28.7282, lng: 24.7499, priority: 'low' },
      { name: 'Nelspruit', lat: -25.4753, lng: 30.969, priority: 'low' }
    ];
  }

  // Get current weather with Google integration
  async getCurrentWeather(lat, lng) {
    try {
      // Try Google Weather API first (if available)
      const googleWeather = await this.getGoogleWeather(lat, lng);
      if (googleWeather) return googleWeather;

      // Fallback to OpenWeatherMap
      return await this.getOpenWeatherMapData(lat, lng);

    } catch (error) {
      console.error('Weather fetch error:', error);
      return this.getWeatherFallback(lat, lng);
    }
  }

  // Google Weather API integration
  async getGoogleWeather(lat, lng) {
    try {
      // Note: Google doesn't have a direct weather API, but we can use
      // Google Maps Geocoding to get location info and combine with other services
      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, async (results, status) => {
          if (status === 'OK' && results[0]) {
            const locationInfo = this.parseGoogleLocationInfo(results[0]);
            
            // Get weather from OpenWeatherMap with enhanced location data
            const weatherData = await this.getOpenWeatherMapData(lat, lng, locationInfo);
            resolve(weatherData);
          } else {
            resolve(null);
          }
        });
      });

    } catch (error) {
      console.error('Google weather integration error:', error);
      return null;
    }
  }

  // Parse Google location information
  parseGoogleLocationInfo(result) {
    const components = result.address_components;
    const locationInfo = {
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      city: null,
      province: null,
      country: null,
      postal_code: null
    };

    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('locality')) {
        locationInfo.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        locationInfo.province = component.long_name;
      } else if (types.includes('country')) {
        locationInfo.country = component.long_name;
      } else if (types.includes('postal_code')) {
        locationInfo.postal_code = component.long_name;
      }
    });

    return locationInfo;
  }

  // Enhanced OpenWeatherMap integration
  async getOpenWeatherMapData(lat, lng, locationInfo = null) {
    try {
      const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;
      if (!apiKey) {
        throw new Error('OpenWeatherMap API key not configured');
      }

      // Get current weather
      const currentResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
      );

      // Get forecast
      const forecastResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
      );

      // Get air quality
      const airQualityResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${apiKey}`
      );

      const weatherData = {
        current: this.parseCurrentWeather(currentResponse.data),
        forecast: this.parseForecastWeather(forecastResponse.data),
        air_quality: this.parseAirQuality(airQualityResponse.data),
        location_info: locationInfo,
        emergency_assessment: null,
        last_updated: new Date()
      };

      // Assess emergency conditions
      weatherData.emergency_assessment = this.assessEmergencyConditions(weatherData);

      // Cache the data
      const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      this.weatherCache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;

    } catch (error) {
      console.error('OpenWeatherMap API error:', error);
      throw error;
    }
  }

  // Parse current weather data
  parseCurrentWeather(data) {
    return {
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      visibility: data.visibility,
      wind_speed: data.wind.speed * 3.6, // Convert m/s to km/h
      wind_direction: data.wind.deg,
      wind_gust: data.wind.gust ? data.wind.gust * 3.6 : null,
      weather: {
        main: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon
      },
      clouds: data.clouds.all,
      rain: data.rain ? data.rain['1h'] || data.rain['3h'] : 0,
      snow: data.snow ? data.snow['1h'] || data.snow['3h'] : 0,
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000)
    };
  }

  // Parse forecast weather data
  parseForecastWeather(data) {
    return data.list.map(item => ({
      datetime: new Date(item.dt * 1000),
      temperature: item.main.temp,
      feels_like: item.main.feels_like,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      wind_speed: item.wind.speed * 3.6,
      wind_direction: item.wind.deg,
      weather: {
        main: item.weather[0].main,
        description: item.weather[0].description,
        icon: item.weather[0].icon
      },
      rain: item.rain ? item.rain['3h'] : 0,
      snow: item.snow ? item.snow['3h'] : 0,
      visibility: item.visibility || 10000
    }));
  }

  // Parse air quality data
  parseAirQuality(data) {
    const current = data.list[0];
    return {
      aqi: current.main.aqi, // 1-5 scale
      components: {
        co: current.components.co,
        no: current.components.no,
        no2: current.components.no2,
        o3: current.components.o3,
        so2: current.components.so2,
        pm2_5: current.components.pm2_5,
        pm10: current.components.pm10,
        nh3: current.components.nh3
      },
      quality_description: this.getAQIDescription(current.main.aqi)
    };
  }

  // Get AQI description
  getAQIDescription(aqi) {
    const descriptions = {
      1: 'Good',
      2: 'Fair',
      3: 'Moderate',
      4: 'Poor',
      5: 'Very Poor'
    };
    return descriptions[aqi] || 'Unknown';
  }

  // Assess emergency weather conditions
  assessEmergencyConditions(weatherData) {
    const { current, forecast } = weatherData;
    const threats = [];
    let riskLevel = 'low';

    // Temperature extremes
    if (current.temperature >= this.emergencyThresholds.temperature.extreme_hot) {
      threats.push({
        type: 'extreme_heat',
        severity: 'high',
        description: `Extreme heat warning: ${current.temperature}°C`,
        recommendations: ['Stay indoors', 'Drink plenty of water', 'Avoid outdoor activities']
      });
      riskLevel = 'high';
    } else if (current.temperature <= this.emergencyThresholds.temperature.extreme_cold) {
      threats.push({
        type: 'extreme_cold',
        severity: 'high',
        description: `Extreme cold warning: ${current.temperature}°C`,
        recommendations: ['Stay warm', 'Avoid prolonged exposure', 'Check heating systems']
      });
      riskLevel = 'high';
    }

    // Wind conditions
    if (current.wind_speed >= this.emergencyThresholds.wind_speed.extreme) {
      threats.push({
        type: 'extreme_wind',
        severity: 'high',
        description: `Extreme wind warning: ${current.wind_speed.toFixed(1)} km/h`,
        recommendations: ['Stay indoors', 'Secure loose objects', 'Avoid driving']
      });
      riskLevel = 'high';
    } else if (current.wind_speed >= this.emergencyThresholds.wind_speed.high) {
      threats.push({
        type: 'high_wind',
        severity: 'medium',
        description: `High wind advisory: ${current.wind_speed.toFixed(1)} km/h`,
        recommendations: ['Be cautious outdoors', 'Secure loose items']
      });
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Visibility
    if (current.visibility <= this.emergencyThresholds.visibility.critical) {
      threats.push({
        type: 'critical_visibility',
        severity: 'high',
        description: `Critical visibility: ${current.visibility}m`,
        recommendations: ['Avoid travel', 'Use emergency lights', 'Stay in safe location']
      });
      riskLevel = 'high';
    } else if (current.visibility <= this.emergencyThresholds.visibility.poor) {
      threats.push({
        type: 'poor_visibility',
        severity: 'medium',
        description: `Poor visibility: ${current.visibility}m`,
        recommendations: ['Drive carefully', 'Use headlights', 'Reduce speed']
      });
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Severe weather patterns
    const severeWeatherTypes = ['Thunderstorm', 'Tornado', 'Squall'];
    if (severeWeatherTypes.includes(current.weather.main)) {
      threats.push({
        type: 'severe_weather',
        severity: 'high',
        description: `Severe weather: ${current.weather.description}`,
        recommendations: ['Seek immediate shelter', 'Avoid windows', 'Monitor weather updates']
      });
      riskLevel = 'high';
    }

    // Heavy precipitation
    if (current.rain >= this.emergencyThresholds.rainfall.extreme) {
      threats.push({
        type: 'extreme_rainfall',
        severity: 'high',
        description: `Extreme rainfall: ${current.rain}mm/h`,
        recommendations: ['Avoid flood-prone areas', 'Do not drive through water', 'Stay indoors']
      });
      riskLevel = 'high';
    }

    // Air quality concerns
    if (weatherData.air_quality.aqi >= 4) {
      threats.push({
        type: 'poor_air_quality',
        severity: weatherData.air_quality.aqi === 5 ? 'high' : 'medium',
        description: `Poor air quality: ${weatherData.air_quality.quality_description}`,
        recommendations: ['Limit outdoor activities', 'Use air purifiers', 'Wear masks if necessary']
      });
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    return {
      risk_level: riskLevel,
      threats,
      safe_for_emergency_response: riskLevel !== 'high',
      response_recommendations: this.getEmergencyResponseRecommendations(threats, riskLevel)
    };
  }

  // Get emergency response recommendations
  getEmergencyResponseRecommendations(threats, riskLevel) {
    const recommendations = [];

    if (riskLevel === 'high') {
      recommendations.push('Consider delaying non-critical emergency responses');
      recommendations.push('Ensure emergency responders have proper protective equipment');
      recommendations.push('Use alternative routes if weather affects primary response paths');
    }

    if (threats.some(t => t.type.includes('wind'))) {
      recommendations.push('Be aware of falling debris and unstable structures');
      recommendations.push('Use ground-based transport instead of air support if possible');
    }

    if (threats.some(t => t.type.includes('visibility'))) {
      recommendations.push('Use GPS navigation and emergency lighting');
      recommendations.push('Reduce response vehicle speeds and increase following distances');
    }

    if (threats.some(t => t.type.includes('rainfall'))) {
      recommendations.push('Avoid flood-prone routes and low-lying areas');
      recommendations.push('Monitor water levels and road conditions continuously');
    }

    return recommendations;
  }

  // Monitor weather for all major cities
  async monitorAllCities() {
    const weatherUpdates = [];

    for (const city of this.southAfricaCities) {
      try {
        const weather = await this.getCurrentWeather(city.lat, city.lng);
        weatherUpdates.push({
          city: city.name,
          priority: city.priority,
          weather,
          timestamp: new Date()
        });

        // Check for emergency conditions
        if (weather.emergency_assessment.risk_level === 'high') {
          await this.triggerWeatherAlert(city, weather);
        }

      } catch (error) {
        console.error(`Weather monitoring error for ${city.name}:`, error);
      }
    }

    return weatherUpdates;
  }

  // Trigger weather alerts
  async triggerWeatherAlert(city, weather) {
    const alert = {
      type: 'weather_emergency',
      city: city.name,
      location: { lat: city.lat, lng: city.lng },
      risk_level: weather.emergency_assessment.risk_level,
      threats: weather.emergency_assessment.threats,
      timestamp: new Date(),
      recommendations: weather.emergency_assessment.response_recommendations
    };

    // Notify all subscribers
    this.alertSubscriptions.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Weather alert callback error:', error);
      }
    });

    // Send to backend for broader notification
    try {
      await axios.post('/api/weather/emergency-alert', alert, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Weather alert backend error:', error);
    }
  }

  // Subscribe to weather alerts
  onWeatherAlert(callback) {
    this.alertSubscriptions.add(callback);
    
    return () => {
      this.alertSubscriptions.delete(callback);
    };
  }

  // Get weather for emergency route
  async getRouteWeather(waypoints) {
    try {
      const weatherAlongRoute = [];

      for (const point of waypoints) {
        const weather = await this.getCurrentWeather(point.lat, point.lng);
        weatherAlongRoute.push({
          location: point,
          weather,
          safe_for_travel: weather.emergency_assessment.safe_for_emergency_response
        });
      }

      return {
        route_weather: weatherAlongRoute,
        overall_safety: weatherAlongRoute.every(w => w.safe_for_travel),
        worst_conditions: weatherAlongRoute.reduce((worst, current) => {
          const currentRisk = current.weather.emergency_assessment.risk_level;
          const worstRisk = worst?.weather.emergency_assessment.risk_level || 'low';
          
          const riskLevels = { low: 1, medium: 2, high: 3 };
          return riskLevels[currentRisk] > riskLevels[worstRisk] ? current : worst;
        }, null)
      };

    } catch (error) {
      console.error('Route weather error:', error);
      throw error;
    }
  }

  // Fallback weather data
  getWeatherFallback(lat, lng) {
    return {
      current: {
        temperature: 20,
        humidity: 60,
        wind_speed: 10,
        weather: { main: 'Unknown', description: 'Weather data unavailable' },
        visibility: 10000
      },
      emergency_assessment: {
        risk_level: 'unknown',
        threats: [],
        safe_for_emergency_response: true,
        response_recommendations: ['Weather data unavailable - proceed with caution']
      },
      last_updated: new Date(),
      data_source: 'fallback'
    };
  }

  // Clear cache
  clearCache() {
    this.weatherCache.clear();
  }

  // Get cached weather data
  getCachedWeather(lat, lng, maxAgeMinutes = 10) {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = this.weatherCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < (maxAgeMinutes * 60 * 1000)) {
      return cached.data;
    }
    
    return null;
  }
}

// Create singleton instance
const weatherIntegrationService = new WeatherIntegrationService();

export default weatherIntegrationService;