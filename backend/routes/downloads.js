// backend/routes/downloads.js
const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const { body, param } = require('express-validator');

/**
 * Download Routes
 */

/**
 * @route GET /api/downloads/image/:imageId
 * @desc Download a single image
 * @access Private
 */
router.get('/image/:imageId', [
  authMiddleware,
  validationMiddleware.validateObjectId('imageId')
], downloadController.downloadImage);

/**
 * @route GET /api/downloads/convert/:imageId
 * @desc Convert and download an image
 * @access Private
 */
router.get('/convert/:imageId', [
  authMiddleware,
  validationMiddleware.validateObjectId('imageId'),
  validationMiddleware.validateDownloadOptions
], downloadController.convertImage);

/**
 * @route POST /api/downloads/batch
 * @desc Download multiple images as a ZIP file
 * @access Private
 */
router.post('/batch', [
  authMiddleware,
  body('imageIds').isArray({ min: 1 }).withMessage('At least one image ID is required'),
  body('imageIds.*').custom(validationMiddleware.isValidObjectId)
    .withMessage('Invalid image ID format'),
  validationMiddleware.validateDownloadOptions
], downloadController.downloadBatch);

/**
 * @route GET /api/downloads/formats
 * @desc Get supported output formats
 * @access Private
 */
router.get('/formats', authMiddleware, downloadController.getSupportedFormats);

module.exports = router;