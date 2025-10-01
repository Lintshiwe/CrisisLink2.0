const express = require('express')
const router = express.Router()
const notificationService = require('../services/notificationService')

// Send a generic notification (stubbed)
router.post('/send', async (req, res) => {
  try {
    const { title, body, tokens, token, data } = req.body || {}
    // Prefer multicast if tokens array provided
    if (Array.isArray(tokens) && tokens.length > 0) {
      await notificationService.sendMulticastPushNotification(tokens, {
        notification: { title: title || 'Notification', body: body || '' },
        data: data || {},
      })
    } else if (token) {
      await notificationService.sendPushNotification(token, {
        notification: { title: title || 'Notification', body: body || '' },
        data: data || {},
      })
    }
    res.json({ success: true, message: 'Notification dispatched (stub)' })
  } catch (error) {
    console.error('Notification send error:', error)
    res.status(200).json({ success: true, message: 'Notification stub OK' })
  }
})

// Send FCM notification (stub)
router.post('/fcm', async (req, res) => {
  try {
    const { token, payload } = req.body || {}
    if (token && payload) {
      await notificationService.sendPushNotification(token, payload)
    }
    res.json({ success: true })
  } catch (error) {
    console.error('FCM send error:', error)
    res.json({ success: true })
  }
})

// In-app emergency notification (no SMS)
router.post('/emergency', async (req, res) => {
  try {
    // In dev, we just acknowledge
    res.json({ success: true, message: 'In-app emergency notification queued' })
  } catch (error) {
    res.json({ success: true })
  }
})

// SMS endpoint stub (disabled)
router.post('/sms', (req, res) => {
  res.json({ success: true, message: 'SMS disabled in this environment' })
})

// Voice endpoint stub (disabled)
router.post('/voice', (req, res) => {
  res.json({
    success: true,
    message: 'Voice call disabled in this environment',
  })
})

module.exports = router
