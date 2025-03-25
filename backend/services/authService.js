// backend/services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const authConfig = require('../config/auth');
const emailConfig = require('../config/email');

/**
 * Authentication Service
 * Handles authentication, token management, and security
 */
class AuthService {
  /**
   * Generate JWT access token
   * 
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateAccessToken(user) {
    const payload = {
      id: user._id || user.id,
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, authConfig.jwtConfig.secret, {
      expiresIn: authConfig.jwtConfig.accessTokenExpiration,
      algorithm: authConfig.jwtConfig.algorithm,
      issuer: authConfig.jwtConfig.issuer
    });
  }
  
  /**
   * Generate refresh token
   * 
   * @returns {Object} - Refresh token object with token and expiration date
   */
  generateRefreshToken() {
    // Create a random token
    const token = crypto.randomBytes(40).toString('hex');
    
    // Set expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + authConfig.jwtConfig.refreshTokenExpiration);
    
    return {
      token,
      expiresAt
    };
  }
  
  /**
   * Verify access token
   * 
   * @param {string} token - JWT token
   * @returns {Object|null} - Decoded token or null if invalid
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, authConfig.jwtConfig.secret, {
        algorithms: [authConfig.jwtConfig.algorithm],
        issuer: authConfig.jwtConfig.issuer
      });
    } catch (error) {
      console.error('Token verification error:', error.message);
      return null;
    }
  }
  
  /**
   * Validate password against policy
   * 
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result with success flag and message
   */
  validatePassword(password) {
    return authConfig.validatePassword(password);
  }
  
  /**
   * Register a new user
   * 
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - Registration result
   */
  async registerUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      
      if (existingUser) {
        return {
          success: false,
          message: 'Email is already registered'
        };
      }
      
      // Validate password
      const passwordValidation = this.validatePassword(userData.password);
      if (!passwordValidation.success) {
        return {
          success: false,
          message: passwordValidation.message
        };
      }
      
      // Set default role if not provided
      if (!userData.role) {
        userData.role = 'agent';
      }
      
      // Create new user
      const user = new User({
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: userData.password, // Will be hashed in pre-save hook
        role: userData.role,
        agency: userData.agency || {},
        isActive: true,
        createdAt: new Date()
      });
      
      // Save user to database
      await user.save();
      
      // Generate JWT token
      const token = this.generateAccessToken(user);
      
      // Generate refresh token
      const refreshTokenData = this.generateRefreshToken();
      
      // Add refresh token to user
      user.addRefreshToken(
        refreshTokenData.token,
        refreshTokenData.expiresAt,
        userData.userAgent || 'Unknown',
        userData.ipAddress || 'Unknown'
      );
      
      // Update last login
      user.lastLoginAt = new Date();
      await user.save();
      
      // Send welcome email
      if (userData.sendWelcomeEmail !== false) {
        await emailConfig.sendEmail({
          to: user.email,
          template: 'welcome',
          data: {
            name: user.name
          }
        });
      }
      
