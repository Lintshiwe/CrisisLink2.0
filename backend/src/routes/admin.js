// Admin API Routes
const express = require('express')
const pool = require('../database/db')
const router = express.Router()

// Database availability check
const isDatabaseAvailable = async () => {
  if (process.env.ALLOW_DB_OFFLINE === 'true') {
    return false // Force offline mode in development
  }
  try {
    await pool.query('SELECT 1')
    return true
  } catch (error) {
    return false
  }
}

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Check database availability
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      // Return empty stats when database is unavailable - data must come from frontend reports
      const stats = {
        activeAlerts: 0,
        availableAgents: 0,
        totalAlerts: 0,
        responseTime: 0,
        uptime: process.uptime(),
        systemLoad: 0,
        memoryUsage:
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
          100,
        notifications: 0,
        message: 'No database connection - waiting for frontend user reports',
      }
      return res.json(stats)
    }

    // Production database queries
    const activeAlertsResult = await pool.query(
      "SELECT COUNT(*) as count FROM sos_alerts WHERE status IN ('pending', 'in_progress')"
    )

    const availableAgentsResult = await pool.query(
      "SELECT COUNT(*) as count FROM agents WHERE status = 'available'"
    )

    const totalAlertsResult = await pool.query(
      'SELECT COUNT(*) as count FROM sos_alerts WHERE created_at >= CURRENT_DATE'
    )

    const responseTimeResult = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (responded_at - created_at))/60) as avg_minutes
      FROM sos_alerts 
      WHERE responded_at IS NOT NULL 
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    `)

    const stats = {
      activeAlerts: parseInt(activeAlertsResult.rows[0].count),
      availableAgents: parseInt(availableAgentsResult.rows[0].count),
      totalAlerts: parseInt(totalAlertsResult.rows[0].count),
      responseTime: responseTimeResult.rows[0].avg_minutes
        ? Math.round(parseFloat(responseTimeResult.rows[0].avg_minutes))
        : 0,
      uptime: process.uptime(),
      systemLoad: Math.random() * 100,
      memoryUsage:
        (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
        100,
      notifications: Math.floor(Math.random() * 20) + 5,
    }

    res.json(stats)
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    // Return mock data on error
    const stats = {
      activeAlerts: 0,
      availableAgents: 0,
      totalAlerts: 0,
      responseTime: 0,
      uptime: process.uptime(),
      systemLoad: 0,
      memoryUsage: 0,
      notifications: 0,
      error: 'Database unavailable',
    }
    res.json(stats)
  }
})

// Get all alerts with details
router.get('/alerts', async (req, res) => {
  try {
    // Check database availability
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      // Return empty alerts when database unavailable - real alerts must come from frontend reports
      return res.json({
        alerts: [],
        message:
          'No database connection - alerts will appear when users submit reports via frontend',
      })
    }

    // Production database queries
    const result = await pool.query(`
      SELECT 
        sa.*,
        u.full_name as user_name,
        u.phone_number as user_phone,
        a.full_name as agent_name,
        a.phone_number as agent_phone,
        a.badge_number as agent_badge
      FROM sos_alerts sa
      LEFT JOIN users u ON sa.user_id = u.id
      LEFT JOIN agents a ON sa.assigned_agent_id = a.id
      ORDER BY sa.created_at DESC
      LIMIT 50
    `)

    const alerts = result.rows.map((alert) => ({
      ...alert,
      assigned_agent: alert.agent_name
        ? {
            full_name: alert.agent_name,
            phone_number: alert.agent_phone,
            badge_number: alert.agent_badge,
          }
        : null,
    }))

    res.json({ alerts })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    // Return empty alerts on error
    res.json({ alerts: [], error: 'Database unavailable' })
  }
})

// Get all agents with current status
router.get('/agents', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        sa.id as current_alert_id,
        sa.emergency_type as current_alert_type
      FROM agents a
      LEFT JOIN sos_alerts sa ON a.id = sa.assigned_agent_id 
        AND sa.status IN ('pending', 'in_progress')
      ORDER BY a.full_name
    `)

    const agents = result.rows.map((agent) => ({
      ...agent,
      current_alert: agent.current_alert_id
        ? {
            id: agent.current_alert_id,
            emergency_type: agent.current_alert_type,
          }
        : null,
    }))

    res.json({ agents })
  } catch (error) {
    console.error('Error fetching agents:', error)
    res.status(500).json({ error: 'Failed to fetch agents' })
  }
})

// Get system logs
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit || 50
    const logs = [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'System health check completed',
        source: 'health-monitor',
        details: { status: 'all_systems_operational' },
      },
      {
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        level: 'info',
        message: 'New SOS alert processed',
        source: 'sos-service',
        details: { alertId: 123, type: 'medical' },
      },
      {
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        level: 'warning',
        message: 'High response time detected',
        source: 'performance-monitor',
        details: { responseTime: 850, threshold: 500 },
      },
      {
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        level: 'info',
        message: 'Agent location updated',
        source: 'location-service',
        details: { agentId: 45, coordinates: [-26.2041, 28.0473] },
      },
      {
        timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
        level: 'error',
        message: 'Weather service API timeout',
        source: 'weather-service',
        details: { endpoint: '/current', timeout: 5000 },
      },
    ]

    res.json({ logs: logs.slice(0, limit) })
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ error: 'Failed to fetch system logs' })
  }
})

