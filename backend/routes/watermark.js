// backend/routes/watermark.js
const express = require('express');
const router = express.Router();
const watermarkController = require('../controllers/watermarkController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
const { body } = require('express-validator');
const validationMiddleware = require('../middleware/validation');

/**
 * Watermark Routes
 */

/**
 * @route GET /api/watermark/settings
 * @desc Get user's watermark settings
 * @access Private
 */
router.get('/settings', authMiddleware, watermarkController.getWatermarkSettings);

/**
 * @route POST /api/watermark/upload
 * @desc Upload a new watermark image
 * @access Private
 */
router.post('/upload', [
  authMiddleware,
  uploadMiddleware.uploadWatermark.single('watermark'),
  uploadMiddleware.handleMulterError,
  body('position').optional().isIn(['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center']),
  body('opacity').optional().isFloat({ min: 0, max: 1 }),
  body('size').optional().isInt({ min: 5, max: 50 }),
  body('autoApply').optional().isBoolean(),
  validationMiddleware.validateRequest
], watermarkController.uploadWatermark);

/**
 * @route PUT /api/watermark/settings
 * @desc Update watermark settings
 * @access Private
 */
router.put('/settings', [
  authMiddleware,
  body('position').optional().isIn(['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center']),
  body('opacity').optional().isFloat({ min: 0, max: 1 }),
  body('size').optional().isInt({ min: 5, max: 50 }),
  body('padding').optional().isInt({ min: 0, max: 100 }),
  body('autoApply').optional().isBoolean(),
  validationMiddleware.validateRequest
], watermarkController.updateWatermarkSettings);

/**
 * @route DELETE /api/watermark
 * @desc Delete user's watermark
 * @access Private
 */
router.delete('/', authMiddleware, watermarkController.deleteWatermark);

/**
 * @route POST /api/watermark/preview
 * @desc Generate a preview of an image with watermark applied
 * @access Private
 */
router.post('/preview', [
  authMiddleware,
  uploadMiddleware.uploadImage.single('image'),
  uploadMiddleware.handleMulterError,
  body('position').optional().isIn(['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center']),
  body('opacity').optional().isFloat({ min: 0, max: 1 }),
  body('size').optional().isInt({ min: 5, max: 50 }),
  validationMiddleware.validateRequest
], watermarkController.previewWatermark);

module.exports = router;