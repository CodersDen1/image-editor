// backend/services/watermarkService.js
const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const User = require('../models/User');
const Watermark = require('../models/Watermark');
const storageService = require('../utils/storageServiceSelector').service;

/**
 * Watermark Service
 * Handles watermark operations for user images
 */
class WatermarkService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'realestate-imagepro-watermarks');
    this.ensureTempDir();
  }
  
  /**
   * Create temp directory if it doesn't exist
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating watermark temp directory:', error);
    }
  }
  
  /**
   * Get user's watermark settings
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Watermark settings or null if not found
   */
  async getUserWatermark(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.watermark || !user.watermark.watermarkKey) {
        return null;
      }
      
      return user.watermark;
    } catch (error) {
      console.error('Error getting user watermark:', error);
      return null;
    }
  }
  
  /**
   * Save a new watermark for a user
   * 
   * @param {string} userId - User ID
   * @param {Buffer} imageBuffer - Watermark image buffer
   * @param {Object} settings - Watermark settings
   * @returns {Promise<Object>} - Result of operation
   */
  async saveWatermark(userId, imageBuffer, settings = {}) {
    try {
      // Get existing watermark if any to delete it
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Delete old watermark if exists
      if (user.watermark && user.watermark.watermarkKey) {
        await this.removeWatermark(userId);
      }
      
      // Process the watermark image
      const metadata = await sharp(imageBuffer).metadata();
      
      // If the image is not PNG, convert it to PNG with transparency
      let processedImage = imageBuffer;
      if (metadata.format !== 'png') {
        processedImage = await sharp(imageBuffer)
          .png()
          .toBuffer();
      }
      
      // Generate a temporary filename
      const tempFilename = `watermark-${crypto.randomBytes(8).toString('hex')}.png`;
      const tempFilePath = path.join(this.tempDir, tempFilename);
      
      // Save processed image to temp file
      await fs.writeFile(tempFilePath, processedImage);
      
      // Upload to storage service
      const uploadResult = await storageService.uploadFile(
        processedImage,
        tempFilename,
        userId,
        {
          type: 'watermark',
          contentType: 'image/png',
          width: metadata.width,
          height: metadata.height
        }
      );
      
      if (!uploadResult.success) {
        return {
          success: false,
          message: 'Failed to upload watermark to storage'
        };
      }
      
      // Clean up temp file
      await fs.unlink(tempFilePath).catch(err => {
        console.error('Error deleting temp watermark file:', err);
      });
      
      // Merge settings with defaults
      const defaultSettings = Watermark.getDefaultSettings();
      const mergedSettings = {
        ...defaultSettings,
        ...settings
      };
      
      // Update user's watermark information
      user.watermark = {
        watermarkKey: uploadResult.key,
        watermarkUrl: uploadResult.url,
        settings: mergedSettings,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await user.save();
      
      return {
        success: true,
        message: 'Watermark saved successfully',
        watermark: user.watermark
      };
    } catch (error) {
      console.error('Error saving watermark:', error);
      return {
        success: false,
        message: 'Error saving watermark: ' + error.message
      };
    }
  }
  
  /**
   * Update watermark settings
   * 
   * @param {string} userId - User ID
   * @param {Object} settings - New settings
   * @returns {Promise<Object>} - Result of operation
   */
  async updateWatermarkSettings(userId, settings = {}) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.watermark || !user.watermark.watermarkKey) {
        return {
          success: false,
          message: 'No watermark found for this user'
        };
      }
      
      // Update settings
      user.watermark.settings = {
        ...user.watermark.settings,
        ...settings
      };
      
      user.watermark.updatedAt = new Date();
      await user.save();
      
      return {
        success: true,
        message: 'Watermark settings updated successfully',
        watermark: user.watermark
      };
    } catch (error) {
      console.error('Error updating watermark settings:', error);
      return {
        success: false,
        message: 'Error updating watermark settings: ' + error.message
      };
    }
  }
  
  /**
   * Remove user's watermark
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of operation
   */
  async removeWatermark(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.watermark || !user.watermark.watermarkKey) {
        return {
          success: false,
          message: 'No watermark found for this user'
        };
      }
      
      // Delete watermark from storage
      const watermarkKey = user.watermark.watermarkKey;
      await storageService.deleteFile(watermarkKey, userId);
      
      // Remove watermark from user
      user.watermark = undefined;
      await user.save();
      
      return {
        success: true,
        message: 'Watermark removed successfully'
      };
    } catch (error) {
      console.error('Error removing watermark:', error);
      return {
        success: false,
        message: 'Error removing watermark: ' + error.message
      };
    }
  }
  
  /**
   * Apply watermark to an image
   * 
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} userId - User ID
   * @param {Object} customSettings - Optional custom settings
   * @returns {Promise<Buffer>} - Watermarked image buffer
   */
  async applyWatermark(imageBuffer, userId, customSettings = {}) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.watermark || !user.watermark.watermarkKey) {
        // Return original image if no watermark
        return imageBuffer;
      }
      
      // Get watermark from storage
      const watermarkResult = await storageService.getFile(user.watermark.watermarkKey);
      
      if (!watermarkResult.success) {
        console.error('Error retrieving watermark from storage:', watermarkResult.error);
        return imageBuffer;
      }
      
      // Get watermark buffer
      const watermarkBuffer = watermarkResult.data;
      
      // Merge settings - custom settings override default
      const settings = {
        ...user.watermark.settings,
        ...customSettings
      };
      
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      // Calculate watermark size based on settings
      const watermarkWidth = Math.round((metadata.width * settings.size) / 100);
      
      // Resize watermark
      const resizedWatermark = await sharp(watermarkBuffer)
        .resize(watermarkWidth)
        .png()
        .toBuffer();
      
      // Process watermark with opacity
      const processedWatermark = await sharp(resizedWatermark)
        .composite([{
          input: Buffer.from([
            255, 255, 255, Math.round(settings.opacity * 255)
          ]),
          raw: {
            width: 1,
            height: 1,
            channels: 4
          },
          tile: true,
          blend: 'dest-in'
        }])
        .toBuffer();
      
      // Get position coordinates
      const padding = settings.padding || 20;
      const gravity = this._getGravityFromPosition(settings.position);
      
      // Apply watermark to image
      const watermarkedImage = await sharp(imageBuffer)
        .composite([{
          input: processedWatermark,
          gravity: gravity,
          top: gravity.includes('north') ? padding : undefined,
          left: gravity.includes('west') ? padding : undefined,
          bottom: gravity.includes('south') ? padding : undefined,
          right: gravity.includes('east') ? padding : undefined,
        }])
        .toBuffer();
      
      return watermarkedImage;
    } catch (error) {
      console.error('Error applying watermark:', error);
      // Return original image if error
      return imageBuffer;
    }
  }
  
  /**
   * Convert position to Sharp gravity
   * 
   * @param {string} position - Position (topLeft, topRight, etc.)
   * @returns {string} - Sharp gravity value
   * @private
   */
  _getGravityFromPosition(position) {
    switch (position) {
      case 'topLeft':
        return 'northwest';
      case 'topRight':
        return 'northeast';
      case 'bottomLeft':
        return 'southwest';
      case 'bottomRight':
        return 'southeast';
      case 'center':
        return 'center';
      default:
        return 'southeast'; // Default to bottom right
    }
  }
}

module.exports = new WatermarkService();