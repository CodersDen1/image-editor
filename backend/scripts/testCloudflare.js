// scripts/testCloudflare.js
require('dotenv').config();
const cloudflareConfig = require('../config/cloudflare');
const cloudflareUtils = require('../utils/cloudflareUtils');

/**
 * Test Cloudflare R2 configuration and connection
 */
async function testCloudflareConfig() {
  console.log('\n🔍 Testing Cloudflare R2 Configuration...\n');
  
  // Check configuration
  const configValid = cloudflareConfig.validateCloudflareConfig();
  console.log(`Configuration Valid: ${configValid ? '✅ Yes' : '❌ No'}`);
  
  if (!configValid) {
    console.log('\n❌ Missing or invalid Cloudflare configuration. Please check your .env file.\n');
    
    // Check which configuration is missing
    const r2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const r2SecretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    
    console.log('Configuration Status:');
    console.log(`- Account ID: ${accountId ? '✅ Set' : '❌ Missing'}`);
    console.log(`- API Token: ${apiToken ? '✅ Set' : '❌ Missing'}`);
    console.log(`- R2 Access Key ID: ${r2AccessKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`- R2 Secret Access Key: ${r2SecretKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`- R2 Bucket Name: ${bucketName ? '✅ Set' : '❌ Missing'}`);
    
    console.log('\nPlease update your .env file with the required Cloudflare credentials');
    console.log('Example .env configuration:');
    console.log(`
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=realestate-imagepro
    `);
    
    process.exit(1);
  }
  
  // Test connection
  console.log('\n🔄 Testing connection to Cloudflare R2...');
  const connectionResult = await cloudflareUtils.testR2Connection();
  
  if (connectionResult.success) {
    console.log('✅ Successfully connected to Cloudflare R2');
    console.log(`- Available buckets: ${connectionResult.buckets}`);
    
    // Test bucket access
    console.log(`\n🔄 Testing access to bucket '${cloudflareConfig.r2.bucketName}'...`);
    const bucketResult = await cloudflareUtils.checkBucketAccess(cloudflareConfig.r2.bucketName);
    
    if (bucketResult.success) {
      console.log(`✅ Successfully accessed bucket: ${cloudflareConfig.r2.bucketName}`);
      console.log('\n✅ Cloudflare R2 configuration is valid and operational\n');
    } else {
      console.log(`❌ Failed to access bucket: ${cloudflareConfig.r2.bucketName}`);
      console.log(`- Error: ${bucketResult.error}`);
      console.log('\nPossible issues:');
      console.log('1. The bucket does not exist');
      console.log('2. The R2 credentials do not have access to this bucket');
      console.log('3. The bucket name is incorrect');
      console.log('\nTo create a new bucket, you can use the Cloudflare dashboard or run:');
      console.log(`node scripts/createBucket.js ${cloudflareConfig.r2.bucketName}`);
    }
  } else {
    console.log('❌ Failed to connect to Cloudflare R2');
    console.log(`- Error: ${connectionResult.error || connectionResult.message}`);
    console.log('\nPossible issues:');
    console.log('1. The Cloudflare credentials are incorrect');
    console.log('2. Network connectivity issues');
    console.log('3. The R2 service might be temporarily unavailable');
  }
}

// Run the test
testCloudflareConfig().catch(error => {
  console.error('Error running Cloudflare configuration test:', error);
  process.exit(1);
});