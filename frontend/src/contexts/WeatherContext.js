import React, { createContext, useContext, useState } from 'react'

const WeatherContext = createContext()

export const useWeather = () => {
  const context = useContext(WeatherContext)
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider')
  }
  return context
}

export const WeatherProvider = ({ children }) => {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getWeatherByLocation = async (latitude, longitude) => {
    setLoading(true)
    setError(null)

    try {
      // Mock weather data for now
      const mockWeather = {
        temperature: 22,
        condition: 'Partly Cloudy',
        humidity: 65,
        windSpeed: 15,
        location: 'Johannesburg, SA',
        alerts: [],
      }

      setWeather(mockWeather)
      setLoading(false)
      return mockWeather
    } catch (err) {
      const errorMessage = 'Failed to fetch weather data'
      setError(errorMessage)
      setLoading(false)
      throw new Error(errorMessage)
    }
  }

  const value = {
    weather,
    loading,
    error,
    getWeatherByLocation,
  }

  return (
    <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>
  )
}

export default WeatherContext
