const mongoose = require('mongoose')

const sosAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      address: {
        type: String,
        trim: true,
      },
      accuracy: {
        type: Number,
        default: 0,
      },
    },
    type: {
      type: String,
      enum: ['emergency', 'medical', 'fire', 'police', 'general'],
      default: 'general',
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['active', 'assigned', 'in-progress', 'resolved', 'cancelled'],
      default: 'active',
    },
    description: {
      type: String,
      trim: true,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    notes: [
      {
        agent: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Agent',
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    attachments: [
      {
        type: {
          type: String,
          enum: ['image', 'video', 'audio', 'document'],
        },
        url: String,
        filename: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    responseTime: {
      type: Number, // in minutes
      default: null,
    },
    metadata: {
      deviceInfo: {
        userAgent: String,
        platform: String,
        battery: Number,
      },
      weatherConditions: {
        temperature: Number,
        conditions: String,
        visibility: Number,
      },
    },
  },
  {
    timestamps: true,
  }
)

// Index for location-based queries
sosAlertSchema.index({ 'location.latitude': 1, 'location.longitude': 1 })

// Index for status and type queries
sosAlertSchema.index({ status: 1, type: 1, createdAt: -1 })

// Calculate response time when agent is assigned
sosAlertSchema.methods.calculateResponseTime = function () {
  if (this.respondedAt && this.createdAt) {
    this.responseTime = Math.round(
      (this.respondedAt - this.createdAt) / (1000 * 60)
    ) // minutes
  }
  return this.responseTime
}

// Add note method
sosAlertSchema.methods.addNote = function (agentId, message) {
  this.notes.push({
    agent: agentId,
    message: message,
    timestamp: new Date(),
  })
  return this.save()
}

module.exports = mongoose.model('SosAlert', sosAlertSchema)
