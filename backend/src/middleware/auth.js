const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret'
    const payload = jwt.verify(token, secret)
    req.user = payload
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { authenticateToken }
