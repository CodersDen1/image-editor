// backend/config/cloudflare.js
const dotenv = require('dotenv');
dotenv.config();

/**
 * Cloudflare Configuration
 * -----------------------
 * Main configuration for Cloudflare services including:
 * - R2 Storage (S3-compatible object storage)
 * - Cloudflare Images (if enabled)
 * - Rate limiting and security settings
 * 
 * Required environment variables:
 * - CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
 * - CLOUDFLARE_API_TOKEN: API token with R2 permissions
 * - CLOUDFLARE_R2_ACCESS_KEY_ID: R2 access key ID
 * - CLOUDFLARE_R2_SECRET_ACCESS_KEY: R2 secret access key
 * - CLOUDFLARE_R2_BUCKET_NAME: R2 bucket name
 */
const cloudflareConfig = {
  // Account details
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
  
  // R2 Storage configuration
  r2: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'realestate-imagepro',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    publicAccess: process.env.CLOUDFLARE_R2_PUBLIC_ACCESS === 'true',
    region: 'auto' // R2 doesn't use regions but AWS SDK requires this
  },
  
  // Image delivery optimization with Cloudflare Images (if enabled)
  images: {
    enabled: process.env.CLOUDFLARE_IMAGES_ENABLED === 'true',
    accountHash: process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH || '',
    token: process.env.CLOUDFLARE_IMAGES_TOKEN || '',
    variantBase: process.env.CLOUDFLARE_IMAGES_VARIANT_BASE || '',
    defaultVariants: {
      thumbnail: 'thumbnail',
      preview: 'preview',
      full: 'full'
    }
  },
  
  // Rate limiting to prevent API abuse
  rateLimits: {
    maxRequestsPerMinute: parseInt(process.env.CLOUDFLARE_MAX_REQUESTS_PER_MINUTE) || 100,
    maxStorageOperationsPerMinute: parseInt(process.env.CLOUDFLARE_MAX_STORAGE_OPS_PER_MINUTE) || 50
  },
  
  // Security settings
  security: {
    encryptData: process.env.CLOUDFLARE_ENCRYPT_DATA === 'true',
    encryptionKey: process.env.CLOUDFLARE_ENCRYPTION_KEY || '',
    accessControlMaxAge: parseInt(process.env.CLOUDFLARE_ACCESS_CONTROL_MAX_AGE) || 3600
  }
};

/**
 * Validate required configuration
 * @returns {boolean} - True if configuration is valid
 */
function validateCloudflareConfig() {
  const requiredFields = [
    'accountId',
    'apiToken',
    'r2.accessKeyId',
    'r2.secretAccessKey',
    'r2.bucketName'
  ];
  
  const missingFields = requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj && obj[key], cloudflareConfig);
    return !value;
  });
  
  if (missingFields.length > 0) {
    console.warn(`⚠️  Missing required Cloudflare configuration: ${missingFields.join(', ')}`);
    console.warn('⚠️  Check your .env file and ensure all required variables are set.');
    return false;
  }
  
  return true;
}

module.exports = {
  ...cloudflareConfig,
  validateCloudflareConfig
};