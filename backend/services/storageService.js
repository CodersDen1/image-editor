// backend/services/storageService.js
const AWS = require('aws-sdk');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const cloudflareConfig = require('../config/cloudflare');
const User = require('../models/User');

/**
 * Storage Service
 * Handles interactions with Cloudflare R2 storage
 */
class StorageService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'realestate-imagepro');
    this.ensureTempDir();
    
    // Configure the S3 client to use Cloudflare R2
    // R2 is compatible with S3 API
    this.s3 = new AWS.S3({
      endpoint: `https://${cloudflareConfig.accountId}.r2.cloudflarestorage.com`,
      accessKeyId: cloudflareConfig.r2.accessKeyId,
      secretAccessKey: cloudflareConfig.r2.secretAccessKey,
      signatureVersion: 'v4',
      region: cloudflareConfig.r2.region || 'auto'
    });
    
    this.bucketName = cloudflareConfig.r2.bucketName;
  }
  
  /**
   * Create temp directory if it doesn't exist
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }
  
  /**
   * Generate a unique key for storing the image
   * 
   * @param {string} userId - User ID
   * @param {string} filename - Original filename
   * @returns {string} - Storage key
   */
  generateStorageKey(userId, filename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(filename);
    const basename = path.basename(filename, extension);
    
    // Create a path that organizes files by user and maintains original filename
    return `users/${userId}/${timestamp}-${randomString}-${basename}${extension}`;
  }
  
  /**
   * Upload a file to Cloudflare R2
   * 
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Original filename
   * @param {string} userId - User ID
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(buffer, filename, userId, metadata = {}) {
    try {
      // Generate a unique storage key
      const key = this.generateStorageKey(userId, filename);
      
      // Set up upload parameters
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: this.getContentType(filename),
        Metadata: {
          userId: userId.toString(),
          originalFilename: filename,
          uploadTimestamp: Date.now().toString(),
          ...this.flattenMetadata(metadata)
        }
      };
      
      // Upload to R2
      const result = await this.s3.upload(params).promise();
      
      // Update user's storage usage
      await this.updateStorageUsage(userId, buffer.length);
      
      // Generate a URL for the uploaded file
      const url = this.getPublicUrl(key);
      
      return {
        success: true,
        key: key,
        url: url,
        etag: result.ETag,
        size: buffer.length,
        metadata: params.Metadata
      };
    } catch (error) {
      console.error('Error uploading to R2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get a file from Cloudflare R2
   * 
   * @param {string} key - File key
   * @returns {Promise<Object>} - File data and metadata
   */
  async getFile(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key
      };
      
      const result = await this.s3.getObject(params).promise();
      
      return {
        success: true,
        data: result.Body,
        contentType: result.ContentType,
        metadata: result.Metadata,
        size: result.ContentLength,
        lastModified: result.LastModified
      };
    } catch (error) {
      console.error('Error retrieving from R2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get file metadata from Cloudflare R2
   * 
   * @param {string} key - File key
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key
      };
      
      const result = await this.s3.headObject(params).promise();
      
      return {
        success: true,
        metadata: result.Metadata,
        contentType: result.ContentType,
        size: result.ContentLength,
        lastModified: result.LastModified
      };
    } catch (error) {
      console.error('Error retrieving metadata from R2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Delete a file from Cloudflare R2
   * 
   * @param {string} key - File key
   * @param {string} userId - User ID (for storage usage update)
   * @returns {Promise<Object>} - Result
   */
  async deleteFile(key, userId) {
    try {
      // Get file metadata for size before deleting
      const metadata = await this.getFileMetadata(key);
      const fileSize = metadata.success ? metadata.size : 0;
      
      const params = {
        Bucket: this.bucketName,
        Key: key
      };
      
      await this.s3.deleteObject(params).promise();
      
      // Update user's storage usage if file size was retrieved
      if (fileSize > 0 && userId) {
        await this.updateStorageUsage(userId, -fileSize);
      }
      
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting from R2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate a signed URL for temporary access
   * 
   * @param {string} key - File key
   * @param {number} expiresInSeconds - Expiration time in seconds
   * @returns {Promise<Object>} - Signed URL result
   */
  async getSignedUrl(key, expiresInSeconds = 3600) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresInSeconds
      };
      
      const url = await this.s3.getSignedUrlPromise('getObject', params);
      
      return {
        success: true,
        url: url,
        expires: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get a list of files for a user
   * 
   * @param {string} userId - User ID
   * @param {string} prefix - Optional prefix filter
   * @param {Object} options - List options
   * @returns {Promise<Object>} - List of files
   */
  async listUserFiles(userId, prefix = '', options = {}) {
    try {
      const listPrefix = `users/${userId}/${prefix}`;
      
      const params = {
        Bucket: this.bucketName,
        Prefix: listPrefix,
        MaxKeys: options.limit || 1000,
        Marker: options.startAfter || undefined
      };
      
      const result = await this.s3.listObjectsV2(params).promise();
      
      return {
        success: true,
        files: result.Contents.map(item => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
          url: this.getPublicUrl(item.Key)
        })),
        nextContinuationToken: result.NextContinuationToken,
        isTruncated: result.IsTruncated
      };
    } catch (error) {
      console.error('Error listing files from R2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Update user's storage usage
   * 
   * @param {string} userId - User ID
   * @param {number} sizeChange - Size change in bytes (positive for add, negative for remove)
   */
  async updateStorageUsage(userId, sizeChange) {
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'storage.used': sizeChange }
      });
    } catch (error) {
      console.error('Error updating storage usage:', error);
    }
  }
  
  /**
   * Get the content type based on file extension
   * 
   * @param {string} filename - Filename
   * @returns {string} - Content type
   */
  getContentType(filename) {
    const extension = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
      '.svg': 'image/svg+xml',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.raw': 'image/raw',
      '.arw': 'image/raw', // Sony
      '.cr2': 'image/raw', // Canon
      '.nef': 'image/raw', // Nikon
      '.dng': 'image/raw', // Adobe
      '.zip': 'application/zip'
    };
    
    return contentTypes[extension] || 'application/octet-stream';
  }
  
  /**
   * Get a public URL for the file
   * 
   * @param {string} key - File key
   * @returns {string} - Public URL
   */
  getPublicUrl(key) {
    if (cloudflareConfig.r2.publicAccess) {
      // If using Cloudflare R2 with public access
      return `https://${this.bucketName}.r2.dev/${key}`;
    } else {
      // For private files, we would use the API endpoint to serve them
      // This should be replaced with your actual frontend URL
      return `${process.env.API_URL || 'http://localhost:3000'}/api/images/view/${encodeURIComponent(key)}`;
    }
  }
  
  /**
   * Flatten metadata object for Cloudflare R2
   * R2 only supports string values in metadata
   * 
   * @param {Object} metadata - Metadata object
   * @returns {Object} - Flattened metadata
   */
  flattenMetadata(metadata) {
    const result = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) {
        continue;
      }
      
      if (typeof value === 'object') {
        result[key] = JSON.stringify(value);
      } else {
        result[key] = value.toString();
      }
    }
    
    return result;
  }
}

module.exports = new StorageService();