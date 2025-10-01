const { sequelize } = require('../config/database')

// Import all models
const User = require('./User')
const Agent = require('./Agent')
const SosAlert = require('./SosAlert')
const WeatherAlert = require('./WeatherAlert')

// Define core associations only (simplified for now)
// User associations
User.hasMany(SosAlert, {
  foreignKey: 'userId',
  as: 'sosAlerts',
})

// Agent associations
Agent.hasMany(SosAlert, {
  foreignKey: 'agentId',
  as: 'assignedSosAlerts',
})

// SosAlert associations
SosAlert.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
})

SosAlert.belongsTo(Agent, {
  foreignKey: 'agentId',
  as: 'agent',
})

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Agent,
  SosAlert,
  WeatherAlert,
}
