const mongoose = require('mongoose')

// Import all Mongoose models
const User = require('./mongoose/User')
const Agent = require('./mongoose/Agent')
const SosAlert = require('./mongoose/SosAlert')
const WeatherAlert = require('./mongoose/WeatherAlert')

// Export all models
module.exports = {
  User,
  Agent,
  SosAlert,
  WeatherAlert,
  mongoose,
}