      return {
        success: true,
        message: 'Registration successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token,
        refreshToken: refreshTokenData.token,
        expiresIn: authConfig.jwtConfig.accessTokenExpiration
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Error registering user',
        error: error.message
      };
    }
  }
  
  /**
   * Login a user
   * 
   * @param {Object} loginData - Login credentials
   * @returns {Promise<Object>} - Login result
   */
  async loginUser(loginData) {
    try {
      // Find user by email
      const user = await User.findOne({ email: loginData.email.toLowerCase() });
      
      // Check if user exists
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }
      
      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is inactive. Please contact support.'
        };
      }
      
      // Check password
      const isMatch = await user.comparePassword(loginData.password);
      
      if (!isMatch) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }
      
      // Generate JWT token
      const token = this.generateAccessToken(user);
      
      // Generate refresh token
      const refreshTokenData = this.generateRefreshToken();
      
      // Add refresh token to user
      user.addRefreshToken(
        refreshTokenData.token,
        refreshTokenData.expiresAt,
        loginData.userAgent || 'Unknown',
        loginData.ipAddress || 'Unknown'
      );
      
      // Clean expired refresh tokens
      user.cleanExpiredRefreshTokens();
      
      // Update last login
      user.lastLoginAt = new Date();
      await user.save();
      
      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage
        },
        token,
        refreshToken: refreshTokenData.token,
        expiresIn: authConfig.jwtConfig.accessTokenExpiration
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Error during login',
        error: error.message
      };
    }
  }
  
  /**
   * Refresh access token using refresh token
   * 
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} - New access token
   */
  async refreshToken(refreshToken) {
    try {
      // Find user with this refresh token
      const user = await User.findOne({
        'refreshTokens.token': refreshToken,
        'refreshTokens.expiresAt': { $gt: new Date() }
      });
      
      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired refresh token'
        };
      }
      
      // Check if account is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is inactive'
        };
      }
      
      // Generate new access token
      const token = this.generateAccessToken(user);
      
      return {
        success: true,
        token,
        expiresIn: authConfig.jwtConfig.accessTokenExpiration
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        message: 'Error refreshing token',
        error: error.message
      };
    }
  }
  
  /**
   * Logout a user / Invalidate refresh token
   * 
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token to invalidate
   * @returns {Promise<Object>} - Logout result
   */
  async logoutUser(userId, refreshToken) {
    try {
      // Find user
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Remove refresh token if provided
      if (refreshToken) {
        user.removeRefreshToken(refreshToken);
        await user.save();
      }
      
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Error during logout',
        error: error.message
      };
    }
  }
  
  /**
   * Generate password reset token
   * 
   * @returns {Object} - Reset token object with token and expiration date
   */
  generatePasswordResetToken() {
    // Create a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration date (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    return {
      token,
      expiresAt
    };
  }
  
  /**
   * Request password reset
   * 
   * @param {string} email - User email
   * @returns {Promise<Object>} - Password reset request result
   */
  async forgotPassword(email) {
    try {
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      
      // Don't reveal if user exists or not for security
      if (!user) {
        return {
          success: true,
          message: 'If your email is registered, you will receive a password reset link'
        };
      }
      
      // Generate reset token
      const resetTokenData = this.generatePasswordResetToken();
      
      // Save reset token to user
      user.resetPasswordToken = resetTokenData.token;
      user.resetPasswordExpires = resetTokenData.expiresAt;
      await user.save();
      
      // Send password reset email
      await emailConfig.sendEmail({
        to: user.email,
        template: 'passwordReset',
        data: {
          name: user.name,
          resetUrl: `${process.env.APP_URL}/reset-password?token=${resetTokenData.token}`
        }
      });
      
      return {
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: 'Error processing password reset request',
        error: error.message
      };
    }
  }
  
  /**
   * Reset password with token
   * 
   * @param {string} token - Reset token
   * @param {string} password - New password
   * @returns {Promise<Object>} - Password reset result
   */
  async resetPassword(token, password) {
    try {
      // Find user with this reset token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      });
      
      if (!user) {
        return {
          success: false,
          message: 'Password reset token is invalid or has expired'
        };
      }
      
      // Validate password
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.success) {
        return {
          success: false,
          message: passwordValidation.message
        };
      }
      
      // Update password and clear reset token
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      // Send password change notification
      await emailConfig.sendEmail({
        to: user.email,
        template: 'accountUpdate',
        data: {
          name: user.name,
          action: 'password reset'
        }
      });
      
      return {
        success: true,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'Error resetting password',
        error: error.message
      };
    }
  }
  
  /**
   * Change password (logged in user)
   * 
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Password change result
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Find user
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Check current password
      const isMatch = await user.comparePassword(currentPassword);
      
      if (!isMatch) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }
      
      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.success) {
        return {
          success: false,
          message: passwordValidation.message
        };
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      // Invalidate all refresh tokens for security
      user.refreshTokens = [];
      await user.save();
      
      // Send password change notification
      await emailConfig.sendEmail({
        to: user.email,
        template: 'accountUpdate',
        data: {
          name: user.name,
          action: 'password change'
        }
      });
      
      return {
        success: true,
        message: 'Password changed successfully. Please login again.'
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Error changing password',
        error: error.message
      };
    }
  }
}

module.exports = new AuthService();