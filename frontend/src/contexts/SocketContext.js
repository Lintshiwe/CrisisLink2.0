import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize socket connection (allow polling fallback for dev/stability)
    const isLocal =
      typeof window !== 'undefined' &&
      /localhost|127\.0\.0\.1/.test(window.location.hostname)
    const newSocket = io(
      process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
      {
        // Prefer polling first on localhost to avoid initial WebSocket console errors,
        // then allow upgrade to websocket when possible.
        transports: isLocal
          ? ['polling', 'websocket']
          : ['websocket', 'polling'],
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 500,
        timeout: 10000,
      }
    )

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Socket connected:', newSocket.id)

      // Register frontend user with backend for tracking
      const userData = {
        userId: `USER-${Date.now()}`,
        name: localStorage.getItem('userName') || 'Anonymous User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(localStorage.getItem('userName') || 'Anonymous')}`,
        company: 'Frontend User',
        deviceInfo: `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} App v2.1.0`,
        socketId: newSocket.id,
      }

      // Store user ID for future use
      localStorage.setItem('crisisLinkUserId', userData.userId)

      // Register with backend
      newSocket.emit('user-register', userData)

      // Start location tracking if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationData = {
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                address: 'Live Location',
              },
              battery: Math.round(Math.random() * 100), // Mock battery level
              threatLevel: 'Low',
            }

            newSocket.emit('user-location-update', locationData)
          },
          (error) => {
            console.log('Location access denied or unavailable')
          }
        )
      }
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Socket disconnected')
    })

    // Listen for tracking requests from admin
    newSocket.on('track-request', (data) => {
      console.log('Tracking request received from admin:', data)
      // User can respond to tracking requests here
    })

    // Listen for contact requests from admin
    newSocket.on('contact-user-request', (data) => {
      console.log('Contact request received from admin:', data)
      // Show notification to user about contact request
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Send periodic location updates with throttling to reduce permission spam
  useEffect(() => {
    if (socket && isConnected) {
      let lastLocationTime = 0
      let cachedLocation = null
      const LOCATION_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
      const UPDATE_INTERVAL = 30000 // 30 seconds

      const locationInterval = setInterval(() => {
        const now = Date.now()

        // Use cached location if available and recent
        if (
          cachedLocation &&
          now - lastLocationTime < LOCATION_CACHE_DURATION
        ) {
          // Add some variation to mock data for realism
          const locationData = {
            ...cachedLocation,
            battery: Math.round(20 + Math.random() * 80),
            threatLevel: Math.random() > 0.8 ? 'Medium' : 'Low',
          }
          socket.emit('user-location-update', locationData)
          return
        }

        // Only request new location if cache is expired
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const locationData = {
                location: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  address: 'Live Location',
                },
                battery: Math.round(20 + Math.random() * 80),
                threatLevel: Math.random() > 0.8 ? 'Medium' : 'Low',
              }

              // Cache the location
              cachedLocation = locationData
              lastLocationTime = now

              socket.emit('user-location-update', locationData)
            },
            (error) => {
              // Use last known location or default if geolocation fails
              if (cachedLocation) {
                const locationData = {
                  ...cachedLocation,
                  battery: Math.round(20 + Math.random() * 80),
                  threatLevel: Math.random() > 0.8 ? 'Medium' : 'Low',
                }
                socket.emit('user-location-update', locationData)
              }
            },
            {
              // Options to reduce permission prompts
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: LOCATION_CACHE_DURATION,
            }
          )
        }
      }, UPDATE_INTERVAL)

      return () => clearInterval(locationInterval)
    }
  }, [socket, isConnected])

  const sendEmergencyAlert = (alertData) => {
    if (socket && isConnected) {
      socket.emit('emergency-alert', {
        type: alertData.emergencyType || 'general',
        message: alertData.description || 'Emergency assistance needed',
        location: alertData.location,
        severity: 'high',
      })
    }
  }

  const sendSosAlert = (alertData) => {
    if (socket && isConnected) {
      const sosData = {
        alertId: `SOS-${Date.now()}`,
        userId: alertData.userId || alertData.name || 'User',
        name: alertData.name || alertData.userId || 'User',
        location: alertData.location,
        emergencyType: alertData.emergencyType || 'general',
        message:
          alertData.description ||
          alertData.message ||
          'Emergency assistance needed',
        description:
          alertData.description ||
          alertData.message ||
          'Emergency assistance needed',
        severity: 'high',
        timestamp: new Date(),
      }

      console.log('🚨 Sending SOS Alert:', sosData)
      socket.emit('sos-alert', sosData)
      return sosData
    }
  }

  const sendSosResponse = (alertId, message) => {
    if (socket && isConnected) {
      socket.emit('user-send-sos-response', {
        alertId,
        userId: 'current-user', // This should come from auth context
        userName: 'User', // This should come from auth context
        message,
        timestamp: new Date(),
      })
    }
  }

  const updateUserStatus = (status) => {
    if (socket && isConnected) {
      socket.emit('user-status-update', { status })
    }
  }

  const value = {
    socket,
    isConnected,
    sendEmergencyAlert,
    sendSosAlert,
    sendSosResponse,
    updateUserStatus,
  }

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}

export default SocketContext
