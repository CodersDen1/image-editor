// backend/controllers/processingController.js
const path = require('path');
const fs = require('fs/promises');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const imageProcessor = require('../services/imageProcessor');
const storageService = require('../utils/storageServiceSelector').service;
const watermarkService = require('../services/watermarkService');
const Image = require('../models/Image');
const User = require('../models/User');
const processingConfig = require('../config/processing');

/**
 * Processing Controller
 * 
 * Handles image processing operations including auto and manual enhancement
 */
class ProcessingController {
  /**
   * Process an image using automatic enhancements
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async autoProcess(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      // Validate request body
      if (!imageId) {
        return res.status(400).json({
          success: false,
          message: 'Image ID is required'
        });
      }
      
      // Get image metadata from database
      const image = await Image.findOne({ 
        _id: imageId,
        userId: userId,
        isDeleted: false
      });
      
      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image not found or access denied'
        });
      }
      
      // Get processing options
      const options = {
        ...req.body,
        userId: userId
      };
      
      // Check if this is a preview only (no save)
      const isPreview = req.preview === true;
      
      // Create temp directory for processing
      const tempDir = path.join(os.tmpdir(), 'realestate-imagepro', uuidv4());
      await fs.mkdir(tempDir, { recursive: true });
      
      // Output file path
      const outputFileName = `${path.parse(image.originalName).name}-processed${path.extname(image.originalName)}`;
      const outputPath = path.join(tempDir, outputFileName);
      
      // Get image from storage
      const imageResult = await storageService.getFile(image.storageKey);
      
      if (!imageResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve image from storage'
        });
      }
      
      // Apply user's watermark if enabled
      if (options.watermark && options.watermark.enabled && options.watermark.useUserWatermark) {
        const user = await User.findById(userId);
        if (user && user.watermark && user.watermark.watermarkKey) {
          options.watermark = {
            ...options.watermark,
            ...user.watermark.settings
          };
        }
      }
      
      // Process image
      const processResult = await imageProcessor.autoProcess(
        imageResult.data,
        outputPath,
        options
      );
      
      if (!processResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Image processing failed',
          error: processResult.error
        });
      }
      
      // If this is just a preview, return the processed image directly
      if (isPreview) {
        // Read processed image
        const processedImageBuffer = await fs.readFile(outputPath);
        
        // Clean up
        await fs.unlink(outputPath);
        await fs.rmdir(tempDir, { recursive: true });
        
        // Send the processed image
        res.set('Content-Type', `image/${path.extname(outputPath).substring(1)}`);
        return res.send(processedImageBuffer);
      }
      
      // Read processed image
      const processedImageBuffer = await fs.readFile(outputPath);
      
      // Get dimensions of processed image
      const processedMetadata = await imageProcessor.getImageMetadata(outputPath);
      
      // Upload processed image to storage
      const storageResult = await storageService.uploadFile(
        processedImageBuffer,
        outputFileName,
        userId,
        {
          originalId: image._id,
          processingType: 'auto',
          settings: processResult.applied,
          width: processedMetadata.width,
          height: processedMetadata.height
        }
      );
      
      if (!storageResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload processed image to storage'
        });
      }
      
      // Create a record for the processed image
      const processedImage = new Image({
        userId: userId,
        originalName: outputFileName,
        storageKey: storageResult.key,
        url: storageResult.url,
        size: processedImageBuffer.length,
        width: processedMetadata.width,
        height: processedMetadata.height,
        mimeType: `image/${path.extname(outputFileName).substring(1)}`,
        parentImageId: image._id,
        processingType: 'auto',
        processingSettings: processResult.applied,
        tags: image.tags,
        projectId: image.projectId,
        isProcessed: true
      });
      
      await processedImage.save();
      
      // Clean up temporary files
      await fs.unlink(outputPath);
      await fs.rmdir(tempDir, { recursive: true });
      
      return res.json({
        success: true,
        message: 'Image processed successfully',
        image: {
          id: processedImage._id,
          name: processedImage.originalName,
          url: processedImage.url,
          width: processedImage.width,
          height: processedImage.height,
          size: processedImage.size,
          processingType: processedImage.processingType,
          processingSettings: processedImage.processingSettings,
          createdAt: processedImage.createdAt
        }
      });
    } catch (error) {
      console.error('Auto processing error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error processing image',
        error: error.message
      });
    }
  }
  
  /**
   * Process an image using manual adjustments
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async manualProcess(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      // Validate request body
      if (!imageId || !req.body.adjustments) {
        return res.status(400).json({
          success: false,
          message: 'Image ID and adjustments are required'
        });
      }
      
      // Get image metadata from database
      const image = await Image.findOne({ 
        _id: imageId,
        userId: userId,
        isDeleted: false
      });
      
      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image not found or access denied'
        });
      }
      
      // Create temp directory for processing
      const tempDir = path.join(os.tmpdir(), 'realestate-imagepro', uuidv4());
      await fs.mkdir(tempDir, { recursive: true });
      
      // Output file path
      const outputFileName = `${path.parse(image.originalName).name}-processed${path.extname(image.originalName)}`;
      const outputPath = path.join(tempDir, outputFileName);
      
      // Get image from storage
      const imageResult = await storageService.getFile(image.storageKey);
      
      if (!imageResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve image from storage'
        });
      }
      
      // Check if this is a preview only (no save)
      const isPreview = req.preview === true;
      
      // Add user ID to adjustments for watermark handling
      const adjustments = {
        ...req.body.adjustments,
        userId: userId
      };
      
      // Apply user's watermark if enabled
      if (adjustments.watermarkEnabled && adjustments.useUserWatermark) {
        const user = await User.findById(userId);
        if (user && user.watermark) {
          adjustments.watermark = {
            enabled: true,
            ...user.watermark.settings
          };
        }
      }
      
      // Process image
      const processResult = await imageProcessor.manualProcess(
        imageResult.data,
        outputPath,
        adjustments
      );
      
      if (!processResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Image processing failed',
          error: processResult.error
        });
      }
      
      // If this is just a preview, return the processed image directly
      if (isPreview) {
        // Read processed image
        const processedImageBuffer = await fs.readFile(outputPath);
        
        // Clean up
        await fs.unlink(outputPath);
        await fs.rmdir(tempDir, { recursive: true });
        
        // Send the processed image
        res.set('Content-Type', `image/${path.extname(outputPath).substring(1)}`);
        return res.send(processedImageBuffer);
      }
      
      // Read processed image
      const processedImageBuffer = await fs.readFile(outputPath);
      
      // Get dimensions of processed image
      const processedMetadata = await imageProcessor.getImageMetadata(outputPath);
      
      // Upload processed image to storage
      const storageResult = await storageService.uploadFile(
        processedImageBuffer,
        outputFileName,
        userId,
        {
          originalId: image._id,
          processingType: 'manual',
          settings: adjustments
        }
      );
      
      if (!storageResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload processed image to storage'
        });
      }
      
      // Create a record for the processed image
      const processedImage = new Image({
        userId: userId,
        originalName: outputFileName,
        storageKey: storageResult.key,
        url: storageResult.url,
        size: processedImageBuffer.length,
        width: processedMetadata.width,
        height: processedMetadata.height,
        mimeType: `image/${path.extname(outputFileName).substring(1)}`,
        parentImageId: image._id,
        processingType: 'manual',
        processingSettings: adjustments,
        tags: image.tags,
        projectId: image.projectId,
        isProcessed: true
      });
      
      await processedImage.save();
      
      // Clean up temporary files
      await fs.unlink(outputPath);
      await fs.rmdir(tempDir, { recursive: true });
      
      return res.json({
        success: true,
        message: 'Image processed successfully',
        image: {
          id: processedImage._id,
          name: processedImage.originalName,
          url: processedImage.url,
          width: processedImage.width,
          height: processedImage.height,
          size: processedImage.size,
          processingType: processedImage.processingType,
          processingSettings: processedImage.processingSettings,
          createdAt: processedImage.createdAt
        }
      });
    } catch (error) {
      console.error('Manual processing error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error processing image',
        error: error.message
      });
    }
  }
  
  /**
   * Process multiple images in batch
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async batchProcess(req, res) {
    try {
      const { imageIds, mode, options } = req.body;
      const userId = req.user.id;
      
      // Validate request body
      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Image IDs array is required'
        });
      }
      
      // Default to auto mode if not specified
      const processingMode = mode || 'auto';
      if (!['auto', 'manual'].includes(processingMode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid processing mode, must be "auto" or "manual"'
        });
      }
      
      // Get images metadata from database
      const images = await Image.find({ 
        _id: { $in: imageIds },
        userId: userId,
        isDeleted: false
      });
      
      if (images.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No images found or access denied'
        });
      }
      
      // Create temp directory for processing
      const batchId = uuidv4();
      const tempDir = path.join(os.tmpdir(), 'realestate-imagepro', batchId);
      await fs.mkdir(tempDir, { recursive: true });
      
      // Process images
      const results = {
        success: [],
        failed: []
      };
      
      // Add user ID to options for watermark handling
      const processingOptions = {
        ...options,
        userId: userId
      };
      
      // Apply user's watermark if enabled
      if (processingOptions.watermark && processingOptions.watermark.enabled && processingOptions.watermark.useUserWatermark) {
        const user = await User.findById(userId);
        if (user && user.watermark) {
          processingOptions.watermark = {
            ...processingOptions.watermark,
            ...user.watermark.settings
          };
        }
      }
      
      // Process each image
      for (const image of images) {
        try {
          // Create output path
          const outputFileName = `${path.parse(image.originalName).name}-processed${path.extname(image.originalName)}`;
          const outputPath = path.join(tempDir, outputFileName);
          
          // Get image from storage
          const imageResult = await storageService.getFile(image.storageKey);
          
          if (!imageResult.success) {
            results.failed.push({
              id: image._id,
              name: image.originalName,
              error: 'Failed to retrieve image from storage'
            });
            continue;
          }
          
          // Process image
          let processResult;
          if (processingMode === 'auto') {
            processResult = await imageProcessor.autoProcess(
              imageResult.data,
              outputPath,
              processingOptions
            );
          } else {
            processResult = await imageProcessor.manualProcess(
              imageResult.data,
              outputPath,
              processingOptions
            );
          }
          
          if (!processResult.success) {
            results.failed.push({
              id: image._id,
              name: image.originalName,
              error: processResult.error || 'Processing failed'
            });
            continue;
          }
          
          // Read processed image
          const processedImageBuffer = await fs.readFile(outputPath);
          
          // Get dimensions of processed image
          const processedMetadata = await imageProcessor.getImageMetadata(outputPath);
          
          // Upload processed image to storage
          const storageResult = await storageService.uploadFile(
            processedImageBuffer,
            outputFileName,
            userId,
            {
              originalId: image._id,
              processingType: processingMode,
              settings: processingMode === 'auto' ? processResult.applied : processingOptions
            }
          );
          
          if (!storageResult.success) {
            results.failed.push({
              id: image._id,
              name: image.originalName,
              error: 'Failed to upload processed image to storage'
            });
            continue;
          }
          
          // Create a record for the processed image
          const processedImage = new Image({
            userId: userId,
            originalName: outputFileName,
            storageKey: storageResult.key,
            url: storageResult.url,
            size: processedImageBuffer.length,
            width: processedMetadata.width,
            height: processedMetadata.height,
            mimeType: `image/${path.extname(outputFileName).substring(1)}`,
            parentImageId: image._id,
            processingType: processingMode,
            processingSettings: processingMode === 'auto' ? processResult.applied : processingOptions,
            tags: image.tags,
            projectId: image.projectId,
            isProcessed: true
          });
          
          await processedImage.save();
          
          // Add to success results
          results.success.push({
            id: processedImage._id,
            originalId: image._id,
            name: processedImage.originalName,
            url: processedImage.url
          });
        } catch (error) {
          console.error(`Error processing image ${image._id}:`, error);
          results.failed.push({
            id: image._id,
            name: image.originalName,
            error: error.message
          });
        }
      }
      
      // Clean up temporary files
      try {
        await fs.rmdir(tempDir, { recursive: true });
      } catch (error) {
        console.error('Error cleaning up temp directory:', error);
      }
      
      return res.json({
        success: true,
        message: `Batch processing complete. ${results.success.length} succeeded, ${results.failed.length} failed.`,
        results: results
      });
    } catch (error) {
      console.error('Batch processing error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error processing images',
        error: error.message
      });
    }
  }
  
  /**
   * Get processing presets
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPresets(req, res) {
    try {
      const userId = req.user.id;
      
      // Get default presets
      const defaultPresets = processingConfig.defaultPresets;
      
      // Format presets for frontend
      const presetList = Object.entries(defaultPresets).map(([name, settings]) => ({
        id: name,
        name: this._formatPresetName(name),
        description: this._getPresetDescription(name),
        isDefault: true,
        settings: settings
      }));
      
      // Get user's custom presets
      const userPresets = await imageProcessor.getUserPresets(userId);
      
      // Combine presets
      const allPresets = [
        ...presetList,
        ...userPresets.filter(p => !p.isDefault)
      ];
      
      return res.json({
        success: true,
        presets: allPresets
      });
    } catch (error) {
      console.error('Error getting presets:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error retrieving presets',
        error: error.message
      });
    }
  }
  
  /**
   * Save a processing preset
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async savePreset(req, res) {
    try {
      const { name, settings } = req.body;
      const userId = req.user.id;
      
      // Validate request body
      if (!name || !settings) {
        return res.status(400).json({
          success: false,
          message: 'Preset name and settings are required'
        });
      }
      
      // Save preset
      const preset = await imageProcessor.savePreset(name, settings, userId);
      
      return res.json({
        success: true,
        message: 'Preset saved successfully',
        preset: {
          id: preset._id || name,
          name: preset.name,
          isDefault: false,
          settings: preset.settings
        }
      });
    } catch (error) {
      console.error('Error saving preset:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error saving preset',
        error: error.message
      });
    }
  }
  
  /**
   * Detect scene type for automatic preset suggestion
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async detectSceneType(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      // Get image from database
      const image = await Image.findOne({
        _id: imageId,
        userId: userId,
        isDeleted: false
      });
      
      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image not found or access denied'
        });
      }
      
      // Get image data from storage
      const imageResult = await storageService.getFile(image.storageKey);
      
      if (!imageResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve image from storage'
        });
      }
      
      // Detect scene type
      const sceneType = await imageProcessor.detectSceneType(imageResult.data);
      
      // Map scene type to preset
      const presetMapping = {
        'interior': 'interior',
        'exterior': 'exterior',
        'twilight': 'twilight',
        'default': 'natural'
      };
      
      const suggestedPreset = presetMapping[sceneType] || presetMapping.default;
      
      return res.json({
        success: true,
        sceneType: sceneType,
        suggestedPreset: suggestedPreset,
        confidence: 85 // Hardcoded for now, in a real implementation this would come from ML model
      });
    } catch (error) {
      console.error('Error detecting scene type:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error detecting scene type',
        error: error.message
      });
    }
  }
  
  /**
   * Format preset name for display
   * 
   * @param {string} name - Preset key
   * @returns {string} - Formatted name
   * @private
   */
  _formatPresetName(name) {
    switch (name) {
      case 'natural': return 'Natural Look';
      case 'bright': return 'Bright & Airy';
      case 'professional': return 'Professional';
      case 'hdr': return 'HDR Effect';
      case 'interior': return 'Interior Boost';
      case 'exterior': return 'Exterior Pro';
      case 'twilight': return 'Twilight/Evening';
      default: return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  
  /**
   * Get preset description
   * 
   * @param {string} name - Preset key
   * @returns {string} - Description
   * @private
   */
  _getPresetDescription(name) {
    switch (name) {
      case 'natural': return 'Balanced enhancements for natural appearance';
      case 'bright': return 'Increased brightness and contrast for a light, airy feel';
      case 'professional': return 'Sharp details with balanced colors and professional polish';
      case 'hdr': return 'High dynamic range look with detail in shadows and highlights';
      case 'interior': return 'Optimized for indoor spaces with balanced window exposure';
      case 'exterior': return 'Enhanced architecture with vibrant colors and clear details';
      case 'twilight': return 'Evening mood with warm tones and balanced lighting';
      default: return 'Custom preset';
    }
  }
}

module.exports = new ProcessingController();