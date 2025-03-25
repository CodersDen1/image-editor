// backend/config/storage.js
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Storage Configuration
 * --------------------
 * Settings for file storage, uploads, and retention policies
 * 
 * Environment variables:
 * - STORAGE_PROVIDER: Storage provider ('cloudflare', 'local', etc.)
 * - MAX_FILE_SIZE_MB: Maximum file size in MB
 * - STORAGE_RETENTION_DAYS: Default retention period in days
 * - ALLOWED_FILE_TYPES: Comma-separated list of allowed file extensions
 */

// Storage provider - Cloudflare R2 is default
const storageProvider = process.env.STORAGE_PROVIDER || 'cloudflare';

// Local storage paths
const localStoragePaths = {
  uploads: process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'),
  temp: process.env.TEMP_PATH || path.join(process.cwd(), 'temp'),
  public: process.env.PUBLIC_PATH || path.join(process.cwd(), 'public')
};

// File size limits
const fileSizeLimits = {
  default: parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024 || 25 * 1024 * 1024, // 25MB default
  avatar: 2 * 1024 * 1024, // 2MB
  watermark: 5 * 1024 * 1024, // 5MB
  batchUpload: 500 * 1024 * 1024 // 500MB total for batch uploads
};

// Allowed file types
const allowedFileTypes = {
  images: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,heif,raw').split(','),
  documents: ['pdf', 'docx', 'xlsx'],
  avatars: ['jpg', 'jpeg', 'png'],
  watermarks: ['png', 'svg']
};

// File MIME types by extension
const mimeTypes = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  raw: 'image/raw',
  arw: 'image/raw', // Sony
  cr2: 'image/raw', // Canon
  nef: 'image/raw', // Nikon
  dng: 'image/raw', // Adobe
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip'
};

// Retention policies
const retentionPolicies = {
  default: parseInt(process.env.STORAGE_RETENTION_DAYS) || 30, // days
  processed: 30, // days to keep processed images
  shared: 90, // days to keep shared images
  deleted: 7, // days to keep deleted images before permanent deletion
  temp: 1 // days to keep temporary files
};

// Output formats for processed images
const outputFormats = {
  default: 'jpeg',
  web: 'webp',
  transparent: 'png',
  available: ['jpeg', 'jpg', 'png', 'webp', 'tiff']
};

// Image quality presets
const qualityPresets = {
  low: 60,
  medium: 75,
  high: 85,
  maximum: 100,
  default: 85
};

// Thumbnail sizes
const thumbnailSizes = {
  small: { width: 200, height: 200 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 }
};

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string|null} - File extension or null if not found
 */
const getExtensionFromMime = (mimeType) => {
  const entry = Object.entries(mimeTypes).find(([ext, mime]) => mime === mimeType);
  return entry ? entry[0] : null;
};

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension
 * @returns {string} - MIME type or default octet-stream
 */
const getMimeFromExtension = (extension) => {
  const ext = extension.startsWith('.') ? extension.slice(1) : extension;
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
};

/**
 * Check if file type is allowed
 * @param {string} filename - File name or extension
 * @param {string} category - Category to check against (images, documents, etc.)
 * @returns {boolean} - True if allowed
 */
const isFileTypeAllowed = (filename, category = 'images') => {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return allowedFileTypes[category].includes(ext);
};

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted size
 */
const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

module.exports = {
  storageProvider,
  localStoragePaths,
  fileSizeLimits,
  allowedFileTypes,
  mimeTypes,
  retentionPolicies,
  outputFormats,
  qualityPresets,
  thumbnailSizes,
  getExtensionFromMime,
  getMimeFromExtension,
  isFileTypeAllowed,
  formatFileSize
};