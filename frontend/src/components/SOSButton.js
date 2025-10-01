import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Zap, MapPin, Shield } from 'lucide-react'
import { useLocation } from '../contexts/LocationContext'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { sosService } from '../services/sosService'
import toast from 'react-hot-toast'

const SOSButton = ({ onSOSActivated, disabled = false }) => {
  const [isPressed, setIsPressed] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [emergencyType, setEmergencyType] = useState('other')
  const [description, setDescription] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [isActivating, setIsActivating] = useState(false)

  const pressStartTime = useRef(null)
  const countdownInterval = useRef(null)
  const vibrationRef = useRef(null)

  const { currentLocation, isLocationLoading, locationError } = useLocation()
  const { socket, sendSosAlert } = useSocket()
  const { user } = useAuth()

  const emergencyTypes = [
    {
      id: 'medical',
      label: 'Medical Emergency',
      icon: '🚑',
      color: 'text-red-400',
    },
    {
      id: 'fire',
      label: 'Fire Emergency',
      icon: '🚒',
      color: 'text-orange-400',
    },
    {
      id: 'police',
      label: 'Police Emergency',
      icon: '🚔',
      color: 'text-blue-400',
    },
    { id: 'accident', label: 'Accident', icon: '🚗', color: 'text-yellow-400' },
    {
      id: 'natural_disaster',
      label: 'Natural Disaster',
      icon: '🌪️',
      color: 'text-purple-400',
    },
    {
      id: 'other',
      label: 'Other Emergency',
      icon: '⚠️',
      color: 'text-gray-400',
    },
  ]

  // Vibration patterns for different states
  const vibrationPatterns = {
    press: [100],
    countdown: [50, 50, 50],
    activate: [200, 100, 200, 100, 200],
    cancel: [100, 50, 100],
  }

  const vibrate = useCallback((pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  const startCountdown = useCallback(() => {
    setCountdown(3)
    setIsPulsing(true)
    vibrate(vibrationPatterns.countdown)

    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current)
          activateSOS()
          return null
        }
        vibrate(vibrationPatterns.countdown)
        return prev - 1
      })
    }, 1000)
  }, [vibrate])

  const cancelCountdown = useCallback(() => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current)
      countdownInterval.current = null
    }
    setCountdown(null)
    setIsPulsing(false)
    setIsPressed(false)
    vibrate(vibrationPatterns.cancel)
  }, [vibrate])

  const activateSOS = useCallback(async () => {
    if (!currentLocation) {
      toast.error(
        'Location not available. Please ensure location services are enabled.'
      )
      cancelCountdown()
      return
    }

    setIsActivating(true)
    vibrate(vibrationPatterns.activate)

    try {
      const sosData = {
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        emergencyType,
        description: description.trim(),
      }

      const response = await sosService.createSOSAlert(sosData)

      if (response.success) {
        toast.success('🚨 Emergency alert sent! Help is being dispatched.')

        // Send SOS alert through enhanced socket system
        const sosData = sendSosAlert({
          userId: user.id,
          location: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          emergencyType,
          description: description.trim(),
        })

        // Callback to parent component with combined data
        if (onSOSActivated) {
          onSOSActivated({
            alert: {
              id: response.data.alert.id || `sos_${Date.now()}`,
              ...response.data.alert,
              ...sosData,
            },
            nearestAgents: response.data.nearestAgents,
          })
        }
      } else {
        throw new Error(response.message || 'Failed to send SOS alert')
      }
    } catch (error) {
      console.error('Error activating SOS:', error)
      toast.error(`Failed to send SOS alert: ${error.message}`)
    } finally {
      setIsActivating(false)
      setCountdown(null)
      setIsPulsing(false)
      setIsPressed(false)
      setShowOptions(false)
    }
  }, [
    currentLocation,
    emergencyType,
    description,
    sendSosAlert,
    user,
    onSOSActivated,
    vibrate,
    cancelCountdown,
  ])

  const handleButtonPress = useCallback(() => {
    if (disabled || isActivating || isLocationLoading) return

    if (locationError) {
      toast.error('Location access required for emergency services')
      return
    }

    setIsPressed(true)
    pressStartTime.current = Date.now()
    vibrate(vibrationPatterns.press)

    // Start countdown after 500ms of continuous press
    setTimeout(() => {
      if (isPressed) {
        startCountdown()
      }
    }, 500)
  }, [
    disabled,
    isActivating,
    isLocationLoading,
    locationError,
    isPressed,
    startCountdown,
    vibrate,
  ])

  const handleButtonRelease = useCallback(() => {
    if (!isPressed) return

    const pressDuration = Date.now() - (pressStartTime.current || 0)

    // If released before countdown starts, show options
    if (pressDuration < 500 && !countdown) {
      setShowOptions(true)
    } else if (countdown) {
      // Cancel countdown if button released during countdown
      cancelCountdown()
    }

    setIsPressed(false)
  }, [isPressed, countdown, cancelCountdown])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
      }
      if (vibrationRef.current) {
        navigator.vibrate(0) // Stop any ongoing vibration
      }
    }
  }, [])

  const selectedEmergencyType = emergencyTypes.find(
    (type) => type.id === emergencyType
  )

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Emergency Type Options */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-dark rounded-2xl p-4 w-80 max-w-full"
          >
            <h3 className="text-lg font-semibold text-white mb-3 text-center">
              Select Emergency Type
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {emergencyTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setEmergencyType(type.id)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    emergencyType === type.id
                      ? 'border-emergency-500 bg-emergency-500/20'
                      : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div
                    className={`text-xs font-medium ${
                      emergencyType === type.id ? 'text-white' : 'text-gray-300'
                    }`}
                  >
                    {type.label}
                  </div>
                </button>
              ))}
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description (optional)"
              className="input w-full h-20 resize-none text-sm mb-4"
              maxLength={500}
            />

            <div className="flex space-x-3">
              <button
                onClick={() => setShowOptions(false)}
                className="flex-1 btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowOptions(false)
                  startCountdown()
                }}
                className="flex-1 btn-primary py-3 font-semibold"
                disabled={!currentLocation}
              >
                Send SOS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main SOS Button */}
      <div className="relative flex flex-col items-center">
        <motion.button
          onMouseDown={handleButtonPress}
          onMouseUp={handleButtonRelease}
          onTouchStart={handleButtonPress}
          onTouchEnd={handleButtonRelease}
          className={`sos-button flex items-center justify-center ${
            isPulsing ? 'sos-button-active emergency-glow' : ''
          } ${disabled || isLocationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={disabled || isLocationLoading}
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          animate={{
            boxShadow: isPulsing
              ? [
                  '0 0 20px rgba(220, 38, 38, 0.5)',
                  '0 0 40px rgba(220, 38, 38, 0.8)',
                  '0 0 20px rgba(220, 38, 38, 0.5)',
                ]
              : '0 0 20px rgba(220, 38, 38, 0.3)',
          }}
          transition={{
            repeat: isPulsing ? Infinity : 0,
            duration: 1,
          }}
        >
          {isActivating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="w-12 h-12 text-white" />
            </motion.div>
          ) : (
            <>
              <AlertTriangle className="w-12 h-12 text-white" />
              {countdown && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <span className="text-4xl font-bold text-white">
                    {countdown}
                  </span>
                </motion.div>
              )}
            </>
          )}
        </motion.button>

        {/* Button Label */}
        <motion.div
          className="mt-4 text-center"
          animate={{ scale: isPulsing ? [1, 1.1, 1] : 1 }}
          transition={{ repeat: isPulsing ? Infinity : 0, duration: 1 }}
        >
          <h2 className="text-2xl font-bold text-white mb-2">
            {isActivating
              ? 'Sending...'
              : countdown
                ? `Sending in ${countdown}`
                : 'Emergency SOS'}
          </h2>
          <p className="text-gray-400 text-sm">
            {isLocationLoading
              ? 'Getting your location...'
              : locationError
                ? 'Location access required'
                : countdown
                  ? 'Release button to cancel'
                  : 'Press and hold for emergency, tap for options'}
          </p>
        </motion.div>

        {/* Selected Emergency Type */}
        {selectedEmergencyType && !showOptions && (
          <motion.div
            className="mt-2 flex items-center space-x-2 text-sm text-gray-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-lg">{selectedEmergencyType.icon}</span>
            <span>{selectedEmergencyType.label}</span>
          </motion.div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="flex items-center space-x-4 text-xs text-gray-400">
        <div className="flex items-center space-x-1">
          <MapPin className="w-4 h-4" />
          <span>
            {isLocationLoading
              ? 'Locating...'
              : currentLocation
                ? 'Location ready'
                : 'No location'}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <Shield className="w-4 h-4" />
          <span>Secure connection</span>
        </div>
      </div>

      {/* Instructions */}
      {countdown && (
        <motion.div
          className="text-center p-4 glass-dark rounded-lg max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-warning-400 font-semibold mb-2">
            Emergency Alert Activating
          </h3>
          <p className="text-sm text-gray-300">
            Your location and emergency details will be sent to nearby rescue
            agents. Release the button to cancel.
          </p>
        </motion.div>
      )}
    </div>
  )
}

export default SOSButton
