// Lightweight database wrapper with graceful fallback for local dev
const { Pool } = require('pg')
const logger = require('./logger')

let pool = null
let offlineMode = false

function getConfig() {
  return {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'crisislink',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  }
}

function initPool() {
  if (pool) return pool
  try {
    const config = getConfig()
    // Allow offline mode to skip DB connection for local dev or CI
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      offlineMode = true
      logger.warn(
        'Database offline mode enabled (ALLOW_DB_OFFLINE=true). Queries will be mocked.'
      )
      return null
    }
    pool = new Pool(config)
    pool.on('error', (err) => {
      logger.error('Unexpected PG pool error:', err)
    })
    logger.info('PostgreSQL pool initialized')
    return pool
  } catch (err) {
    logger.error('Failed to initialize database pool:', err)
    if (process.env.ALLOW_DB_OFFLINE === 'true') {
      offlineMode = true
      return null
    }
    return null
  }
}

async function query(text, params) {
  try {
    if (!pool && !offlineMode) initPool()
    if (offlineMode) {
      logger.warn(`DB offline; returning mock result for query: ${text}`)
      // Return a minimal pg-like result shape
      return { rows: [], rowCount: 0, command: 'SELECT' }
    }
    if (!pool) throw new Error('Database pool not initialized')
    return await pool.query(text, params)
  } catch (err) {
    logger.error(`DB query failed: ${text}`, err)
    throw err
  }
}

async function healthCheck() {
  try {
    if (offlineMode) return { ok: false, offline: true }
    await query('SELECT 1')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

module.exports = { initPool, query, healthCheck, pool }
