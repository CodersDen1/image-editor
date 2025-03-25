// backend/middleware/checkCloudflareConfig.js
const cloudflareConfig = require('../config/cloudflare');
const logger = require('../utils/logger');

/**
 * Middleware to check if Cloudflare configuration is valid
 * and handle S3/R2 client initialization
 */
const checkCloudflareConfig = (req, res, next) => {
  // Skip for health check and non-protected routes
  if (req.path === '/health' || req.path === '/api' || req.path.startsWith('/api/docs')) {
    return next();
  }

  // Check if Cloudflare config is valid for storage operations
  if (!cloudflareConfig.validateCloudflareConfig()) {
    // For routes that absolutely require storage
    if (
      req.path.includes('/api/images/upload') ||
      req.path.includes('/api/watermark/upload') ||
      req.path.includes('/api/profile/image')
    ) {
      return res.status(503).json({
        success: false,
        message: 'Storage service unavailable. Please check your Cloudflare configuration.',
        error: 'STORAGE_UNAVAILABLE'
      });
    }
    
    // For other routes, add a warning but continue
    req.cloudflareConfigWarning = true;
    logger.warn('Cloudflare configuration is incomplete. Some storage features may not work correctly.');
  }
  
  next();
};

module.exports = checkCloudflareConfig;