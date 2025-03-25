// backend/models/Watermark.js
const mongoose = require('mongoose');

/**
 * Watermark Schema
 * Defines the structure for watermark settings in MongoDB
 */
const WatermarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  storageKey: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
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
    padding: {
      type: Number,
      min: 0,
      max: 100,
      default: 20
    },
    autoApply: {
      type: Boolean,
      default: false
    }
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
 * Get default watermark settings
 * @returns {Object} Default settings
 */
WatermarkSchema.statics.getDefaultSettings = function() {
  return {
    position: 'bottomRight',
    opacity: 0.7,
    size: 30,
    padding: 20,
    autoApply: false
  };
};

/**
 * Check if autoApply is enabled
 * @returns {boolean} True if autoApply is enabled
 */
WatermarkSchema.methods.shouldAutoApply = function() {
  return this.settings.autoApply === true;
};

/**
 * Update watermark settings
 * @param {Object} newSettings - New settings
 */
WatermarkSchema.methods.updateSettings = function(newSettings) {
  Object.assign(this.settings, newSettings);
  this.updatedAt = new Date();
};

module.exports = mongoose.model('Watermark', WatermarkSchema);