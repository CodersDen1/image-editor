/* eslint-disable no-unused-vars */
// src/pages/ImagesPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImages } from '../context/ImageContext';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Download,
  Share2,
  Zap,
  Edit,
  Grid,
  List,
  X,
  Calendar,
  Tag,
  SortAsc,
  SortDesc,
  Check,
  AlertCircle
} from 'lucide-react';
import Button from '../components/common/Button';
import ImageGrid from '../components/common/ImageGrid';
import UploadArea from '../components/upload/UploadArea';
import ImageViewer from '../components/common/ImageViewer';
import ShareModal from '../components/common/ShareModal';
import imageService from '../services/imageService';

const ImagesPage = () => {
  const navigate = useNavigate();
  const { 
    images, 
    isLoading, 
    error, 
    fetchImages, 
    selectedImages, 
    toggleImageSelection,
    clearImageSelection,
    selectAllImages,
    deleteImages,
    uploadImages,
    updateFilters,
    filters 
  } = useImages();

  // Local state
  const [view, setView] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtersState, setFiltersState] = useState({
    sortBy: 'createdAt',
    sortDirection: 'desc',
    dateRange: 'all',
    tags: []
  });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load images when component mounts
  useEffect(() => {
    if (!isLoading) {
      fetchImages();
    }
  }, [fetchImages, isLoading]);

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchQuery });
  };

  // Apply filters
  const applyFilters = () => {
    updateFilters({ 
      sortBy: filtersState.sortBy,
      sortDirection: filtersState.sortDirection,
      dateRange: filtersState.dateRange,
      tags: filtersState.tags
    });
    setShowFilters(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFiltersState({
      sortBy: 'createdAt',
      sortDirection: 'desc',
      dateRange: 'all',
      tags: []
    });
    updateFilters({
      sortBy: 'createdAt',
      sortDirection: 'desc',
      dateRange: 'all',
      tags: []
    });
    setSearchQuery('');
    setShowFilters(false);
  };

  // Handle file upload
  const handleFilesSelected = async (files) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 200);
    
    try {
      const result = await uploadImages(files);
      setUploadProgress(100);
      
      // Reset after a short delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadModalOpen(false);
        
        // Show success message
        if (result.success) {
          setSuccessMessage(`Successfully uploaded ${files.length} ${files.length === 1 ? 'image' : 'images'}`);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccessMessage('');
          }, 3000);
        }
      }, 1000);
      
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      clearInterval(progressInterval);
      setUploadProgress(0);
      return { success: false, message: error.message };
    }
  };

  // Handle view image
  const handleViewImage = (image) => {
    setCurrentImage(image);
    setViewerOpen(true);
  };

  // Auto enhance selected images
  const handleAutoEnhance = async () => {
    if (selectedImages.length === 0) return;
    
    setProcessingImages(true);
    
    try {
      const result = await imageService.processImages(selectedImages, {
        mode: 'auto',
        preset: 'natural'
      });
      
      if (result.success) {
        setSuccessMessage(`Successfully enhanced ${selectedImages.length} ${selectedImages.length === 1 ? 'image' : 'images'}`);
        clearImageSelection();
        await fetchImages();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
    } finally {
      setProcessingImages(false);
    }
  };

  // Edit selected image
  const handleEditImage = (image) => {
    const imageId = typeof image === 'string' ? image : image.id;
    navigate(`/edit/${imageId}`);
  };

  // Share selected images
  const handleShareImages = () => {
    setShareModalOpen(true);
  };

  // Download selected images
  const handleDownloadImages = async () => {
    if (selectedImages.length === 0) return;
    
    setProcessingImages(true);
    
    try {
      const result = await imageService.downloadImages(selectedImages);
      
      if (result.success) {
        // Create a download link
        const link = document.createElement('a');
        link.href = result.url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup URL object
        setTimeout(() => URL.revokeObjectURL(result.url), 100);
        
        setSuccessMessage(`Downloaded ${selectedImages.length} ${selectedImages.length === 1 ? 'image' : 'images'}`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setProcessingImages(false);
    }
  };

  // Delete selected images
  const handleDeleteImages = async () => {
    if (selectedImages.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedImages.length} selected images?`)) {
      setProcessingImages(true);
      
      try {
        const result = await deleteImages(selectedImages);
        
        if (result.success) {
          setSuccessMessage(`Successfully deleted ${selectedImages.length} ${selectedImages.length === 1 ? 'image' : 'images'}`);
          clearImageSelection();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccessMessage('');
          }, 3000);
        }
      } catch (error) {
        console.error('Delete error:', error);
      } finally {
        setProcessingImages(false);
      }
    }
  };

  // Create share link
  const handleShareCreate = async (shareData) => {
    try {
      const result = await imageService.shareImages(selectedImages, shareData);
      
      if (result.success) {
        // Construct the share URL
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/share/${result.share.shareToken}`;
        
        // Add share URL to result
        result.shareUrl = shareUrl;
        
        // Reset selection after successful share
        clearImageSelection();
        
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Share creation error:', error);
      return { success: false, message: error.message || 'Failed to create share' };
    }
  };

  // Handle image actions from viewer
  const handleViewerDownload = async (image) => {
    try {
      const result = await imageService.downloadImage(image.id);
      
      if (result.success) {
        const link = document.createElement('a');
        link.href = result.url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup URL object
        setTimeout(() => URL.revokeObjectURL(result.url), 100);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  // Get all available tags from images
  const allTags = Array.from(new Set(
    images.flatMap(img => img.tags || [])
  )).sort();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Images</h1>
            <p className="text-gray-600 mt-1">
              Manage and organize your real estate images
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setUploadModalOpen(true)}
            >
              Upload Images
            </Button>
          </div>
        </div>
      </div>
      
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-start">
          <Check className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Action Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap justify-between items-center gap-4">
            {/* Search and Filter */}
            <div className="flex flex-wrap gap-2">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex rounded-md border border-gray-300 overflow-hidden">
                <input
                  type="text"
                  placeholder="Search images..."
                  className="px-3 py-2 focus:outline-none text-sm sm:w-60"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200">
                  <Search size={16} />
                </button>
              </form>
              
              {/* Filter Button */}
              <button 
                className={`flex items-center gap-1 px-3 py-2 border ${
                  showFilters ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-700'
                } rounded-md text-sm hover:bg-gray-50`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} />
                <span className="hidden sm:inline">Filter</span>
              </button>
              
              {/* View Toggle */}
              <div className="border border-gray-300 rounded-md flex overflow-hidden">
                <button
                  className={`p-2 ${view === 'grid' ? 'bg-gray-100' : 'bg-white'}`}
                  onClick={() => setView('grid')}
                  title="Grid View"
                >
                  <Grid size={16} />
                </button>
                <button
                  className={`p-2 ${view === 'list' ? 'bg-gray-100' : 'bg-white'}`}
                  onClick={() => setView('list')}
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
            
            {/* Selected Images Actions */}
            {selectedImages.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">
                  {selectedImages.length} selected
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Zap size={16} />}
                  onClick={handleAutoEnhance}
                  disabled={processingImages}
                >
                  Enhance
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Edit size={16} />}
                  onClick={() => handleEditImage(selectedImages[0])}
                  disabled={selectedImages.length !== 1 || processingImages}
                >
                  Edit
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Share2 size={16} />}
                  onClick={handleShareImages}
                  disabled={processingImages}
                >
                  Share
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download size={16} />}
                  onClick={handleDownloadImages}
                  disabled={processingImages}
                >
                  Download
                </Button>
                
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={16} />}
                  onClick={handleDeleteImages}
                  disabled={processingImages}
                >
                  Delete
                </Button>
              </div>
            ) : (
              <div>
                <span className="text-sm text-gray-500">
                  {images.length} {images.length === 1 ? 'image' : 'images'}
                </span>
              </div>
            )}
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Filter Images</h3>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <div className="flex rounded-md border border-gray-300 overflow-hidden">
                    <select
                      value={filtersState.sortBy}
                      onChange={(e) => setFiltersState({...filtersState, sortBy: e.target.value})}
                      className="flex-1 px-3 py-2 focus:outline-none text-sm"
                    >
                      <option value="createdAt">Date Uploaded</option>
                      <option value="name">Filename</option>
                      <option value="size">File Size</option>
                      <option value="width">Width</option>
                      <option value="height">Height</option>
                    </select>
                    <button 
                      type="button" 
                      className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
                      onClick={() => setFiltersState({
                        ...filtersState, 
                        sortDirection: filtersState.sortDirection === 'asc' ? 'desc' : 'asc'
                      })}
                    >
                      {filtersState.sortDirection === 'asc' ? (
                        <SortAsc size={16} />
                      ) : (
                        <SortDesc size={16} />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <div className="flex items-center">
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar size={16} className="text-gray-400" />
                      </div>
                      <select
                        value={filtersState.dateRange}
                        onChange={(e) => setFiltersState({...filtersState, dateRange: e.target.value})}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag size={16} className="text-gray-400" />
                    </div>
                    <select
                      multiple
                      value={filtersState.tags}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setFiltersState({...filtersState, tags: values});
                      }}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                      size="3"
                    >
                      {allTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple tags</p>
                </div>
              </div>
              
              <div className="flex justify-end mt-4 space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={applyFilters}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Images Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading images...</p>
            </div>
          ) : images.length > 0 ? (
            <ImageGrid 
              images={images}
              selectedImages={selectedImages}
              onSelectImage={toggleImageSelection}
              onViewImage={handleViewImage}
            />
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <ImageIcon size={48} className="mx-auto text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No images found</h3>
              <p className="mt-1 text-gray-500">
                {filters.search || filters.tags.length > 0 || filters.dateRange !== 'all' ? (
                  'No images match your search or filters. Try adjusting your criteria.'
                ) : (
                  'Get started by uploading your first image.'
                )}
              </p>
              
              {filters.search || filters.tags.length > 0 || filters.dateRange !== 'all' ? (
                <Button 
                  variant="outline"
                  className="mt-4"
                  onClick={resetFilters}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button 
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={16} />}
                  onClick={() => setUploadModalOpen(true)}
                >
                  Upload Images
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Upload Images</h2>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <UploadArea 
                onFilesSelected={handleFilesSelected}
                isUploading={isUploading}
                progress={uploadProgress}
                accept="image/*"
                maxFiles={20}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Image Viewer */}
      {currentImage && (
        <ImageViewer 
          image={currentImage}
          images={images}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onDownload={handleViewerDownload}
          onShare={(image) => {
            setViewerOpen(false);
            toggleImageSelection(image.id);
            setShareModalOpen(true);
          }}
          onEdit={handleEditImage}
          onDelete={async (image) => {
            const result = await deleteImages([image.id]);
            if (result.success) {
              setSuccessMessage('Image deleted successfully');
            }
          }}
        />
      )}
      
      {/* Share Modal */}
      <ShareModal 
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          clearImageSelection();
        }}
        selectedImages={selectedImages.map(id => {
          const image = images.find(img => img.id === id);
          return image || id;
        })}
        onShareCreate={handleShareCreate}
      />
    </div>
  );
};

export default ImagesPage;