// backend/utils/validation.js
const { body, query, param, validationResult } = require('express-validator');

/**
 * Validation utility functions
 */

/**
 * Handle validation errors from express-validator
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {boolean} - True if validation passes, false otherwise
 */
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
    return false;
  }
  
  return true;
};

/**
 * Validation middleware to check validation results
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validate = (req, res, next) => {
  if (handleValidationErrors(req, res)) {
    next();
  }
};

/**
 * User registration validation rules
 */
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('email').notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password').notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  
  body('role').optional()
    .isIn(['agent', 'admin', 'support']).withMessage('Invalid role'),
  
  validate
];

/**
 * Login validation rules
 */
const loginValidation = [
  body('email').notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password').notEmpty().withMessage('Password is required'),
  
  validate
];

/**
 * Password reset validation rules
 */
const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  
  body('password').notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  
  validate
];

/**
 * Change password validation rules
 */
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  
  body('newPassword').notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  
  validate
];

/**
 * Image upload validation rules
 */
const imageUploadValidation = [
  body('projectId').optional().isMongoId().withMessage('Invalid project ID format'),
  
  body('tags').optional(),
  
  body('customFields').optional(),
  
  validate
];

/**
 * Processing validation rules
 */
const processingValidation = [
  param('imageId').notEmpty().withMessage('Image ID is required')
    .isMongoId().withMessage('Invalid image ID format'),
  
  body('preset').optional().isString(),
  
  body('brightness').optional().isFloat({ min: 0.5, max: 2.0 }),
  body('contrast').optional().isFloat({ min: 0.5, max: 2.0 }),
  body('saturation').optional().isFloat({ min: 0.5, max: 2.0 }),
  body('sharpness').optional().isFloat({ min: 0.5, max: 3.0 }),
  
  body('whiteBalance').optional().isBoolean(),
  body('perspective').optional().isBoolean(),
  
  body('quality').optional().isInt({ min: 1, max: 100 }),
  
  body('watermarkEnabled').optional().isBoolean(),
  body('watermarkPosition').optional()
    .isIn(['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center']),
  
  validate
];

/**
 * Batch processing validation rules
 */
const batchProcessingValidation = [
  body('imageIds').isArray({ min: 1 }).withMessage('At least one image ID is required'),
  body('imageIds.*').isMongoId().withMessage('Invalid image ID format'),
  
  body('mode').optional().isIn(['auto', 'manual']).withMessage('Mode must be "auto" or "manual"'),
  
  validate
];

/**
 * Share creation validation rules
 */
const shareCreationValidation = [
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
  
  validate
];

/**
 * Watermark settings validation rules
 */
const watermarkSettingsValidation = [
  body('position').optional()
    .isIn(['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'])
    .withMessage('Invalid position'),
  
  body('opacity').optional().isFloat({ min: 0, max: 1 })
    .withMessage('Opacity must be between 0 and 1'),
  
  body('size').optional().isInt({ min: 5, max: 50 })
    .withMessage('Size must be between 5 and 50'),
  
  body('padding').optional().isInt({ min: 0, max: 100 })
    .withMessage('Padding must be between 0 and 100'),
  
  body('autoApply').optional().isBoolean()
    .withMessage('Auto apply must be a boolean'),
  
  validate
];

/**
 * Pagination validation rules
 */
const paginationValidation = [
  query('page').optional().isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit').optional().isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  validate
];

/**
 * Image ID param validation rule
 */
const imageIdParamValidation = [
  param('imageId').notEmpty().withMessage('Image ID is required')
    .isMongoId().withMessage('Invalid image ID format'),
  
  validate
];

/**
 * Date range validation rules
 */
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  
  validate
];

/**
 * Email validation rule
 */
const emailValidation = (fieldName = 'email') => {
  return body(fieldName).notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail();
};

/**
 * Password validation rule
 */
const passwordValidation = (fieldName = 'password') => {
  return body(fieldName).notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long');
};

/**
 * MongoDB ObjectId validation rule
 */
const objectIdValidation = (fieldName, location = 'params') => {
  if (location === 'params') {
    return param(fieldName).notEmpty().withMessage(`${fieldName} is required`)
      .isMongoId().withMessage(`Invalid ${fieldName} format`);
  } else if (location === 'body') {
    return body(fieldName).notEmpty().withMessage(`${fieldName} is required`)
      .isMongoId().withMessage(`Invalid ${fieldName} format`);
  } else if (location === 'query') {
    return query(fieldName).notEmpty().withMessage(`${fieldName} is required`)
      .isMongoId().withMessage(`Invalid ${fieldName} format`);
  }
};

module.exports = {
  validate,
  handleValidationErrors,
  registerValidation,
  loginValidation,
  resetPasswordValidation,
  changePasswordValidation,
  imageUploadValidation,
  processingValidation,
  batchProcessingValidation,
  shareCreationValidation,
  watermarkSettingsValidation,
  paginationValidation,
  imageIdParamValidation,
  dateRangeValidation,
  emailValidation,
  passwordValidation,
  objectIdValidation
};