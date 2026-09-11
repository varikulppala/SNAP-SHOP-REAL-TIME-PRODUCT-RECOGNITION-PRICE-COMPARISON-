const jwt = require('jsonwebtoken');

const JWT_SECRET = () => process.env.JWT_SECRET || 'snapshop_dev_secret';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * For routes that work without a user but still use `req.user` when the token is valid.
 * Never returns 401: missing/invalid/expired Bearer → no user; valid Bearer → req.user set.
 * Sets req.authExpired when a Bearer token was sent but JWT verification failed.
 */
const optionalAuth = (req, res, next) => {
  req.user = null;
  req.authExpired = false;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    req.user = { id: decoded.id, email: decoded.email };
  } catch (err) {
    req.authExpired = true;
  }
  next();
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;

