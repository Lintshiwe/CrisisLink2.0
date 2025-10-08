const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const agentSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v)
        },
        message: 'Please enter a valid email address',
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    badgeNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    rank: {
      type: String,
      required: false,
      trim: true,
    },
    specializations: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-duty', 'off-duty', 'suspended'],
      default: 'inactive',
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      lastUpdated: { type: Date, default: Date.now },
    },
    availability: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'unavailable',
    },
    assignedAlerts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SosAlert',
      },
    ],
    responseTime: {
      average: { type: Number, default: 0 },
      totalResponses: { type: Number, default: 0 },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Hash password before saving
agentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
agentSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
agentSchema.methods.toJSON = function () {
  const agent = this.toObject()
  delete agent.password
  return agent
}

// Update location method
agentSchema.methods.updateLocation = function (latitude, longitude) {
  this.location = {
    latitude,
    longitude,
    lastUpdated: new Date(),
  }
  return this.save()
}

module.exports = mongoose.model('Agent', agentSchema)
