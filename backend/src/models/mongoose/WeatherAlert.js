const mongoose = require('mongoose')

const weatherAlertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'severe_weather',
        'storm',
        'flood',
        'heat_wave',
        'cold_wave',
        'wind',
        'fog',
        'other',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe', 'extreme'],
      required: true,
    },
    urgency: {
      type: String,
      enum: ['immediate', 'expected', 'future', 'past'],
      required: true,
    },
    certainty: {
      type: String,
      enum: ['observed', 'likely', 'possible', 'unlikely'],
      required: true,
    },
    area: {
      type: {
        type: String,
        enum: ['Polygon', 'Point', 'MultiPolygon'],
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]], // GeoJSON format for polygons
        required: true,
      },
    },
    affectedRegions: [
      {
        name: String,
        code: String,
      },
    ],
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    externalId: {
      type: String,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'test'],
      default: 'active',
    },
    instructions: {
      type: String,
      trim: true,
    },
    contactInfo: {
      phone: String,
      email: String,
      website: String,
    },
    parameters: [
      {
        name: String,
        value: String,
        unit: String,
      },
    ],
    references: [
      {
        identifier: String,
        sender: String,
        sent: Date,
      },
    ],
    notificationsSent: {
      type: Number,
      default: 0,
    },
    lastNotificationSent: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Index for geospatial queries
weatherAlertSchema.index({ area: '2dsphere' })

// Index for time-based queries
weatherAlertSchema.index({ startTime: 1, endTime: 1, status: 1 })

// Index for type and severity queries
weatherAlertSchema.index({ type: 1, severity: 1, status: 1 })

// Check if alert is currently active
weatherAlertSchema.methods.isActive = function () {
  const now = new Date()
  return this.status === 'active' && this.startTime <= now && this.endTime > now
}

// Check if a point is within the alert area
weatherAlertSchema.methods.containsPoint = function (latitude, longitude) {
  // This is a simplified check - in production you'd use proper geospatial queries
  if (this.area.type === 'Point') {
    const [lng, lat] = this.area.coordinates
    // Simple distance check (approximately 10km radius)
    const distance = Math.sqrt(
      Math.pow(latitude - lat, 2) + Math.pow(longitude - lng, 2)
    )
    return distance < 0.1 // roughly 10km
  }

  // For polygons, you'd implement point-in-polygon algorithm
  // or use MongoDB's $geoIntersects operator
  return false
}

// Update notification counter
weatherAlertSchema.methods.recordNotification = function () {
  this.notificationsSent += 1
  this.lastNotificationSent = new Date()
  return this.save()
}

module.exports = mongoose.model('WeatherAlert', weatherAlertSchema)
