const express = require('express')
const { body, validationResult } = require('express-validator')
const sosService = require('../services/sosService')
const weatherService = require('../services/weatherService')
const { validateCoordinates } = require('../utils/geolocation')

const router = express.Router()

// In-memory store for dev/offline mode to satisfy frontend interactions
const IN_MEMORY = {
  alerts: [],
}

/**
 * @route   POST /api/sos/alert
 * @desc    Create a new SOS alert
 * @access  Private (User)
 */
const createAlertValidators = [
  body('location.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude required'),
  body('location.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude required'),
  body('emergencyType')
    .optional()
    .isIn([
      'medical',
      'fire',
      'police',
      'natural_disaster',
      'accident',
      'other',
    ]),
  body('description').optional().isLength({ max: 500 }),
]

async function handleCreateAlert(req, res) {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      })
    }

    // Support both {location:{latitude,longitude}} and flat {latitude, longitude}
    let {
      location,
      emergencyType,
      description,
      latitude,
      longitude,
      emergency_type,
      additional_info,
    } = req.body
    if (!location && latitude != null && longitude != null) {
      location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      }
    }
    if (!emergencyType && emergency_type) emergencyType = emergency_type
    if (!description && additional_info) description = additional_info
    const userId = req.user?.id || 'dev-user' // auth middleware sets req.user in real env

    // Validate coordinates
    const coordValidation = validateCoordinates(
      location.latitude,
      location.longitude
    )
    if (!coordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: coordValidation.message,
      })
    }

    let result
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      const id = `${Date.now()}`
      const alert = {
        id,
        userId,
        location,
        emergencyType: emergencyType || 'other',
        description: description || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      IN_MEMORY.alerts.unshift(alert)
      result = { alert, nearestAgents: [] }
    } else {
      result = await sosService.createSosAlert(
        userId,
        location,
        emergencyType,
        description
      )
    }

    // Emit real-time event to connected agents
    const io = req.app.get('io')
    io &&
      io.to('agents').emit('new-sos-alert', {
        alert: result.alert,
        nearestAgents: result.nearestAgents || [],
      })

    res.status(201).json({
      success: true,
      message: 'SOS alert created successfully',
      data: result,
      alert: result.alert,
    })
  } catch (error) {
    console.error('Error creating SOS alert:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create SOS alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}

// Primary create route
router.post('/alert', createAlertValidators, handleCreateAlert)
// Alias to match some frontends expecting /api/sos/create
router.post('/create', createAlertValidators, handleCreateAlert)

/**
 * @route   POST /api/sos/:sosId/assign
 * @desc    Assign agent to SOS alert
 * @access  Private (Agent)
 */
router.post('/:sosId/assign', async (req, res) => {
  try {
    const { sosId } = req.params
    const agentId = req.user?.id || 'dev-agent'

    let result
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      const idx = IN_MEMORY.alerts.findIndex((a) => a.id === sosId)
      if (idx < 0)
        return res.status(404).json({ success: false, message: 'Not found' })
      IN_MEMORY.alerts[idx].agentId = agentId
      IN_MEMORY.alerts[idx].status = 'assigned'
      result = {
        sosAlert: IN_MEMORY.alerts[idx],
        agent: { id: agentId, name: 'Dev Agent' },
        estimatedArrival: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }
    } else {
      result = await sosService.assignAgentToSos(sosId, agentId)
    }

    // Emit real-time event to user (both hyphen and underscore for compatibility)
    const io = req.app.get('io')
    const payload = {
      sosAlert: result.sosAlert,
      agent: result.agent,
      eta: result.estimatedArrival,
    }
    io &&
      io.to(`user-${result.sosAlert.userId}`).emit('agent-assigned', payload)
    io &&
      io.to(`user-${result.sosAlert.userId}`).emit('agent_assigned', payload)

    // Notify other agents that this SOS is no longer available
    io && io.to('agents').emit('sos-assigned', { sosId })

    res.json({
      success: true,
      message: 'Agent assigned successfully',
      data: result,
    })
  } catch (error) {
    console.error('Error assigning agent to SOS:', error)
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
})

/**
 * @route   PUT /api/sos/:sosId/status
 * @desc    Update SOS alert status
 * @access  Private (Agent)
 */
router.put(
  '/:sosId/status',
  [
    body('status')
      .isIn(['assigned', 'en_route', 'arrived', 'completed'])
      .withMessage('Valid status required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        })
      }

      const { sosId } = req.params
      const { status } = req.body
      const agentId = req.user?.id || 'dev-agent'

      let sosAlert
      if (process.env.ALLOW_DB_OFFLINE === 'true') {
        const idx = IN_MEMORY.alerts.findIndex((a) => a.id === sosId)
        if (idx < 0)
          return res.status(404).json({ success: false, message: 'Not found' })
        IN_MEMORY.alerts[idx].status = status
        sosAlert = IN_MEMORY.alerts[idx]
      } else {
        sosAlert = await sosService.updateSosStatus(sosId, status, agentId)
      }

      // Emit real-time event to user (status updates)
      const io = req.app.get('io')
      const statusPayload = {
        sosId,
        status,
        timestamp: new Date().toISOString(),
      }
      io &&
        io.to(`user-${sosAlert.userId}`).emit('status-update', statusPayload)
      io &&
        io.to(`user-${sosAlert.userId}`).emit('status_update', statusPayload)
      if (status === 'arrived') {
        io && io.to(`user-${sosAlert.userId}`).emit('agent_arrived', { sosId })
      }
      if (status === 'completed') {
        io &&
          io.to(`user-${sosAlert.userId}`).emit('rescue_completed', { sosId })
      }

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: sosAlert,
      })
    } catch (error) {
      console.error('Error updating SOS status:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  }
)

// Confirm agent arrival (alias for setting status)
router.post('/:sosId/confirm-arrival', async (req, res) => {
  try {
    const { sosId } = req.params
    let sosAlert
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      const idx = IN_MEMORY.alerts.findIndex((a) => a.id === sosId)
      if (idx < 0)
        return res.status(404).json({ success: false, message: 'Not found' })
      IN_MEMORY.alerts[idx].status = 'arrived'
      sosAlert = IN_MEMORY.alerts[idx]
    } else {
      sosAlert = await sosService.updateSosStatus(
        sosId,
        'arrived',
        req.user?.id || 'dev-agent'
      )
    }

    const io = req.app.get('io')
    io &&
      io.to(`user-${sosAlert.userId}`).emit('status-update', {
        sosId,
        status: 'arrived',
        timestamp: new Date().toISOString(),
      })
    res.json({ success: true, data: sosAlert })
  } catch (error) {
    console.error('Error confirming arrival:', error)
    res.status(400).json({ success: false, message: error.message })
  }
})

/**
 * @route   DELETE /api/sos/:sosId
 * @desc    Cancel SOS alert
 * @access  Private (User)
 */
async function handleCancel(req, res) {
  try {
    const { sosId } = req.params
    const userId = req.user?.id || 'dev-user'

    let sosAlert
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      const idx = IN_MEMORY.alerts.findIndex(
        (a) => a.id === sosId && a.userId === userId
      )
      if (idx < 0)
        return res.status(404).json({ success: false, message: 'Not found' })
      IN_MEMORY.alerts[idx].status = 'cancelled'
      sosAlert = IN_MEMORY.alerts[idx]
    } else {
      sosAlert = await sosService.cancelSosAlert(sosId, userId)
    }

    // Emit real-time event to assigned agent if any
    const io = req.app.get('io')
    if (io && sosAlert.agentId) {
      io.to(`agent-${sosAlert.agentId}`).emit('sos-cancelled', { sosId })
    }

    res.json({
      success: true,
      message: 'SOS alert cancelled successfully',
      data: sosAlert,
    })
  } catch (error) {
    console.error('Error cancelling SOS alert:', error)
    res.status(400).json({ success: false, message: error.message })
  }
}

