import React, { useState, useEffect } from 'react'
import {
  Settings,
  Activity,
  MapPin,
  Bell,
  Shield,
  Wifi,
  Database,
  Server,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const ServiceManagementPage = () => {
  const [services, setServices] = useState([])
  const [systemStatus, setSystemStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Mock service data - replace with actual API calls
  const mockServices = [
    {
      id: 'location-service',
      name: 'Location Service',
      description: 'GPS tracking and geolocation services',
      icon: MapPin,
      status: 'active',
      uptime: '99.9%',
      lastUpdated: new Date().toISOString(),
      endpoint: '/api/location',
      dependencies: ['GPS', 'Network'],
      metrics: {
        requests: 15420,
        errors: 12,
        responseTime: '45ms',
      },
    },
    {
      id: 'notification-service',
      name: 'Notification Service',
      description: 'Push notifications and alerts',
      icon: Bell,
      status: 'active',
      uptime: '99.7%',
      lastUpdated: new Date().toISOString(),
      endpoint: '/api/notifications',
      dependencies: ['FCM', 'WebSocket'],
      metrics: {
        requests: 8234,
        errors: 5,
        responseTime: '125ms',
      },
    },
    {
      id: 'auth-service',
      name: 'Authentication Service',
      description: 'User authentication and authorization',
      icon: Shield,
      status: 'active',
      uptime: '99.8%',
      lastUpdated: new Date().toISOString(),
      endpoint: '/api/auth',
      dependencies: ['Database', 'JWT'],
      metrics: {
        requests: 3421,
        errors: 2,
        responseTime: '78ms',
      },
    },
    {
      id: 'socket-service',
      name: 'Real-time Communication',
      description: 'WebSocket connections for live updates',
      icon: Wifi,
      status: 'active',
      uptime: '99.5%',
      lastUpdated: new Date().toISOString(),
      endpoint: '/socket.io',
      dependencies: ['WebSocket', 'Redis'],
      metrics: {
        requests: 45234,
        errors: 23,
        responseTime: '12ms',
      },
    },
    {
      id: 'weather-service',
      name: 'Weather Integration',
      description: 'Weather data and forecasting',
      icon: Activity,
      status: 'warning',
      uptime: '95.2%',
      lastUpdated: new Date().toISOString(),
      endpoint: '/api/weather',
      dependencies: ['External API', 'Cache'],
      metrics: {
        requests: 2341,
        errors: 45,
        responseTime: '234ms',
      },
    },
    {
      id: 'database-service',
      name: 'Database Service',
      description: 'Primary data storage and retrieval',
      icon: Database,
      status: 'active',
      uptime: '99.9%',
      lastUpdated: new Date().toISOString(),
      endpoint: '/api/db',
      dependencies: ['MongoDB', 'Connection Pool'],
      metrics: {
        requests: 67234,
        errors: 8,
        responseTime: '23ms',
      },
    },
  ]

  useEffect(() => {
    fetchServiceStatus()
    const interval = setInterval(fetchServiceStatus, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchServiceStatus = async () => {
    setLoading(true)
    try {
      // Mock API call - replace with actual service
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setServices(mockServices)
      setSystemStatus({
        totalServices: mockServices.length,
        activeServices: mockServices.filter((s) => s.status === 'active')
          .length,
        warningServices: mockServices.filter((s) => s.status === 'warning')
          .length,
        downServices: mockServices.filter((s) => s.status === 'down').length,
        lastCheck: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to fetch service status:', error)
      toast.error('Failed to load service status')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchServiceStatus()
    toast.success('Services refreshed')
  }

  const handleServiceAction = async (serviceId, action) => {
    try {
      // Mock service action - replace with actual API
      await new Promise((resolve) => setTimeout(resolve, 500))

      setServices((prev) =>
        prev.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                status:
                  action === 'start'
                    ? 'active'
                    : action === 'stop'
                      ? 'down'
                      : service.status,
                lastUpdated: new Date().toISOString(),
              }
            : service
        )
      )

      toast.success(`Service ${action} completed`)
    } catch (error) {
      console.error(`Failed to ${action} service:`, error)
      toast.error(`Failed to ${action} service`)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'down':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && services.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading service status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-red-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Service Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
              <div className="text-sm text-gray-500">
                Last updated:{' '}
                {new Date(systemStatus.lastCheck).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Services
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemStatus.totalServices}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {systemStatus.activeServices}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {systemStatus.warningServices}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Down</p>
                <p className="text-2xl font-bold text-red-600">
                  {systemStatus.downServices}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {services.map((service) => {
            const IconComponent = service.icon
            return (
              <div key={service.id} className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-100 rounded-lg mr-3">
                        <IconComponent className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {service.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {service.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {getStatusIcon(service.status)}
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}
                      >
                        {service.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Service Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {service.uptime}
                      </p>
                      <p className="text-xs text-gray-600">Uptime</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {service.metrics.requests.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">Requests</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {service.metrics.responseTime}
                      </p>
                      <p className="text-xs text-gray-600">Response Time</p>
                    </div>
                  </div>

                  {/* Dependencies */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Dependencies:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {service.dependencies.map((dep, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Last updated:{' '}
                      {new Date(service.lastUpdated).toLocaleString()}
                    </p>
                    <div className="flex space-x-2">
                      {service.status === 'down' && (
                        <button
                          onClick={() =>
                            handleServiceAction(service.id, 'start')
                          }
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Start
                        </button>
                      )}
                      {service.status === 'active' && (
                        <button
                          onClick={() =>
                            handleServiceAction(service.id, 'restart')
                          }
                          className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                        >
                          Restart
                        </button>
                      )}
                      <button
                        onClick={() => handleServiceAction(service.id, 'logs')}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Logs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ServiceManagementPage
