// backend/routes/shares.js
const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const { body, param } = require('express-validator');

/**
 * Share Routes
 */

/**
 * @route POST /api/shares
 * @desc Create a new share
 * @access Private
 */
router.post('/', [
  authMiddleware,
  body('imageIds').isArray({ min: 1 }).withMessage('At least one image ID is required'),
  body('imageIds.*').isMongoId().withMessage('Invalid image ID format'),
  body('title').optional().isString().isLength({ max: 100 })
    .withMessage('Title must be 100 characters or less'),
  body('description').optional().isString().isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('password').optional(),
  body('expirationDays').optional().isInt({ min: 0 })
    .withMessage('Expiration days must be a positive number or zero'),
  body('maxAccess').optional().isInt({ min: 0 })
    .withMessage('Max access must be a positive number or zero'),
  validationMiddleware.validateRequest
], shareController.createShare);

/**
 * @route GET /api/shares
 * @desc Get shares for a user
 * @access Private
 */
router.get('/', [
  authMiddleware,
  validationMiddleware.validatePagination
], shareController.getUserShares);

/**
 * @route GET /api/shares/token/:token
 * @desc Get share details by token
 * @access Public
 */
router.get('/token/:token', shareController.getShareByToken);

/**
 * @route GET /api/shares/download/:token/:imageId
 * @desc Download a shared image
 * @access Public
 */
router.get('/download/:token/:imageId', [
  validationMiddleware.validateObjectId('imageId')
], shareController.downloadSharedImage);

/**
 * @route GET /api/shares/download-zip/:token
 * @desc Download all images in a share as a ZIP
 * @access Public
 */
router.get('/download-zip/:token', shareController.downloadShareAsZip);

/**
 * @route DELETE /api/shares/:shareId
 * @desc Delete a share
 * @access Private
 */
router.delete('/:shareId', [
  authMiddleware,
  validationMiddleware.validateObjectId('shareId')
], shareController.deleteShare);

/**
 * @route PUT /api/shares/:shareId
 * @desc Update share settings
 * @access Private
 */
router.put('/:shareId', [
  authMiddleware,
  validationMiddleware.validateObjectId('shareId'),
  body('title').optional().isString().isLength({ max: 100 })
    .withMessage('Title must be 100 characters or less'),
  body('description').optional().isString().isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('password').optional(),
  body('expirationDays').optional().isInt({ min: 0 })
    .withMessage('Expiration days must be a positive number or zero'),
  body('maxAccess').optional().isInt({ min: 0 })
    .withMessage('Max access must be a positive number or zero'),
  validationMiddleware.validateRequest
], shareController.updateShare);

/**
 * @route POST /api/shares/verify-password/:token
 * @desc Verify share password
 * @access Public
 */
router.post('/verify-password/:token', [
  body('password').notEmpty().withMessage('Password is required'),
  validationMiddleware.validateRequest
], shareController.verifySharePassword);

/**
 * @route GET /api/shares/check/:token
 * @desc Check if a share exists and is valid
 * @access Public
 */
router.get('/check/:token', shareController.checkShareStatus);

module.exports = router;