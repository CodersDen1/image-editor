// backend/models/Preset.js
const mongoose = require('mongoose');

/**
 * Preset Schema
 * Defines the structure for image processing presets in MongoDB
 */
const PresetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  settings: {
    // Common image adjustment settings
    brightness: Number,
    contrast: Number,
    saturation: Number,
    sharpness: Number,
    temperature: Number,
    
    // Advanced settings
    shadows: Number,
    highlights: Number,
    whiteBalance: Boolean,
    perspective: Boolean,
    noiseReduction: Number,
    
    // Additional settings can be stored in this object
    extras: Object
  },
  usageCount: {
    type: Number,
    default: 0
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

// Create compound index for user and preset name
PresetSchema.index({ userId: 1, name: 1 }, { unique: true });

/**
 * Get popular presets
 */
PresetSchema.statics.getPopularPresets = async function(limit = 10) {
  return this.find({ 
    isPublic: true 
  })
  .sort({ usageCount: -1 })
  .limit(limit);
};

/**
 * Get presets by user
 */
PresetSchema.statics.getUserPresets = async function(userId) {
  return this.find({ userId })
    .sort({ updatedAt: -1 });
};

/**
 * Increment usage count
 */
PresetSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
};

module.exports = mongoose.model('Preset', PresetSchema);