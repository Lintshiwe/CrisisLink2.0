const mongoose = require('mongoose')
const logger = require('../utils/logger')

// MongoDB connection configuration
const mongoURL =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  'mongodb://localhost:27017/crisislink_db'

const connectDB = async () => {
  try {
    // Configure mongoose options
    const options = {
      maxPoolSize: 10, // Maximum number of connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    }

    // Connect to MongoDB
    await mongoose.connect(mongoURL, options)

    logger.info('✅ Database connected successfully (MongoDB)')
    logger.info(`🔗 Connected to: ${mongoURL.replace(/:[^@]*@/, ':***@')}`) // Hide password in logs

    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      logger.debug('MongoDB connection established')
    })

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost')
    })
  } catch (error) {
    handleConnectionFailure(error)
  }
}

const handleConnectionFailure = (error) => {
  const nonFatal =
    process.env.ALLOW_DB_OFFLINE === 'true' ||
    process.env.NODE_ENV !== 'production'

  if (nonFatal) {
    logger.warn(
      `Database connection failed: ${error?.message || 'connection refused'}. Continuing without database. Set ALLOW_DB_OFFLINE=false to enforce strict startup.`
    )
  } else {
    logger.error('❌ Unable to connect to MongoDB:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close()
    logger.info('MongoDB connection closed through app termination')
    process.exit(0)
  } catch (error) {
    logger.error('Error during database shutdown:', error)
    process.exit(1)
  }
})

module.exports = { mongoose, connectDB }
