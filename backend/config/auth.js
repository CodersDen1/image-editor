// backend/config/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Authentication Configuration
 * ---------------------------
 * JWT token settings, password policies, and authentication utilities
 * 
 * Required environment variables:
 * - JWT_SECRET: Secret key for JWT signing
 * - JWT_EXPIRATION: Token expiration time (e.g., "1h", "1d")
 * - REFRESH_TOKEN_EXPIRATION: Refresh token expiration in days
 */

// JWT configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  accessTokenExpiration: process.env.JWT_EXPIRATION || '1h',
  refreshTokenExpiration: parseInt(process.env.REFRESH_TOKEN_EXPIRATION) || 7, // days
  algorithm: 'HS256',
  issuer: 'realestate-imagepro'
};

// Password policy
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90 // days
};

/**
 * Generate access token
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
const generateAccessToken = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.accessTokenExpiration,
    algorithm: jwtConfig.algorithm,
    issuer: jwtConfig.issuer
  });
};

/**
 * Generate refresh token
 * @returns {Object} - Refresh token and expiration date
 */
const generateRefreshToken = () => {
  // Create a random token
  const token = crypto.randomBytes(40).toString('hex');
  
  // Set expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + jwtConfig.refreshTokenExpiration);
  
  return {
    token,
    expiresAt
  };
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token or null if invalid
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer
    });
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
};

/**
 * Validate password against policy
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with success flag and message
 */
const validatePassword = (password) => {
  const result = {
    success: true,
    message: 'Password is valid'
  };
  
  if (password.length < passwordPolicy.minLength) {
    result.success = false;
    result.message = `Password must be at least ${passwordPolicy.minLength} characters long`;
    return result;
  }
  
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    result.success = false;
    result.message = 'Password must contain at least one uppercase letter';
    return result;
  }
  
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    result.success = false;
    result.message = 'Password must contain at least one lowercase letter';
    return result;
  }
  
  if (passwordPolicy.requireNumbers && !/[0-9]/.test(password)) {
    result.success = false;
    result.message = 'Password must contain at least one number';
    return result;
  }
  
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.success = false;
    result.message = 'Password must contain at least one special character';
    return result;
  }
  
  return result;
};

/**
 * Generate password reset token
 * @returns {Object} - Reset token and expiration date
 */
const generatePasswordResetToken = () => {
  // Create a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration date (24 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  return {
    token,
    expiresAt
  };
};

// Warning if JWT_SECRET is not set or is default
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set in environment variables. Using random secret.');
  console.warn('⚠️  This will invalidate all existing tokens when the server restarts.');
}

module.exports = {
  jwtConfig,
  passwordPolicy,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  validatePassword,
  generatePasswordResetToken
};