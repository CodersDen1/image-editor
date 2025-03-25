// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize storage service selector (must be before other imports)
const storageSelector = require('./utils/storageServiceSelector');

// Import routes
const apiRouter = require('./routes/api');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const imagesRouter = require('./routes/images');
const processingRouter = require('./routes/processing');
const downloadsRouter = require('./routes/downloads');
const sharesRouter = require('./routes/shares');
const watermarkRouter = require('./routes/watermark');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Basic security headers
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));

// Logging
app.use(morgan('dev'));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Static files - public directory for uploads preview
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    storageProvider: storageSelector.provider
  });
});

// API routes
app.use('/api', apiRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/images', imagesRouter);
app.use('/api/processing', processingRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/shares', sharesRouter);
app.use('/api/watermark', watermarkRouter);

// Add a storage status endpoint
app.get('/api/storage/status', (req, res) => {
  res.json({
    success: true,
    provider: storageSelector.provider,
    status: 'operational'
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found'
  });
});

// Error handler
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('🔌 Connected to MongoDB');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Start the server
app.listen(PORT, () => {
  console.log(`
  🚀 RealEstate ImagePro API Server running at http://localhost:${PORT}
  📅 ${new Date().toLocaleString()}
  🔧 Environment: ${process.env.NODE_ENV || 'development'}
  🗄️ Storage Provider: ${storageSelector.provider}
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app; // For testing