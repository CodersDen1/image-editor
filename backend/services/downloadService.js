// backend/services/downloadService.js
const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const sharp = require('sharp');
const Image = require('../models/Image');
const storageService = require('../utils/storageServiceSelector').service;

/**
 * Download Service
 * Handles image download functionality including batch downloads and format conversions
 */
class DownloadService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'realestate-imagepro-downloads');
    this.ensureTempDir();
  }
  
  /**
   * Create temp directory if it doesn't exist
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating download temp directory:', error);
    }
  }
  
  /**
   * Download a single image
   * 
   * @param {string} imageId - Image ID
   * @param {string} userId - User ID
   * @param {Object} options - Download options
   * @returns {Promise<Object>} - Result with image data
   */
  async downloadImage(imageId, userId, options = {}) {
    try {
      // Find image in database
      const image = await Image.findOne({
        _id: imageId,
        userId,
        isDeleted: false
      });
      
      if (!image) {
        return {
          success: false,
          message: 'Image not found or access denied'
        };
      }
      
      // Get image from storage
      const imageResult = await storageService.getFile(image.storageKey);
      
      if (!imageResult.success) {
        return {
          success: false,
          message: 'Failed to retrieve image from storage'
        };
      }
      
      // Check if format conversion is needed
      let outputData = imageResult.data;
      let contentType = imageResult.contentType;
      let filename = image.originalName;
      
      if (options.format && options.format !== path.extname(image.originalName).slice(1)) {
        // Convert to requested format
        const convertResult = await this.convertImageFormat(
          imageResult.data,
          options.format,
          options.quality
        );
        
        if (convertResult.success) {
          outputData = convertResult.data;
          contentType = convertResult.contentType;
          
          // Update filename with new extension
          const filenameWithoutExt = path.parse(image.originalName).name;
          filename = `${filenameWithoutExt}.${options.format}`;
        }
      }
      
      // Increment download count
      await Image.findByIdAndUpdate(imageId, {
        $inc: { downloadCount: 1 }
      });
      
      return {
        success: true,
        image: {
          data: outputData,
          contentType: contentType,
          filename: filename,
          size: outputData.length
        }
      };
    } catch (error) {
      console.error('Error downloading image:', error);
      return {
        success: false,
        message: 'Error downloading image',
        error: error.message
      };
    }
  }
  
  /**
   * Create a ZIP file with multiple images
   * 
   * @param {Array} imageIds - Array of image IDs
   * @param {string} userId - User ID
   * @param {Object} options - Download options
   * @returns {Promise<Object>} - Result with ZIP file details
   */
  async createBatchDownload(imageIds, userId, options = {}) {
    try {
      // Validate inputs
      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return {
          success: false,
          message: 'No images specified for download'
        };
      }
      
      // Find images in database
      const images = await Image.find({
        _id: { $in: imageIds },
        userId,
        isDeleted: false
      });
      
      if (images.length === 0) {
        return {
          success: false,
          message: 'No valid images found for download'
        };
      }
      
      // Create a temporary file for the ZIP
      const zipId = uuidv4();
      const zipFileName = `download-${zipId}.zip`;
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
      const processedImages = [];
      const failedImages = [];
      
      for (const image of images) {
        try {
          // Get image from storage
          const imageResult = await storageService.getFile(image.storageKey);
          
          if (!imageResult.success) {
            failedImages.push({
              id: image._id,
              name: image.originalName,
              error: 'Failed to retrieve from storage'
            });
            continue;
          }
          
          // Process image if needed
          let outputData = imageResult.data;
          let filename = image.originalName;
          
          // Convert format if specified
          if (options.format && options.format !== path.extname(image.originalName).slice(1)) {
            const convertResult = await this.convertImageFormat(
              imageResult.data,
              options.format,
              options.quality
            );
            
            if (convertResult.success) {
              outputData = convertResult.data;
              
              // Update filename with new extension
              const filenameWithoutExt = path.parse(image.originalName).name;
              filename = `${filenameWithoutExt}.${options.format}`;
            } else {
              // Fallback to original if conversion fails
              outputData = imageResult.data;
            }
          }
          
          // If organized by folders is enabled
          if (options.organizeByFolders && image.projectId) {
            // Get project name
            let folderName = 'Unknown';
            
            // If the project is in memory, use its name
            if (options.projects && options.projects[image.projectId]) {
              folderName = options.projects[image.projectId];
            }
            
            // Add image to folder
            archive.append(outputData, { 
              name: `${folderName}/${filename}` 
            });
          } else {
            // Add directly to root
            archive.append(outputData, { 
              name: filename 
            });
          }
          
          // Add to processed images
          processedImages.push({
            id: image._id,
            name: filename
          });
          
          // Increment download count
          await Image.findByIdAndUpdate(image._id, {
            $inc: { downloadCount: 1 }
          });
        } catch (error) {
          console.error(`Error processing image ${image._id}:`, error);
          failedImages.push({
            id: image._id,
            name: image.originalName,
            error: error.message
          });
        }
      }
      
      // Finalize archive
      archive.finalize();
      
      // Wait for archive to be created
      const zipFile = await archivePromise;
      
      return {
        success: true,
        zipFilePath: zipFile,
        fileName: zipFileName,
        stats: {
          totalImages: images.length,
          processedImages: processedImages.length,
          failedImages: failedImages.length
        },
        processedImages,
        failedImages
      };
    } catch (error) {
      console.error('Error creating batch download:', error);
      return {
        success: false,
        message: 'Error creating batch download',
        error: error.message
      };
    }
  }
  
  /**
   * Convert image to a different format
   * 
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} format - Target format (jpg, png, webp, etc.)
   * @param {number} quality - Output quality (1-100)
   * @returns {Promise<Object>} - Result with converted image
   */
  async convertImageFormat(imageBuffer, format, quality = 85) {
    try {
      let processor = sharp(imageBuffer);
      let contentType;
      
      // Apply format-specific conversions
      switch (format.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
          processor = processor.jpeg({ quality });
          contentType = 'image/jpeg';
          break;
        
        case 'png':
          processor = processor.png({ quality });
          contentType = 'image/png';
          break;
        
        case 'webp':
          processor = processor.webp({ quality });
          contentType = 'image/webp';
          break;
        
        case 'tiff':
          processor = processor.tiff({ quality });
          contentType = 'image/tiff';
          break;
        
        default:
          // Default to original format
          return {
            success: false,
            message: `Unsupported format: ${format}`
          };
      }
      
      // Process the image
      const outputBuffer = await processor.toBuffer();
      
      return {
        success: true,
        data: outputBuffer,
        contentType: contentType,
        format: format.toLowerCase()
      };
    } catch (error) {
      console.error('Error converting image format:', error);
      return {
        success: false,
        message: 'Error converting image format',
        error: error.message
      };
    }
  }
  
  /**
   * Get temporary file path
   * 
   * @param {string} fileId - File ID or name
   * @returns {string} - Full path to temp file
   */
  getTempFilePath(fileId) {
    return path.join(this.tempDir, fileId);
  }
  
  /**
   * Clean up temporary download files
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

module.exports = new DownloadService();