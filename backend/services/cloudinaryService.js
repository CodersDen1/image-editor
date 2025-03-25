// backend/services/cloudinaryService.js
const cloudinary = require('cloudinary').v2;
const path = require('path');
const { Readable } = require('stream');

/**
 * Cloudinary Storage Service
 * Handles image uploads, retrieval, and deletion using Cloudinary
 */
class CloudinaryService {
  constructor() {
    // Configure Cloudinary with environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    console.log('📷 Cloudinary service initialized');
  }

  /**
   * Upload a file to Cloudinary
   * 
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Original filename
   * @param {string} userId - User ID
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(buffer, filename, userId, metadata = {}) {
    try {
      // Generate folder structure in Cloudinary
      const folder = `realestate-imagepro/users/${userId}`;
      const extension = path.extname(filename).toLowerCase();
      const publicId = `${folder}/${path.basename(filename, extension)}`;
      
      // Return a promise that resolves with the upload result
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: path.basename(filename, extension),
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            context: this._formatMetadata(metadata)
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject({
                success: false,
                error: error.message
              });
            } else {
              resolve({
                success: true,
                key: result.public_id,
                url: result.secure_url,
                size: result.bytes,
                width: result.width,
                height: result.height,
                format: result.format,
                metadata: metadata
              });
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get a file from Cloudinary
   * 
   * @param {string} key - File key (public_id)
   * @returns {Promise<Object>} - File data and metadata
   */
  async getFile(key) {
    try {
      // Get file details
      const result = await cloudinary.api.resource(key);
      
      // Download the file
      const url = cloudinary.url(key, {
        secure: true,
        resource_type: result.resource_type
      });
      
      // Fetch the file from Cloudinary
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      
      return {
        success: true,
        data: Buffer.from(buffer),
        contentType: this._getContentType(result.format),
        metadata: result.context ? result.context.custom : {},
        size: result.bytes,
        lastModified: result.created_at
      };
    } catch (error) {
      console.error('Error retrieving from Cloudinary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Delete a file from Cloudinary
   * 
   * @param {string} key - File key (public_id)
   * @param {string} userId - User ID (for validation)
   * @returns {Promise<Object>} - Result
   */
  async deleteFile(key, userId) {
    try {
      // Check if the file belongs to the user
      if (!key.includes(`realestate-imagepro/users/${userId}`)) {
        return {
          success: false,
          message: 'Access denied to this file'
        };
      }
      
      // Delete the file
      const result = await cloudinary.uploader.destroy(key);
      
      if (result.result === 'ok' || result.result === 'not found') {
        return {
          success: true,
          message: 'File deleted successfully'
        };
      } else {
        return {
          success: false,
          message: `Failed to delete file: ${result.result}`
        };
      }
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate a signed URL for temporary access to a file
   * @param {string} key - File key (public_id)
   * @param {number} expiresInSeconds - Expiration time in seconds
   * @returns {string} - Signed URL
   */
  getSignedUrl(key, expiresInSeconds = 3600) {
    const timestamp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return cloudinary.url(key, {
      secure: true,
      sign_url: true,
      expires_at: timestamp
    });
  }
  
  /**
   * Apply transformations to an image URL
   * @param {string} url - Original Cloudinary URL
   * @param {Object} transformations - Cloudinary transformation parameters
   * @returns {string} - Transformed URL
   */
  getTransformedUrl(publicId, transformations = {}) {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: transformations
    });
  }
  
  /**
   * Format metadata for Cloudinary context
   * 
   * @param {Object} metadata - Metadata object
   * @returns {Object} - Formatted context object
   * @private
   */
  _formatMetadata(metadata) {
    // Convert metadata to string pairs for Cloudinary context
    const context = { custom: {} };
    
    // Extract fields that can be included in context
    Object.entries(metadata).forEach(([key, value]) => {
      // Skip complex objects and arrays
      if (typeof value !== 'object' && value !== null) {
        context.custom[key] = String(value);
      }
    });
    
    return context;
  }
  
  /**
   * Get content type based on file format
   * 
   * @param {string} format - File format
   * @returns {string} - Content type
   * @private
   */
  _getContentType(format) {
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'svg': 'image/svg+xml'
    };
    
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }
}

module.exports = new CloudinaryService();