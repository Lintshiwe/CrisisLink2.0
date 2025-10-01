const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sosAlertId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sos_alerts',
      key: 'id',
    },
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
    allowNull: false,
    references: {
      model: 'agents',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('active', 'ended'),
    defaultValue: 'active',
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'conversations',
});

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'conversations',
      key: 'id',
    },
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  senderType: {
    type: DataTypes.ENUM('user', 'agent'),
    allowNull: false,
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'location', 'voice'),
    defaultValue: 'text',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'messages',
});

const Call = sequelize.define('Call', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'conversations',
      key: 'id',
    },
  },
  initiatorId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  initiatorType: {
    type: DataTypes.ENUM('user', 'agent'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('initiated', 'ringing', 'answered', 'ended', 'missed'),
    defaultValue: 'initiated',
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true,
  },
  twilioCallSid: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'calls',
});

module.exports = { Conversation, Message, Call };