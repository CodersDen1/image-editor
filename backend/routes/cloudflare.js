// backend/routes/cloudflare.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const cloudflareUtils = require('../utils/cloudflareUtils');
const cloudflareConfig = require('../config/cloudflare');

/**
 * @route GET /api/cloudflare/status
 * @desc Get Cloudflare connection status
 * @access Private (admin only)
 */
router.get('/status', authMiddleware, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required'
    });
  }

  try {
    // Get configuration status
    const configValid = cloudflareConfig.validateCloudflareConfig();
    
    // Test connection only if config is valid
    let connectionStatus = { success: false, message: 'Configuration invalid' };
    let bucketStatus = { success: false, message: 'Configuration invalid' };
    
    if (configValid) {
      // Test R2 connection
      connectionStatus = await cloudflareUtils.testR2Connection();
      
      // Check bucket access
      bucketStatus = await cloudflareUtils.checkBucketAccess(
        cloudflareConfig.r2.bucketName
      );
    }
    
    // Return status
    res.json({
      success: true,
      cloudflare: {
        configValid,
        accountId: configValid ? cloudflareConfig.accountId : null,
        r2: {
          configured: configValid,
          connectionStatus,
          bucketStatus,
          bucketName: cloudflareConfig.r2.bucketName,
          publicAccess: cloudflareConfig.r2.publicAccess
        },
        images: {
          enabled: cloudflareConfig.images.enabled,
          configured: cloudflareConfig.images.enabled && cloudflareConfig.images.token
        }
      }
    });
  } catch (error) {
    console.error('Cloudflare status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking Cloudflare status',
      error: error.message
    });
  }
});

/**
 * @route POST /api/cloudflare/create-bucket
 * @desc Create a new R2 bucket
 * @access Private (admin only)
 */
router.post('/create-bucket', authMiddleware, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required'
    });
  }

  const { bucketName } = req.body;
  
  if (!bucketName) {
    return res.status(400).json({
      success: false,
      message: 'Bucket name is required'
    });
  }

  try {
    const s3Client = cloudflareUtils.initializeR2Client();
    
    if (!s3Client) {
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize R2 client due to invalid configuration'
      });
    }
    
    // Create bucket
    await s3Client.createBucket({
      Bucket: bucketName
    }).promise();
    
    res.json({
      success: true,
      message: `Bucket "${bucketName}" created successfully`
    });
  } catch (error) {
    console.error('Create bucket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bucket',
      error: error.message
    });
  }
});

/**
 * @route GET /api/cloudflare/list-buckets
 * @desc List all R2 buckets
 * @access Private (admin only)
 */
router.get('/list-buckets', authMiddleware, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required'
    });
  }

  try {
    const s3Client = cloudflareUtils.initializeR2Client();
    
    if (!s3Client) {
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize R2 client due to invalid configuration'
      });
    }
    
    // List buckets
    const result = await s3Client.listBuckets().promise();
    
    res.json({
      success: true,
      buckets: result.Buckets.map(bucket => ({
        name: bucket.Name,
        creationDate: bucket.CreationDate
      }))
    });
  } catch (error) {
    console.error('List buckets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing buckets',
      error: error.message
    });
  }
});

module.exports = router;