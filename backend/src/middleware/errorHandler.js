const logger = require('../utils/logger')

const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Generate error ID for tracking
  const errorId = Math.random().toString(36).substr(2, 9)
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Enhanced error logging with context
  logger.error(`🚨 Error [${errorId}] ${err.name}: ${err.message}`, {
    errorId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    stack: err.stack,
  })

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = isDevelopment
      ? `Invalid ID format: ${err.value}`
      : 'Resource not found'
    error = { message, statusCode: 404 }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0]
    const message = isDevelopment
      ? `Duplicate value for field '${field}': ${err.keyValue?.[field]}`
      : 'Duplicate field value entered'
    error = { message, statusCode: 400 }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message)
    error = { message: messages, statusCode: 400 }
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map((e) => `${e.path}: ${e.message}`).join(', ')
    error = { message, statusCode: 400 }
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path
    const message = isDevelopment
      ? `Duplicate value for field '${field}'`
      : 'Duplicate field value entered'
    error = { message, statusCode: 400 }
  }

  // Sequelize connection error
  if (err.name === 'SequelizeConnectionError') {
    const message = isDevelopment
      ? `Database connection failed: ${err.message}`
      : 'Database service unavailable'
    error = { message, statusCode: 503 }
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = isDevelopment
      ? `JWT Error: ${err.message}`
      : 'Invalid token'
    error = { message, statusCode: 401 }
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired - please log in again'
    error = { message, statusCode: 401 }
  }

  // Rate limiting error
  if (err.statusCode === 429) {
    const message = 'Too many requests - please try again later'
    error = { message, statusCode: 429 }
  }

  // Firebase/External service errors
  if (err.code && typeof err.code === 'string') {
    if (err.code.includes('firebase') || err.code.includes('auth')) {
      const message = isDevelopment
        ? `External service error: ${err.message}`
        : 'External service temporarily unavailable'
      error = { message, statusCode: 502 }
    }
  }

  // Prepare response
  const response = {
    success: false,
    error: error.message || 'Internal server error',
    errorId,
    timestamp: new Date().toISOString(),
  }

  // Add development-specific details
  if (isDevelopment) {
    response.details = {
      name: err.name,
      stack: err.stack,
      path: req.path,
      method: req.method,
    }
  }

  // Log response for monitoring
  logger.info(
    `📤 Error Response [${errorId}]: ${error.statusCode || 500} - ${error.message}`
  )

  res.status(error.statusCode || 500).json(response)
}

module.exports = errorHandler
