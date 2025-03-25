/* eslint-disable no-unused-vars */
// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useImages } from '../context/ImageContext';
import { useAuth } from '../context/AuthContext';
import {
  Upload,
  Image as ImageIcon,
  Share2,
  Download,
  Edit,
  Trash2,
  Zap,
  Plus,
  Filter,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import UploadArea from '../components/upload/UploadArea';
import ImageGrid from '../components/common/ImageGrid';
import Button from '../components/common/Button';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { 
    images, 
    isLoading, 
    error, 
    fetchImages, 
    selectedImages,
    toggleImageSelection,
    clearImageSelection,
    uploadImages,
    deleteImages,
    updateFilters,
    filters,
    processImages
  } = useImages();
  const [activeTab, setActiveTab] = useState('images');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Search functionality
  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchQuery });
  };

  // Upload handlers
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
        setActiveTab('images');
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

  // Action handlers for selected images
  const handleAutoProcess = async () => {
    if (selectedImages.length === 0) return;
    
    const result = await processImages(selectedImages, {
      mode: 'auto',
      preset: 'natural'
    });
    
    if (result.success) {
      clearImageSelection();
    }
  };

  const handleDelete = async () => {
    if (selectedImages.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedImages.length} selected images?`)) {
      const result = await deleteImages(selectedImages);
      
      if (result.success) {
        clearImageSelection();
      }
    }
  };

  // Stats cards data
  const statsCards = [
    {
      title: 'Total Images',
      value: images.length,
      icon: <ImageIcon size={24} className="text-blue-500" />,
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Processed Images',
      value: images.filter(img => img.isProcessed).length,
      icon: <Zap size={24} className="text-green-500" />,
      bgColor: 'bg-green-50'
    },
    {
      title: 'Shared Images',
      value: images.filter(img => img.shareCount > 0).length,
      icon: <Share2 size={24} className="text-purple-500" />,
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Downloaded',
      value: images.reduce((sum, img) => sum + (img.downloadCount || 0), 0),
      icon: <Download size={24} className="text-amber-500" />,
      bgColor: 'bg-amber-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {currentUser?.name || 'User'}!
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your real estate images with our powerful tools.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <div 
            key={index} 
            className={`${card.bgColor} rounded-lg shadow-sm p-4 transition-transform hover:scale-105`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-700 text-sm font-medium">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className="p-3 rounded-full bg-white shadow-sm">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'images' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('images')}
          >
            <div className="flex items-center">
              <ImageIcon size={18} className="mr-2" />
              My Images
            </div>
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'upload' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            <div className="flex items-center">
              <Upload size={18} className="mr-2" />
              Upload
            </div>
          </button>
        </div>

        {/* Content based on active tab */}
        <div className="p-4">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-800">Upload Images</h2>
              <UploadArea 
                onFilesSelected={handleFilesSelected}
                isUploading={isUploading}
                progress={uploadProgress}
                accept="image/*"
                maxFiles={20}
              />
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-4">
              {/* Filter & Search Row */}
              <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-lg font-medium text-gray-800">My Images</h2>
                
                <div className="flex flex-wrap gap-2">
                  {/* Search Bar */}
                  <form onSubmit={handleSearch} className="flex rounded-md border border-gray-300 overflow-hidden">
                    <input
                      type="text"
                      placeholder="Search images..."
                      className="px-3 py-1 focus:outline-none text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200">
                      <Search size={16} />
                    </button>
                  </form>
                  
                  {/* Filter Button */}
                  <button className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                    <Filter size={16} />
                    <span className="hidden sm:inline">Filter</span>
                  </button>
                  
                  {/* Upload Button */}
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                </div>
              </div>
              
              {/* Selected Images Actions */}
              {selectedImages.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-md flex justify-between items-center">
                  <p className="text-sm text-blue-700">
                    {selectedImages.length} images selected
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAutoProcess}
                      variant="primary"
                      size="sm"
                      icon={<Zap size={16} />}
                    >
                      Auto Enhance
                    </Button>
                    <Button 
                      variant="secondary"
                      size="sm"
                      icon={<Edit size={16} />}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="secondary"
                      size="sm"
                      icon={<Share2 size={16} />}
                    >
                      Share
                    </Button>
                    <Button 
                      variant="secondary"
                      size="sm"
                      icon={<Download size={16} />}
                    >
                      Download
                    </Button>
                    <Button 
                      onClick={handleDelete}
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={16} />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              {/* Images Grid */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="spinner"></div>
                  <p className="mt-2 text-gray-600">Loading images...</p>
                </div>
              ) : images.length > 0 ? (
                <ImageGrid 
                  images={images}
                  selectedImages={selectedImages}
                  onSelectImage={toggleImageSelection}
                />
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <ImageIcon size={48} className="mx-auto text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No images yet</h3>
                  <p className="mt-1 text-gray-500">Get started by uploading your first image</p>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Upload Images
                  </button>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;