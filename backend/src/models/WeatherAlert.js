const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WeatherAlert = sequelize.define('WeatherAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  location: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: false,
  },
  province: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  alertType: {
    type: DataTypes.ENUM('storm', 'flood', 'heatwave', 'cold_snap', 'wind', 'rain', 'snow', 'drought'),
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('low', 'moderate', 'high', 'extreme'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  weatherData: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  affectedRadius: {
    type: DataTypes.INTEGER, // in kilometers
    defaultValue: 50,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  sentNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'weather_alerts',
  indexes: [
    {
      name: 'weather_alerts_location_idx',
      using: 'GIST',
      fields: ['location'],
    },
    {
      fields: ['alertType'],
    },
    {
      fields: ['severity'],
    },
    {
      fields: ['isActive'],
    },
  ],
});

module.exports = WeatherAlert;