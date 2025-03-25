// backend/models/Share.js
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Share Schema
 * Defines the structure for image sharing in MongoDB
 */
const ShareSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  images: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image',
    required: true
  }],
  shareToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String
  },
  description: {
    type: String
  },
  accessCount: {
    type: Number,
    default: 0
  },
  maxAccess: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  isPasswordProtected: {
    type: Boolean,
    default: false
  },
  password: {
    type: String
  },
  expiresAt: {
    type: Date,
    index: true
  },
  lastAccessedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * Generate a secure share token
 * @returns {string} Random token
 */
ShareSchema.statics.generateShareToken = function() {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Check if share is expired
 * @returns {boolean} True if expired
 */
ShareSchema.methods.isExpired = function() {
  if (!this.expiresAt) {
    return false;
  }
  return new Date() > this.expiresAt;
};

/**
 * Check if share has reached maximum access count
 * @returns {boolean} True if max access reached
 */
ShareSchema.methods.isMaxAccessReached = function() {
  if (this.maxAccess === 0) {
    return false; // Unlimited access
  }
  return this.accessCount >= this.maxAccess;
};

/**
 * Check if share is still valid
 * @returns {boolean} True if valid
 */
ShareSchema.methods.isValid = function() {
  return !this.isExpired() && !this.isMaxAccessReached();
};

/**
 * Record an access to the share
 */
ShareSchema.methods.recordAccess = async function() {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  await this.save();
};

/**
 * Verify share password
 * @param {string} password Password to verify
 * @returns {boolean} True if password matches
 */
ShareSchema.methods.verifyPassword = function(password) {
  if (!this.isPasswordProtected) {
    return true;
  }
  
  return password === this.password;
};

/**
 * Find shares expiring soon
 * @param {Number} daysThreshold Days threshold
 * @returns {Promise<Array>} Shares expiring soon
 */
ShareSchema.statics.findExpiringShares = async function(daysThreshold = 3) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    expiresAt: { 
      $exists: true, 
      $ne: null,
      $lte: thresholdDate,
      $gt: new Date()
    }
  }).populate('userId', 'name email');
};

module.exports = mongoose.model('Share', ShareSchema);