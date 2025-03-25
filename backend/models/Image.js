// backend/models/Image.js
const mongoose = require('mongoose');

/**
 * Image Schema
 * Defines the structure for image metadata in MongoDB
 */
const ImageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true
  },
  storageKey: {
    type: String,
    required: true,
    unique: true
  },
  url: {
    type: String
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
  mimeType: {
    type: String,
    required: true
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  processingType: {
    type: String,
    enum: ['auto', 'manual', null],
    default: null
  },
  processingSettings: {
    type: Object,
    default: null
  },
  parentImageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image',
    default: null
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  tags: [{
    type: String,
    index: true
  }],
  metadata: {
    exif: Object,
    location: {
      lat: Number,
      lng: Number
    },
    propertyId: String,
    listingId: String,
    customFields: Object
  },
  thumbnails: {
    small: String,
    medium: String,
    large: String
  },
  shareCount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deleteAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for common queries
ImageSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
ImageSchema.index({ userId: 1, projectId: 1, isDeleted: 1 });
ImageSchema.index({ userId: 1, tags: 1, isDeleted: 1 });

/**
 * Get processed versions of an image
 */
ImageSchema.methods.getProcessedVersions = async function() {
  return await this.model('Image').find({
    parentImageId: this._id,
    isDeleted: false
  }).sort({ createdAt: -1 });
};

/**
 * Update image counters
 */
ImageSchema.methods.updateCounter = async function(counterType) {
  const validCounters = ['shareCount', 'downloadCount', 'viewCount'];
  
  if (!validCounters.includes(counterType)) {
    throw new Error(`Invalid counter type: ${counterType}`);
  }
  
  this[counterType] += 1;
  await this.save();
};

/**
 * Find images by project
 */
ImageSchema.statics.findByProject = async function(userId, projectId, options = {}) {
  const query = {
    userId,
    projectId,
    isDeleted: false,
    parentImageId: null // Only originals, not processed versions
  };
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $all: options.tags };
  }
  
  const sort = options.sort || { createdAt: -1 };
  const limit = options.limit || 50;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

/**
 * Search images
 */
ImageSchema.statics.search = async function(userId, searchQuery, options = {}) {
  const query = {
    userId,
    isDeleted: false,
    parentImageId: null,
    $or: [
      { originalName: { $regex: searchQuery, $options: 'i' } },
      { tags: { $regex: searchQuery, $options: 'i' } }
    ]
  };
  
  if (options.projectId) {
    query.projectId = options.projectId;
  }
  
  if (options.startDate && options.endDate) {
    query.createdAt = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  const sort = options.sort || { createdAt: -1 };
  const limit = options.limit || 50;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Image', ImageSchema);