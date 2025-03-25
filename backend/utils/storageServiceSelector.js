// backend/utils/storageServiceSelector.js
const dotenv = require('dotenv');
dotenv.config();

/**
 * Storage Service Selector
 * 
 * This utility determines which storage service to use based on available configurations.
 * Priority: Cloudinary > Cloudflare R2 > Local Storage
 */

// Determine which storage service to use based on environment variables
let storageService;
let storageProvider;

// Check if Cloudinary is configured
if (process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET) {
  
  console.log('📷 Using Cloudinary storage service');
  storageService = require('../services/cloudinaryService');
  storageProvider = 'cloudinary';
}
// Check if Cloudflare R2 is configured
else if (process.env.CLOUDFLARE_ACCOUNT_ID && 
         process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && 
         process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
  
  console.log('🔹 Using Cloudflare R2 storage service');
  storageService = require('../services/storageService');
  storageProvider = 'cloudflare';
}
// Fall back to local storage
else {
  try {
    // Try to import local storage service
    console.warn('⚠️ Using local storage service (not recommended for production)');
    storageService = require('../services/storageServiceLocal');
    storageProvider = 'local';
  } catch (error) {
    // If local storage service doesn't exist, create a stub one
    console.error('❌ No storage service available! File operations will fail.');
    storageService = {
      uploadFile: () => ({ success: false, error: 'No storage service configured' }),
      getFile: () => ({ success: false, error: 'No storage service configured' }),
      deleteFile: () => ({ success: false, error: 'No storage service configured' })
    };
    storageProvider = 'none';
  }
}

module.exports = {
  service: storageService,
  provider: storageProvider
};