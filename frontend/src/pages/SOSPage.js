import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useLocation as useLocationContext } from '../contexts/LocationContext'
import SOSButton from '../components/SOSButton'
import TrackingDashboard from '../components/TrackingDashboard'
import SosChat from '../components/SosChat'
import LocationService from '../services/LocationService'
import toast from 'react-hot-toast'
import axios from 'axios'

const SOSPage = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const { location, requestLocation } = useLocationContext()
  const [sosAlert, setSosAlert] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [alertHistory, setAlertHistory] = useState([])
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [showSosChat, setShowSosChat] = useState(false)

  useEffect(() => {
    // Request location permission on page load
    requestLocation()

    // Load alert history and emergency contacts
    loadUserData()

    // Socket event listeners
    if (socket) {
      socket.on('sos_confirmed', handleSOSConfirmed)
      socket.on('agent_assigned', handleAgentAssigned)
      socket.on('agent_arrived', handleAgentArrived)
      socket.on('rescue_completed', handleRescueCompleted)

      // New SOS socket events for the enhanced system
      socket.on('sos-status-changed', (data) => {
        if (sosAlert && data.alertId === sosAlert.id) {
          if (data.status === 'resolved') {
            handleRescueCompleted(data)
          } else {
            setSosAlert((prev) => ({ ...prev, status: data.status }))
            toast.info(`Status update: ${data.message || data.status}`)
          }
        }
      })

      return () => {
        socket.off('sos_confirmed')
        socket.off('agent_assigned')
        socket.off('agent_arrived')
        socket.off('rescue_completed')
        socket.off('sos-status-changed')
      }
    }
  }, [socket, requestLocation])

  const loadUserData = async () => {
    try {
      // Load recent SOS alerts
      const alertsResponse = await axios.get('/api/sos/history', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setAlertHistory(alertsResponse.data.alerts || [])

      // Load emergency contacts
      const contactsResponse = await axios.get('/api/auth/emergency-contacts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setEmergencyContacts(contactsResponse.data.contacts || [])
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const handleSOSActivation = (emergencyData) => {
    // This is called from SOSButton when SOS is successfully activated
    console.log('SOS activated with data:', emergencyData)

    if (emergencyData && emergencyData.alert) {
      setSosAlert(emergencyData.alert)
      setShowSosChat(true)
      toast.success('🚨 Emergency alert sent! Opening communication channel...')
    }
  }

  const handleSOSConfirmed = (data) => {
    setSosAlert(data.alert)
    toast.success('✅ Emergency alert confirmed by dispatch center')
  }

  const handleAgentAssigned = (data) => {
    setSosAlert((prev) => ({ ...prev, ...data.alert }))
    setIsTracking(true)
    toast.success(
      `🚑 Agent ${data.agent.name} has been assigned to your emergency`
    )
  }

  const handleAgentArrived = (data) => {
    setSosAlert((prev) => ({ ...prev, status: 'agent_arrived' }))
    toast.success('✅ Emergency responder has arrived at your location')
  }

  const handleRescueCompleted = (data) => {
    setSosAlert((prev) => ({ ...prev, status: 'completed' }))
    setIsTracking(false)
    setShowSosChat(false)
    LocationService.stopAllTracking()
    toast.success('✅ Emergency response completed')

    // Clear the alert after a delay
    setTimeout(() => {
      setSosAlert(null)
    }, 3000)

    // Reload alert history
    loadUserData()
  }

  const cancelSOS = async () => {
    if (!sosAlert) return

    try {
      await axios.post(
        `/api/sos/${sosAlert.id}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      )

      setSosAlert(null)
      setIsTracking(false)
      LocationService.stopAllTracking()
      toast.success('Emergency alert cancelled')
    } catch (error) {
      console.error('Error cancelling SOS:', error)
      toast.error('Failed to cancel emergency alert')
    }
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      dispatched: 'bg-orange-500',
      in_progress: 'bg-green-500',
      agent_arrived: 'bg-purple-500',
      completed: 'bg-gray-500',
      cancelled: 'bg-red-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  const getStatusText = (status) => {
    const texts = {
      pending: 'Alert Sent',
      confirmed: 'Confirmed',
      dispatched: 'Agent Dispatched',
      in_progress: 'Agent En Route',
      agent_arrived: 'Agent Arrived',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }
    return texts[status] || status
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Emergency SOS
              </h1>
              <p className="text-gray-600">
                Immediate help when you need it most
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
              {location && (
                <p className="text-xs text-green-600">📍 Location available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Active Alert */}
        {sosAlert && (
          <div className="mb-8 bg-white rounded-xl shadow-lg border-2 border-red-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded-full ${getStatusColor(sosAlert.status)} animate-pulse`}
                  ></div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Active Emergency Alert
                  </h2>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  #{sosAlert.id}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <p className="font-medium">
                    {getStatusText(sosAlert.status)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    Emergency Type
                  </label>
                  <p className="font-medium capitalize">
                    {sosAlert.emergency_type}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Alert Time</label>
                  <p className="font-medium">
                    {formatTime(sosAlert.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                {isTracking && (
                  <button
                    onClick={() => setIsTracking(true)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    📍 View Live Tracking
                  </button>
                )}

                {sosAlert.status === 'pending' && (
                  <button
                    onClick={cancelSOS}
                    className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Cancel Alert
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SOS Button Section */}
        {!sosAlert && (
          <div className="text-center mb-8">
            <SOSButton onSOSActivated={handleSOSActivation} />
            <div className="mt-6 text-gray-600">
              <p className="text-lg font-medium mb-2">In case of emergency:</p>
              <ul className="text-sm space-y-1">
                <li>• Press and hold the SOS button for 3 seconds</li>
                <li>• Your location will be automatically shared</li>
                <li>• Emergency responders will be dispatched</li>
                <li>• Stay calm and wait for help to arrive</li>
              </ul>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        {emergencyContacts.length > 0 && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Emergency Contacts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emergencyContacts.map((contact, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-gray-600">{contact.phone}</p>
                  </div>
                  <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
                    Call
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Alerts */}
        {alertHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Alerts
            </h2>
            <div className="space-y-3">
              {alertHistory.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(alert.status)}`}
                    ></div>
                    <div>
                      <p className="font-medium">Alert #{alert.id}</p>
                      <p className="text-sm text-gray-600">
                        {formatTime(alert.created_at)} • {alert.emergency_type}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {getStatusText(alert.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tracking Dashboard Modal */}
      {isTracking && sosAlert && (
        <TrackingDashboard
          sosAlert={sosAlert}
          onClose={() => setIsTracking(false)}
        />
      )}

      {/* SOS Chat Modal */}
      {showSosChat && sosAlert && (
        <SosChat
          alertId={sosAlert.id}
          onClose={() => {
            setShowSosChat(false)
            // Keep the alert active but hide the chat
          }}
        />
      )}
    </div>
  )
}

export default SOSPage
