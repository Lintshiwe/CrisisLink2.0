const express = require('express')
const router = express.Router()
const ambeeService = require('../services/ambeeService')
const logger = require('../utils/logger')

/**
 * GET /api/disasters/summary
 * Get disaster monitoring summary
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = ambeeService.getDisasterSummary()
    res.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    logger.error('Error getting disaster summary:', error)
    res.status(500).json({
      error: 'Failed to get disaster summary',
      message: error.message,
    })
  }
})

/**
 * GET /api/disasters/area
 * Get disasters for a specific area
 */
router.get('/area', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'lat and lng are required',
      })
    }

    const disasters = await ambeeService.getDisastersForArea(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseInt(radius) : 50
    )

    res.json({
      success: true,
      data: disasters,
    })
  } catch (error) {
    logger.error('Error getting disasters for area:', error)
    res.status(500).json({
      error: 'Failed to get disasters for area',
      message: error.message,
    })
  }
})

/**
 * POST /api/disasters/test
 * Test Ambee API connection
 */
router.post('/test', async (req, res) => {
  try {
    const testResult = await ambeeService.testConnection()
    res.json({
      success: testResult.success,
      data: testResult.data,
      error: testResult.error,
    })
  } catch (error) {
    logger.error('Error testing Ambee connection:', error)
    res.status(500).json({
      error: 'Failed to test connection',
      message: error.message,
    })
  }
})

/**
 * POST /api/disasters/scan
 * Manually trigger disaster scan
 */
router.post('/scan', async (req, res) => {
  try {
    await ambeeService.scanForDisaster()
    const summary = ambeeService.getDisasterSummary()

    res.json({
      success: true,
      message: 'Disaster scan completed',
      data: summary,
    })
  } catch (error) {
    logger.error('Error triggering disaster scan:', error)
    res.status(500).json({
      error: 'Failed to trigger disaster scan',
      message: error.message,
    })
  }
})

module.exports = router
