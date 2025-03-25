// backend/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const storageConfig = require('../config/storage');

// Ensure upload directories exist
const ensureDirectoriesExist = () => {
  const dirs = [
    storageConfig.localStoragePaths.uploads,
    storageConfig.localStoragePaths.temp,
    path.join(storageConfig.localStoragePaths.uploads, 'images'),
    path.join(storageConfig.localStoragePaths.uploads, 'watermarks'),
    path.join(storageConfig.localStoragePaths.uploads, 'profiles')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Create directories
ensureDirectoriesExist();

/**
 * Configure storage for different upload types
 */
const configureStorage = (type = 'image') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadPath;
      
      switch (type) {
        case 'watermark':
          uploadPath = path.join(storageConfig.localStoragePaths.uploads, 'watermarks');
          break;
        case 'profile':
          uploadPath = path.join(storageConfig.localStoragePaths.uploads, 'profiles');
          break;
        case 'image':
        default:
          uploadPath = path.join(storageConfig.localStoragePaths.uploads, 'images');
          break;
      }
      
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const randomString = crypto.randomBytes(8).toString('hex');
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      
      cb(null, `${timestamp}-${randomString}${extension}`);
    }
  });
};

/**
 * File filter for validating file types
 */
const imageFileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = storageConfig.allowedFileTypes.images.map(ext => 
    storageConfig.getMimeFromExtension(ext)
  );
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${storageConfig.allowedFileTypes.images.join(', ')}`), false);
  }
};

/**
 * File filter for watermark uploads
 */
const watermarkFileFilter = (req, file, cb) => {
  // Watermarks can only be PNG or SVG for transparency support
  const allowedTypes = storageConfig.allowedFileTypes.watermarks.map(ext => 
    storageConfig.getMimeFromExtension(ext)
  );
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid watermark file type. Allowed types: ${storageConfig.allowedFileTypes.watermarks.join(', ')}`), false);
  }
};

/**
 * File filter for profile image uploads
 */
const profileFileFilter = (req, file, cb) => {
  const allowedTypes = storageConfig.allowedFileTypes.avatars.map(ext => 
    storageConfig.getMimeFromExtension(ext)
  );
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid profile image type. Allowed types: ${storageConfig.allowedFileTypes.avatars.join(', ')}`), false);
  }
};

/**
 * Image upload middleware
 */
const uploadImage = multer({
  storage: configureStorage('image'),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: storageConfig.fileSizeLimits.default
  }
});

/**
 * Watermark upload middleware
 */
const uploadWatermark = multer({
  storage: configureStorage('watermark'),
  fileFilter: watermarkFileFilter,
  limits: {
    fileSize: storageConfig.fileSizeLimits.watermark
  }
});

/**
 * Profile image upload middleware
 */
const uploadProfile = multer({
  storage: configureStorage('profile'),
  fileFilter: profileFileFilter,
  limits: {
    fileSize: storageConfig.fileSizeLimits.avatar
  }
});

/**
 * Middleware to handle multer errors
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File too large. Maximum size is ${storageConfig.formatFileSize(err.field === 'watermark' ? storageConfig.fileSizeLimits.watermark : storageConfig.fileSizeLimits.default)}`
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    }
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
  
  // No error
  next();
};

module.exports = {
  uploadImage,
  uploadWatermark,
  uploadProfile,
  handleMulterError
};