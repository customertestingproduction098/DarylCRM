const rateLimit = require('express-rate-limit');

// Global rate limiter: 150 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limiter for auth endpoints: 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again in 15 minutes.' },
  skipSuccessfulRequests: true
});

// Sensitive operations limiter (customer deletion, billing creation): 40 per hour
const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: { error: 'Too many sensitive operations requested, please slow down.' }
});

module.exports = {
  globalLimiter,
  authLimiter,
  sensitiveOperationLimiter
};
