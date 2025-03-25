// backend/middleware/validation.js
const { validationResult } = require('express-validator');

/**
 * Validate request data based on express-validator rules
 * Returns formatted validation errors if any
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Validate pagination parameters
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validatePagination = (req, res, next) => {
  // Default values
  req.query.page = parseInt(req.query.page) || 1;
  req.query.limit = parseInt(req.query.limit) || 20;
  
  // Enforce limits
  if (req.query.page < 1) req.query.page = 1;
  if (req.query.limit < 1) req.query.limit = 1;
  if (req.query.limit > 100) req.query.limit = 100;
  
  next();
};

/**
 * Validation for MongoDB ObjectId
 * 
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid ObjectId
 */
const isValidObjectId = (id) => {
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
};

/**
 * Validate MongoDB ObjectId middleware
 * 
 * @param {string} paramName - Name of parameter to validate
 * @returns {Function} - Middleware function
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName];
    
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

/**
 * Validate image request data
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateImageData = (req, res, next) => {
  // Optional project ID validation
  if (req.body.projectId && !isValidObjectId(req.body.projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid project ID format'
    });
  }
  
  // Tags validation
  if (req.body.tags) {
    if (typeof req.body.tags === 'string') {
      // Convert comma-separated string to array
      req.body.tags = req.body.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    } else if (!Array.isArray(req.body.tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be a string or an array'
      });
    }
    
    // Check tag length
    if (req.body.tags.some(tag => tag.length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be 50 characters or less'
      });
    }
  }
  
  // Custom fields validation
  if (req.body.customFields) {
    try {
      if (typeof req.body.customFields === 'string') {
        req.body.customFields = JSON.parse(req.body.customFields);
      }
      
      if (typeof req.body.customFields !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Custom fields must be a valid JSON object'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON in custom fields'
      });
    }
  }
  
  // Location validation
  if (req.body.location) {
    try {
      if (typeof req.body.location === 'string') {
        req.body.location = JSON.parse(req.body.location);
      }
      
      if (!req.body.location.lat || !req.body.location.lng || 
          isNaN(parseFloat(req.body.location.lat)) || 
          isNaN(parseFloat(req.body.location.lng))) {
        return res.status(400).json({
          success: false,
          message: 'Location must contain valid lat and lng coordinates'
        });
      }
      
      // Convert to numbers
      req.body.location.lat = parseFloat(req.body.location.lat);
      req.body.location.lng = parseFloat(req.body.location.lng);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location format'
      });
    }
  }
  
  next();
};

/**
 * Validate processing options
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateProcessingOptions = (req, res, next) => {
  // Validate basic numeric parameters
  const numericParams = [
    'brightness', 'contrast', 'saturation', 'sharpness', 
    'quality', 'noiseReduction', 'shadows', 'highlights'
  ];
  
  for (const param of numericParams) {
    if (req.body[param] !== undefined) {
      const value = parseFloat(req.body[param]);
      
      if (isNaN(value)) {
        return res.status(400).json({
          success: false,
          message: `${param} must be a valid number`
        });
      }
      
      // Convert to number
      req.body[param] = value;
    }
  }
  
  // Validate boolean parameters
  const booleanParams = ['whiteBalance', 'perspective', 'watermarkEnabled'];
  
  for (const param of booleanParams) {
    if (req.body[param] !== undefined) {
      if (typeof req.body[param] === 'string') {
        req.body[param] = req.body[param].toLowerCase() === 'true';
      } else if (typeof req.body[param] !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `${param} must be a boolean value`
        });
      }
    }
  }
  
  // Validate watermark position
  if (req.body.watermarkPosition && 
      !['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'].includes(req.body.watermarkPosition)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid watermark position'
    });
  }
  
  // Validate preset
  if (req.body.preset && typeof req.body.preset !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Preset must be a string'
    });
  }
  
  // If manual adjustments are passed
  if (req.body.adjustments) {
    try {
      if (typeof req.body.adjustments === 'string') {
        req.body.adjustments = JSON.parse(req.body.adjustments);
      }
      
      if (typeof req.body.adjustments !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Adjustments must be a valid JSON object'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON in adjustments'
      });
    }
  }
  
  next();
};

/**
 * Validate share creation options
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateShareOptions = (req, res, next) => {
  // Validate image IDs
  if (!req.body.imageIds || !Array.isArray(req.body.imageIds) || req.body.imageIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one image ID is required'
    });
  }
  
  // Validate each image ID
  for (const imageId of req.body.imageIds) {
    if (!isValidObjectId(imageId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid image ID format: ${imageId}`
      });
    }
  }
  
  // Validate expiration days
  if (req.body.expirationDays !== undefined) {
    const days = parseInt(req.body.expirationDays);
    
    if (isNaN(days) || days < 0) {
      return res.status(400).json({
        success: false,
        message: 'Expiration days must be a positive number or zero'
      });
    }
    
    // Convert to number
    req.body.expirationDays = days;
  }
  
  // Validate max access
  if (req.body.maxAccess !== undefined) {
    const maxAccess = parseInt(req.body.maxAccess);
    
    if (isNaN(maxAccess) || maxAccess < 0) {
      return res.status(400).json({
        success: false,
        message: 'Max access must be a positive number or zero'
      });
    }
    
    // Convert to number
    req.body.maxAccess = maxAccess;
  }
  
  // Validate that title is not too long
  if (req.body.title && typeof req.body.title === 'string' && req.body.title.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Title must be 100 characters or less'
    });
  }
  
  // Validate that description is not too long
  if (req.body.description && typeof req.body.description === 'string' && req.body.description.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Description must be 500 characters or less'
    });
  }
  
  next();
};

/**
 * Validate download options
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateDownloadOptions = (req, res, next) => {
  // Validate format if provided
  if (req.query.format) {
    const validFormats = ['jpg', 'jpeg', 'png', 'webp', 'tiff'];
    
    if (!validFormats.includes(req.query.format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Supported formats: ${validFormats.join(', ')}`
      });
    }
    
    // Normalize format
    req.query.format = req.query.format.toLowerCase();
  }
  
  // Validate quality if provided
  if (req.query.quality) {
    const quality = parseInt(req.query.quality);
    
    if (isNaN(quality) || quality < 1 || quality > 100) {
      return res.status(400).json({
        success: false,
        message: 'Quality must be a number between 1 and 100'
      });
    }
    
    // Convert to number
    req.query.quality = quality;
  }
  
  next();
};

module.exports = {
  validateRequest,
  validatePagination,
  isValidObjectId,
  validateObjectId,
  validateImageData,
  validateProcessingOptions,
  validateShareOptions,
  validateDownloadOptions
};