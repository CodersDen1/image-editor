// backend/controllers/shareController.js
const sharingService = require('../services/sharingService');
const Share = require('../models/Share');
const Image = require('../models/Image');
const fs = require('fs/promises');

/**
 * Share Controller
 * 
 * Handles image sharing, access control, and download generation
 */
class ShareController {
  /**
   * Create a new share
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createShare(req, res) {
    try {
      const userId = req.user.id;
      const { imageIds, title, description, password, expirationDays, maxAccess } = req.body;
      
      // Create share
      const result = await sharingService.createShare(userId, imageIds, {
        title,
        description,
        password,
        expirationDays,
        maxAccess
      });
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Generate share URL
      const shareUrl = `${process.env.APP_URL || req.protocol + '://' + req.get('host')}/share/${result.share.shareToken}`;
      
      res.status(201).json({
        success: true,
        message: 'Images shared successfully',
        share: {
          ...result.share,
          shareUrl
        }
      });
    } catch (error) {
      console.error('Create share error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating share',
        error: error.message
      });
    }
  }
  
  /**
   * Get shares for a user
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserShares(req, res) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };
      
      // If active filter is specified
      if (req.query.active !== undefined) {
        options.active = req.query.active === 'true';
      }
      
      // Get shares
      const result = await sharingService.getUserShares(userId, options);
      
      if (!result.success) {
        return res.status(500).json(result);
      }
      
      // Add share URLs
      const baseShareUrl = `${process.env.APP_URL || req.protocol + '://' + req.get('host')}/share/`;
      result.shares = result.shares.map(share => ({
        ...share,
        shareUrl: baseShareUrl + share.shareToken
      }));
      
      res.json(result);
    } catch (error) {
      console.error('Get user shares error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving shares',
        error: error.message
      });
    }
  }
  
  /**
   * Get share details by token
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getShareByToken(req, res) {
    try {
      const { token } = req.params;
      const password = req.query.password || req.body.password || null;
      
      // Get share
      const result = await sharingService.getShare(token, password);
      
      if (!result.success) {
        // If it's a password-protected share but no/wrong password
        if (result.isPasswordProtected) {
          return res.status(401).json({
            success: false,
            message: 'This share is password protected',
            isPasswordProtected: true
          });
        }
        
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Get share error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving share',
        error: error.message
      });
    }
  }
  
  /**
   * Download a shared image
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async downloadSharedImage(req, res) {
    try {
      const { token, imageId } = req.params;
      const password = req.query.password || null;
      
      // Get image
      const result = await sharingService.downloadSharedImage(token, imageId, password);
      
      if (!result.success) {
        // If it's a password-protected share but no/wrong password
        if (result.isPasswordProtected) {
          return res.status(401).json({
            success: false,
            message: 'This share is password protected',
            isPasswordProtected: true
          });
        }
        
        return res.status(404).json(result);
      }
      
      // Send image
      res.set('Content-Type', result.image.contentType);
      res.set('Content-Disposition', `attachment; filename="${result.image.name}"`);
      res.set('Content-Length', result.image.data.length);
      res.send(result.image.data);
    } catch (error) {
      console.error('Download shared image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error downloading image',
        error: error.message
      });
    }
  }
  
  /**
   * Download all images in a share as a ZIP
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async downloadShareAsZip(req, res) {
    try {
      const { token } = req.params;
      const password = req.query.password || null;
      
      // Create ZIP
      const result = await sharingService.createShareZip(token, password);
      
      if (!result.success) {
        // If it's a password-protected share but no/wrong password
        if (result.isPasswordProtected) {
          return res.status(401).json({
            success: false,
            message: 'This share is password protected',
            isPasswordProtected: true
          });
        }
        
        return res.status(404).json(result);
      }
      
      // Get share for filename
      const share = await Share.findOne({ shareToken: token });
      let zipName = 'shared-images.zip';
      
      if (share && share.title) {
        // Create safe filename from title
        zipName = share.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.zip';
      }
      
      // Read ZIP file
      const zipData = await fs.readFile(result.zipFilePath);
      
      // Send ZIP
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', `attachment; filename="${zipName}"`);
      res.set('Content-Length', zipData.length);
      res.send(zipData);
      
      // Clean up the temporary file
      try {
        await fs.unlink(result.zipFilePath);
      } catch (unlinkError) {
        console.error('Error deleting temporary ZIP file:', unlinkError);
      }
    } catch (error) {
      console.error('Download share as ZIP error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating ZIP archive',
        error: error.message
      });
    }
  }
  
  /**
   * Delete a share
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteShare(req, res) {
    try {
      const shareId = req.params.shareId;
      const userId = req.user.id;
      
      // Delete share
      const result = await sharingService.deleteShare(shareId, userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Delete share error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting share',
        error: error.message
      });
    }
  }
  
  /**
   * Update share settings
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateShare(req, res) {
    try {
      const shareId = req.params.shareId;
      const userId = req.user.id;
      
      // Update share
      const result = await sharingService.updateShare(shareId, userId, req.body);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Update share error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating share',
        error: error.message
      });
    }
  }
  
  /**
   * Verify share password
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifySharePassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }
      
      // Find share by token
      const share = await Share.findOne({ shareToken: token });
      
      if (!share) {
        return res.status(404).json({
          success: false,
          message: 'Share not found'
        });
      }
      
      // Check if password protected
      if (!share.isPasswordProtected) {
        return res.json({
          success: true,
          message: 'Share is not password protected',
          isPasswordProtected: false
        });
      }
      
      // Verify password
      const isValid = share.verifyPassword(password);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password',
          isPasswordProtected: true
        });
      }
      
      res.json({
        success: true,
        message: 'Password verified successfully'
      });
    } catch (error) {
      console.error('Verify share password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error verifying password',
        error: error.message
      });
    }
  }
  
  /**
   * Check if a share exists and is valid
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkShareStatus(req, res) {
    try {
      const { token } = req.params;
      
      // Find share by token
      const share = await Share.findOne({ shareToken: token });
      
      if (!share) {
        return res.status(404).json({
          success: false,
          message: 'Share not found'
        });
      }
      
      // Check if share is valid
      const isValid = share.isValid();
      const isExpired = share.isExpired();
      const isMaxReached = share.isMaxAccessReached();
      
      // Get image count
      const imageCount = await Image.countDocuments({ 
        _id: { $in: share.images },
        isDeleted: false
      });
      
      res.json({
        success: true,
        share: {
          isValid,
          isExpired,
          isMaxReached,
          isPasswordProtected: share.isPasswordProtected,
          title: share.title,
          imageCount,
          expiresAt: share.expiresAt,
          accessCount: share.accessCount,
          maxAccess: share.maxAccess,
          createdAt: share.createdAt
        }
      });
    } catch (error) {
      console.error('Check share status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error checking share status',
        error: error.message
      });
    }
  }
}

module.exports = new ShareController();