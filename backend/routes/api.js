// backend/routes/api.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

/**
 * Main API Router
 * Aggregates all API endpoints and provides API information
 */

// API Information endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'RealEstate ImagePro API',
    version: '1.0.0',
    description: 'API for RealEstate ImagePro - Real Estate Image Processing SaaS',
    endpoints: {
      '/api/auth': 'Authentication endpoints',
      '/api/users': 'User management endpoints',
      '/api/images': 'Image management endpoints',
      '/api/processing': 'Image processing endpoints',
      '/api/downloads': 'Download endpoints',
      '/api/shares': 'Sharing endpoints',
      '/api/watermark': 'Watermark management endpoints'
    },
    documentation: '/api/docs'
  });
});

// API Status endpoint
router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    time: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Protected endpoint example
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// API Documentation
router.get('/docs', (req, res) => {
  // In a real application, this would serve API documentation
  // For now, we'll just redirect to the root endpoint
  res.redirect('/api');
});

// Feature availability
router.get('/features', (req, res) => {
  res.json({
    upload: {
      enabled: true,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB) || 25,
      supportedFormats: ['jpg', 'jpeg', 'png', 'heif', 'raw']
    },
    processing: {
      autoEnhancement: true,
      manualAdjustments: true,
      batchProcessing: true,
      watermarking: true,
      aiFeatures: process.env.AI_FEATURES_ENABLED === 'true'
    },
    storage: {
      retention: parseInt(process.env.STORAGE_RETENTION_DAYS) || 30,
      cloudflare: {
        enabled: true,
        r2: true,
        images: process.env.CLOUDFLARE_IMAGES_ENABLED === 'true'
      }
    },
    sharing: {
      enabled: true,
      passwordProtection: true,
      expiringLinks: true,
      directDownload: true
    },
    integrations: {
      crmSystems: ['salesforce', 'hubspot', 'propertybase'],
      listingPlatforms: ['mls', 'zillow', 'realtor.com', 'trulia']
    }
  });
});

module.exports = router;