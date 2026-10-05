const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : (statusCode === 500 ? 'Internal server error occurred. Our team has been notified.' : err.message);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
