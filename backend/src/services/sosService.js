const { SosAlert, User, Agent } = require('../models/mongooseIndex')
const logger = require('../utils/logger')
const { calculateDistance, reverseGeocode } = require('../utils/geolocation')
const weatherService = require('./weatherService')
const notificationService = require('./notificationService')

class SosService {
  /**
   * Create a new SOS alert
   */
  async createSosAlert(
    userId,
    location,
    emergencyType = 'other',
    description = ''
  ) {
    const transaction = await sequelize.transaction()

    try {
      // Get user information
      const user = await User.findByPk(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Reverse geocode location to get address
      const address = await reverseGeocode(
        location.latitude,
        location.longitude
      )

      // Get current weather conditions
      const weatherConditions = await weatherService.getCurrentWeather(
        location.latitude,
        location.longitude
      )

      // Determine priority based on weather conditions and emergency type
      const priority = this.determinePriority(emergencyType, weatherConditions)

      // Create SOS alert
      const sosAlert = await SosAlert.create(
        {
          userId,
          location: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
          address,
          emergencyType,
          priority,
          description,
          weatherConditions,
        },
        { transaction }
      )

      // Find nearest available agents
      const nearestAgents = await this.findNearestAgents(
        location.latitude,
        location.longitude,
        emergencyType
      )

      if (nearestAgents.length === 0) {
        logger.warn(`No available agents found for SOS alert ${sosAlert.id}`)
        // Notify admin about lack of available agents
        await notificationService.notifyAdminNoAgentsAvailable(sosAlert)
      } else {
        // Notify nearest agents
        await notificationService.notifyAgentsOfSos(nearestAgents, sosAlert)
      }

      // Notify user that help is being dispatched
      await notificationService.notifyUserSosReceived(user, sosAlert)

      await transaction.commit()

      logger.info(`SOS alert created: ${sosAlert.id} for user ${userId}`)

      return {
        alert: sosAlert,
        nearestAgents: nearestAgents.slice(0, 3), // Return top 3 nearest agents
      }
    } catch (error) {
      await transaction.rollback()
      logger.error('Error creating SOS alert:', error)
      throw error
    }
  }

  /**
   * Assign an agent to a SOS alert
   */
  async assignAgentToSos(sosId, agentId) {
    const transaction = await sequelize.transaction()

    try {
      const sosAlert = await SosAlert.findByPk(sosId, { transaction })
      if (!sosAlert) {
        throw new Error('SOS alert not found')
      }

      if (sosAlert.status !== 'pending') {
        throw new Error('SOS alert is no longer available for assignment')
      }

      const agent = await Agent.findByPk(agentId, { transaction })
      if (!agent) {
        throw new Error('Agent not found')
      }

      if (agent.status !== 'available') {
        throw new Error('Agent is not available')
      }

      // Calculate ETA
      const agentLocation = agent.currentLocation
      const sosLocation = sosAlert.location

      const distance = calculateDistance(
        agentLocation.coordinates[1], // latitude
        agentLocation.coordinates[0], // longitude
        sosLocation.coordinates[1],
        sosLocation.coordinates[0]
      )

      const estimatedArrival = new Date()
      // Rough calculation: 40 km/h average speed in emergency conditions
      const etaMinutes = Math.ceil((distance / 40) * 60)
      estimatedArrival.setMinutes(estimatedArrival.getMinutes() + etaMinutes)

      // Update SOS alert
      await sosAlert.update(
        {
          agentId,
          status: 'assigned',
          estimatedArrival,
        },
        { transaction }
      )

      // Update agent status
      await agent.update(
        {
          status: 'busy',
        },
        { transaction }
      )

      // Get user for notification
      const user = await User.findByPk(sosAlert.userId)

      // Notify user about agent assignment
      await notificationService.notifyUserAgentAssigned(user, sosAlert, agent)

      // Notify other agents that this SOS is no longer available
      await notificationService.notifyAgentsSosAssigned(sosId)

      await transaction.commit()

      logger.info(`Agent ${agentId} assigned to SOS alert ${sosId}`)

      return {
        sosAlert,
        agent,
        estimatedArrival,
      }
    } catch (error) {
      await transaction.rollback()
      logger.error('Error assigning agent to SOS:', error)
      throw error
    }
  }

  /**
   * Update SOS alert status
   */
  async updateSosStatus(sosId, status, agentId) {
    try {
      const sosAlert = await SosAlert.findByPk(sosId)
      if (!sosAlert) {
        throw new Error('SOS alert not found')
      }

      if (sosAlert.agentId !== agentId) {
        throw new Error('Unauthorized to update this SOS alert')
      }

      const updateData = { status }

      if (status === 'arrived') {
        updateData.actualArrival = new Date()
      } else if (status === 'completed') {
        updateData.completedAt = new Date()

        // Update agent status back to available
        await Agent.update({ status: 'available' }, { where: { id: agentId } })
      }

      await sosAlert.update(updateData)

      // Get user for notification
      const user = await User.findByPk(sosAlert.userId)
      const agent = await Agent.findByPk(agentId)

      // Notify user about status update
      await notificationService.notifyUserStatusUpdate(user, sosAlert, agent)

      logger.info(`SOS alert ${sosId} status updated to ${status}`)

      return sosAlert
    } catch (error) {
      logger.error('Error updating SOS status:', error)
      throw error
    }
  }

  /**
   * Cancel SOS alert
   */
  async cancelSosAlert(sosId, userId) {
    try {
      const sosAlert = await SosAlert.findByPk(sosId)
      if (!sosAlert) {
        throw new Error('SOS alert not found')
      }

      if (sosAlert.userId !== userId) {
        throw new Error('Unauthorized to cancel this SOS alert')
      }

      if (['completed', 'cancelled'].includes(sosAlert.status)) {
        throw new Error('SOS alert cannot be cancelled')
      }

      await sosAlert.update({ status: 'cancelled' })

      // If agent was assigned, make them available again
      if (sosAlert.agentId) {
        await Agent.update(
          { status: 'available' },
          { where: { id: sosAlert.agentId } }
        )

        // Notify agent about cancellation
        const agent = await Agent.findByPk(sosAlert.agentId)
        await notificationService.notifyAgentSosCancelled(agent, sosAlert)
      }

      logger.info(`SOS alert ${sosId} cancelled by user ${userId}`)

      return sosAlert
    } catch (error) {
      logger.error('Error cancelling SOS alert:', error)
      throw error
    }
  }

  /**
   * Find nearest available agents
   */
  async findNearestAgents(
    latitude,
    longitude,
    emergencyType = null,
    maxDistance = 50
  ) {
    try {
      const point = `POINT(${longitude} ${latitude})`

      let whereClause = {
        status: 'available',
        isActive: true,
        currentLocation: {
          [Op.ne]: null,
        },
      }

      // If specific emergency type, prefer agents with that specialization
      if (emergencyType && emergencyType !== 'other') {
        whereClause = {
          ...whereClause,
          [Op.or]: [
            { specialization: emergencyType },
            { specialization: 'general' },
          ],
        }
      }

      const agents = await Agent.findAll({
        where: whereClause,
        attributes: [
          'id',
          'firstName',
          'lastName',
          'badgeNumber',
          'vehiclePlate',
          'vehicleType',
          'specialization',
          'rating',
          'currentLocation',
          [
            sequelize.fn(
              'ST_Distance',
              sequelize.fn('ST_GeomFromText', point, 4326),
              sequelize.col('current_location')
            ),
            'distance',
          ],
        ],
        having: sequelize.where(
          sequelize.fn(
            'ST_DWithin',
            sequelize.fn('ST_GeomFromText', point, 4326),
            sequelize.col('current_location'),
            maxDistance * 1000 // Convert km to meters
          ),
          true
        ),
        order: [[sequelize.col('distance'), 'ASC']],
        limit: 10,
      })

      return agents
    } catch (error) {
      logger.error('Error finding nearest agents:', error)
      throw error
    }
  }

  /**
   * Determine priority based on emergency type and weather conditions
   */
  determinePriority(emergencyType, weatherConditions) {
    let basePriority = 'medium'

    // Set base priority based on emergency type
    switch (emergencyType) {
      case 'medical':
        basePriority = 'critical'
        break
      case 'fire':
        basePriority = 'critical'
        break
      case 'accident':
        basePriority = 'high'
        break
      case 'natural_disaster':
        basePriority = 'critical'
        break
      case 'police':
        basePriority = 'high'
        break
      default:
        basePriority = 'medium'
    }

    // Escalate priority based on severe weather conditions
    if (
      weatherConditions &&
      weatherConditions.alerts &&
      weatherConditions.alerts.length > 0
    ) {
      const severeAlerts = weatherConditions.alerts.filter((alert) =>
        ['high', 'extreme'].includes(alert.severity)
      )

      if (severeAlerts.length > 0) {
        if (basePriority === 'medium') basePriority = 'high'
        if (basePriority === 'high') basePriority = 'critical'
      }
    }

    return basePriority
  }

  /**
   * Get SOS alert by ID
   */
  async getSosAlert(sosId) {
    try {
      const sosAlert = await SosAlert.findByPk(sosId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'phoneNumber'],
          },
          {
            model: Agent,
            as: 'agent',
            attributes: [
              'id',
              'firstName',
              'lastName',
              'badgeNumber',
              'vehiclePlate',
              'vehicleType',
              'currentLocation',
            ],
          },
        ],
      })

      return sosAlert
    } catch (error) {
      logger.error('Error getting SOS alert:', error)
      throw error
    }
  }

  /**
   * Get active SOS alerts for user
   */
  async getUserActiveSosAlerts(userId) {
    try {
      const alerts = await SosAlert.findAll({
        where: {
          userId,
          status: {
            [Op.in]: ['pending', 'assigned', 'en_route', 'arrived'],
          },
        },
        include: [
          {
            model: Agent,
            as: 'agent',
            attributes: [
              'id',
              'firstName',
              'lastName',
              'badgeNumber',
              'vehiclePlate',
              'vehicleType',
              'currentLocation',
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      })

      return alerts
    } catch (error) {
      logger.error('Error getting user active SOS alerts:', error)
      throw error
    }
  }

  /**
   * Get assigned SOS alerts for agent
   */
  async getAgentAssignedSosAlerts(agentId) {
    try {
      const alerts = await SosAlert.findAll({
        where: {
          agentId,
          status: {
            [Op.in]: ['assigned', 'en_route', 'arrived'],
          },
        },
        include: [
          {
            model: User,
            attributes: [
              'id',
              'firstName',
              'lastName',
              'phoneNumber',
              'emergencyContact',
              'bloodType',
              'medicalConditions',
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      })

      return alerts
    } catch (error) {
      logger.error('Error getting agent assigned SOS alerts:', error)
      throw error
    }
  }
}

module.exports = new SosService()
