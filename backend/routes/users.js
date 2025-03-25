// backend/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
const { body } = require('express-validator');
const validationMiddleware = require('../middleware/validation');

/**
 * User Routes
 */

/**
 * @route GET /api/users/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
  const result = await userController.getProfile(req.user.id);
  
  if (!result.success) {
    return res.status(404).json(result);
  }
  
  res.json(result);
});

/**
 * @route PUT /api/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', [
  authMiddleware,
  body('name').optional().isString().isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('agency.name').optional().isString().isLength({ max: 100 })
    .withMessage('Agency name must be 100 characters or less'),
  body('agency.website').optional().isURL()
    .withMessage('Agency website must be a valid URL'),
  validationMiddleware.validateRequest
], async (req, res) => {
  const result = await userController.updateProfile(req.user.id, req.body);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

/**
 * @route POST /api/users/profile/image
 * @desc Upload profile image
 * @access Private
 */
router.post('/profile/image', [
  authMiddleware,
  uploadMiddleware.uploadProfile.single('profileImage'),
  uploadMiddleware.handleMulterError
], async (req, res) => {
  // If file wasn't uploaded properly
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image provided'
    });
  }
  
  const result = await userController.uploadProfileImage(req.user.id, req.file);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

/**
 * @route DELETE /api/users/profile/image
 * @desc Delete profile image
 * @access Private
 */
router.delete('/profile/image', authMiddleware, async (req, res) => {
  const result = await userController.deleteProfileImage(req.user.id);
  
  if (!result.success) {
    return res.status(404).json(result);
  }
  
  res.json(result);
});

/**
 * @route GET /api/users/stats
 * @desc Get user statistics
 * @access Private
 */
router.get('/stats', authMiddleware, async (req, res) => {
  const result = await userController.getUserStats(req.user.id);
  
  if (!result.success) {
    return res.status(500).json(result);
  }
  
  res.json(result);
});

/**
 * @route PUT /api/users/email
 * @desc Update user email
 * @access Private
 */
router.put('/email', [
  authMiddleware,
  body('newEmail').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validationMiddleware.validateRequest
], async (req, res) => {
  const result = await userController.updateEmail(
    req.user.id,
    req.body.newEmail,
    req.body.password
  );
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

/**
 * @route POST /api/users/deactivate
 * @desc Deactivate user account
 * @access Private
 */
router.post('/deactivate', [
  authMiddleware,
  body('password').notEmpty().withMessage('Password is required'),
  validationMiddleware.validateRequest
], async (req, res) => {
  const result = await userController.deactivateAccount(
    req.user.id,
    req.body.password
  );
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

module.exports = router;