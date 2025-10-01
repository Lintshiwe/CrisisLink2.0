import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  AlertTriangle,
  Users,
  MapPin,
  Activity,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    activeAlerts: 0,
    availableAgents: 0,
    totalAlerts: 0,
    responseTime: '0',
  })

  const [alerts, setAlerts] = useState([])
  const [agents, setAgents] = useState([])
  const [systemLogs, setSystemLogs] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes, agentsRes, logsRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/alerts'),
        axios.get('/api/admin/agents'),
        axios.get('/api/admin/logs'),
      ])

      setStats(statsRes.data)
      setAlerts(alertsRes.data.alerts)
      setAgents(agentsRes.data.agents)
      setSystemLogs(logsRes.data.logs)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setLoading(false)
    }
  }

  const updateAlertStatus = async (alertId, status) => {
    try {
      await axios.put(`/api/sos/${alertId}/status`, { status })
      fetchDashboardData() // Refresh data
    } catch (error) {
      console.error('Failed to update alert status:', error)
    }
  }

  const updateAgentStatus = async (agentId, status) => {
    try {
      await axios.put(`/api/agents/${agentId}/status`, { status })
      fetchDashboardData() // Refresh data
    } catch (error) {
      console.error('Failed to update agent status:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-red-600 bg-red-100'
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100'
      case 'resolved':
        return 'text-green-600 bg-green-100'
      case 'cancelled':
        return 'text-gray-600 bg-gray-100'
      case 'available':
        return 'text-green-600 bg-green-100'
      case 'busy':
        return 'text-yellow-600 bg-yellow-100'
      case 'offline':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const calculateResponseTime = (createdAt, respondedAt) => {
    if (!respondedAt) return 'Pending'
    const diff = new Date(respondedAt) - new Date(createdAt)
    const minutes = Math.floor(diff / 60000)
    return `${minutes} min`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
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
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                CrisisLink Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {formatTime(new Date())}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm text-gray-600">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Activity },
              { id: 'alerts', name: 'Active Alerts', icon: AlertTriangle },
              { id: 'agents', name: 'Agents', icon: Users },
              { id: 'logs', name: 'System Logs', icon: Clock },
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                  activeTab === id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Active Alerts
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.activeAlerts}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Available Agents
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.availableAgents}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Alerts Today
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalAlerts}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Avg Response Time
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.responseTime} min
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Emergency Alerts
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alert ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Response Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {alerts.slice(0, 5).map((alert) => (
                      <tr key={alert.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{alert.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {alert.emergency_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alert.latitude.toFixed(4)},{' '}
                          {alert.longitude.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}
                          >
                            {alert.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateResponseTime(
                            alert.created_at,
                            alert.responded_at
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Active Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Active Emergency Alerts
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alert Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Alert #{alert.id} - {alert.emergency_type}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatTime(alert.created_at)}
                          </div>
                          {alert.additional_info && (
                            <div className="text-sm text-gray-600 mt-1">
                              {alert.additional_info}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                          <div className="text-sm text-gray-900">
                            {alert.latitude.toFixed(4)},{' '}
                            {alert.longitude.toFixed(4)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {alert.assigned_agent ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {alert.assigned_agent.full_name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {alert.assigned_agent.phone_number}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-red-600">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {alert.status === 'pending' && (
                            <button
                              onClick={() =>
                                updateAlertStatus(alert.id, 'in_progress')
                              }
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Start Response
                            </button>
                          )}
                          {alert.status === 'in_progress' && (
                            <button
                              onClick={() =>
                                updateAlertStatus(alert.id, 'resolved')
                              }
                              className="text-green-600 hover:text-green-900"
                            >
                              Mark Resolved
                            </button>
                          )}
                          <button
                            onClick={() =>
                              updateAlertStatus(alert.id, 'cancelled')
                            }
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Emergency Response Agents
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active Alert
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agents.map((agent) => (
                    <tr key={agent.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {agent.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Badge: {agent.badge_number}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {agent.phone_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                          <div className="text-sm text-gray-900">
                            {agent.current_lat?.toFixed(4)},{' '}
                            {agent.current_lng?.toFixed(4)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Updated: {formatTime(agent.location_updated_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {agent.status === 'available' && (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          )}
                          {agent.status === 'busy' && (
                            <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                          )}
                          {agent.status === 'offline' && (
                            <XCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span
                            className={`text-sm font-medium ${getStatusColor(agent.status)}`}
                          >
                            {agent.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {agent.current_alert ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Alert #{agent.current_alert.id}
                            </div>
                            <div className="text-sm text-gray-500">
                              {agent.current_alert.emergency_type}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {agent.status === 'offline' && (
                            <button
                              onClick={() =>
                                updateAgentStatus(agent.id, 'available')
                              }
                              className="text-green-600 hover:text-green-900"
                            >
                              Set Available
                            </button>
                          )}
                          {agent.status === 'available' && (
                            <button
                              onClick={() =>
                                updateAgentStatus(agent.id, 'offline')
                              }
                              className="text-red-600 hover:text-red-900"
                            >
                              Set Offline
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                System Activity Logs
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {systemLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {log.level === 'error' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {log.level === 'warning' && (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      {log.level === 'info' && (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {log.message}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(log.timestamp)} - {log.source}
                      </div>
                      {log.details && (
                        <div className="text-xs text-gray-600 mt-1 font-mono bg-white p-2 rounded">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