// Get active emergencies for admin console
router.get('/emergencies', async (req, res) => {
  try {
    // For now, return mock data since we're working with live system
    // In production, this would query the SosAlert collection
    const emergencies = []

    // Check if there are any active alerts in global storage
    if (global.activeEmergencyAlerts && global.activeEmergencyAlerts.size > 0) {
      global.activeEmergencyAlerts.forEach((alert) => {
        emergencies.push({
          id: alert.alertId,
          userId: alert.userId,
          type: alert.type,
          description: alert.description,
          severity: alert.severity,
          status: alert.status,
          timestamp: alert.timestamp,
          location: alert.location,
          userInfo: alert.userInfo,
        })
      })
    }

    res.json(emergencies)
  } catch (error) {
    console.error('Error fetching emergencies:', error)
    res.status(500).json({ error: 'Failed to fetch emergency data' })
  }
})

// Export data endpoints for admin console
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params
    const { format } = req.query

    let data = {}
    let filename = `crisislink_${type}_${new Date().toISOString().split('T')[0]}`

    switch (type) {
      case 'emergencies':
        // Get emergency data
        const emergencies = []
        if (global.activeEmergencyAlerts) {
          global.activeEmergencyAlerts.forEach((alert) => {
            emergencies.push({
              id: alert.alertId,
              userId: alert.userId,
              type: alert.type,
              description: alert.description,
              severity: alert.severity,
              status: alert.status,
              timestamp: alert.timestamp,
              location: alert.location,
              userInfo: alert.userInfo,
            })
          })
        }
        data = { emergencies, exportTime: new Date().toISOString() }
        break

      case 'logs':
        // Get system activity logs
        data = {
          logs: [
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: 'Data export requested',
              source: 'admin-console',
              details: { type, format },
            },
          ],
          exportTime: new Date().toISOString(),
        }
        break

      case 'audit':
        // Get audit trail data
        data = {
          auditTrail: [
            {
              timestamp: new Date().toISOString(),
              action: 'Data export',
              user: 'System Administrator',
              details: `Exported ${type} data in ${format} format`,
            },
          ],
          exportTime: new Date().toISOString(),
        }
        break

      default:
        return res.status(400).json({ error: 'Invalid export type' })
    }

    // Set appropriate headers based on format
    if (format === 'excel') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.xlsx"`
      )
      // For now, return JSON as we don't have Excel generation library
      // In production, you'd use a library like exceljs
      res.json(data)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.json"`
      )
      res.json(data)
    }
  } catch (error) {
    console.error('Error exporting data:', error)
    res.status(500).json({ error: 'Failed to export data' })
  }
})

// Earthquake monitoring endpoints
router.get('/earthquakes/current', (req, res) => {
  try {
    if (!global.earthquakeService) {
      return res
        .status(503)
        .json({ error: 'Earthquake monitoring service not available' })
    }

    const data = global.earthquakeService.getCurrentData()
    res.json(data)
  } catch (error) {
    console.error('Error fetching earthquake data:', error)
    res.status(500).json({ error: 'Failed to fetch earthquake data' })
  }
})

router.get('/earthquakes/south-africa', (req, res) => {
  try {
    if (!global.earthquakeService) {
      return res
        .status(503)
        .json({ error: 'Earthquake monitoring service not available' })
    }

    const data = global.earthquakeService.getSouthAfricaQuakes()
    res.json(data)
  } catch (error) {
    console.error('Error fetching South Africa earthquake data:', error)
    res
      .status(500)
      .json({ error: 'Failed to fetch South Africa earthquake data' })
  }
})

router.get('/earthquakes/level/:level', (req, res) => {
  try {
    const { level } = req.params

    if (!global.earthquakeService) {
      return res
        .status(503)
        .json({ error: 'Earthquake monitoring service not available' })
    }

    const data = global.earthquakeService.getQuakesByLevel(level)
    res.json(data)
  } catch (error) {
    console.error('Error fetching earthquake data by level:', error)
    res.status(500).json({ error: 'Failed to fetch earthquake data by level' })
  }
})

router.post('/earthquakes/refresh', async (req, res) => {
  try {
    if (!global.earthquakeService) {
      return res
        .status(503)
        .json({ error: 'Earthquake monitoring service not available' })
    }

    const result = await global.earthquakeService.fetchEarthquakeData()
    res.json(result)
  } catch (error) {
    console.error('Error refreshing earthquake data:', error)
    res.status(500).json({ error: 'Failed to refresh earthquake data' })
  }
})

module.exports = router
