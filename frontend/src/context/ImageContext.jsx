// src/context/ImageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import imageService from '../services/imageService';
import { useAuth } from './AuthContext';

const ImageContext = createContext();

export const useImages = () => useContext(ImageContext);

export const ImageProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [images, setImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    projectId: null,
    tags: []
  });

  // Fetch images when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchImages();
    }
  }, [isAuthenticated, pagination.page, filters]);

  // Fetch images from API
  const fetchImages = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await imageService.getUserImages({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      
      if (result.success) {
        setImages(result.images);
        setFilteredImages(result.images);
        setPagination({
          ...pagination,
          total: result.pagination.total,
          pages: result.pagination.pages
        });
      } else {
        setError(result.message || 'Failed to fetch images');
      }
    } catch (err) {
      console.error('Fetch images error:', err);
      setError('Error loading images. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload images
  const uploadImages = async (files) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await imageService.uploadImages(files, filters.projectId);
      
      if (result.success) {
        // Refresh images
        fetchImages();
        return { success: true, data: result };
      } else {
        setError(result.message || 'Upload failed');
        return { success: false, message: result.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Upload failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Process images
  const processImages = async (imageIds, options) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await imageService.processImages(imageIds, options);
      
      if (result.success) {
        // Refresh images
        fetchImages();
        return { success: true, data: result };
      } else {
        setError(result.message || 'Processing failed');
        return { success: false, message: result.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Processing failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Download images
  const downloadImages = async (imageIds, options) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await imageService.downloadImages(imageIds, options);
      
      if (result.success) {
        // Handle download file - the API typically returns a blob URL
        return { success: true, data: result };
      } else {
        setError(result.message || 'Download failed');
        return { success: false, message: result.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Download failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Share images
  const shareImages = async (imageIds, shareOptions) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await imageService.shareImages(imageIds, shareOptions);
      
      if (result.success) {
        return { success: true, data: result };
      } else {
        setError(result.message || 'Sharing failed');
        return { success: false, message: result.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Sharing failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Delete images
  const deleteImages = async (imageIds) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await Promise.all(
        imageIds.map(id => imageService.deleteImage(id))
      );
      
      const allSuccess = results.every(result => result.success);
      
      if (allSuccess) {
        // Refresh images
        fetchImages();
        return { success: true };
      } else {
        const failedCount = results.filter(r => !r.success).length;
        setError(`Failed to delete ${failedCount} images`);
        return { 
          success: false, 
          message: `Failed to delete ${failedCount} images` 
        };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Delete failed. Please try again.';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Update filters
  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Toggle image selection
  const toggleImageSelection = (imageId) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  // Clear image selection
  const clearImageSelection = () => {
    setSelectedImages([]);
  };

  // Select all images
  const selectAllImages = () => {
    setSelectedImages(images.map(img => img.id));
  };

  // Context value
  const value = {
    images,
    filteredImages,
    selectedImages,
    isLoading,
    error,
    pagination,
    filters,
    fetchImages,
    uploadImages,
    processImages,
    downloadImages,
    shareImages,
    deleteImages,
    updateFilters,
    toggleImageSelection,
    clearImageSelection,
    selectAllImages
  };

  return (
    <ImageContext.Provider value={value}>
      {children}
    </ImageContext.Provider>
  );
};