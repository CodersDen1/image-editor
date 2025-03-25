// scripts/createBucket.js
require('dotenv').config();
const cloudflareUtils = require('../utils/cloudflareUtils');
const AWS = require('aws-sdk');
const cloudflareConfig = require('../config/cloudflare');

/**
 * Create a new Cloudflare R2 bucket
 * @param {string} bucketName - Name of the bucket to create
 */
async function createBucket(bucketName) {
  console.log(`\n🔍 Creating Cloudflare R2 bucket: ${bucketName}...\n`);
  
  // Check configuration
  const configValid = cloudflareConfig.validateCloudflareConfig();
  
  if (!configValid) {
    console.error('❌ Missing or invalid Cloudflare configuration. Please check your .env file.');
    process.exit(1);
  }
  
  try {
    // Initialize S3 client
    const s3Client = cloudflareUtils.initializeR2Client();
    
    if (!s3Client) {
      console.error('❌ Failed to initialize R2 client');
      process.exit(1);
    }
    
    // Check if bucket already exists
    try {
      await s3Client.headBucket({ Bucket: bucketName }).promise();
      console.log(`⚠️  Bucket '${bucketName}' already exists`);
      process.exit(0);
    } catch (error) {
      if (error.code !== 'NotFound') {
        console.error('❌ Error checking bucket existence:', error.message);
        process.exit(1);
      }
      // If NotFound, continue to create the bucket
    }
    
    // Create the bucket
    await s3Client.createBucket({ Bucket: bucketName }).promise();
    
    console.log(`✅ Successfully created bucket: ${bucketName}`);
    
    // Update .env file with the new bucket name if it's different from the current one
    if (bucketName !== cloudflareConfig.r2.bucketName) {
      console.log(`ℹ️  Remember to update your .env file with the new bucket name:`);
      console.log(`CLOUDFLARE_R2_BUCKET_NAME=${bucketName}`);
    }
    
    // Check if we can write to the bucket
    const testKey = `test/test-${Date.now()}.txt`;
    const testData = 'This is a test file to verify bucket write permissions.';
    
    console.log(`\n🔄 Testing bucket write access with test file: ${testKey}`);
    
    await s3Client.putObject({
      Bucket: bucketName,
      Key: testKey,
      Body: testData,
      ContentType: 'text/plain'
    }).promise();
    
    console.log('✅ Successfully wrote test file to bucket');
    
    // Delete the test file
    await s3Client.deleteObject({
      Bucket: bucketName,
      Key: testKey
    }).promise();
    
    console.log('✅ Successfully deleted test file from bucket');
    console.log('\n✅ Bucket creation and verification complete');
    
  } catch (error) {
    console.error(`❌ Error creating bucket '${bucketName}':`, error.message);
    process.exit(1);
  }
}

// Get bucket name from command line or use the one from config
const bucketName = process.argv[2] || cloudflareConfig.r2.bucketName;

if (!bucketName) {
  console.error('❌ Please provide a bucket name as a command line argument or set CLOUDFLARE_R2_BUCKET_NAME in your .env file');
  process.exit(1);
}

// Run the function
createBucket(bucketName).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});