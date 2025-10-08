const express = require('express')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const { User, Agent } = require('../models/mongooseIndex')

const router = express.Router()

/**
 * Generate JWT token
 */
const generateToken = (user, type) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: type,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  )
}

/**
 * @route   POST /api/auth/register/user
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register/user',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        })
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        emergencyContact,
        bloodType,
        medicalConditions,
      } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } })
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email',
        })
      }

      // Create user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        emergencyContact,
        bloodType,
        medicalConditions,
      })

      const token = generateToken(user, 'user')

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          token,
        },
      })
    } catch (error) {
      console.error('Error registering user:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to register user',
      })
    }
  }
)

/**
 * @route   POST /api/auth/register/agent
 * @desc    Register a new agent
 * @access  Public (but would typically require admin approval)
 */
router.post(
  '/register/agent',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('badgeNumber').notEmpty().withMessage('Badge number is required'),
    body('vehiclePlate').notEmpty().withMessage('Vehicle plate is required'),
    body('vehicleType').notEmpty().withMessage('Vehicle type is required'),
    body('specialization')
      .optional()
      .isIn(['medical', 'fire', 'police', 'search_rescue', 'general']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        })
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        badgeNumber,
        vehiclePlate,
        vehicleType,
        specialization,
      } = req.body

      // Check if agent already exists
      const existingAgent = await Agent.findOne({
        where: {
          $or: [{ email }, { badgeNumber }],
        },
      })

      if (existingAgent) {
        return res.status(400).json({
          success: false,
          message: 'Agent already exists with this email or badge number',
        })
      }

      // Create agent
      const agent = await Agent.create({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        badgeNumber,
        vehiclePlate,
        vehicleType,
        specialization: specialization || 'general',
      })

      const token = generateToken(agent, 'agent')

      res.status(201).json({
        success: true,
        message: 'Agent registered successfully',
        data: {
          agent,
          token,
        },
      })
    } catch (error) {
      console.error('Error registering agent:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to register agent',
      })
    }
  }
)

/**
 * @route   POST /api/auth/login
 * @desc    Login user or agent
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('userType')
      .isIn(['user', 'agent'])
      .withMessage('Valid user type required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        })
      }

      const { email, password, userType } = req.body

      let user
      if (userType === 'user') {
        user = await User.findOne({ where: { email, isActive: true } })
      } else {
        user = await Agent.findOne({ where: { email, isActive: true } })
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        })
      }

      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        })
      }

      const token = generateToken(user, userType)

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          token,
          userType,
        },
      })
    } catch (error) {
      console.error('Error logging in:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to login',
      })
    }
  }
)

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    let user
    if (decoded.type === 'user') {
      user = await User.findByPk(decoded.id)
    } else {
      user = await Agent.findByPk(decoded.id)
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      })
    }

    const newToken = generateToken(user, decoded.type)

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user,
        token: newToken,
        userType: decoded.type,
      },
    })
  } catch (error) {
    console.error('Error refreshing token:', error)
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    })
  }
})

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', (req, res) => {
  // In a more sophisticated setup, you might maintain a blacklist of tokens
  res.json({
    success: true,
    message: 'Logged out successfully',
  })
})

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    let user
    if (decoded.type === 'user') {
      user = await User.findByPk(decoded.id)
    } else {
      user = await Agent.findByPk(decoded.id)
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      })
    }

    res.json({
      success: true,
      data: {
        user,
        userType: decoded.type,
      },
    })
  } catch (error) {
    console.error('Error getting user profile:', error)
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    })
  }
})

// DEV helper: emergency contacts stub
router.get('/emergency-contacts', async (req, res) => {
  try {
    // In dev/offline mode return static contacts
    const contacts = [
      { name: 'Primary Contact', phone: '+27000000001', relation: 'Family' },
      { name: 'Secondary Contact', phone: '+27000000002', relation: 'Friend' },
    ]
    res.json({ success: true, contacts })
  } catch (error) {
    res.json({ success: true, contacts: [] })
  }
})

// DEV helper: register FCM token (no-op)
router.post('/fcm-token', async (req, res) => {
  try {
    res.json({ success: true })
  } catch (error) {
    res.json({ success: true })
  }
})

// DEV helper: update push subscription (no-op)
router.post('/update-push-subscription', async (req, res) => {
  try {
    res.json({ success: true })
  } catch (error) {
    res.json({ success: true })
  }
})

module.exports = router
/** DEV helper endpoints below: emergency contacts + FCM token registration **/
