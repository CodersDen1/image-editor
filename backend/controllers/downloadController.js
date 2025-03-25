// backend/controllers/downloadController.js
const downloadService = require('../services/downloadService');
const Image = require('../models/Image');
const fs = require('fs/promises');

/**
 * Download Controller
 * 
 * Handles image download functionality including batch downloads and format conversions
 */
class DownloadController {
  /**
   * Download a single image
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async downloadImage(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      const options = {
        format: req.query.format,
        quality: req.query.quality ? parseInt(req.query.quality) : undefined
      };
      
      // Download image
      const result = await downloadService.downloadImage(imageId, userId, options);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      // Send file
      res.set('Content-Type', result.image.contentType);
      res.set('Content-Disposition', `attachment; filename="${result.image.filename}"`);
      res.set('Content-Length', result.image.data.length);
      res.send(result.image.data);
    } catch (error) {
      console.error('Download image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error downloading image',
        error: error.message
      });
    }
  }
  
  /**
   * Download multiple images as a ZIP file
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async downloadBatch(req, res) {
    try {
      const { imageIds } = req.body;
      const userId = req.user.id;
      
      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one image ID is required'
        });
      }
      
      const options = {
        format: req.query.format || req.body.format,
        quality: req.query.quality || req.body.quality,
        organizeByFolders: req.body.organizeByFolders === 'true' || req.body.organizeByFolders === true
      };
      
      // If organizing by project folders, we need to get project names
      if (options.organizeByFolders) {
        // Get project IDs from images
        const images = await Image.find({
          _id: { $in: imageIds },
          userId,
          isDeleted: false
        }).select('projectId');
        
        // Extract unique project IDs
        const projectIds = [...new Set(images
          .map(img => img.projectId)
          .filter(id => id) // Filter out null/undefined
          .map(id => id.toString())
        )];
        
        // Get project names
        if (projectIds.length > 0) {
          // This would normally come from a Project model query
          // For now, use generic folder names
          options.projects = {};
          projectIds.forEach(id => {
            options.projects[id] = `Project_${id.substring(0, 5)}`;
          });
        }
      }
      
      // Create the batch download
      const result = await downloadService.createBatchDownload(imageIds, userId, options);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Read the ZIP file
      const zipData = await fs.readFile(result.zipFilePath);
      
      // Send ZIP
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.set('Content-Length', zipData.length);
      res.send(zipData);
      
      // Clean up the temporary file
      try {
        await fs.unlink(result.zipFilePath);
      } catch (unlinkError) {
        console.error('Error deleting temporary ZIP file:', unlinkError);
      }
    } catch (error) {
      console.error('Batch download error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating batch download',
        error: error.message
      });
    }
  }
  
  /**
   * Convert an image to a different format
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async convertImage(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      const { format, quality } = req.query;
      
      if (!format) {
        return res.status(400).json({
          success: false,
          message: 'Format parameter is required'
        });
      }
      
      const options = {
        format,
        quality: quality ? parseInt(quality) : undefined
      };
      
      // Convert and download image
      const result = await downloadService.downloadImage(imageId, userId, options);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      // Send file
      res.set('Content-Type', result.image.contentType);
      res.set('Content-Disposition', `attachment; filename="${result.image.filename}"`);
      res.set('Content-Length', result.image.data.length);
      res.send(result.image.data);
    } catch (error) {
      console.error('Convert image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error converting image',
        error: error.message
      });
    }
  }
  
  /**
   * Get supported output formats
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSupportedFormats(req, res) {
    try {
      // This would normally be dynamic based on system capabilities
      const formats = [
        {
          id: 'jpg',
          name: 'JPEG',
          extension: 'jpg',
          mimeType: 'image/jpeg',
          supportsTransparency: false,
          description: 'Best for photos and general-purpose images'
        },
        {
          id: 'png',
          name: 'PNG',
          extension: 'png',
          mimeType: 'image/png',
          supportsTransparency: true,
          description: 'Lossless compression, good for images with transparency'
        },
        {
          id: 'webp',
          name: 'WebP',
          extension: 'webp',
          mimeType: 'image/webp',
          supportsTransparency: true,
          description: 'Modern format with excellent compression, good for web use'
        },
        {
          id: 'tiff',
          name: 'TIFF',
          extension: 'tiff',
          mimeType: 'image/tiff',
          supportsTransparency: true,
          description: 'High quality format for printing and archiving'
        }
      ];
      
      res.json({
        success: true,
        formats
      });
    } catch (error) {
      console.error('Get formats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving formats',
        error: error.message
      });
    }
  }
}

module.exports = new DownloadController();