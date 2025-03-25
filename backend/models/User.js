// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * User Schema
 * Defines the structure for user documents in MongoDB
 */
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['agent', 'admin', 'support'],
    default: 'agent'
  },
  agency: {
    name: String,
    logo: String,
    website: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String
  },
  storage: {
    used: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      default: 1024 * 1024 * 1024 // 1GB default storage limit
    }
  },
  watermark: {
    watermarkKey: String,
    watermarkUrl: String,
    settings: {
      position: {
        type: String,
        enum: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'],
        default: 'bottomRight'
      },
      opacity: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.7
      },
      size: {
        type: Number,
        min: 5,
        max: 50,
        default: 30
      },
      autoApply: {
        type: Boolean,
        default: false
      }
    },
    createdAt: Date,
    updatedAt: Date
  },
  lastLoginAt: Date,
  refreshTokens: [{
    token: String,
    expiresAt: Date,
    userAgent: String,
    ipAddress: String
  }],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    }
  }
});

/**
 * Pre-save hook to hash passwords before saving
 */
UserSchema.pre('save', async function(next) {
  const user = this;
  
  // Only hash the password if it's modified or new
  if (!user.isModified('password')) return next();
  
  try {
    // Generate salt and hash
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare passwords
 * 
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - True if passwords match
 */
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Add refresh token to user
 * 
 * @param {string} token - Refresh token
 * @param {Date} expiresAt - Expiration date
 * @param {string} userAgent - User agent string
 * @param {string} ipAddress - IP address
 */
UserSchema.methods.addRefreshToken = function(token, expiresAt, userAgent, ipAddress) {
  this.refreshTokens.push({
    token,
    expiresAt,
    userAgent,
    ipAddress
  });
};

/**
 * Remove refresh token from user
 * 
 * @param {string} token - Refresh token to remove
 * @returns {boolean} - True if token was found and removed
 */
UserSchema.methods.removeRefreshToken = function(token) {
  const initialLength = this.refreshTokens.length;
  this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
  return this.refreshTokens.length < initialLength;
};

/**
 * Clean expired refresh tokens
 */
UserSchema.methods.cleanExpiredRefreshTokens = function() {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(t => t.expiresAt > now);
};

module.exports = mongoose.model('User', UserSchema);