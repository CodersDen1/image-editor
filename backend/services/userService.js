// backend/services/userService.js
const User = require('../models/User');
const Image = require('../models/Image');
const storageService = require('../utils/storageServiceSelector').service;
const emailConfig = require('../config/email');
const path = require('path');
const fs = require('fs/promises');

/**
 * User Service
 * Handles user profile management and statistics
 */
class UserService {
  /**
   * Get user profile
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User profile data
   */
  async getProfile(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Get storage usage statistics
      const storageUsed = user.storage?.used || 0;
      const storageLimit = user.storage?.limit || 0;
      const usagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;
      
      return {
        success: true,
        profile: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          agency: user.agency,
          profileImage: user.profileImage,
          storage: {
            used: storageUsed,
            limit: storageLimit,
            usagePercentage: Math.min(usagePercentage, 100),
            formattedUsed: this._formatBytes(storageUsed),
            formattedLimit: this._formatBytes(storageLimit)
          },
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        message: 'Error retrieving user profile',
        error: error.message
      };
    }
  }
  
  /**
   * Update user profile
   * 
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} - Update result
   */
  async updateProfile(userId, profileData) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Fields that can be updated
      const updatableFields = ['name', 'agency'];
      
      // Update allowed fields
      updatableFields.forEach(field => {
        if (profileData[field] !== undefined) {
          if (field === 'agency') {
            user.agency = {
              ...user.agency,
              ...profileData.agency
            };
          } else {
            user[field] = profileData[field];
          }
        }
      });
      
      // Save changes
      await user.save();
      
      return {
        success: true,
        message: 'Profile updated successfully',
        profile: {
          id: user._id,
          name: user.name,
          email: user.email,
          agency: user.agency,
          profileImage: user.profileImage
        }
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'Error updating profile',
        error: error.message
      };
    }
  }
  
  /**
   * Upload profile image
   * 
   * @param {string} userId - User ID
   * @param {Object} fileData - File data (buffer, mimetype, etc.)
   * @returns {Promise<Object>} - Upload result
   */
  async uploadProfileImage(userId, fileData) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      if (!fileData || !fileData.buffer) {
        return {
          success: false,
          message: 'No file provided'
        };
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(fileData.mimetype)) {
        return {
          success: false,
          message: 'Invalid file type. Only JPEG and PNG are allowed.'
        };
      }
      
      // Check file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (fileData.size > maxSize) {
        return {
          success: false,
          message: 'File too large. Maximum size is 2MB.'
        };
      }
      
      // Delete old profile image if exists
      if (user.profileImage) {
        const oldImageKey = this._extractStorageKeyFromUrl(user.profileImage);
        if (oldImageKey) {
          await storageService.deleteFile(oldImageKey, userId);
        }
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `profile-${timestamp}${path.extname(fileData.originalname)}`;
      
      // Upload to storage
      const uploadResult = await storageService.uploadFile(
        fileData.buffer,
        filename,
        userId,
        {
          type: 'profile',
          contentType: fileData.mimetype
        }
      );
      
      if (!uploadResult.success) {
        return {
          success: false,
          message: 'Failed to upload profile image',
          error: uploadResult.error
        };
      }
      
      // Update user profile
      user.profileImage = uploadResult.url;
      await user.save();
      
      return {
        success: true,
        message: 'Profile image uploaded successfully',
        profileImage: user.profileImage
      };
    } catch (error) {
      console.error('Upload profile image error:', error);
      return {
        success: false,
        message: 'Error uploading profile image',
        error: error.message
      };
    }
  }
  
  /**
   * Delete profile image
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Delete result
   */
  async deleteProfileImage(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Check if user has a profile image
      if (!user.profileImage) {
        return {
          success: false,
          message: 'No profile image to delete'
        };
      }
      
      // Delete profile image from storage
      const imageKey = this._extractStorageKeyFromUrl(user.profileImage);
      if (imageKey) {
        await storageService.deleteFile(imageKey, userId);
      }
      
      // Update user profile
      user.profileImage = null;
      await user.save();
      
      return {
        success: true,
        message: 'Profile image deleted successfully'
      };
    } catch (error) {
      console.error('Delete profile image error:', error);
      return {
        success: false,
        message: 'Error deleting profile image',
        error: error.message
      };
    }
  }
  
  /**
   * Get user statistics
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User statistics
   */
  async getUserStats(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Get total images count
      const totalImages = await Image.countDocuments({ 
        userId, 
        isDeleted: false,
        parentImageId: null // Only count original images, not processed versions
      });
      
      // Get total processed images count
      const totalProcessedImages = await Image.countDocuments({ 
        userId, 
        isDeleted: false,
        parentImageId: { $ne: null } // Only count processed versions
      });
      
      // Get images uploaded in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentImages = await Image.countDocuments({
        userId,
        isDeleted: false,
        parentImageId: null,
        createdAt: { $gte: thirtyDaysAgo }
      });
      
      // Get images processed in the last 30 days
      const recentProcessedImages = await Image.countDocuments({
        userId,
        isDeleted: false,
        parentImageId: { $ne: null },
        createdAt: { $gte: thirtyDaysAgo }
      });
      
      // Get storage usage
      const storageUsed = user.storage?.used || 0;
      const storageLimit = user.storage?.limit || 0;
      const storagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;
      
      // Get most used tags
      const tagData = await Image.aggregate([
        { $match: { userId, isDeleted: false } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      const topTags = tagData.map(tag => ({
        name: tag._id,
        count: tag.count
      }));
      
      return {
        success: true,
        stats: {
          totalImages,
          totalProcessedImages,
          recentImages,
          recentProcessedImages,
          storage: {
            used: storageUsed,
            limit: storageLimit,
            percentage: Math.min(storagePercentage, 100),
            formattedUsed: this._formatBytes(storageUsed),
            formattedLimit: this._formatBytes(storageLimit)
          },
          topTags,
          accountAge: this._getDaysSince(user.createdAt),
          lastLogin: user.lastLoginAt
        }
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      return {
        success: false,
        message: 'Error retrieving user statistics',
        error: error.message
      };
    }
  }
  
  /**
   * Update user email
   * 
   * @param {string} userId - User ID
   * @param {string} newEmail - New email address
   * @param {string} password - Current password for verification
   * @returns {Promise<Object>} - Update result
   */
  async updateEmail(userId, newEmail, password) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Verify password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return {
          success: false,
          message: 'Incorrect password'
        };
      }
      
      // Check if email is already in use
      const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
      
      if (existingUser && existingUser._id.toString() !== userId) {
        return {
          success: false,
          message: 'Email is already in use'
        };
      }
      
      // Store old email for notification
      const oldEmail = user.email;
      
      // Update email
      user.email = newEmail.toLowerCase();
      
      // Invalidate all refresh tokens for security
      user.refreshTokens = [];
      
      await user.save();
      
      // Send notification to old email
      await emailConfig.sendEmail({
        to: oldEmail,
        template: 'accountUpdate',
        data: {
          name: user.name,
          action: 'email change',
          newEmail: newEmail
        }
      });
      
      // Send confirmation to new email
      await emailConfig.sendEmail({
        to: newEmail,
        template: 'accountUpdate',
        data: {
          name: user.name,
          action: 'email confirmation'
        }
      });
      
      return {
        success: true,
        message: 'Email updated successfully. Please login again with your new email.'
      };
    } catch (error) {
      console.error('Update email error:', error);
      return {
        success: false,
        message: 'Error updating email',
        error: error.message
      };
    }
  }
  
  /**
   * Deactivate user account
   * 
   * @param {string} userId - User ID
   * @param {string} password - Current password for verification
   * @returns {Promise<Object>} - Deactivation result
   */
  async deactivateAccount(userId, password) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Verify password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return {
          success: false,
          message: 'Incorrect password'
        };
      }
      
      // Deactivate account
      user.isActive = false;
      
      // Invalidate all refresh tokens
      user.refreshTokens = [];
      
      await user.save();
      
      // Send deactivation notification
      await emailConfig.sendEmail({
        to: user.email,
        template: 'accountUpdate',
        data: {
          name: user.name,
          action: 'account deactivation'
        }
      });
      
      return {
        success: true,
        message: 'Account deactivated successfully'
      };
    } catch (error) {
      console.error('Deactivate account error:', error);
      return {
        success: false,
        message: 'Error deactivating account',
        error: error.message
      };
    }
  }
  
  /**
   * Calculate total storage used by user
   * 
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Total storage in bytes
   */
  async calculateStorageUsed(userId) {
    try {
      // Aggregate total size of all non-deleted images
      const result = await Image.aggregate([
        { $match: { userId, isDeleted: false } },
        { $group: { _id: null, totalSize: { $sum: '$size' } } }
      ]);
      
      return result.length > 0 ? result[0].totalSize : 0;
    } catch (error) {
      console.error('Calculate storage error:', error);
      return 0;
    }
  }
  
  /**
   * Update storage usage for user
   * 
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  async updateStorageUsage(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return false;
      }
      
      // Calculate storage
      const storageUsed = await this.calculateStorageUsed(userId);
      
      // Update user
      user.storage = {
        used: storageUsed,
        limit: user.storage?.limit || 0
      };
      
      await user.save();
      
      return true;
    } catch (error) {
      console.error('Update storage usage error:', error);
      return false;
    }
  }
  
  /**
   * Format bytes to human-readable string
   * 
   * @param {number} bytes - Bytes to format
   * @param {number} decimals - Decimal places
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
  
  /**
   * Get days since a date
   * 
   * @param {Date} date - Date to calculate from
   * @returns {number} - Days since date
   * @private
   */
  _getDaysSince(date) {
    const now = new Date();
    const diffTime = Math.abs(now - new Date(date));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Extract storage key from URL
   * 
   * @param {string} url - URL to parse
   * @returns {string} - Storage key
   * @private
   */
  _extractStorageKeyFromUrl(url) {
    if (!url) return null;
    
    try {
      // For Cloudflare R2 public URLs
      if (url.includes('r2.dev')) {
        const matches = url.match(/\.r2\.dev\/(.+)$/);
        return matches && matches[1] ? matches[1] : null;
      }
      
      // For API-served URLs
      const matches = url.match(/\/api\/images\/view\/(.+)$/);
      return matches && matches[1] ? decodeURIComponent(matches[1]) : null;
    } catch (error) {
      console.error('Error extracting storage key:', error);
      return null;
    }
  }
}

module.exports = new UserService();