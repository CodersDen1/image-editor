// scripts/testCloudinary.js
require('dotenv').config();
const cloudinaryService = require('../services/cloudinaryService');
const fs = require('fs/promises');
const path = require('path');

async function testCloudinary() {
  try {
    console.log('Testing Cloudinary configuration...');
    
    // Check if Cloudinary credentials are set
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      console.error('❌ Cloudinary credentials not found in .env file');
      return;
    }
    
    console.log('✅ Cloudinary credentials found');
    
    // Create a test image
    const testFile = path.join(__dirname, 'test-image.jpg');
    let fileBuffer;
    
    try {
      // Try to read the test file
      fileBuffer = await fs.readFile(testFile);
    } catch (error) {
      // If file doesn't exist, create a simple one
      console.log('Creating test image...');
      // Create a 100x100 red square
      fileBuffer = await require('sharp')({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      }).jpeg().toBuffer();
      
      // Save for future use
      await fs.writeFile(testFile, fileBuffer);
    }
    
    // Upload test file
    console.log('Uploading test image to Cloudinary...');
    const uploadResult = await cloudinaryService.uploadFile(
      fileBuffer,
      'test-image.jpg',
      'test-user',
      { test: true, width: 100, height: 100 }
    );
    
    if (uploadResult.success) {
      console.log('✅ Upload successful');
      console.log(`- URL: ${uploadResult.url}`);
      console.log(`- Key: ${uploadResult.key}`);
      
      // Get the file
      console.log('Retrieving file from Cloudinary...');
      const getResult = await cloudinaryService.getFile(uploadResult.key);
      
      if (getResult.success) {
        console.log('✅ Retrieval successful');
        console.log(`- Size: ${getResult.size} bytes`);
        console.log(`- Type: ${getResult.contentType}`);
        
        // Delete the file
        console.log('Deleting file from Cloudinary...');
        const deleteResult = await cloudinaryService.deleteFile(
          uploadResult.key,
          'test-user'
        );
        
        if (deleteResult.success) {
          console.log('✅ Deletion successful');
        } else {
          console.error('❌ Deletion failed:', deleteResult.message || deleteResult.error);
        }
      } else {
        console.error('❌ Retrieval failed:', getResult.message || getResult.error);
      }
    } else {
      console.error('❌ Upload failed:', uploadResult.message || uploadResult.error);
    }
    
    console.log('\n✅ Cloudinary test complete!');
  } catch (error) {
    console.error('❌ Error testing Cloudinary:', error);
  }
}

testCloudinary();