// backend/controllers/watermarkController.js
const watermarkService = require('../services/watermarkService');
const User = require('../models/User');
const fs = require('fs/promises'); // Add this import

/**
 * Watermark Controller
 * 
 * Handles watermark operations for user images
 */
class WatermarkController {
  /**
   * Get user's watermark settings
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWatermarkSettings(req, res) {
    try {
      const userId = req.user.id;
      const watermark = await watermarkService.getUserWatermark(userId);

      if (!watermark) {
        return res.json({
          success: true,
          hasWatermark: false,
          message: 'No watermark configured for this user'
        });
      }

      // Return settings, but not the actual watermark key for security
      return res.json({
        success: true,
        hasWatermark: true,
        watermark: {
          watermarkUrl: watermark.watermarkUrl,
          settings: watermark.settings,
          createdAt: watermark.createdAt,
          updatedAt: watermark.updatedAt
        }
      });
    } catch (error) {
      console.error('Error fetching watermark settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching watermark settings',
        error: error.message
      });
    }
  }
  
  /**
   * Upload a new watermark image
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadWatermark(req, res) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No watermark image provided'
        });
      }

      const userId = req.user.id;

      // Prepare settings
      const settings = {
        position: req.body.position,
        opacity: req.body.opacity ? parseFloat(req.body.opacity) : undefined,
        size: req.body.size ? parseInt(req.body.size) : undefined,
        autoApply: req.body.autoApply === 'true'
      };

      // Remove undefined values
      Object.keys(settings).forEach(key => 
        settings[key] === undefined && delete settings[key]
      );

      // Get the file buffer - handle both multer storage methods
      let fileBuffer;
      if (req.file.buffer) {
        fileBuffer = req.file.buffer;
      } else if (req.file.path) {
        fileBuffer = await fs.readFile(req.file.path);
      } else {
        return res.status(500).json({
          success: false,
          message: 'File data not available'
        });
      }

      // Save watermark
      const result = await watermarkService.saveWatermark(
        userId,
        fileBuffer,
        settings
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message || 'Failed to save watermark'
        });
      }

      res.json({
        success: true,
        message: 'Watermark uploaded successfully',
        watermark: {
          watermarkUrl: result.watermark.watermarkUrl,
          settings: result.watermark.settings
        }
      });
    } catch (error) {
      console.error('Error uploading watermark:', error);

      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 2MB.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error uploading watermark',
        error: error.message
      });
    }
  }
  
  /**
   * Update watermark settings
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateWatermarkSettings(req, res) {
    try {
      const userId = req.user.id;

      // Prepare settings
      const settings = {
        position: req.body.position,
        opacity: req.body.opacity ? parseFloat(req.body.opacity) : undefined,
        size: req.body.size ? parseInt(req.body.size) : undefined,
        padding: req.body.padding ? parseInt(req.body.padding) : undefined,
        autoApply: req.body.autoApply === 'true'
      };

      // Remove undefined values
      Object.keys(settings).forEach(key => 
        settings[key] === undefined && delete settings[key]
      );

      // Check if user has a watermark
      const watermark = await watermarkService.getUserWatermark(userId);

      if (!watermark) {
        return res.status(404).json({
          success: false,
          message: 'No watermark found for this user'
        });
      }

      // Update settings
      const result = await watermarkService.updateWatermarkSettings(userId, settings);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message || 'Failed to update watermark settings'
        });
      }

      res.json({
        success: true,
        message: 'Watermark settings updated successfully',
        settings: result.watermark.settings
      });
    } catch (error) {
      console.error('Error updating watermark settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating watermark settings',
        error: error.message
      });
    }
  }
  
  /**
   * Delete user's watermark
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteWatermark(req, res) {
    try {
      const userId = req.user.id;

      // Remove watermark
      const result = await watermarkService.removeWatermark(userId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.message || 'No watermark found for this user'
        });
      }

      res.json({
        success: true,
        message: 'Watermark removed successfully'
      });
    } catch (error) {
      console.error('Error removing watermark:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing watermark',
        error: error.message
      });
    }
  }
  
  /**
   * Generate a preview of an image with watermark applied
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async previewWatermark(req, res) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image provided'
        });
      }

      const userId = req.user.id;

      // Prepare custom settings for preview
      const settings = {
        position: req.body.position,
        opacity: req.body.opacity ? parseFloat(req.body.opacity) : undefined,
        size: req.body.size ? parseInt(req.body.size) : undefined
      };

      // Remove undefined values
      Object.keys(settings).forEach(key => 
        settings[key] === undefined && delete settings[key]
      );

      // Get the file buffer - handle both multer storage methods
      let fileBuffer;
      if (req.file.buffer) {
        fileBuffer = req.file.buffer;
      } else if (req.file.path) {
        fileBuffer = await fs.readFile(req.file.path);
      } else {
        return res.status(500).json({
          success: false,
          message: 'File data not available'
        });
      }

      // Apply watermark to preview image
      const watermarkedImage = await watermarkService.applyWatermark(
        fileBuffer,
        userId,
        settings
      );

      // Send the watermarked image
      res.set('Content-Type', req.file.mimetype);
      res.send(watermarkedImage);
    } catch (error) {
      console.error('Error generating watermark preview:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating watermark preview',
        error: error.message
      });
    }
  }
}

module.exports = new WatermarkController();