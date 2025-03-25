// backend/utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Custom console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Define log level based on environment
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Create the winston logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'api' },
  transports: [
    // Write to all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      level: 'info' 
    }),
    
    // Write all logs error (and below) to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error' 
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

/**
 * Create a context-aware logger for a specific module
 * 
 * @param {string} module - Module name
 * @returns {Object} - Logger instance with module context
 */
logger.getModuleLogger = function(module) {
  return {
    error: (message, meta = {}) => logger.error(message, { module, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { module, ...meta }),
    info: (message, meta = {}) => logger.info(message, { module, ...meta }),
    http: (message, meta = {}) => logger.http(message, { module, ...meta }),
    verbose: (message, meta = {}) => logger.verbose(message, { module, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { module, ...meta }),
    silly: (message, meta = {}) => logger.silly(message, { module, ...meta })
  };
};

/**
 * Log a request for request logging middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} options - Additional options
 */
logger.logRequest = function(req, res, options = {}) {
  const { level = 'http', includeHeaders = false, includeBody = false } = options;
  
  const meta = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req._remoteAddress,
    statusCode: res.statusCode,
    responseTime: res._startTime ? (Date.now() - res._startTime) : undefined,
    userAgent: req.headers['user-agent'],
    module: 'http'
  };
  
  if (includeHeaders) {
    meta.headers = { ...req.headers };
    // Remove sensitive headers
    delete meta.headers.authorization;
    delete meta.headers.cookie;
  }
  
  if (includeBody && req.body) {
    meta.body = { ...req.body };
    // Remove sensitive data
    delete meta.body.password;
    delete meta.body.newPassword;
    delete meta.body.currentPassword;
  }
  
  // Log the request
  logger[level](`${req.method} ${req.originalUrl || req.url} - ${res.statusCode}`, meta);
};

/**
 * Create a request logger middleware
 * 
 * @param {Object} options - Middleware options
 * @returns {Function} - Express middleware function
 */
logger.requestLoggerMiddleware = function(options = {}) {
  return (req, res, next) => {
    // Add start time to the request
    req._startTime = Date.now();
    
    // Log after response is sent
    res.on('finish', () => {
      logger.logRequest(req, res, options);
    });
    
    next();
  };
};

// Export logger instance
module.exports = logger;