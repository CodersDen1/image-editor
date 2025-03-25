/* eslint-disable no-unused-vars */
// src/services/watermarkService.js
import api from './api';

const watermarkService = {
  // Get user's watermark settings
  async getWatermarkSettings() {
    try {
      const response = await api.get('/watermark/settings');
      return response.data;
    } catch (error) {
      console.error('Get watermark settings error:', error);
      throw error;
    }
  },

  // Upload a new watermark image
  async uploadWatermark(file, settings = {}) {
    try {
      const formData = new FormData();
      formData.append('watermark', file);
      
      // Add settings to form data
      Object.keys(settings).forEach(key => {
        formData.append(key, settings[key]);
      });

      const response = await api.post('/watermark/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Upload watermark error:', error);
      throw error;
    }
  },

  // Update watermark settings
  async updateWatermarkSettings(settings) {
    try {
      const response = await api.put('/watermark/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Update watermark settings error:', error);
      throw error;
    }
  },

  // Delete user's watermark
  async deleteWatermark() {
    try {
      const response = await api.delete('/watermark');
      return response.data;
    } catch (error) {
      console.error('Delete watermark error:', error);
      throw error;
    }
  },

  // Generate a preview of an image with watermark applied
  async previewWatermark(imageFile, settings = {}) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Add settings to form data
      Object.keys(settings).forEach(key => {
        formData.append(key, settings[key]);
      });

      const response = await api.post('/watermark/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob'
      });
      
      // Create a URL for the preview image
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      return {
        success: true,
        previewUrl: url,
        blob: response.data
      };
    } catch (error) {
      console.error('Watermark preview error:', error);
      throw error;
    }
  }
}


export default watermarkService;