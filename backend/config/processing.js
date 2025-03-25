// backend/config/processing.js
const dotenv = require('dotenv');
dotenv.config();

/**
 * Image Processing Configuration
 * -----------------------------
 * Settings for image processing features and algorithms
 * 
 * Environment variables:
 * - MAX_PROCESSING_DIMENSIONS: Maximum dimensions for processing
 * - DEFAULT_QUALITY: Default quality for processed images
 * - ENABLE_AI_FEATURES: Enable AI-powered enhancements
 */

// General processing settings
const processingConfig = {
  // Default settings for auto-enhancement
  autoSettings: {
    brightness: 1.05,      // Slightly brighter for real estate photos
    contrast: 1.10,        // Enhanced contrast for better depth
    saturation: 1.05,      // Slightly enhanced colors
    sharpness: 1.2,        // Better detail sharpness
    whiteBalance: true,    // Auto white balance correction
    noiseReduction: 0.5,   // Moderate noise reduction
    perspective: true,     // Auto perspective correction for verticals
    cropDetection: true,   // Intelligent cropping detection
    quality: parseInt(process.env.DEFAULT_QUALITY) || 85
  },
  
  // Processing limits
  limits: {
    maxWidth: parseInt(process.env.MAX_PROCESSING_WIDTH) || 8000,
    maxHeight: parseInt(process.env.MAX_PROCESSING_HEIGHT) || 8000,
    maxPixels: parseInt(process.env.MAX_PROCESSING_PIXELS) || 40000000, // ~40 megapixels
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE) || 50,
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_PROCESSING) || 4
  },
  
  // Feature flags
  features: {
    aiEnhancement: process.env.ENABLE_AI_FEATURES === 'true',
    hdrEffect: process.env.ENABLE_HDR_EFFECT !== 'false',
    perspectiveCorrection: process.env.ENABLE_PERSPECTIVE_CORRECTION !== 'false',
    virtualStaging: process.env.ENABLE_VIRTUAL_STAGING === 'true',
    skyReplacement: process.env.ENABLE_SKY_REPLACEMENT === 'true',
    objectRemoval: process.env.ENABLE_OBJECT_REMOVAL === 'true'
  },
  
  // Thumbnail generation
  thumbnails: {
    enabled: true,
    sizes: {
      small: { width: 200, height: 200, fit: 'cover' },
      medium: { width: 600, height: 600, fit: 'inside' },
      large: { width: 1200, height: 1200, fit: 'inside' }
    },
    format: 'webp',
    quality: 80
  },
  
  // Watermark defaults
  watermark: {
    defaultPosition: 'bottomRight',
    defaultOpacity: 0.7,
    defaultSize: 30, // percentage of image width
    padding: 20 // pixels from edge
  }
};

// Default presets for real estate photography
const defaultPresets = {
  'natural': {
    brightness: 1.05,
    contrast: 1.10,
    saturation: 1.05,
    sharpness: 1.2,
    whiteBalance: true,
    noiseReduction: 0.5,
    perspective: true
  },
  'bright': {
    brightness: 1.15,
    contrast: 1.15,
    saturation: 1.1,
    sharpness: 1.3,
    whiteBalance: true,
    noiseReduction: 0.6,
    perspective: true
  },
  'professional': {
    brightness: 1.03,
    contrast: 1.15,
    saturation: 1.02,
    sharpness: 1.4,
    whiteBalance: true,
    noiseReduction: 0.7,
    perspective: true
  },
  'hdr': {
    brightness: 1.05,
    contrast: 1.25,
    saturation: 1.1,
    sharpness: 1.3,
    whiteBalance: true,
    noiseReduction: 0.5,
    perspective: true,
    highlights: -15,  // Reduce highlights
    shadows: 15       // Boost shadows
  },
  'interior': {
    brightness: 1.12,
    contrast: 1.08,
    saturation: 1.0,
    sharpness: 1.2,
    whiteBalance: true,
    noiseReduction: 0.8,
    perspective: true,
    shadows: 20,      // Brighten shadowy areas
    highlights: -10   // Reduce window blow-outs
  },
  'exterior': {
    brightness: 1.05,
    contrast: 1.18,
    saturation: 1.15,
    sharpness: 1.4,
    whiteBalance: true,
    noiseReduction: 0.4,
    perspective: true,
    shadows: 10,      // Bring out architectural details
    highlights: -5    // Preserve sky details
  },
  'twilight': {
    brightness: 1.08,
    contrast: 1.2,
    saturation: 0.95,
    sharpness: 1.1,
    whiteBalance: false, // Preserve warm lighting
    noiseReduction: 0.9, // Higher for night shots
    perspective: true,
    shadows: 25,     // Bring out dark areas
    highlights: -5   // Preserve window lights
  }
};

// Output formats
const outputFormats = {
  'jpeg': {
    extension: 'jpg',
    mimeType: 'image/jpeg',
    quality: 85,
    defaultForWeb: false,
    supportsTransparency: false
  },
  'webp': {
    extension: 'webp',
    mimeType: 'image/webp',
    quality: 80,
    defaultForWeb: true,
    supportsTransparency: true
  },
  'png': {
    extension: 'png',
    mimeType: 'image/png',
    compressionLevel: 9,
    defaultForWeb: false,
    supportsTransparency: true
  },
  'tiff': {
    extension: 'tiff',
    mimeType: 'image/tiff',
    quality: 90,
    defaultForWeb: false,
    supportsTransparency: true
  }
};

// Validate processing limits
if (processingConfig.limits.maxWidth * processingConfig.limits.maxHeight > processingConfig.limits.maxPixels) {
  console.warn('⚠️  Warning: maxWidth * maxHeight exceeds maxPixels limit. The maxPixels limit will take precedence.');
}

module.exports = {
  processingConfig,
  defaultPresets,
  outputFormats
};