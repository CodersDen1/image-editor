// backend/middleware/errorHandler.js

/**
 * Global error handler middleware
 * Standardizes error responses across the API
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
module.exports = function(err, req, res, next) {
    // Log the error
    console.error('ERROR:', err);
    
    // Default status code and message
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errorDetails = null;
    
    // Check for known error types and adjust response accordingly
    if (err.name === 'ValidationError') {
      // Mongoose validation error
      statusCode = 400;
      message = 'Validation Error';
      errorDetails = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
    } else if (err.name === 'MongoError' && err.code === 11000) {
      // MongoDB duplicate key error
      statusCode = 409;
      message = 'Duplicate Key Error';
      const field = Object.keys(err.keyValue)[0];
      errorDetails = `${field} already exists`;
    } else if (err.name === 'CastError') {
      // Mongoose cast error (e.g., invalid ObjectId)
      statusCode = 400;
      message = 'Invalid ID Format';
      errorDetails = `Invalid ${err.path}: ${err.value}`;
    } else if (err.name === 'JsonWebTokenError') {
      // JWT validation error
      statusCode = 401;
      message = 'Invalid Token';
    } else if (err.name === 'TokenExpiredError') {
      // JWT expired error
      statusCode = 401;
      message = 'Token Expired';
    } else if (err.statusCode) {
      // Error with explicit status code (e.g., from custom errors)
      statusCode = err.statusCode;
      message = err.message;
      errorDetails = err.details || null;
    } else if (err.code === 'ENOENT') {
      // File not found error
      statusCode = 404;
      message = 'File Not Found';
      errorDetails = err.path;
    } else if (err.code === 'EACCES') {
      // Permission error
      statusCode = 403;
      message = 'Permission Denied';
      errorDetails = err.path;
    }
    
    // Include stack trace in development environment
    const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;
    
    // Send error response
    res.status(statusCode).json({
      success: false,
      message,
      error: errorDetails || err.message,
      stack,
      timestamp: new Date().toISOString()
    });
  };