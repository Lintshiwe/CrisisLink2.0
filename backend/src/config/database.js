const { Sequelize } = require('sequelize')
const logger = require('../utils/logger')

const sequelize = new Sequelize(
  process.env.DB_NAME || 'crisislink_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? logger.debug : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
    },
  }
)

const connectDB = async () => {
  try {
    await sequelize.authenticate()
    logger.info('✅ Database connected successfully')

    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true })
      logger.info('🔄 Database models synchronized')
    }
  } catch (error) {
    const nonFatal =
      process.env.ALLOW_DB_OFFLINE === 'true' ||
      process.env.NODE_ENV !== 'production'
    if (nonFatal) {
      logger.warn(
        `Database connection failed: ${error?.message || 'connection refused'}. Continuing without database. Set ALLOW_DB_OFFLINE=false to enforce strict startup.`
      )
    } else {
      logger.error('❌ Unable to connect to database:', error)
      process.exit(1)
    }
  }
}

module.exports = { sequelize, connectDB }
