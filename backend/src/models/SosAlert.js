const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SosAlert = sequelize.define('SosAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'agents',
      key: 'id',
    },
  },
  location: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emergencyType: {
    type: DataTypes.ENUM('medical', 'fire', 'police', 'natural_disaster', 'accident', 'other'),
    defaultValue: 'other',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'high',
  },
  status: {
    type: DataTypes.ENUM('pending', 'assigned', 'en_route', 'arrived', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  estimatedArrival: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  actualArrival: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5,
    },
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  weatherConditions: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'sos_alerts',
  indexes: [
    {
      name: 'sos_alerts_location_idx',
      using: 'GIST',
      fields: ['location'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['createdAt'],
    },
  ],
});

module.exports = SosAlert;