// backend/utils/cloudflareUtils.js
const AWS = require('aws-sdk');
const cloudflareConfig = require('../config/cloudflare');
const logger = require('./logger');

/**
 * Initialize the S3 client for Cloudflare R2
 * @returns {AWS.S3|null} - S3 client or null if configuration invalid
 */
const initializeR2Client = () => {
  try {
    if (!cloudflareConfig.validateCloudflareConfig()) {
      return null;
    }

    return new AWS.S3({
      endpoint: cloudflareConfig.r2.endpoint,
      accessKeyId: cloudflareConfig.r2.accessKeyId,
      secretAccessKey: cloudflareConfig.r2.secretAccessKey,
      signatureVersion: 'v4',
      region: cloudflareConfig.r2.region || 'auto'
    });
  } catch (error) {
    logger.error('Failed to initialize R2 client:', error);
    return null;
  }
};

/**
 * Test connection to Cloudflare R2
 * @returns {Promise<Object>} - Test result
 */
const testR2Connection = async () => {
  try {
    const s3Client = initializeR2Client();
    
    if (!s3Client) {
      return {
        success: false,
        message: 'Failed to initialize R2 client due to invalid configuration'
      };
    }
    
    // Try to list buckets to verify credentials
    const result = await s3Client.listBuckets().promise();
    
    return {
      success: true,
      message: 'Successfully connected to Cloudflare R2',
      buckets: result.Buckets.length
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to connect to Cloudflare R2',
      error: error.message
    };
  }
};

/**
 * Check if a bucket exists and is accessible
 * @param {string} bucketName - Bucket name to check
 * @returns {Promise<Object>} - Test result
 */
const checkBucketAccess = async (bucketName) => {
  try {
    const s3Client = initializeR2Client();
    
    if (!s3Client) {
      return {
        success: false,
        message: 'Failed to initialize R2 client due to invalid configuration'
      };
    }
    
    // Try to access bucket
    await s3Client.headBucket({ Bucket: bucketName }).promise();
    
    return {
      success: true,
      message: `Successfully accessed bucket: ${bucketName}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to access bucket: ${bucketName}`,
      error: error.message
    };
  }
};

module.exports = {
  initializeR2Client,
  testR2Connection,
  checkBucketAccess
};