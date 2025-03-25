// backend/routes/processing.js
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const processingController = require('../controllers/processingController');
const authMiddleware = require('../middleware/auth');

/**
 * Image Processing Routes
 */

/**
 * @route POST /api/processing/auto/:imageId
 * @desc Apply automatic enhancements to an image
 * @access Private
 */
router.post('/auto/:imageId', [
  authMiddleware,
  param('imageId').notEmpty().withMessage('Image ID is required'),
  body('preset').optional().isString(),
  body('brightness').optional().isFloat({ min: 0.5, max: 2.0 }),
  body('contrast').optional().isFloat({ min: 0.5, max: 2.0 }),
  body('saturation').optional().isFloat({ min: 0.5, max: 2.0 }),
  body('sharpness').optional().isFloat({ min: 0.5, max: 3.0 }),
  body('whiteBalance').optional().isBoolean(),
  body('perspective').optional().isBoolean(),
  body('quality').optional().isInt({ min: 1, max: 100 }),
  body('watermarkEnabled').optional().isBoolean(),
  body('watermarkText').optional().isString(),
  body('watermarkPosition').optional().isIn(['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'])
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  // Process the image
  await processingController.autoProcess(req, res);
});

/**
 * @route POST /api/processing/manual/:imageId
 * @desc Apply manual adjustments to an image
 * @access Private
 */
router.post('/manual/:imageId', [
  authMiddleware,
  param('imageId').notEmpty().withMessage('Image ID is required'),
  body('adjustments').notEmpty().withMessage('Adjustments are required'),
  body('adjustments.color.brightness').optional().isFloat({ min: -100, max: 100 }),
  body('adjustments.color.contrast').optional().isFloat({ min: -100, max: 100 }),
  body('adjustments.color.saturation').optional().isFloat({ min: -100, max: 100 }),
  body('adjustments.color.temperature').optional().isFloat({ min: -100, max: 100 }),
  body('adjustments.sharpness.amount').optional().isFloat({ min: 0, max: 100 }),
  body('adjustments.tonalAdjustments.highlights').optional().isFloat({ min: -100, max: 100 }),
  body('adjustments.tonalAdjustments.shadows').optional().isFloat({ min: -100, max: 100 }),
  body('adjustments.perspective').optional(),
  body('adjustments.cropEnabled').optional().isBoolean(),
  body('adjustments.crop').optional(),
  body('adjustments.watermarkEnabled').optional().isBoolean(),
  body('adjustments.watermarkText').optional().isString(),
  body('adjustments.watermarkPosition').optional().isIn(['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center']),
  body('adjustments.output.format').optional().isIn(['jpeg', 'jpg', 'png', 'webp']),
  body('adjustments.output.quality').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  // Process the image
  await processingController.manualProcess(req, res);
});

/**
 * @route POST /api/processing/batch
 * @desc Process multiple images in batch
 * @access Private
 */
router.post('/batch', [
  authMiddleware,
  body('imageIds').isArray({ min: 1 }).withMessage('At least one image ID is required'),
  body('mode').optional().isIn(['auto', 'manual']).withMessage('Mode must be "auto" or "manual"'),
  body('options').optional().isObject()
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  // Process the images
  await processingController.batchProcess(req, res);
});

/**
 * @route GET /api/processing/presets
 * @desc Get available processing presets
 * @access Private
 */
router.get('/presets', authMiddleware, async (req, res) => {
  await processingController.getPresets(req, res);
});

/**
 * @route POST /api/processing/presets
 * @desc Save a custom processing preset
 * @access Private
 */
router.post('/presets', [
  authMiddleware,
  body('name').notEmpty().withMessage('Preset name is required'),
  body('settings').notEmpty().withMessage('Preset settings are required')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  // Save the preset
  await processingController.savePreset(req, res);
});

/**
 * @route POST /api/processing/preview
 * @desc Generate a preview of processing
 * @access Private
 */
router.post('/preview', [
  authMiddleware,
  body('imageId').notEmpty().withMessage('Image ID is required'),
  body('mode').isIn(['auto', 'manual']).withMessage('Mode must be "auto" or "manual"'),
  body('settings').optional().isObject()
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  // This would generate a preview without saving the processed image
  // For simplicity, we'll just delegate to the same controller but add a preview flag
  req.preview = true;
  
  if (req.body.mode === 'auto') {
    await processingController.autoProcess(req, res);
  } else {
    await processingController.manualProcess(req, res);
  }
});

/**
 * @route GET /api/processing/detect-scene/:imageId
 * @desc Automatically detect scene type (interior/exterior)
 * @access Private
 */
router.get('/detect-scene/:imageId', [
  authMiddleware,
  param('imageId').notEmpty().withMessage('Image ID is required')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  // In a real implementation, this would call a controller method
  // For now, just return a mock response
  res.json({
    success: true,
    sceneType: Math.random() > 0.5 ? 'interior' : 'exterior',
    suggestedPreset: Math.random() > 0.5 ? 'interior' : 'exterior',
    confidence: Math.floor(Math.random() * 20 + 80) // 80-99% confidence
  });
});

module.exports = router;