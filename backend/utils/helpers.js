// backend/utils/helpers.js

/**
 * Helper functions for common utilities across the application
 */

/**
 * Format bytes to human-readable string
 * 
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted string
 */
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  /**
   * Get file extension from filename
   * 
   * @param {string} filename - Filename
   * @returns {string} - Extension without dot
   */
  const getExtension = (filename) => {
    if (!filename || typeof filename !== 'string') return '';
    return filename.split('.').pop().toLowerCase();
  };
  
  /**
   * Generate a random string
   * 
   * @param {number} length - Length of the string
   * @returns {string} - Random string
   */
  const generateRandomString = (length = 10) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  };
  
  /**
   * Check if string is a valid URL
   * 
   * @param {string} url - URL to check
   * @returns {boolean} - True if valid URL
   */
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  /**
   * Sanitize filename (remove invalid characters)
   * 
   * @param {string} filename - Filename to sanitize
   * @returns {string} - Sanitized filename
   */
  const sanitizeFilename = (filename) => {
    if (!filename || typeof filename !== 'string') return 'file';
    
    // Remove path traversal and invalid characters
    return filename
      .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid characters with dash
      .replace(/\s+/g, '_')          // Replace spaces with underscore
      .trim();
  };
  
  /**
   * Create a slug from a string
   * 
   * @param {string} text - Text to slugify
   * @returns {string} - Slugified text
   */
  const slugify = (text) => {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')       // Replace spaces with -
      .replace(/&/g, '-and-')     // Replace & with 'and'
      .replace(/[^\w\-]+/g, '')   // Remove all non-word characters
      .replace(/\-\-+/g, '-');    // Replace multiple - with single -
  };
  
  /**
   * Check if a value is a valid ObjectId
   * 
   * @param {string} id - ID to check
   * @returns {boolean} - True if valid ObjectId
   */
  const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
  };
  
  /**
   * Get a date range from a preset
   * 
   * @param {string} preset - Date range preset (today, yesterday, week, month, year)
   * @returns {Object} - Start and end date
   */
  const getDateRangeFromPreset = (preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    switch (preset) {
      case 'today':
        return {
          start: today,
          end: tomorrow
        };
        
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday,
          end: today
        };
        
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return {
          start: weekStart,
          end: tomorrow
        };
        
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: monthStart,
          end: tomorrow
        };
        
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return {
          start: yearStart,
          end: tomorrow
        };
        
      default:
        return {
          start: null,
          end: null
        };
    }
  };
  
  /**
   * Extract pagination parameters from request
   * 
   * @param {Object} req - Express request object
   * @returns {Object} - Pagination parameters
   */
  const getPaginationParams = (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    return {
      page,
      limit,
      skip
    };
  };
  
  /**
   * Deep copy an object
   * 
   * @param {Object} obj - Object to copy
   * @returns {Object} - Deep copy of the object
   */
  const deepCopy = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
  
  /**
   * Extract query parameters for MongoDB query
   * 
   * @param {Object} query - Query parameters
   * @param {Array} allowedFields - Allowed fields to filter on
   * @returns {Object} - MongoDB query object
   */
  const buildMongoQuery = (query, allowedFields) => {
    const mongoQuery = {};
    
    for (const field of allowedFields) {
      if (query[field] !== undefined) {
        if (Array.isArray(query[field])) {
          mongoQuery[field] = { $in: query[field] };
        } else if (typeof query[field] === 'string' && query[field].startsWith('/') && query[field].endsWith('/')) {
          // Regex search
          const regex = new RegExp(query[field].slice(1, -1), 'i');
          mongoQuery[field] = regex;
        } else {
          mongoQuery[field] = query[field];
        }
      }
    }
    
    return mongoQuery;
  };
  
  /**
   * Check if a file is an image based on extension
   * 
   * @param {string} filename - Filename to check
   * @returns {boolean} - True if file is an image
   */
  const isImageFile = (filename) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'raw'];
    const extension = getExtension(filename);
    return imageExtensions.includes(extension);
  };
  
  module.exports = {
    formatBytes,
    getExtension,
    generateRandomString,
    isValidUrl,
    sanitizeFilename,
    slugify,
    isValidObjectId,
    getDateRangeFromPreset,
    getPaginationParams,
    deepCopy,
    buildMongoQuery,
    isImageFile
  };