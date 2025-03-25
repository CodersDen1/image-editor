// backend/services/sharingService.js
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const archiver = require('archiver');
const Share = require('../models/Share');
const Image = require('../models/Image');
const User = require('../models/User');
const storageService = require('../utils/storageServiceSelector').service;

/**
 * Sharing Service
 * Handles image sharing, access control, and download generation
 */
class SharingService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'realestate-imagepro-shares');
    this.ensureTempDir();
  }
  
  /**
   * Create temp directory if it doesn't exist
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating sharing temp directory:', error);
    }
  }
  
  /**
   * Create a new share
   * 
   * @param {string} userId - User ID
   * @param {Array} imageIds - Array of image IDs to share
   * @param {Object} options - Share options
   * @returns {Promise<Object>} - Share result
   */
  async createShare(userId, imageIds, options = {}) {
    try {
      // Validate inputs
      if (!userId || !imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return {
          success: false,
          message: 'Invalid input parameters'
        };
      }
      
      // Verify that all images exist and belong to the user
      const images = await Image.find({
        _id: { $in: imageIds },
        userId: userId,
        isDeleted: false
      });
      
      if (images.length === 0) {
        return {
          success: false,
          message: 'No valid images found to share'
        };
      }
      
      if (images.length !== imageIds.length) {
        return {
          success: false,
          message: 'Some images were not found or do not belong to you'
        };
      }
      
      // Generate a unique share token
      const shareToken = Share.generateShareToken();
      
      // Create share object
      const share = new Share({
        userId,
        images: imageIds,
        shareToken,
        title: options.title,
        description: options.description,
        isPasswordProtected: !!options.password,
        password: options.password,
        expiresAt: options.expiresAt
      });
      
      // If expiration is specified as days, convert to date
      if (options.expirationDays && !options.expiresAt) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + options.expirationDays);
        share.expiresAt = expirationDate;
      }
      
      // If max access is specified
      if (options.maxAccess) {
        share.maxAccess = options.maxAccess;
      }
      
      // Save the share
      await share.save();
      
      // Increment share count for each image
      await Image.updateMany(
        { _id: { $in: imageIds } },
        { $inc: { shareCount: 1 } }
      );
      
      return {
        success: true,
        message: 'Images shared successfully',
        share: {
          id: share._id,
          shareToken: share.shareToken,
          title: share.title,
          imageCount: images.length,
          isPasswordProtected: share.isPasswordProtected,
          expiresAt: share.expiresAt,
          createdAt: share.createdAt
        }
      };
    } catch (error) {
      console.error('Error creating share:', error);
      return {
        success: false,
        message: 'Error creating share',
        error: error.message
      };
    }
  }
  
  /**
   * Get share details including images
   * 
   * @param {string} shareToken - Share token
   * @param {string} password - Share password (if protected)
   * @returns {Promise<Object>} - Share details
   */
  async getShare(shareToken, password = null) {
    try {
      // Find share by token
      const share = await Share.findOne({ shareToken });
      
      if (!share) {
        return {
          success: false,
          message: 'Share not found'
        };
      }
      
      // Check if share is valid
      if (!share.isValid()) {
        return {
          success: false,
          message: share.isExpired() ? 'Share has expired' : 'Share has reached maximum access limit'
        };
      }
      
      // Check password if protected
      if (share.isPasswordProtected && !share.verifyPassword(password)) {
        return {
          success: false,
          message: 'Invalid password',
          isPasswordProtected: true
        };
      }
      
      // Get user info
      const user = await User.findById(share.userId).select('name agency');
      
      // Get images
      const images = await Image.find({
        _id: { $in: share.images },
        isDeleted: false
      }).select('_id originalName url width height size thumbnails');
      
      // Record access
      await share.recordAccess();
      
      return {
        success: true,
        share: {
          id: share._id,
          shareToken: share.shareToken,
          title: share.title,
          description: share.description,
          sharedBy: user ? {
            name: user.name,
            agency: user.agency
          } : null,
          isPasswordProtected: share.isPasswordProtected,
          expiresAt: share.expiresAt,
          accessCount: share.accessCount,
          maxAccess: share.maxAccess,
          createdAt: share.createdAt,
          images: images.map(image => ({
            id: image._id,
            name: image.originalName,
            url: image.url,
            width: image.width,
            height: image.height,
            size: image.size,
            thumbnails: image.thumbnails
          }))
        }
      };
    } catch (error) {
      console.error('Error getting share:', error);
      return {
        success: false,
        message: 'Error retrieving share',
        error: error.message
      };
    }
  }
  
  /**
   * Download a shared image
   * 
   * @param {string} shareToken - Share token
   * @param {string} imageId - Image ID to download
   * @param {string} password - Share password (if protected)
   * @returns {Promise<Object>} - Download result with image buffer
   */
  async downloadSharedImage(shareToken, imageId, password = null) {
    try {
      // Get share details
      const shareResult = await this.getShare(shareToken, password);
      
      if (!shareResult.success) {
        return shareResult;
      }
      
      // Check if image is in this share
      const image = shareResult.share.images.find(img => img.id.toString() === imageId);
      
      if (!image) {
        return {
          success: false,
          message: 'Image not found in this share'
        };
      }
      
      // Find the image in the database to get storage key
      const imageFromDb = await Image.findById(imageId);
      
      if (!imageFromDb || !imageFromDb.storageKey) {
        return {
          success: false,
          message: 'Image storage information not found'
        };
      }
      
      // Get image from storage
      const imageResult = await storageService.getFile(imageFromDb.storageKey);
      
      if (!imageResult.success) {
        return {
          success: false,
          message: 'Failed to retrieve image from storage'
        };
      }
      
      // Increment download count
      await Image.findByIdAndUpdate(imageId, {
        $inc: { downloadCount: 1 }
      });
      
      return {
        success: true,
        image: {
          data: imageResult.data,
          contentType: imageResult.contentType,
          name: imageFromDb.originalName,
          size: imageResult.size
        }
      };
    } catch (error) {
      console.error('Error downloading shared image:', error);
      return {
        success: false,
        message: 'Error downloading image',
        error: error.message
      };
    }
  }
  
  /**
   * Create a ZIP archive of all images in a share
   * 
   * @param {string} shareToken - Share token
   * @param {string} password - Share password (if protected)
   * @returns {Promise<Object>} - Result with ZIP file path
   */
  async createShareZip(shareToken, password = null) {
    try {
      // Get share details
      const shareResult = await this.getShare(shareToken, password);
      
      if (!shareResult.success) {
        return shareResult;
      }
      
      // Create a temporary file for the ZIP
      const zipFileName = `share-${shareToken}-${Date.now()}.zip`;
      const zipFilePath = path.join(this.tempDir, zipFileName);
      
      // Create a write stream
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      // Set up archive events
      const archivePromise = new Promise((resolve, reject) => {
        output.on('close', () => resolve(zipFilePath));
        archive.on('error', err => reject(err));
        
        archive.pipe(output);
      });
      
      // Add each image to the archive
      for (const image of shareResult.share.images) {
        // Get image from database to get storage key
        const imageFromDb = await Image.findById(image.id);
        
        if (!imageFromDb || !imageFromDb.storageKey) {
          continue; // Skip images without storage key
        }
        
        // Get image from storage
        const imageResult = await storageService.getFile(imageFromDb.storageKey);
        
        if (!imageResult.success) {
          continue; // Skip failed images
        }
        
        // Add to archive with original filename
        archive.append(imageResult.data, { 
          name: imageFromDb.originalName 
        });
        
        // Increment download count
        await Image.findByIdAndUpdate(image.id, {
          $inc: { downloadCount: 1 }
        });
      }
      
      // Finalize archive
      archive.finalize();
      
      // Wait for archive to be created
      const zipFile = await archivePromise;
      
      return {
        success: true,
        zipFilePath: zipFile,
        fileName: path.basename(zipFile)
      };
    } catch (error) {
      console.error('Error creating share ZIP:', error);
      return {
        success: false,
        message: 'Error creating ZIP archive',
        error: error.message
      };
    }
  }
  
  /**
   * Get a list of shares for a user
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - List of shares
   */
  async getUserShares(userId, options = {}) {
    try {
      // Build query
      const query = { userId };
      
      // Apply filters
      if (options.active === true) {
        // Active shares (not expired)
        query.expiresAt = { $gt: new Date() };
      } else if (options.active === false) {
        // Expired shares
        query.expiresAt = { $lte: new Date() };
      }
      
      // Pagination
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;
      
      // Get total count
      const totalShares = await Share.countDocuments(query);
      
      // Get shares
      const shares = await Share.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // Get image counts
      const sharesWithCounts = await Promise.all(shares.map(async (share) => {
        // Count actual valid images (not deleted)
        const imageCount = await Image.countDocuments({
          _id: { $in: share.images },
          isDeleted: false
        });
        
        return {
          id: share._id,
          shareToken: share.shareToken,
          title: share.title || 'Untitled Share',
          imageCount: imageCount,
          isPasswordProtected: share.isPasswordProtected,
          expiresAt: share.expiresAt,
          isExpired: share.isExpired(),
          accessCount: share.accessCount,
          maxAccess: share.maxAccess,
          isMaxAccessReached: share.isMaxAccessReached(),
          createdAt: share.createdAt,
          lastAccessedAt: share.lastAccessedAt
        };
      }));
      
      return {
        success: true,
        shares: sharesWithCounts,
        pagination: {
          total: totalShares,
          page,
          limit,
          pages: Math.ceil(totalShares / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user shares:', error);
      return {
        success: false,
        message: 'Error retrieving shares',
        error: error.message
      };
    }
  }
  
  /**
   * Delete a share
   * 
   * @param {string} shareId - Share ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result
   */
  async deleteShare(shareId, userId) {
    try {
      // Find share by ID and user ID
      const share = await Share.findOne({
        _id: shareId,
        userId
      });
      
      if (!share) {
        return {
          success: false,
          message: 'Share not found or access denied'
        };
      }
      
      // Delete the share
      await Share.deleteOne({ _id: shareId });
      
      return {
        success: true,
        message: 'Share deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting share:', error);
      return {
        success: false,
        message: 'Error deleting share',
        error: error.message
      };
    }
  }
  
  /**
   * Update share settings
   * 
   * @param {string} shareId - Share ID
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Result
   */
  async updateShare(shareId, userId, updates = {}) {
    try {
      // Find share by ID and user ID
      const share = await Share.findOne({
        _id: shareId,
        userId
      });
      
      if (!share) {
        return {
          success: false,
          message: 'Share not found or access denied'
        };
      }
      
      // Allowed fields to update
      const allowedUpdates = [
        'title', 'description', 'expiresAt', 'maxAccess', 
        'isPasswordProtected', 'password'
      ];
      
      // Apply updates
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          // Special handling for password
          if (field === 'isPasswordProtected' && updates[field] === false) {
            share.password = undefined;
          }
          
          // Special handling for expiration days
          if (field === 'expirationDays' && updates[field]) {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + updates[field]);
            share.expiresAt = expirationDate;
          } else {
            share[field] = updates[field];
          }
        }
      });
      
      // Save changes
      await share.save();
      
      return {
        success: true,
        message: 'Share updated successfully',
        share: {
          id: share._id,
          shareToken: share.shareToken,
          title: share.title,
          description: share.description,
          isPasswordProtected: share.isPasswordProtected,
          expiresAt: share.expiresAt,
          maxAccess: share.maxAccess,
          updatedAt: share.updatedAt
        }
      };
    } catch (error) {
      console.error('Error updating share:', error);
      return {
        success: false,
        message: 'Error updating share',
        error: error.message
      };
    }
  }
  
  /**
   * Get all expired shares
   * 
   * @returns {Promise<Array>} - Array of expired shares
   */
  async getExpiredShares() {
    try {
      return await Share.find({
        expiresAt: { $lt: new Date() }
      });
    } catch (error) {
      console.error('Error getting expired shares:', error);
      return [];
    }
  }
  
  /**
   * Clean up temporary ZIP files
   * 
   * @param {number} maxAgeMins - Maximum age in minutes
   * @returns {Promise<number>} - Number of files cleaned up
   */
  async cleanTempFiles(maxAgeMins = 60) {
    try {
      const files = await fs.readdir(this.tempDir);
      let cleaned = 0;
      
      const maxAgeMs = maxAgeMins * 60 * 1000;
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          
          // Delete if older than max age
          if (now - stats.mtime.getTime() > maxAgeMs) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch (error) {
          console.error(`Error cleaning temp file ${file}:`, error);
        }
      }
      
      return cleaned;
    } catch (error) {
      console.error('Error cleaning temp files:', error);
      return 0;
    }
  }
}

module.exports = new SharingService();