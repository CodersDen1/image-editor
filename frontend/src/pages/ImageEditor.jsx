/* eslint-disable no-unused-vars */
// src/pages/ImageEditor.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useImages } from '../context/ImageContext';
import imageService from '../services/imageService';
import { 
  Save, 
  Undo, 
  Redo, 
  Zap, 
  Sliders, 
  Crop, 
  Image as ImageIcon, 
  ChevronLeft,
  SunMedium,
  Contrast,
  PaintBucket,
  Sparkles,
  RefreshCw,
  Flip,
  RotateCw,
  Settings,
  AlignLeft,
  DownloadCloud
} from 'lucide-react';
import Button from '../components/common/Button';
import ProgressBar from '../components/upload/ProgressBar';

const ImageEditor = () => {
  const { imageId } = useParams();
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const { fetchImages, images, isLoading } = useImages();
  
  const [image, setImage] = useState(null);
  const [editedImageUrl, setEditedImageUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('auto');
  const [presetType, setPresetType] = useState('natural');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [error, setError] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState(0); // To force image refresh

  // Manual adjustments state
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    sharpness: 0,
    shadows: 0,
    highlights: 0,
    cropEnabled: false,
    crop: null,
    output: {
      format: 'jpeg',
      quality: 85
    }
  });

  // Available presets
  const presets = [
    { id: 'natural', name: 'Natural' },
    { id: 'bright', name: 'Bright & Airy' },
    { id: 'professional', name: 'Professional' },
    { id: 'hdr', name: 'HDR Effect' },
    { id: 'interior', name: 'Interior Boost' },
    { id: 'exterior', name: 'Exterior Pro' },
    { id: 'twilight', name: 'Twilight/Evening' }
  ];

  // Fetch image data when component mounts or imageId changes
  useEffect(() => {
    const fetchImage = async () => {
      if (!imageId) {
        navigate('/');
        return;
      }

      try {
        // Try to find image in context first
        const contextImage = images.find(img => img.id === imageId);
        
        if (contextImage) {
          setImage(contextImage);
          setEditedImageUrl(contextImage.url);
        } else {
          // Fetch directly if not in context
          const result = await imageService.getImage(imageId);
          if (result.success) {
            setImage(result.image);
            setEditedImageUrl(result.image.url);
          } else {
            setError('Image not found');
            navigate('/');
          }
        }
      } catch (err) {
        console.error('Error fetching image:', err);
        setError('Failed to load image');
        navigate('/');
      }
    };

    fetchImage();
  }, [imageId, navigate, images]);

  // Generate a preview based on current adjustments
  const generatePreview = async () => {
    if (!image) return;
    
    setPreviewLoading(true);
    
    try {
      let result;
      
      if (activeTab === 'auto') {
        // Auto processing preview
        result = await imageService.autoProcessImage(image.id, {
          preset: presetType,
          preview: true
        });
      } else {
        // Manual adjustments preview
        result = await imageService.manualProcessImage(image.id, {
          adjustments,
          preview: true
        });
      }
      
      if (result.success && result.previewUrl) {
        setEditedImageUrl(result.previewUrl + `?key=${previewKey}`);
        setPreviewKey(prev => prev + 1); // Force refresh
      }
    } catch (err) {
      console.error('Error generating preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Save changes and process the image
  const saveChanges = async () => {
    if (!image) return;
    
    setIsProcessing(true);
    setProgressValue(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgressValue(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 200);
    
    try {
      let result;
      
      if (activeTab === 'auto') {
        // Process with auto preset
        result = await imageService.autoProcessImage(image.id, {
          preset: presetType
        });
      } else {
        // Process with manual adjustments
        result = await imageService.manualProcessImage(image.id, {
          adjustments
        });
      }
      
      if (result.success) {
        setProgressValue(100);
        
        // Refresh images in context
        await fetchImages();
        
        // Navigate to the processed image or back to gallery
        setTimeout(() => {
          if (result.processedImage?.id) {
            navigate(`/images/${result.processedImage.id}`);
          } else {
            navigate('/');
          }
        }, 1000);
      } else {
        setError(result.message || 'Failed to process image');
        clearInterval(progressInterval);
        setProgressValue(0);
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError('An error occurred while processing the image');
      clearInterval(progressInterval);
      setProgressValue(0);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle auto preset selection
  const selectPreset = (preset) => {
    setPresetType(preset);
    // Generate preview when preset changes
    setTimeout(() => generatePreview(), 100);
  };

  // Handle manual adjustment change
  const handleAdjustmentChange = (name, value) => {
    setAdjustments(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  // Apply adjustments on slider change end
  const handleSliderChangeEnd = () => {
    generatePreview();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Image Editor</h1>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Save size={16} />}
            onClick={saveChanges}
            isLoading={isProcessing}
            disabled={isProcessing || previewLoading}
          >
            Save Changes
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Image Preview */}
        <div className="flex-1 bg-gray-900 flex items-center justify-center p-4 overflow-auto">
          {image && (
            <div className="relative">
              {(previewLoading || isProcessing) && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
                    <p className="mt-2">{isProcessing ? 'Processing...' : 'Generating preview...'}</p>
                  </div>
                </div>
              )}
              <img
                src={editedImageUrl || image.url}
                alt={image.name}
                className="max-h-[calc(100vh-12rem)] max-w-full object-contain"
              />
            </div>
          )}
        </div>
        
        {/* Right Panel - Controls */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'auto' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('auto')}
            >
              <div className="flex items-center justify-center">
                <Zap size={16} className="mr-2" />
                Auto Enhance
              </div>
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'manual' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('manual')}
            >
              <div className="flex items-center justify-center">
                <Sliders size={16} className="mr-2" />
                Manual Adjust
              </div>
            </button>
          </div>
          
          {/* Tab Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'auto' ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Select a Preset
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      className={`p-3 border ${
                        presetType === preset.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      } rounded-md text-sm transition-colors`}
                      onClick={() => selectPreset(preset.id)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Preset Description
                  </h3>
                  <p className="text-sm text-gray-600">
                    {presetType === 'natural' && "Enhances the image while maintaining a natural look, with balanced colors and contrast."}
                    {presetType === 'bright' && "Creates a bright, airy look with lifted shadows and a light, clean aesthetic."}
                    {presetType === 'professional' && "Delivers a polished, commercial-quality look with rich colors and crisp details."}
                    {presetType === 'hdr' && "Expands dynamic range to reveal details in shadows and highlights, similar to HDR photography."}
                    {presetType === 'interior' && "Optimized for interior real estate photos, balancing lighting and enhancing room features."}
                    {presetType === 'exterior' && "Enhances exterior property photos with vibrant skies and improved architectural details."}
                    {presetType === 'twilight' && "Creates a dramatic evening look with deep blues and warm glows for twilight exterior shots."}
                  </p>
                </div>
                
                <Button
                  variant="primary"
                  icon={<RefreshCw size={16} />}
                  className="mt-4"
                  onClick={generatePreview}
                  disabled={previewLoading}
                  isLoading={previewLoading}
                >
                  Generate Preview
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Color Adjustments */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <SunMedium size={16} className="mr-2 text-gray-500" />
                    Color Adjustments
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Brightness */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-600">Brightness</label>
                        <span className="text-xs font-medium">{adjustments.brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        value={adjustments.brightness}
                        onChange={(e) => handleAdjustmentChange('brightness', e.target.value)}
                        onMouseUp={handleSliderChangeEnd}
                        onTouchEnd={handleSliderChangeEnd}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Contrast */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-600">Contrast</label>
                        <span className="text-xs font-medium">{adjustments.contrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        value={adjustments.contrast}
                        onChange={(e) => handleAdjustmentChange('contrast', e.target.value)}
                        onMouseUp={handleSliderChangeEnd}
                        onTouchEnd={handleSliderChangeEnd}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Saturation */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-600">Saturation</label>
                        <span className="text-xs font-medium">{adjustments.saturation}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        value={adjustments.saturation}
                        onChange={(e) => handleAdjustmentChange('saturation', e.target.value)}
                        onMouseUp={handleSliderChangeEnd}
                        onTouchEnd={handleSliderChangeEnd}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Temperature */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-600">Temperature</label>
                        <span className="text-xs font-medium">{adjustments.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        value={adjustments.temperature}
                        onChange={(e) => handleAdjustmentChange('temperature', e.target.value)}
                        onMouseUp={handleSliderChangeEnd}
                        onTouchEnd={handleSliderChangeEnd}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Detail Adjustments */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Sparkles size={16} className="mr-2 text-gray-500" />
                    Detail Adjustments
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Sharpness */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-600">Sharpness</label>
                        <span className="text-xs font-medium">{adjustments.sharpness}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={adjustments.sharpness}
                        onChange={(e) => handleAdjustmentChange('sharpness', e.target.value)}
                        onMouseUp={handleSliderChangeEnd}
                        onTouchEnd={handleSliderChangeEnd}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Light Adjustments */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Contrast size={16} className="mr-2 text-gray-500" />
                    Light Adjustments
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Shadows */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-600">Shadows</label>
                        <span className="text-xs font-medium">{adjustments.shadows}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        value={adjustments.shadows}
                        onChange={(e) => handleAdjustmentChange('shadows', e.target.value)}
                        onMouseUp={handleSliderChangeEnd}
                        onTouchEnd={handleSliderChangeEnd}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Highlights */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-600">Highlights</label>
                        <span className="text-xs font-medium">{adjustments.highlights}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        value={adjustments.highlights}
                        onChange={(e) => handleAdjustmentChange('highlights', e.target.value)}
                        onMouseUp={handleSliderChangeEnd}
                        onTouchEnd={handleSliderChangeEnd}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Output Settings */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Settings size={16} className="mr-2 text-gray-500" />
                    Output Settings
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Format */}
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Format</label>
                      <select
                        value={adjustments.output.format}
                        onChange={(e) => setAdjustments(prev => ({
                          ...prev,
                          output: { ...prev.output, format: e.target.value }
                        }))}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md"
                      >
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                      </select>
                    </div>
                    
                    {/* Quality */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-600">Quality</label>
                        <span className="text-xs font-medium">{adjustments.output.quality}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={adjustments.output.quality}
                        onChange={(e) => setAdjustments(prev => ({
                          ...prev,
                          output: { ...prev.output, quality: parseInt(e.target.value) }
                        }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="primary"
                  icon={<RefreshCw size={16} />}
                  className="mt-4"
                  onClick={generatePreview}
                  disabled={previewLoading}
                  isLoading={previewLoading}
                >
                  Generate Preview
                </Button>
              </div>
            )}
          </div>
          
          {/* Bottom Action Bar */}
          {isProcessing && (
            <div className="border-t border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Processing Image</div>
              <ProgressBar progress={progressValue} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;