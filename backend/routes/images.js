// backend/routes/images.js
const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
const validationMiddleware = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Image Routes
 */

/**
 * @route POST /api/images/upload
 * @desc Upload a single image
 * @access Private
 */
router.post('/upload', [
  authMiddleware,
  uploadMiddleware.uploadImage.single('image'),
  uploadMiddleware.handleMulterError,
  validationMiddleware.validateImageData
], imageController.uploadImage);

/**
 * @route POST /api/images/upload/multiple
 * @desc Upload multiple images
 * @access Private
 */
router.post('/upload/multiple', [
  authMiddleware,
  uploadMiddleware.uploadImage.array('images', 50), // Limit to 50 images at once
  uploadMiddleware.handleMulterError,
  validationMiddleware.validateImageData
], imageController.uploadMultipleImages);

/**
 * @route GET /api/images
 * @desc Get all images for a user
 * @access Private
 */
router.get('/', [
  authMiddleware,
  validationMiddleware.validatePagination,
  query('projectId').optional().custom(validationMiddleware.isValidObjectId)
    .withMessage('Invalid project ID format'),
  query('tags').optional(),
  query('search').optional()
], imageController.getUserImages);

/**
 * @route GET /api/images/:imageId
 * @desc Get image by ID
 * @access Private
 */
router.get('/:imageId', [
  authMiddleware,
  validationMiddleware.validateObjectId('imageId')
], imageController.getImage);

/**
 * @route GET /api/images/:imageId/versions
 * @desc Get processed versions of an image
 * @access Private
 */
router.get('/:imageId/versions', [
  authMiddleware,
  validationMiddleware.validateObjectId('imageId')
], imageController.getProcessedVersions);

/**
 * @route PUT /api/images/:imageId
 * @desc Update image metadata
 * @access Private
 */
router.put('/:imageId', [
  authMiddleware,
  validationMiddleware.validateObjectId('imageId'),
  validationMiddleware.validateImageData
], imageController.updateImage);

/**
 * @route DELETE /api/images/:imageId
 * @desc Delete image (soft delete)
 * @access Private
 */
router.delete('/:imageId', [
  authMiddleware,
  validationMiddleware.validateObjectId('imageId')
], imageController.deleteImage);

/**
 * @route DELETE /api/images/:imageId/permanent
 * @desc Permanently delete image
 * @access Private
 */
router.delete('/:imageId/permanent', [
  authMiddleware,
  validationMiddleware.validateObjectId('imageId')
], imageController.permanentlyDeleteImage);

/**
 * @route POST /api/images/:imageId/restore
 * @desc Restore deleted image
 * @access Private
 */
router.post('/:imageId/restore', [
  authMiddleware,
  validationMiddleware.validateObjectId('imageId')
], imageController.restoreImage);

/**
 * @route GET /api/images/deleted
 * @desc Get images deleted in the last 30 days
 * @access Private
 */
router.get('/deleted', [
  authMiddleware,
  validationMiddleware.validatePagination
], imageController.getDeletedImages);

/**
 * @route GET /api/images/view/:imageKey
 * @desc Get image file (public endpoint for sharing)
 * @access Public
 */
router.get('/view/:imageKey', imageController.getImageFile);

module.exports = router;