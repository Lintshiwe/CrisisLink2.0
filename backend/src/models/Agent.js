const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Agent = sequelize.define('Agent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100],
    },
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  badgeNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  vehiclePlate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  vehicleType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  specialization: {
    type: DataTypes.ENUM('medical', 'fire', 'police', 'search_rescue', 'general'),
    defaultValue: 'general',
  },
  status: {
    type: DataTypes.ENUM('available', 'busy', 'offline'),
    defaultValue: 'offline',
  },
  currentLocation: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 5.0,
    validate: {
      min: 0,
      max: 5,
    },
  },
  totalRescues: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  fcmToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'agents',
  hooks: {
    beforeCreate: async (agent) => {
      if (agent.password) {
        agent.password = await bcrypt.hash(agent.password, 12);
      }
    },
    beforeUpdate: async (agent) => {
      if (agent.changed('password')) {
        agent.password = await bcrypt.hash(agent.password, 12);
      }
    },
  },
});

// Instance methods
Agent.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

Agent.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = Agent;