// Primary cancel route
router.delete('/:sosId', handleCancel)
// Alias to match frontends that POST to cancel
router.post('/:sosId/cancel', handleCancel)

// Get SOS history for current user (alias expected by frontend)
router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id || 'dev-user'
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      const alerts = IN_MEMORY.alerts.filter((a) => a.userId === userId)
      return res.json({ success: true, alerts })
    }
    const alerts = await sosService.getUserActiveSosAlerts(userId)
    res.json({ success: true, alerts })
  } catch (error) {
    console.error('Error getting SOS history:', error)
    res.status(500).json({ success: false, message: 'Failed to get history' })
  }
})

/**
 * @route   GET /api/sos/:sosId
 * @desc    Get SOS alert details
 * @access  Private
 */
router.get('/:sosId', async (req, res) => {
  try {
    const { sosId } = req.params
    const userId = req.user?.id
    const userType = req.user?.type // 'user', 'agent', or 'admin'

    let sosAlert
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      sosAlert = IN_MEMORY.alerts.find((a) => a.id === sosId)
    } else {
      sosAlert = await sosService.getSosAlert(sosId)
    }

    if (!sosAlert) {
      return res
        .status(404)
        .json({ success: false, message: 'SOS alert not found' })
    }

    // Check if user has permission to view this SOS alert
    if (userType === 'user' && userId && sosAlert.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    } else if (userType === 'agent' && userId && sosAlert.agentId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    res.json({ success: true, data: sosAlert })
  } catch (error) {
    console.error('Error getting SOS alert:', error)
    res.status(500).json({ success: false, message: 'Failed to get SOS alert' })
  }
})

