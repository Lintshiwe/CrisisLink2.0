const express = require('express')
const router = express.Router()

// In-memory store for agent data (dev mode)
const AGENTS = {
  locations: new Map(),
  status: new Map(),
  profiles: new Map(),
}

// Get agent profile
router.get('/profile', async (req, res) => {
  try {
    const agentId = req.user?.id || req.query.agentId || 'dev-agent'
    const profile = AGENTS.profiles.get(agentId) || {
      id: agentId,
      name: `Agent ${agentId.slice(-4)}`,
      badgeNumber: `Badge${Math.floor(Math.random() * 1000)}`,
      specialization: 'general',
      status: 'available',
    }

    res.json({ success: true, data: profile })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get profile' })
  }
})

// Update agent profile
router.put('/profile', async (req, res) => {
  try {
    const agentId = req.user?.id || req.body.agentId || 'dev-agent'
    const updates = req.body

    const currentProfile = AGENTS.profiles.get(agentId) || {}
    const updatedProfile = { ...currentProfile, ...updates }
    AGENTS.profiles.set(agentId, updatedProfile)

    res.json({ success: true, data: updatedProfile })
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to update profile' })
  }
})

// Update agent location
router.put('/location', async (req, res) => {
  try {
    const agentId = req.user?.id || req.body.agentId || 'dev-agent'
    const { latitude, longitude, accuracy } = req.body

    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy || 10,
      timestamp: new Date().toISOString(),
    }

    AGENTS.locations.set(agentId, location)

    // Emit location update via socket if available
    const io = req.app.get('io')
    if (io) {
      io.to('agents').emit('agent-location-update', {
        agentId,
        location,
      })
    }

    res.json({ success: true, data: location })
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to update location' })
  }
})

// Update agent status
router.put('/status', async (req, res) => {
  try {
    const agentId = req.user?.id || req.body.agentId || 'dev-agent'
    const { status } = req.body

    if (!['available', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    AGENTS.status.set(agentId, {
      status,
      timestamp: new Date().toISOString(),
    })

    res.json({ success: true, data: { agentId, status } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status' })
  }
})

// Get agent stats
router.get('/stats', async (req, res) => {
  try {
    const agentId = req.user?.id || req.query.agentId || 'dev-agent'

    // Mock stats for dev
    const stats = {
      totalAssignments: Math.floor(Math.random() * 50),
      completedToday: Math.floor(Math.random() * 10),
      averageResponseTime: Math.floor(Math.random() * 15) + 5, // 5-20 minutes
      currentStatus: AGENTS.status.get(agentId)?.status || 'available',
      location: AGENTS.locations.get(agentId) || null,
    }

    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get stats' })
  }
})

// Get nearby alerts for agent
router.get('/nearby-alerts', async (req, res) => {
  try {
    const agentId = req.user?.id || req.query.agentId || 'dev-agent'
    const { latitude, longitude, radius = 50 } = req.query

    // In dev mode, return mock nearby alerts
    const mockAlerts = [
      {
        id: '1001',
        emergencyType: 'medical',
        location: { latitude: -26.2041, longitude: 28.0473 },
        description: 'Medical emergency reported',
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        status: 'pending',
        distance: Math.random() * 10, // km
      },
      {
        id: '1002',
        emergencyType: 'accident',
        location: { latitude: -26.21, longitude: 28.05 },
        description: 'Vehicle accident on highway',
        createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
        status: 'pending',
        distance: Math.random() * 15, // km
      },
    ]

    res.json({ success: true, data: mockAlerts })
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to get nearby alerts' })
  }
})

module.exports = router
