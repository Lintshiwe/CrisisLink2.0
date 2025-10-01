import React, { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'

const AgentDashboard = () => {
  const [alerts, setAlerts] = useState([])
  const [activeAlert, setActiveAlert] = useState(null) // eslint-disable-line no-unused-vars
  useSocket() // Socket connection for real-time updates

  useEffect(() => {
    // Mock alerts data
    const mockAlerts = [
      {
        id: 'SOS-001',
        type: 'Medical Emergency',
        location: { lat: -26.2041, lng: 28.0473, address: 'Johannesburg CBD' },
        user: { name: 'John Doe', phone: '+27123456789' },
        timestamp: new Date(Date.now() - 300000),
        status: 'Active',
        priority: 'High',
      },
      {
        id: 'SOS-002',
        type: 'Fire Emergency',
        location: { lat: -26.1849, lng: 28.0422, address: 'Sandton' },
        user: { name: 'Jane Smith', phone: '+27987654321' },
        timestamp: new Date(Date.now() - 600000),
        status: 'Responded',
        priority: 'Critical',
      },
    ]
    setAlerts(mockAlerts)
  }, [])

  const handleAcceptAlert = (alertId) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === alertId
          ? { ...alert, status: 'Accepted', agent: 'Agent-007' }
          : alert
      )
    )
    setActiveAlert(alerts.find((alert) => alert.id === alertId))
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-600'
      case 'High':
        return 'bg-orange-500'
      case 'Medium':
        return 'bg-yellow-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'text-red-600'
      case 'Accepted':
        return 'text-blue-600'
      case 'Responded':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-600 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">🚨 Emergency Agent Dashboard</h1>
          <p className="text-red-100">
            Real-time emergency response coordination
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Active Emergency Alerts ({alerts.length})
              </h2>

              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-3 h-3 rounded-full ${getPriorityColor(alert.priority)}`}
                        ></span>
                        <span className="font-semibold text-gray-800">
                          {alert.id}
                        </span>
                        <span
                          className={`text-sm font-medium ${getStatusColor(alert.status)}`}
                        >
                          {alert.status}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {alert.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    <h3 className="font-semibold text-lg text-gray-800 mb-2">
                      {alert.type}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <strong>Location:</strong> {alert.location.address}
                      </div>
                      <div>
                        <strong>User:</strong> {alert.user.name}
                      </div>
                      <div>
                        <strong>Phone:</strong> {alert.user.phone}
                      </div>
                      <div>
                        <strong>Priority:</strong> {alert.priority}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {alert.status === 'Active' && (
                        <button
                          onClick={() => handleAcceptAlert(alert.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                          Accept & Respond
                        </button>
                      )}
                      <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        View Details
                      </button>
                      <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                        Contact User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dashboard Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Today's Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Alerts</span>
                  <span className="font-semibold">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Responded</span>
                  <span className="font-semibold text-green-600">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-semibold text-orange-600">4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Response Time</span>
                  <span className="font-semibold">3.2 min</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">
                  Broadcast Alert
                </button>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                  Weather Status
                </button>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                  Unit Status
                </button>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700">
                  Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentDashboard
