const admin = require('firebase-admin')
const twilio = require('twilio')
const logger = require('../utils/logger')

class NotificationService {
  constructor() {
    this.firebaseReady = false
    this.twilioReady = false
    this.smsEnabled = process.env.NOTIFICATIONS_SMS_ENABLED === 'true'
    this.initializeFirebase()
    if (this.smsEnabled) {
      this.initializeTwilio()
    } else {
      logger.info(
        'SMS notifications disabled by config (NOTIFICATIONS_SMS_ENABLED=false). Using in-app notifications only.'
      )
    }
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      // Skip Firebase initialization in development if no credentials are provided
      const isDevelopment =
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test'

      // Accept multiple credential formats (JSON string, base64 JSON, raw key triplet)
      const hasTriplet = !!(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      )

      const b64Json =
        process.env.FIREBASE_CREDENTIALS_BASE64 ||
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
      const jsonString =
        process.env.FIREBASE_CREDENTIALS_JSON ||
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      const gcloudCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

      // In development, gracefully handle missing Firebase config
      if (
        isDevelopment &&
        !gcloudCredPath &&
        !jsonString &&
        !b64Json &&
        !hasTriplet
      ) {
        logger.info(
          '🔥 Firebase credentials not configured - running in development mode without push notifications'
        )
        this.firebaseReady = false
        return
      }

      let credentials = null

      // Prefer explicit JSON (base64 or plain)
      if (b64Json) {
        try {
          const decoded = Buffer.from(b64Json, 'base64').toString('utf8')
          credentials = JSON.parse(decoded)
        } catch (e) {
          logger.warn(
            'Failed to decode base64 Firebase credentials; falling back to env triplet if available'
          )
        }
      } else if (jsonString) {
        try {
          credentials = JSON.parse(jsonString)
        } catch (e) {
          logger.warn(
            'Failed to parse JSON Firebase credentials; falling back to env triplet if available'
          )
        }
      }

      if (!credentials && hasTriplet) {
        credentials = this.parseFirebaseCredentials()
      }

      if (!admin.apps.length && credentials) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert(credentials),
            projectId: credentials.projectId || process.env.FIREBASE_PROJECT_ID,
          })
          this.firebaseReady = true
          logger.info('🔥 Firebase Admin SDK initialized successfully')
        } catch (initErr) {
          this.firebaseReady = false
          if (isDevelopment) {
            logger.info(
              '🔥 Firebase initialization failed in development mode - continuing without push notifications'
            )
          } else {
            logger.error(
              '🔥 Firebase Admin SDK initialization failed:',
              initErr.message
            )
          }
        }
      } else if (!credentials) {
        if (gcloudCredPath) {
          logger.warn(
            'GOOGLE_APPLICATION_CREDENTIALS set but credentials not loaded - check file path and format'
          )
        } else if (isDevelopment) {
          logger.info(
            '🔥 Firebase credentials not configured - running in development mode'
          )
        } else {
          logger.warn(
            '🔥 Firebase credentials not found - push notifications disabled'
          )
        }
        this.firebaseReady = false
      }
    } catch (error) {
      this.firebaseReady = false
      const isDevelopment =
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test'
      if (isDevelopment) {
        logger.info(
          '🔥 Firebase initialization skipped in development mode:',
          error.message
        )
      } else {
        logger.error(
          '🔥 Firebase Admin init error; push disabled. Details:',
          error.message
        )
      }
    }
  }

  /**
   * Parse Firebase credentials from individual environment variables
   */
  parseFirebaseCredentials() {
    try {
      // Normalize private key: handle quoted strings and escaped newlines
      let rawKey = process.env.FIREBASE_PRIVATE_KEY
      if (!rawKey) {
        throw new Error('FIREBASE_PRIVATE_KEY empty')
      }

      // Trim enclosing quotes if present
      if (
        (rawKey.startsWith('"') && rawKey.endsWith('"')) ||
        (rawKey.startsWith("'") && rawKey.endsWith("'"))
      ) {
        rawKey = rawKey.slice(1, -1)
      }

      let normalizedKey = rawKey.replace(/\\n/g, '\n')

      // Ensure proper header/footer line breaks
      if (
        normalizedKey.includes('BEGIN PRIVATE KEY') &&
        !/\n-----END PRIVATE KEY-----\n?$/.test(normalizedKey)
      ) {
        normalizedKey = normalizedKey.replace(
          /-END PRIVATE KEY-\s*$/,
          '-----END PRIVATE KEY-----\n'
        )
      }

      return {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizedKey,
      }
    } catch (error) {
      logger.warn(
        '🔥 Failed to parse Firebase credentials from environment variables:',
        error.message
      )
      return null
    }
  }

  /**
   * Initialize Twilio client
   */
  initializeTwilio() {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID
      const token = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_PHONE_NUMBER
      if (sid && token && from && sid.startsWith('AC')) {
        this.twilioClient = twilio(sid, token)
        this.twilioReady = true
        logger.info('Twilio client initialized')
      } else {
        // Provide a mock client so calls no-op in development
        this.twilioReady = false
        this.twilioClient = {
          messages: {
            create: async ({ to, from, body }) => {
              logger.warn(
                `Twilio mock: SMS to ${to} from ${from || 'unset'} would be sent with body: ${body}`
              )
              return {
                sid: 'SM-MOCK-' + Date.now(),
                to,
                from,
                body,
                mock: true,
              }
            },
          },
        }
        logger.warn(
          'Twilio credentials invalid or missing. Using mock SMS sender in development. No real SMS will be sent.'
        )
      }
    } catch (error) {
      this.twilioReady = false
      logger.error('Error initializing Twilio client:', error)
    }
  }

  /**
   * Send push notification to a single user
   */
  async sendPushNotification(fcmToken, title, body, data = {}) {
    if (!this.firebaseReady) {
      logger.warn('Firebase not configured; skipping push notification')
      return { skipped: true }
    }
    try {
      const message = {
        token: fcmToken,
        notification: { title, body },
        data: { ...data, timestamp: new Date().toISOString() },
      }
      const response = await admin.messaging().send(message)
      logger.info(`Push notification sent successfully: ${response}`)
      return response
    } catch (error) {
      logger.error('Error sending push notification:', error)
      throw error
    }
  }

  /**
   * Send push notifications to multiple users
   */
  async sendMulticastPushNotification(fcmTokens, title, body, data = {}) {
    if (!this.firebaseReady) {
      logger.warn('Firebase not configured; skipping multicast push')
      return { skipped: true }
    }
    try {
      const message = {
        tokens: fcmTokens,
        notification: { title, body },
        data: { ...data, timestamp: new Date().toISOString() },
      }
      const response = await admin.messaging().sendEachForMulticast(message)
      logger.info(
        `Multicast notification sent to ${fcmTokens.length} devices. Success: ${response.successCount}, Failure: ${response.failureCount}`
      )
      return response
    } catch (error) {
      logger.error('Error sending multicast push notification:', error)
      throw error
    }
  }

  /**
   * Send SMS notification
   */
  async sendSmsNotification(phoneNumber, message) {
    if (!this.smsEnabled) {
      // Hard-disable SMS per configuration
      return { skipped: true, reason: 'sms_disabled' }
    }
    if (!this.twilioReady) {
      logger.warn('Twilio not configured; skipping SMS')
      return { skipped: true }
    }
    try {
      const sms = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      })
      logger.info(`SMS sent successfully: ${sms.sid}`)
      return sms
    } catch (error) {
      logger.error('Error sending SMS:', error)
      throw error
    }
  }

  /**
   * Notify user that SOS alert was received
   */
  async notifyUserSosReceived(user, sosAlert) {
    try {
      const title = '🚨 SOS Alert Received'
      const body =
        'Your emergency alert has been received. Help is being dispatched.'

      const data = {
        type: 'sos_received',
        sosId: sosAlert.id,
        priority: sosAlert.priority,
      }

      // Send push notification if FCM token available
      if (user.fcmToken) {
        await this.sendPushNotification(user.fcmToken, title, body, data)
      }
      // SMS disabled by default; keep code path gated by config if needed in future
      if (this.smsEnabled) {
        const smsMessage = `CrisisLink: Your emergency alert has been received at ${sosAlert.address}. Help is being dispatched. Alert ID: ${sosAlert.id.slice(0, 8)}`
        await this.sendSmsNotification(user.phoneNumber, smsMessage)
      }
    } catch (error) {
      logger.error('Error notifying user about SOS received:', error)
    }
  }

  /**
   * Notify user about agent assignment
   */
  async notifyUserAgentAssigned(user, sosAlert, agent) {
    try {
      const title = '✅ Help is on the way!'
      const body = `${agent.firstName} ${agent.lastName} is responding to your emergency. ETA: ${sosAlert.estimatedArrival ? new Date(sosAlert.estimatedArrival).toLocaleTimeString() : 'TBD'}`

      const data = {
        type: 'agent_assigned',
        sosId: sosAlert.id,
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        vehiclePlate: agent.vehiclePlate,
        eta: sosAlert.estimatedArrival,
      }

      // Send push notification
      if (user.fcmToken) {
        await this.sendPushNotification(user.fcmToken, title, body, data)
      }
      // Optional SMS (disabled by default)
      if (this.smsEnabled) {
        const smsMessage = `CrisisLink: ${agent.firstName} ${agent.lastName} (Badge: ${agent.badgeNumber}, Vehicle: ${agent.vehiclePlate}) is responding to your emergency. ETA: ${sosAlert.estimatedArrival ? new Date(sosAlert.estimatedArrival).toLocaleTimeString() : 'TBD'}`
        await this.sendSmsNotification(user.phoneNumber, smsMessage)
      }
    } catch (error) {
      logger.error('Error notifying user about agent assignment:', error)
    }
  }

  /**
   * Notify user about status updates
   */
  async notifyUserStatusUpdate(user, sosAlert, agent) {
    try {
      let title, body

      switch (sosAlert.status) {
        case 'en_route':
          title = '🚗 Agent En Route'
          body = `${agent.firstName} ${agent.lastName} is on the way to your location.`
          break
        case 'arrived':
          title = '📍 Agent Arrived'
          body = `${agent.firstName} ${agent.lastName} has arrived at your location.`
          break
        case 'completed':
          title = '✅ Emergency Resolved'
          body = 'Your emergency has been resolved. Stay safe!'
          break
        default:
          return // Don't send notification for other statuses
      }

      const data = {
        type: 'status_update',
        sosId: sosAlert.id,
        status: sosAlert.status,
        agentId: agent.id,
      }

      // Send push notification
      if (user.fcmToken) {
        await this.sendPushNotification(user.fcmToken, title, body, data)
      }

      // Optional SMS for critical updates (disabled by default)
      if (
        this.smsEnabled &&
        ['arrived', 'completed'].includes(sosAlert.status)
      ) {
        const smsMessage = `CrisisLink: ${body} Alert ID: ${sosAlert.id.slice(0, 8)}`
        await this.sendSmsNotification(user.phoneNumber, smsMessage)
      }
    } catch (error) {
      logger.error('Error notifying user about status update:', error)
    }
  }

  /**
   * Notify agents about new SOS alert
   */
  async notifyAgentsOfSos(agents, sosAlert) {
    try {
      const title = '🚨 New Emergency Alert'
      const body = `Emergency in ${sosAlert.address}. Type: ${sosAlert.emergencyType}. Priority: ${sosAlert.priority}`

      const data = {
        type: 'new_sos',
        sosId: sosAlert.id,
        location: JSON.stringify(sosAlert.location),
        address: sosAlert.address,
        emergencyType: sosAlert.emergencyType,
        priority: sosAlert.priority,
      }

      const fcmTokens = agents
        .filter((agent) => agent.fcmToken)
        .map((agent) => agent.fcmToken)

      if (fcmTokens.length > 0) {
        await this.sendMulticastPushNotification(fcmTokens, title, body, data)
      }

      // Optional SMS to agents for critical alerts (disabled by default)
      if (this.smsEnabled && sosAlert.priority === 'critical') {
        for (const agent of agents) {
          const smsMessage = `CrisisLink: CRITICAL emergency alert in ${sosAlert.address}. Type: ${sosAlert.emergencyType}. Respond via app. Alert ID: ${sosAlert.id.slice(0, 8)}`
          await this.sendSmsNotification(agent.phoneNumber, smsMessage)
        }
      }
    } catch (error) {
      logger.error('Error notifying agents about SOS:', error)
    }
  }

  /**
   * Notify agents that SOS has been assigned
   */
  async notifyAgentsSosAssigned(sosId) {
    try {
      // This would typically be sent via WebSocket to all agents
      // For now, we'll log it
      logger.info(`SOS ${sosId} has been assigned - notifying agents`)
    } catch (error) {
      logger.error('Error notifying agents about SOS assignment:', error)
    }
  }

  /**
   * Notify agent about SOS cancellation
   */
  async notifyAgentSosCancelled(agent, sosAlert) {
    try {
      const title = '❌ Emergency Cancelled'
      const body = `Emergency alert in ${sosAlert.address} has been cancelled by the user.`

      const data = {
        type: 'sos_cancelled',
        sosId: sosAlert.id,
      }

      if (agent.fcmToken) {
        await this.sendPushNotification(agent.fcmToken, title, body, data)
      }
    } catch (error) {
      logger.error('Error notifying agent about SOS cancellation:', error)
    }
  }

  /**
   * Notify users about weather alerts
   */
  async notifyUsersWeatherAlert(users, weatherAlert) {
    try {
      const title = `⚠️ ${weatherAlert.title}`
      const body = `${weatherAlert.description} in ${weatherAlert.city}. Stay safe!`

      const data = {
        type: 'weather_alert',
        alertId: weatherAlert.id,
        alertType: weatherAlert.alertType,
        severity: weatherAlert.severity,
        city: weatherAlert.city,
        province: weatherAlert.province,
      }

      const fcmTokens = users
        .filter((user) => user.fcmToken)
        .map((user) => user.fcmToken)

      if (fcmTokens.length > 0) {
        await this.sendMulticastPushNotification(fcmTokens, title, body, data)
      }

      // Optional SMS for extreme weather alerts (disabled by default)
      if (this.smsEnabled && weatherAlert.severity === 'extreme') {
        for (const user of users.slice(0, 50)) {
          const smsMessage = `CrisisLink: ${weatherAlert.title} - ${weatherAlert.description} in ${weatherAlert.city}. Take immediate precautions!`
          await this.sendSmsNotification(user.phoneNumber, smsMessage)
        }
      }
    } catch (error) {
      logger.error('Error notifying users about weather alert:', error)
    }
  }

  /**
   * Notify admin about no available agents
   */
  async notifyAdminNoAgentsAvailable(sosAlert) {
    try {
      logger.warn(
        `No agents available for SOS alert ${sosAlert.id} in ${sosAlert.address}`
      )

      // This would typically send to admin dashboard or admin phone numbers
      // For now, we'll just log it prominently
      logger.error(
        `🚨 ADMIN ALERT: No agents available for emergency in ${sosAlert.address}. Priority: ${sosAlert.priority}`
      )
    } catch (error) {
      logger.error('Error notifying admin about no available agents:', error)
    }
  }

  /**
   * Test notification functionality
   */
  async testNotification(fcmToken, phoneNumber) {
    try {
      const title = '🧪 CrisisLink Test'
      const body =
        'This is a test notification from CrisisLink emergency system.'

      const results = {}

      // Test push notification
      if (fcmToken) {
        try {
          results.pushNotification = await this.sendPushNotification(
            fcmToken,
            title,
            body,
            { type: 'test' }
          )
        } catch (error) {
          results.pushNotificationError = error.message
        }
      }

      // Test SMS (only if explicitly enabled)
      if (this.smsEnabled && phoneNumber) {
        try {
          results.sms = await this.sendSmsNotification(
            phoneNumber,
            'CrisisLink test SMS - system is working correctly.'
          )
        } catch (error) {
          results.smsError = error.message
        }
      }

      return results
    } catch (error) {
      logger.error('Error testing notifications:', error)
      throw error
    }
  }
}

module.exports = new NotificationService()
