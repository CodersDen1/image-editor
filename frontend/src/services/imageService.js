// src/services/imageService.js
import api from './api';

const imageService = {
  // Get user images with optional filtering
  async getUserImages(params = {}) {
    try {
      const response = await api.get('/images', { params });
      return response.data;
    } catch (error) {
      console.error('Get images error:', error);
      throw error;
    }
  },

  // Get a single image by ID
  async getImage(imageId) {
    try {
      const response = await api.get(`/images/${imageId}`);
      return response.data;
    } catch (error) {
      console.error('Get image error:', error);
      throw error;
    }
  },

  // Upload a single image
  async uploadImage(file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Add any additional metadata
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });

      const response = await api.post('/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  },

  // Upload multiple images
  async uploadImages(files, projectId = null, tags = []) {
    try {
      const formData = new FormData();
      
      // Append each file to the form data
      files.forEach(file => {
        formData.append('images', file);
      });

      // Add optional metadata
      if (projectId) {
        formData.append('projectId', projectId);
      }
      
      if (tags.length > 0) {
        formData.append('tags', tags.join(','));
      }

      const response = await api.post('/images/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Upload multiple images error:', error);
      throw error;
    }
  },

  // Process images with auto enhancement
  async autoProcessImage(imageId, options = {}) {
    try {
      const response = await api.post(`/processing/auto/${imageId}`, options);
      return response.data;
    } catch (error) {
      console.error('Auto process image error:', error);
      throw error;
    }
  },

  // Process images with manual adjustments
  async manualProcessImage(imageId, adjustments = {}) {
    try {
      const response = await api.post(`/processing/manual/${imageId}`, { adjustments });
      return response.data;
    } catch (error) {
      console.error('Manual process image error:', error);
      throw error;
    }
  },

  // Batch process multiple images
  async processImages(imageIds, options = {}) {
    try {
      const response = await api.post('/processing/batch', {
        imageIds,
        mode: options.mode || 'auto',
        options
      });
      return response.data;
    } catch (error) {
      console.error('Batch process images error:', error);
      throw error;
    }
  },

  // Download a single image
  async downloadImage(imageId, options = {}) {
    try {
      const response = await api.get(`/downloads/image/${imageId}`, {
        params: options,
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const filename = options.filename || `image-${imageId}.${options.format || 'jpg'}`;
      
      return {
        success: true,
        url,
        filename,
        blob: response.data
      };
    } catch (error) {
      console.error('Download image error:', error);
      throw error;
    }
  },

  // Download multiple images as ZIP
  async downloadImages(imageIds, options = {}) {
    try {
      const response = await api.post('/downloads/batch', {
        imageIds,
        ...options
      }, {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const filename = options.zipName || 'images.zip';
      
      return {
        success: true,
        url,
        filename,
        blob: response.data
      };
    } catch (error) {
      console.error('Download images error:', error);
      throw error;
    }
  },

  // Share images
  async shareImages(imageIds, options = {}) {
    try {
      const response = await api.post('/shares', {
        imageIds,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Share images error:', error);
      throw error;
    }
  },

  // Get user's shares
  async getUserShares(params = {}) {
    try {
      const response = await api.get('/shares', { params });
      return response.data;
    } catch (error) {
      console.error('Get shares error:', error);
      throw error;
    }
  },

  // Delete a single image
  async deleteImage(imageId) {
    try {
      const response = await api.delete(`/images/${imageId}`);
      return response.data;
    } catch (error) {
      console.error('Delete image error:', error);
      throw error;
    }
  },

  // Update image metadata
  async updateImage(imageId, metadata = {}) {
    try {
      const response = await api.put(`/images/${imageId}`, metadata);
      return response.data;
    } catch (error) {
      console.error('Update image error:', error);
      throw error;
    }
  },

  // Get processing presets
  async getPresets() {
    try {
      const response = await api.get('/processing/presets');
      return response.data;
    } catch (error) {
      console.error('Get presets error:', error);
      throw error;
    }
  },

  // Save a processing preset
  async savePreset(name, settings) {
    try {
      const response = await api.post('/processing/presets', { name, settings });
      return response.data;
    } catch (error) {
      console.error('Save preset error:', error);
      throw error;
    }
  }
};

export default imageService;