// backend/controllers/cloudflareController.js
const cloudflareConfig = require('../config/cloudflare');
const cloudflareUtils = require('../utils/cloudflareUtils');
const logger = require('../utils/logger');

/**
 * Cloudflare Controller
 * 
 * Handles Cloudflare R2 operations for administration
 */
class CloudflareController {
  /**
   * Get Cloudflare configuration status
   * 
   * @returns {Promise<Object>} - Configuration status
   */
  async getConfigStatus() {
    try {
      const configValid = cloudflareConfig.validateCloudflareConfig();
      
      return {
        success: true,
        configValid,
        accountId: configValid ? cloudflareConfig.accountId : null,
        r2: {
          configured: configValid,
          bucketName: cloudflareConfig.r2.bucketName,
          publicAccess: cloudflareConfig.r2.publicAccess
        },
        images: {
          enabled: cloudflareConfig.images.enabled,
          configured: cloudflareConfig.images.enabled && cloudflareConfig.images.token
        }
      };
    } catch (error) {
      logger.error('Error getting Cloudflare config status:', error);
      return {
        success: false,
        message: 'Error getting Cloudflare configuration status',
        error: error.message
      };
    }
  }
  
  /**
   * Test Cloudflare R2 connection
   * 
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const connectionStatus = await cloudflareUtils.testR2Connection();
      
      if (connectionStatus.success) {
        // Also test bucket access
        const bucketStatus = await cloudflareUtils.checkBucketAccess(
          cloudflareConfig.r2.bucketName
        );
        
        return {
          success: true,
          connectionStatus,
          bucketStatus
        };
      }
      
      return {
        success: false,
        connectionStatus
      };
    } catch (error) {
      logger.error('Error testing Cloudflare connection:', error);
      return {
        success: false,
        message: 'Error testing Cloudflare connection',
        error: error.message
      };
    }
  }
  
  /**
   * List objects in a bucket with prefix
   * 
   * @param {string} prefix - Prefix to filter objects
   * @param {string} continuationToken - Token for pagination
   * @param {number} maxKeys - Maximum number of keys to return
   * @returns {Promise<Object>} - List result
   */
  async listObjects(prefix = '', continuationToken = null, maxKeys = 1000) {
    try {
      const s3Client = cloudflareUtils.initializeR2Client();
      
      if (!s3Client) {
        return {
          success: false,
          message: 'Failed to initialize R2 client due to invalid configuration'
        };
      }
      
      const params = {
        Bucket: cloudflareConfig.r2.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      };
      
      if (continuationToken) {
        params.ContinuationToken = continuationToken;
      }
      
      const result = await s3Client.listObjectsV2(params).promise();
      
      return {
        success: true,
        objects: result.Contents.map(item => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
          url: this._generatePublicUrl(item.Key)
        })),
        prefix,
        isTruncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken,
        keyCount: result.KeyCount
      };
    } catch (error) {
      logger.error('Error listing objects:', error);
      return {
        success: false,
        message: 'Error listing objects',
        error: error.message
      };
    }
  }
  
  /**
   * Delete an object from the bucket
   * 
   * @param {string} key - Object key to delete
   * @returns {Promise<Object>} - Delete result
   */
  async deleteObject(key) {
    try {
      const s3Client = cloudflareUtils.initializeR2Client();
      
      if (!s3Client) {
        return {
          success: false,
          message: 'Failed to initialize R2 client due to invalid configuration'
        };
      }
      
      await s3Client.deleteObject({
        Bucket: cloudflareConfig.r2.bucketName,
        Key: key
      }).promise();
      
      return {
        success: true,
        message: `Object "${key}" deleted successfully`
      };
    } catch (error) {
      logger.error('Error deleting object:', error);
      return {
        success: false,
        message: 'Error deleting object',
        error: error.message
      };
    }
  }
  
  /**
   * Get storage statistics
   * 
   * @returns {Promise<Object>} - Storage statistics
   */
  async getStorageStats() {
    try {
      const s3Client = cloudflareUtils.initializeR2Client();
      
      if (!s3Client) {
        return {
          success: false,
          message: 'Failed to initialize R2 client due to invalid configuration'
        };
      }
      
      // List all objects to calculate total size
      const result = await this._listAllObjects();
      
      if (!result.success) {
        return result;
      }
      
      // Calculate statistics
      const totalSize = result.objects.reduce((sum, obj) => sum + obj.size, 0);
      const totalObjects = result.objects.length;
      
      // Group by extension
      const extensionCounts = {};
      const extensionSizes = {};
      
      result.objects.forEach(obj => {
        const extension = obj.key.split('.').pop().toLowerCase() || 'unknown';
        
        if (!extensionCounts[extension]) {
          extensionCounts[extension] = 0;
          extensionSizes[extension] = 0;
        }
        
        extensionCounts[extension]++;
        extensionSizes[extension] += obj.size;
      });
      
      // Format statistics
      const statistics = {
        totalSize,
        totalObjects,
        formattedSize: this._formatBytes(totalSize),
        extensions: Object.keys(extensionCounts).map(ext => ({
          extension: ext,
          count: extensionCounts[ext],
          size: extensionSizes[ext],
          formattedSize: this._formatBytes(extensionSizes[ext])
        }))
      };
      
      return {
        success: true,
        statistics
      };
    } catch (error) {
      logger.error('Error getting storage statistics:', error);
      return {
        success: false,
        message: 'Error getting storage statistics',
        error: error.message
      };
    }
  }
  
  /**
   * List all objects in a bucket (handles pagination)
   * 
   * @param {string} prefix - Prefix to filter objects
   * @returns {Promise<Object>} - List result with all objects
   * @private
   */
  async _listAllObjects(prefix = '') {
    try {
      const s3Client = cloudflareUtils.initializeR2Client();
      
      if (!s3Client) {
        return {
          success: false,
          message: 'Failed to initialize R2 client due to invalid configuration'
        };
      }
      
      let allObjects = [];
      let continuationToken = null;
      let isTruncated = true;
      
      while (isTruncated) {
        const params = {
          Bucket: cloudflareConfig.r2.bucketName,
          Prefix: prefix,
          MaxKeys: 1000
        };
        
        if (continuationToken) {
          params.ContinuationToken = continuationToken;
        }
        
        const result = await s3Client.listObjectsV2(params).promise();
        
        allObjects = [
          ...allObjects,
          ...(result.Contents || []).map(item => ({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified
          }))
        ];
        
        isTruncated = result.IsTruncated;
        continuationToken = result.NextContinuationToken;
      }
      
      return {
        success: true,
        objects: allObjects,
        count: allObjects.length
      };
    } catch (error) {
      logger.error('Error listing all objects:', error);
      return {
        success: false,
        message: 'Error listing all objects',
        error: error.message
      };
    }
  }
  
  /**
   * Generate a public URL for an object
   * 
   * @param {string} key - Object key
   * @returns {string} - Public URL
   * @private
   */
  _generatePublicUrl(key) {
    if (cloudflareConfig.r2.publicAccess) {
      return `https://${cloudflareConfig.r2.bucketName}.r2.dev/${key}`;
    } else {
      // For private files, we would use the API endpoint
      return `${process.env.API_URL || 'http://localhost:3000'}/api/images/view/${encodeURIComponent(key)}`;
    }
  }
  
  /**
   * Format bytes to human-readable format
   * 
   * @param {number} bytes - Bytes to format
   * @param {number} decimals - Number of decimals
   * @returns {string} - Formatted string
   * @private
   */
  _formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = new CloudflareController();