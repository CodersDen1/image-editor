// backend/config/app.js
const dotenv = require('dotenv');
dotenv.config();

/**
 * Application Configuration
 * ------------------------
 * General application settings and feature flags
 * 
 * Environment variables:
 * - NODE_ENV: Environment (development, production, test)
 * - APP_NAME: Application name
 * - APP_URL: Application URL
 * - API_URL: API URL
 * - ENABLE_*: Feature flags
 */

// Application information
const appInfo = {
  name: process.env.APP_NAME || 'RealEstate ImagePro',
  version: process.env.npm_package_version || '1.0.0',
  description: 'Real Estate Image Processing SaaS Platform',
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
  isTest: process.env.NODE_ENV === 'test'
};

// URLs and endpoints
const urls = {
  app: process.env.APP_URL || 'http://localhost:3000',
  api: process.env.API_URL || 'http://localhost:3000/api',
  web: process.env.WEB_URL || 'http://localhost:3001',
  assets: process.env.ASSETS_URL || 'http://localhost:3000/assets'
};

// Feature flags
const features = {
  registration: process.env.ENABLE_REGISTRATION !== 'false',
  emailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
  passwordReset: process.env.ENABLE_PASSWORD_RESET !== 'false',
  socialLogin: process.env.ENABLE_SOCIAL_LOGIN === 'true',
  twoFactorAuth: process.env.ENABLE_TWO_FACTOR_AUTH === 'true',
  sharing: process.env.ENABLE_SHARING !== 'false',
  watermarking: process.env.ENABLE_WATERMARKING !== 'false',
  batchProcessing: process.env.ENABLE_BATCH_PROCESSING !== 'false',
  aiEnhancement: process.env.ENABLE_AI_ENHANCEMENT === 'true',
  analytics: process.env.ENABLE_ANALYTICS === 'true',
  publicGalleries: process.env.ENABLE_PUBLIC_GALLERIES !== 'false'
};

// Limits and quotas
const limits = {
  freeUsers: {
    storage: parseInt(process.env.FREE_STORAGE_LIMIT_MB) * 1024 * 1024 || 1024 * 1024 * 1024,
    imagesPerMonth: parseInt(process.env.FREE_IMAGES_PER_MONTH) || 100,
    maxBatchSize: parseInt(process.env.FREE_MAX_BATCH_SIZE) || 20
  },
  paidUsers: {
    storage: parseInt(process.env.PAID_STORAGE_LIMIT_MB) * 1024 * 1024 || 25 * 1024 * 1024 * 1024,
    imagesPerMonth: parseInt(process.env.PAID_IMAGES_PER_MONTH) || 1000,
    maxBatchSize: parseInt(process.env.PAID_MAX_BATCH_SIZE) || 100
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  }
};

// Default user preferences
const defaultPreferences = {
  theme: 'light',
  emailNotifications: true,
  autoApplyWatermark: false,
  defaultProcessingMode: 'auto',
  defaultPreset: 'natural',
  defaultOutputFormat: 'jpeg',
  defaultQuality: 85,
  showTutorials: true
};

// Log configuration object if in development mode
if (appInfo.isDevelopment) {
  console.log('📋 App configuration loaded:');
  console.log('- Environment:', appInfo.environment);
  console.log('- API URL:', urls.api);
  
  // Log disabled features
  const disabledFeatures = Object.entries(features)
    .filter(([_, enabled]) => !enabled)
    .map(([name]) => name);
  
  if (disabledFeatures.length > 0) {
    console.log('⚠️  Disabled features:', disabledFeatures.join(', '));
  }
}

module.exports = {
  appInfo,
  urls,
  features,
  limits,
  defaultPreferences
};