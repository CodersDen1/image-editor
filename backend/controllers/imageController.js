// backend/controllers/imageController.js
const Image = require('../models/Image');
const User = require('../models/User');
const storageService = require('../utils/storageServiceSelector').service;
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const exifReader = require('exif-reader');

/**
 * Image Controller
 * 
 * Handles image uploading, fetching, and management
 */
class ImageController {
  /**
   * Upload a single image
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadImage(req, res) {
    try {
      const userId = req.user.id;
      
      // Check if file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      // Get user to check storage limit
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check storage limit
      const fileSize = req.file.size;
      const storageUsed = user.storage?.used || 0;
      const storageLimit = user.storage?.limit || 0;
      
      if (storageLimit > 0 && storageUsed + fileSize > storageLimit) {
        return res.status(413).json({
          success: false,
          message: 'Storage limit exceeded',
          storageUsed: storageUsed,
          storageLimit: storageLimit,
          fileSize: fileSize
        });
      }
      
      // Read file
      const fileBuffer = await fs.readFile(req.file.path);
      
      // Get image metadata
      let imageMetadata;
      try {
        imageMetadata = await sharp(fileBuffer).metadata();
      } catch (error) {
        return res.status(415).json({
          success: false,
          message: 'Invalid image format or corrupted file',
          error: error.message
        });
      }
      
      // Upload to storage service
      const uploadResult = await storageService.uploadFile(
        fileBuffer,
        req.file.originalname,
        userId,
        {
          width: imageMetadata.width,
          height: imageMetadata.height,
          format: imageMetadata.format,
          projectId: req.body.projectId || null,
          tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
        }
      );
      
      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to storage',
          error: uploadResult.error
        });
      }
      let exifData = null;
        if (imageMetadata.exif) {
            try {
                 exifData = exifReader(imageMetadata.exif);
                  } catch (exifError) {
                console.error('Error parsing EXIF data:', exifError);
                    // Handle invalid EXIF data gracefully
                    }
                  }

      // Create image record in database
      const image = new Image({
        userId: userId,
        originalName: req.file.originalname,
        storageKey: uploadResult.key,
        url: uploadResult.url,
        size: fileSize,
        width: imageMetadata.width,
        height: imageMetadata.height,
        mimeType: req.file.mimetype,
        projectId: req.body.projectId || null,
        tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
        metadata: {
          exif: exifData,
          location: req.body.location ? {
            lat: parseFloat(req.body.location.lat),
            lng: parseFloat(req.body.location.lng)
          } : null,
          propertyId: req.body.propertyId || null,
          listingId: req.body.listingId || null,
          customFields: req.body.customFields ? JSON.parse(req.body.customFields) : null
        }
      });
      
      await image.save();
      
      // Clean up temp file
      await fs.unlink(req.file.path).catch(err => {
        console.error('Error deleting temp file:', err);
      });
      
      // Return success
      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        image: {
          id: image._id,
          name: image.originalName,
          url: image.url,
          size: image.size,
          width: image.width,
          height: image.height,
          tags: image.tags,
          createdAt: image.createdAt
        }
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error uploading image',
        error: error.message
      });
    }
  }
  
  /**
   * Upload multiple images
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadMultipleImages(req, res) {
    try {
      const userId = req.user.id;
      
      // Check if files exist
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }
      
      // Get user to check storage limit
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Calculate total size of all files
      const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
      
      // Check storage limit
      const storageUsed = user.storage?.used || 0;
      const storageLimit = user.storage?.limit || 0;
      
      if (storageLimit > 0 && storageUsed + totalSize > storageLimit) {
        return res.status(413).json({
          success: false,
          message: 'Storage limit exceeded',
          storageUsed: storageUsed,
          storageLimit: storageLimit,
          uploadSize: totalSize
        });
      }
      
      // Process each file
      const uploadPromises = req.files.map(async file => {
        try {
          // Read file
          const fileBuffer = await fs.readFile(file.path);
          
          // Get image metadata
          let imageMetadata;
          try {
            imageMetadata = await sharp(fileBuffer).metadata();
          } catch (error) {
            return {
              success: false,
              name: file.originalname,
              error: 'Invalid image format or corrupted file'
            };
          }
          
          // Upload to storage service
          const uploadResult = await storageService.uploadFile(
            fileBuffer,
            file.originalname,
            userId,
            {
              width: imageMetadata.width,
              height: imageMetadata.height,
              format: imageMetadata.format,
              projectId: req.body.projectId || null,
              tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
            }
          );
          
          if (!uploadResult.success) {
            return {
              success: false,
              name: file.originalname,
              error: uploadResult.error || 'Failed to upload to storage'
            };
          }


          let exifData = null;
              if (imageMetadata.exif) {
                try {
                 exifData = exifReader(imageMetadata.exif);
                   } catch (exifError) {
                      console.error('Error parsing EXIF data:', exifError);
                    }
                  }

          
          // Create image record in database
          const image = new Image({
            userId: userId,
            originalName: file.originalname,
            storageKey: uploadResult.key,
            url: uploadResult.url,
            size: file.size,
            width: imageMetadata.width,
            height: imageMetadata.height,
            mimeType: file.mimetype,
            projectId: req.body.projectId || null,
            tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
            metadata: {
              exif: exifData,
              location: req.body.location ? {
                lat: parseFloat(req.body.location.lat),
                lng: parseFloat(req.body.location.lng)
              } : null,
              propertyId: req.body.propertyId || null,
              listingId: req.body.listingId || null
            }
          });
          
          await image.save();
          
          // Clean up temp file
          await fs.unlink(file.path).catch(err => {
            console.error('Error deleting temp file:', err);
          });
          
          return {
            success: true,
            id: image._id,
            name: image.originalName,
            url: image.url,
            size: image.size,
            width: image.width,
            height: image.height
          };
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          return {
            success: false,
            name: file.originalname,
            error: error.message
          };
        }
      });
      
      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      
      // Count successes and failures
      const successful = results.filter(result => result.success);
      const failed = results.filter(result => !result.success);
      
      res.json({
        success: true,
        message: `${successful.length} files uploaded successfully, ${failed.length} failed`,
        uploaded: successful,
        failed: failed
      });
    } catch (error) {
      console.error('Upload multiple images error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error uploading images',
        error: error.message
      });
    }
  }
  
  /**
   * Get all images for a user
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserImages(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Build query
      const query = {
        userId: userId,
        isDeleted: false,
        parentImageId: null // Only get original images, not processed versions
      };
      
      // Apply filters if provided
      if (req.query.projectId) {
        query.projectId = req.query.projectId;
      }
      
      if (req.query.tags) {
        const tags = req.query.tags.split(',').map(tag => tag.trim());
        query.tags = { $all: tags };
      }
      
      if (req.query.search) {
        query.$or = [
          { originalName: { $regex: req.query.search, $options: 'i' } },
          { tags: { $regex: req.query.search, $options: 'i' } }
        ];
      }
      
      // Get total count for pagination
      const totalImages = await Image.countDocuments(query);
      
      // Get images
      const images = await Image.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // Format response
      const formattedImages = images.map(image => ({
        id: image._id,
        name: image.originalName,
        url: image.url,
        size: image.size,
        width: image.width,
        height: image.height,
        projectId: image.projectId,
        tags: image.tags,
        isProcessed: image.isProcessed,
        createdAt: image.createdAt,
        thumbnails: image.thumbnails || null
      }));
      
      res.json({
        success: true,
        images: formattedImages,
        pagination: {
          total: totalImages,
          page: page,
          limit: limit,
          pages: Math.ceil(totalImages / limit)
        }
      });
    } catch (error) {
      console.error('Get user images error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving images',
        error: error.message
      });
    }
  }
  
  /**
   * Get image by ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getImage(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      // Find image
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
      
      // Increment view count
      image.viewCount += 1;
      await image.save();
      
      // Format response
      const imageData = {
        id: image._id,
        name: image.originalName,
        url: image.url,
        size: image.size,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType,
        projectId: image.projectId,
        tags: image.tags,
        isProcessed: image.isProcessed,
        processingType: image.processingType,
        processingSettings: image.processingSettings,
        parentImageId: image.parentImageId,
        metadata: image.metadata,
        thumbnails: image.thumbnails,
        shareCount: image.shareCount,
        downloadCount: image.downloadCount,
        viewCount: image.viewCount,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt
      };
      
      res.json({
        success: true,
        image: imageData
      });
    } catch (error) {
      console.error('Get image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving image',
        error: error.message
      });
    }
  }
  
  /**
   * Get processed versions of an image
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProcessedVersions(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      // Find original image
      const originalImage = await Image.findOne({
        _id: imageId,
        userId: userId,
        isDeleted: false
      });
      
      if (!originalImage) {
        return res.status(404).json({
          success: false,
          message: 'Image not found or access denied'
        });
      }
      
      // Find processed versions
      const processedImages = await Image.find({
        parentImageId: imageId,
        userId: userId,
        isDeleted: false
      }).sort({ createdAt: -1 });
      
      // Format response
      const formattedImages = processedImages.map(image => ({
        id: image._id,
        name: image.originalName,
        url: image.url,
        size: image.size,
        width: image.width,
        height: image.height,
        processingType: image.processingType,
        processingSettings: image.processingSettings,
        createdAt: image.createdAt
      }));
      
      res.json({
        success: true,
        originalImage: {
          id: originalImage._id,
          name: originalImage.originalName,
          url: originalImage.url
        },
        images: formattedImages
      });
    } catch (error) {
      console.error('Get processed versions error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving processed versions',
        error: error.message
      });
    }
  }
  
  /**
   * Update image metadata
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateImage(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      // Find image
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
      
      // Fields that can be updated
      const updatableFields = ['originalName', 'tags', 'projectId'];
      const metadataFields = ['propertyId', 'listingId', 'location', 'customFields'];
      
      // Update allowed fields
      updatableFields.forEach(field => {
        if (req.body[field] !== undefined) {
          // Special handling for tags if they're provided as a string
          if (field === 'tags' && typeof req.body.tags === 'string') {
            image.tags = req.body.tags.split(',').map(tag => tag.trim());
          } else {
            image[field] = req.body[field];
          }
        }
      });
      
      // Update metadata fields
      metadataFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (!image.metadata) {
            image.metadata = {};
          }
          
          // Special handling for location
          if (field === 'location' && typeof req.body.location === 'object') {
            image.metadata.location = {
              lat: parseFloat(req.body.location.lat),
              lng: parseFloat(req.body.location.lng)
            };
          } 
          // Special handling for custom fields if provided as string
          else if (field === 'customFields' && typeof req.body.customFields === 'string') {
            try {
              image.metadata.customFields = JSON.parse(req.body.customFields);
            } catch (e) {
              // If not valid JSON, store as is
              image.metadata.customFields = req.body.customFields;
            }
          }
          else {
            image.metadata[field] = req.body[field];
          }
        }
      });
      
      // Save changes
      image.updatedAt = new Date();
      await image.save();
      
      res.json({
        success: true,
        message: 'Image updated successfully',
        image: {
          id: image._id,
          name: image.originalName,
          tags: image.tags,
          projectId: image.projectId,
          metadata: image.metadata,
          updatedAt: image.updatedAt
        }
      });
    } catch (error) {
      console.error('Update image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating image',
        error: error.message
      });
    }
  }
  
  /**
   * Delete image (soft delete)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteImage(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      // Find image
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
      
      // Check if this is a parent image with processed versions
      const hasProcessedVersions = await Image.exists({
        parentImageId: imageId,
        isDeleted: false
      });
      
      // Soft delete
      image.isDeleted = true;
      image.deleteAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      await image.save();
      
      // If it has processed versions, soft delete those too
      if (hasProcessedVersions) {
        await Image.updateMany(
          {
            parentImageId: imageId,
            isDeleted: false
          },
          {
            isDeleted: true,
            deleteAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        );
      }
      
      res.json({
        success: true,
        message: 'Image deleted successfully. It will be permanently removed in 7 days.',
        deleteAt: image.deleteAt
      });
    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting image',
        error: error.message
      });
    }
  }
  
  /**
   * Permanently delete image
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async permanentlyDeleteImage(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      // Find image
      const image = await Image.findOne({
        _id: imageId,
        userId: userId
      });
      
      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image not found or access denied'
        });
      }
      
      // Remove from storage
      const storageKey = image.storageKey;
      if (storageKey) {
        await storageService.deleteFile(storageKey, userId);
      }
      
      // Find and delete processed versions from storage and database
      const processedImages = await Image.find({
        parentImageId: imageId,
        userId: userId
      });
      
      for (const processedImage of processedImages) {
        if (processedImage.storageKey) {
          await storageService.deleteFile(processedImage.storageKey, userId);
        }
        await Image.deleteOne({ _id: processedImage._id });
      }
      
      // Delete image from database
      await Image.deleteOne({ _id: imageId });
      
      res.json({
        success: true,
        message: 'Image permanently deleted'
      });
    } catch (error) {
      console.error('Permanently delete image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error permanently deleting image',
        error: error.message
      });
    }
  }
  
  /**
   * Restore deleted image
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async restoreImage(req, res) {
    try {
      const { imageId } = req.params;
      const userId = req.user.id;
      
      // Find image
      const image = await Image.findOne({
        _id: imageId,
        userId: userId,
        isDeleted: true
      });
      
      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image not found or not deleted'
        });
      }
      
      // Restore image
      image.isDeleted = false;
      image.deleteAt = null;
      await image.save();
      
      // Restore processed versions if any
      await Image.updateMany(
        {
          parentImageId: imageId,
          isDeleted: true
        },
        {
          isDeleted: false,
          deleteAt: null
        }
      );
      
      res.json({
        success: true,
        message: 'Image restored successfully',
        image: {
          id: image._id,
          name: image.originalName,
          url: image.url,
          size: image.size,
          width: image.width,
          height: image.height
        }
      });
    } catch (error) {
      console.error('Restore image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error restoring image',
        error: error.message
      });
    }
  }
  
  /**
   * Get image file (public endpoint for sharing)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getImageFile(req, res) {
    try {
      const { imageKey } = req.params;
      
      // Get image from storage
      const imageResult = await storageService.getFile(imageKey);
      
      if (!imageResult.success) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }
      
      // Set headers
      res.set('Content-Type', imageResult.contentType);
      res.set('Content-Length', imageResult.data.length);
      
      // Send image
      res.send(imageResult.data);
    } catch (error) {
      console.error('Get image file error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving image file',
        error: error.message
      });
    }
  }
  
  /**
   * Get images deleted in the last 30 days
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDeletedImages(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Build query
      const query = {
        userId: userId,
        isDeleted: true,
        deleteAt: { $gt: new Date() },
        parentImageId: null // Only get original images, not processed versions
      };
      
      // Get total count for pagination
      const totalImages = await Image.countDocuments(query);
      
      // Get images
      const images = await Image.find(query)
        .sort({ deleteAt: 1 }) // Soonest to be deleted first
        .skip(skip)
        .limit(limit);
      
      // Format response
      const formattedImages = images.map(image => ({
        id: image._id,
        name: image.originalName,
        url: image.url,
        size: image.size,
        width: image.width,
        height: image.height,
        deleteAt: image.deleteAt,
        daysLeft: Math.ceil((image.deleteAt - new Date()) / (1000 * 60 * 60 * 24))
      }));
      
      res.json({
        success: true,
        images: formattedImages,
        pagination: {
          total: totalImages,
          page: page,
          limit: limit,
          pages: Math.ceil(totalImages / limit)
        }
      });
    } catch (error) {
      console.error('Get deleted images error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving deleted images',
        error: error.message
      });
    }
  }
}

module.exports = new ImageController();