/**
 * @route   GET /api/sos/user/active
 * @desc    Get user's active SOS alerts
 * @access  Private (User)
 */
router.get('/user/active', async (req, res) => {
  try {
    const userId = req.user?.id || 'dev-user'
    let alerts
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      alerts = IN_MEMORY.alerts.filter(
        (a) =>
          a.userId === userId && !['cancelled', 'completed'].includes(a.status)
      )
    } else {
      alerts = await sosService.getUserActiveSosAlerts(userId)
    }

    res.json({
      success: true,
      data: alerts,
    })
  } catch (error) {
    console.error('Error getting user active SOS alerts:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get active SOS alerts',
    })
  }
})

/**
 * @route   GET /api/sos/agent/assigned
 * @desc    Get agent's assigned SOS alerts
 * @access  Private (Agent)
 */
router.get('/agent/assigned', async (req, res) => {
  try {
    const agentId = req.user?.id || 'dev-agent'
    let alerts
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      alerts = IN_MEMORY.alerts.filter(
        (a) => a.agentId === agentId && a.status !== 'completed'
      )
    } else {
      alerts = await sosService.getAgentAssignedSosAlerts(agentId)
    }

    res.json({
      success: true,
      data: alerts,
    })
  } catch (error) {
    console.error('Error getting agent assigned SOS alerts:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get assigned SOS alerts',
    })
  }
})

/**
 * @route   GET /api/sos/agents/nearby
 * @desc    Find nearby available agents
 * @access  Private (for testing/admin)
 */
router.get('/agents/nearby', async (req, res) => {
  try {
    const { latitude, longitude, emergencyType, maxDistance } = req.query
    let agents = []
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      agents = [] // no-op in offline mode
    } else {
      agents = await sosService.findNearestAgents(
        parseFloat(latitude),
        parseFloat(longitude),
        emergencyType,
        maxDistance ? parseInt(maxDistance) : 50
      )
    }

    res.json({ success: true, data: agents })
  } catch (error) {
    console.error('Error finding nearby agents:', error)
    res
      .status(500)
      .json({ success: false, message: 'Failed to find nearby agents' })
  }
})

module.exports = router
