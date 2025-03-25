// backend/services/imageProcessor.js
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const processingConfig = require('../config/processing');
const watermarkService = require('./watermarkService');
const Preset = require('../models/Preset');
const User = require('../models/User');

/**
 * Image Processor Service
 * Handles image processing and enhancement operations
 */
class ImageProcessor {
  constructor() {
    // Default settings for auto enhancement
    this.autoSettings = processingConfig.processingConfig.autoSettings;
    
    // Default presets
    this.defaultPresets = processingConfig.defaultPresets;
    
    // Output formats
    this.outputFormats = processingConfig.outputFormats;
  }
  
  /**
   * Process an image with automatic enhancements
   * 
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} outputPath - Path to save processed image
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Result of processing
   */
  async autoProcess(imageBuffer, outputPath, options = {}) {
    try {
      // Start with a pipeline
      let processor = sharp(imageBuffer);
      
      // Get user preset if specified
      let settings = { ...this.autoSettings };
      
      if (options.preset) {
        const presetSettings = await this._getPresetSettings(options.preset, options.userId);
        if (presetSettings) {
          settings = { ...settings, ...presetSettings };
        }
      }
      
      // Override with any provided options
      settings = { ...settings, ...options };
      
      // Track applied settings
      const applied = { ...settings };
      
      // Apply brightness, contrast, saturation
      if (settings.brightness !== undefined || 
          settings.contrast !== undefined || 
          settings.saturation !== undefined) {
        
        processor = processor.modulate({
          brightness: settings.brightness || 1.0,
          saturation: settings.saturation || 1.0
        });
        
        // Contrast is separate in sharp
        if (settings.contrast !== undefined) {
          processor = processor.linear(
            settings.contrast, // Multiply
            0 // Add (offset)
          );
        }
      }
      
      // Apply sharpening
      if (settings.sharpness) {
        processor = processor.sharpen(settings.sharpness);
      }
      
      // Apply noise reduction if specified
      if (settings.noiseReduction) {
        processor = processor.median(Math.round(settings.noiseReduction * 5));
      }
      
      // Apply white balance adjustment if enabled
      if (settings.whiteBalance) {
        processor = await this._applyAutoWhiteBalance(processor);
      }
      
      // Apply perspective correction if enabled
      if (settings.perspective) {
        processor = await this._applyPerspectiveCorrection(
          processor, 
          imageBuffer
        );
      }
      
      // Apply shadow and highlight adjustments if specified
      if (settings.shadows !== undefined || settings.highlights !== undefined) {
        // Use gamma for shadows and linear for highlights
        // These are approximations since sharp doesn't have direct shadow/highlight controls
        if (settings.shadows !== undefined && settings.shadows > 0) {
          // Lighten shadows
          const shadowGamma = 1 + (settings.shadows / 100);
          processor = processor.gamma(shadowGamma);
        }
        
        if (settings.highlights !== undefined && settings.highlights < 0) {
          // Reduce highlights - use linear adjustment
          const highlightReduction = 1 + (settings.highlights / 100);
          processor = processor.linear(highlightReduction, 0);
        }
      }
      
      // Apply watermark if enabled
      if (settings.watermark && settings.watermark.enabled && options.userId) {
        const watermarkedBuffer = await processor.toBuffer();
        
        // Apply watermark
        const finalBuffer = await watermarkService.applyWatermark(
          watermarkedBuffer,
          options.userId,
          settings.watermark
        );
        
        // Start a new processing pipeline with the watermarked image
        processor = sharp(finalBuffer);
      }
      
      // Set output format and quality
      const format = settings.format || 'jpeg';
      const quality = settings.quality || 85;
      
      // Format-specific settings
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          processor = processor.jpeg({ quality });
          break;
        case 'png':
          processor = processor.png({ quality });
          break;
        case 'webp':
          processor = processor.webp({ quality });
          break;
        case 'tiff':
          processor = processor.tiff({ quality });
          break;
      }
      
      // Save to output path
      await processor.toFile(outputPath);
      
      return {
        success: true,
        outputPath: outputPath,
        applied: applied
      };
    } catch (error) {
      console.error('Error during auto processing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process an image with manual adjustments
   * 
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} outputPath - Path to save processed image
   * @param {Object} adjustments - Manual adjustment parameters
   * @returns {Promise<Object>} - Result of processing
   */
  async manualProcess(imageBuffer, outputPath, adjustments = {}) {
    try {
      // Start with a pipeline
      let processor = sharp(imageBuffer);
      
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      // Apply basic color adjustments
      if (adjustments.color) {
        const color = adjustments.color;
        
        // Brightness and saturation
        const modulateOptions = {};
        
        if (color.brightness !== undefined) {
          // Convert from -100 to 100 range to 0 to 2 range
          modulateOptions.brightness = 1 + (color.brightness / 100);
        }
        
        if (color.saturation !== undefined) {
          // Convert from -100 to 100 range to 0 to 2 range
          modulateOptions.saturation = 1 + (color.saturation / 100);
        }
        
        if (Object.keys(modulateOptions).length > 0) {
          processor = processor.modulate(modulateOptions);
        }
        
        // Contrast (separate operation)
        if (color.contrast !== undefined) {
          // Convert from -100 to 100 range to 0.5 to 1.5 range
          const contrastFactor = 1 + (color.contrast / 100);
          processor = processor.linear(contrastFactor, 0);
        }
        
        // Temperature/tint (white balance adjustment)
        if (color.temperature !== undefined) {
          processor = this._applyTemperatureAdjustment(processor, color.temperature);
        }
      }
      
      // Apply sharpness
      if (adjustments.sharpness) {
        const sharpnessAmount = adjustments.sharpness.amount || 0;
        
        if (sharpnessAmount > 0) {
          // Convert from 0-100 range to 0-5 range
          const sharpnessValue = (sharpnessAmount / 100) * 5;
          processor = processor.sharpen(sharpnessValue);
        }
      }
      
      // Apply tonal adjustments (shadows/highlights)
      if (adjustments.tonalAdjustments) {
        const tonal = adjustments.tonalAdjustments;
        
        // Shadows adjustment (gamma)
        if (tonal.shadows !== undefined && tonal.shadows !== 0) {
          // Convert from -100 to 100 range
          // Positive values lighten shadows, negative values darken them
          const shadowGamma = tonal.shadows > 0 
            ? 1 + (tonal.shadows / 100) 
            : 1 / (1 + (Math.abs(tonal.shadows) / 100));
          
          processor = processor.gamma(shadowGamma);
        }
        
        // Highlights adjustment (linear)
        if (tonal.highlights !== undefined && tonal.highlights !== 0) {
          // Convert from -100 to 100 range
          // Negative values reduce highlights, positive values increase
          const highlightFactor = 1 - (tonal.highlights / 100);
          
          processor = processor.linear(highlightFactor, 0.15);
        }
      }
      
      // Apply perspective correction
      if (adjustments.perspective && Object.keys(adjustments.perspective).length > 0) {
        processor = this._applyManualPerspectiveCorrection(
          processor,
          adjustments.perspective
        );
      }
      
      // Apply crop if enabled
      if (adjustments.cropEnabled && adjustments.crop) {
        const crop = adjustments.crop;
        
        if (crop.width && crop.height && crop.left !== undefined && crop.top !== undefined) {
          processor = processor.extract({
            left: Math.round(crop.left),
            top: Math.round(crop.top),
            width: Math.round(crop.width),
            height: Math.round(crop.height)
          });
        }
      }
      
      // Apply watermark if enabled
      if (adjustments.watermarkEnabled && adjustments.userId) {
        const watermarkedBuffer = await processor.toBuffer();
        
        // Get watermark settings
        const watermarkSettings = {
          position: adjustments.watermarkPosition,
          opacity: adjustments.watermarkOpacity,
          size: adjustments.watermarkSize
        };
        
        // Apply watermark
        const finalBuffer = await watermarkService.applyWatermark(
          watermarkedBuffer,
          adjustments.userId,
          watermarkSettings
        );
        
        // Start a new processing pipeline with the watermarked image
        processor = sharp(finalBuffer);
      }
      
      // Set output format and quality
      let format = 'jpeg';
      let quality = 85;
      
      if (adjustments.output) {
        format = adjustments.output.format || format;
        quality = adjustments.output.quality || quality;
      }
      
      // Format-specific settings
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          processor = processor.jpeg({ quality });
          break;
        case 'png':
          processor = processor.png({ quality });
          break;
        case 'webp':
          processor = processor.webp({ quality });
          break;
        case 'tiff':
          processor = processor.tiff({ quality });
          break;
      }
      
      // Save to output path
      await processor.toFile(outputPath);
      
      return {
        success: true,
        outputPath: outputPath,
        applied: adjustments
      };
    } catch (error) {
      console.error('Error during manual processing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get image metadata
   * 
   * @param {string|Buffer} input - Image path or buffer
   * @returns {Promise<Object>} - Image metadata
   */
  async getImageMetadata(input) {
    try {
      return await sharp(input).metadata();
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw error;
    }
  }
  
  /**
   * Get user presets
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of preset objects
   */
  async getUserPresets(userId) {
    try {
      // Get user's custom presets
      const userPresets = await Preset.find({ userId });
      
      // Map to frontend format
      const mappedUserPresets = userPresets.map(preset => ({
        id: preset._id,
        name: preset.name,
        description: preset.description || '',
        isDefault: preset.isDefault,
        settings: preset.settings,
        usageCount: preset.usageCount,
        createdAt: preset.createdAt
      }));
      
      // Add default presets
      const defaultPresets = Object.entries(this.defaultPresets).map(([id, settings]) => ({
        id,
        name: this._formatPresetName(id),
        description: '',
        isDefault: true,
        settings,
        usageCount: 0
      }));
      
      return [...defaultPresets, ...mappedUserPresets];
    } catch (error) {
      console.error('Error getting user presets:', error);
      return [];
    }
  }
  
  /**
   * Save a user preset
   * 
   * @param {string} name - Preset name
   * @param {Object} settings - Preset settings
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Saved preset
   */
  async savePreset(name, settings, userId) {
    try {
      // Check if preset with this name already exists
      let preset = await Preset.findOne({ userId, name });
      
      if (preset) {
        // Update existing preset
        preset.settings = settings;
        preset.updatedAt = new Date();
      } else {
        // Create new preset
        preset = new Preset({
          userId,
          name,
          settings,
          isDefault: false,
          isPublic: false
        });
      }
      
      await preset.save();
      
      return preset;
    } catch (error) {
      console.error('Error saving preset:', error);
      throw error;
    }
  }
  
  /**
   * Detect scene type for automatic preset suggestion
   * 
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<string>} - Scene type (interior, exterior, twilight)
   */
  async detectSceneType(imageBuffer) {
    try {
      // In a real implementation, this would use ML or image analysis
      // For now, we'll use a simple heuristic based on average brightness
      
      // Get image stats
      const stats = await sharp(imageBuffer)
        .stats();
      
      // Get average brightness across channels
      const avgBrightness = stats.channels.reduce((sum, channel) => {
        return sum + channel.mean;
      }, 0) / stats.channels.length;
      
      // Simple classification based on brightness
      if (avgBrightness < 75) {
        return 'twilight';
      } else if (avgBrightness < 128) {
        return 'interior';
      } else {
        return 'exterior';
      }
    } catch (error) {
      console.error('Error detecting scene type:', error);
      return 'default';
    }
  }
  
  /**
   * Apply auto white balance
   * 
   * @param {Object} processor - Sharp processor
   * @returns {Promise<Object>} - Updated processor
   * @private
   */
  async _applyAutoWhiteBalance(processor) {
    try {
      // Get image stats
      const clonedBuffer = await processor.clone().toBuffer();
      const stats = await sharp(clonedBuffer).stats();
      
      // Calculate adjustments for channels to normalize
      const means = stats.channels.map(channel => channel.mean);
      const maxMean = Math.max(...means);
      
      // Create adjustment factor for each channel
      const adjustments = means.map(mean => maxMean / mean);
      
      // Apply normalization - this is a simple white balance algorithm
      processor = processor.linear(
        adjustments.map(adj => Math.min(adj, 1.5)), // Limit adjustment range
        [0, 0, 0]
      );
      
      return processor;
    } catch (error) {
      console.error('Error applying auto white balance:', error);
      return processor;
    }
  }
  
  /**
   * Apply temperature adjustment (white balance)
   * 
   * @param {Object} processor - Sharp processor
   * @param {number} temperature - Temperature adjustment (-100 to 100)
   * @returns {Object} - Updated processor
   * @private
   */
  _applyTemperatureAdjustment(processor, temperature) {
    // Convert temperature to RGB adjustments
    // Negative = cooler (blue), Positive = warmer (yellow/red)
    
    let rAdjust = 1.0;
    let gAdjust = 1.0;
    let bAdjust = 1.0;
    
    if (temperature > 0) {
      // Warmer - increase red, decrease blue
      rAdjust = 1 + (temperature / 100) * 0.5;
      bAdjust = 1 - (temperature / 100) * 0.3;
    } else if (temperature < 0) {
      // Cooler - increase blue, decrease red
      rAdjust = 1 + (temperature / 100) * 0.3;
      bAdjust = 1 - (temperature / 100) * 0.5;
    }
    
    // Apply channel adjustments
    processor = processor.linear(
      [rAdjust, gAdjust, bAdjust],
      [0, 0, 0]
    );
    
    return processor;
  }
  
  /**
   * Apply automatic perspective correction
   * 
   * @param {Object} processor - Sharp processor
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Object>} - Updated processor
   * @private
   */
  async _applyPerspectiveCorrection(processor, imageBuffer) {
    try {
      // In a real implementation, this would detect vertical lines and correct perspective
      // For now, we'll skip this since it requires complex edge detection algorithms
      
      // This is a placeholder for the real implementation
      // In a real app, this would use computer vision to detect perspective issues
      return processor;
    } catch (error) {
      console.error('Error applying perspective correction:', error);
      return processor;
    }
  }
  
  /**
   * Apply manual perspective correction
   * 
   * @param {Object} processor - Sharp processor
   * @param {Object} perspective - Perspective parameters
   * @returns {Object} - Updated processor
   * @private
   */
  _applyManualPerspectiveCorrection(processor, perspective) {
    // Map perspective parameters to Sharp's affine transformation
    // This is simplified; real implementation would need full perspective transform
    
    try {
      // Skip if no perspective adjustments
      if (!perspective) {
        return processor;
      }
      
      // For now, just apply a basic vertical stretching if vertical perspective is specified
      if (perspective.vertical) {
        const verticalStretch = 1 + (perspective.vertical / 100);
        
        processor = processor.affine([
          1, 0,
          0, verticalStretch
        ]);
      }
      
      return processor;
    } catch (error) {
      console.error('Error applying manual perspective correction:', error);
      return processor;
    }
  }
  
  /**
   * Get preset settings by name
   * 
   * @param {string} presetName - Preset name or ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Preset settings or null if not found
   * @private
   */
  async _getPresetSettings(presetName, userId) {
    // First check if it's a default preset
    if (this.defaultPresets[presetName]) {
      return this.defaultPresets[presetName];
    }
    
    // If not default, try to find user preset
    if (userId) {
      try {
        // Try to find by ID first
        let preset = await Preset.findOne({
          $or: [
            { _id: presetName },
            { name: presetName }
          ],
          userId
        });
        
        if (preset) {
          // Increment usage count
          preset.usageCount += 1;
          await preset.save();
          
          return preset.settings;
        }
      } catch (error) {
        console.error('Error fetching user preset:', error);
      }
    }
    
    return null;
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
}

module.exports = new ImageProcessor();