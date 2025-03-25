// src/components/common/ImageViewer.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Share2, 
  Edit, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  Info
} from 'lucide-react';
import Button from './Button';

const ImageViewer = ({ 
  image, 
  images = [], 
  isOpen, 
  onClose, 
  onDownload, 
  onShare, 
  onEdit, 
  onDelete 
}) => {
  const [currentImage, setCurrentImage] = useState(image);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const imageRef = useRef(null);
  const viewerRef = useRef(null);

  // Set current image and find its index when image prop changes
  useEffect(() => {
    if (image && images.length) {
      setCurrentImage(image);
      const index = images.findIndex(img => img.id === image.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [image, images]);

  // Handle escape key press to close viewer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        navigatePrevious();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto'; // Re-enable scrolling
    };
  }, [isOpen, currentIndex, images]);

  if (!isOpen || !currentImage) return null;

  // Navigation functions
  const navigatePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCurrentImage(images[currentIndex - 1]);
      resetZoom();
    }
  };

  const navigateNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentImage(images[currentIndex + 1]);
      resetZoom();
    }
  };

  // Zoom functions
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col"
      onClick={(e) => {
        if (e.target === viewerRef.current) {
          onClose();
        }
      }}
      ref={viewerRef}
    >
      {/* Header Bar */}
      <div className="flex justify-between items-center p-4 text-white">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X size={24} />
          </button>
          <h3 className="text-xl font-medium truncate max-w-md">
            {currentImage.name}
          </h3>
        </div>
        <div className="space-x-2">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-full transition-colors ${showInfo ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-800'}`}
            title="Image Info"
          >
            <Info size={20} />
          </button>
          <button 
            onClick={zoomIn}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button 
            onClick={zoomOut}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <button 
            onClick={resetZoom}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            title="Reset Zoom"
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Navigation Buttons */}
        {currentIndex > 0 && (
          <button
            onClick={navigatePrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors z-10"
          >
            <ChevronLeft size={32} />
          </button>
        )}
        
        {currentIndex < images.length - 1 && (
          <button
            onClick={navigateNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors z-10"
          >
            <ChevronRight size={32} />
          </button>
        )}
        
        {/* Image */}
        <div className="h-full flex items-center justify-center overflow-auto">
          <img
            ref={imageRef}
            src={currentImage.url}
            alt={currentImage.name}
            style={{ 
              transform: `scale(${zoomLevel})`,
              transition: 'transform 0.2s ease-out',
              cursor: zoomLevel > 1 ? 'move' : 'default'
            }}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        
        {/* Image Info Panel (Slide In) */}
        {showInfo && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900 p-4 text-white overflow-y-auto shadow-lg transition-transform transform">
            <h4 className="text-lg font-semibold mb-4">Image Information</h4>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Filename</p>
                <p className="text-white break-all">{currentImage.name}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Dimensions</p>
                <p className="text-white">{currentImage.width} × {currentImage.height} px</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Size</p>
                <p className="text-white">{formatFileSize(currentImage.size)}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Uploaded</p>
                <p className="text-white">{formatDate(currentImage.createdAt)}</p>
              </div>
              
              {currentImage.tags && currentImage.tags.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm">Tags</p>
                  <div className="flex flex-wrap mt-1 gap-2">
                    {currentImage.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-800 rounded-md text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {currentImage.isProcessed && (
                <div>
                  <p className="text-gray-400 text-sm">Processing</p>
                  <p className="text-white">Enhanced</p>
                </div>
              )}
              
              {currentImage.downloadCount > 0 && (
                <div>
                  <p className="text-gray-400 text-sm">Downloads</p>
                  <p className="text-white">{currentImage.downloadCount} times</p>
                </div>
              )}
              
              {currentImage.shareCount > 0 && (
                <div>
                  <p className="text-gray-400 text-sm">Shares</p>
                  <p className="text-white">{currentImage.shareCount} times</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div className="bg-gray-900 p-4 flex justify-between items-center">
        <div className="text-white text-sm">
          {currentIndex + 1} of {images.length}
        </div>
        
        <div className="space-x-2">
          {onEdit && (
            <Button 
              onClick={() => onEdit(currentImage)}
              variant="outline"
              icon={<Edit size={16} />}
            >
              Edit
            </Button>
          )}
          
          {onShare && (
            <Button 
              onClick={() => onShare(currentImage)}
              variant="outline"
              icon={<Share2 size={16} />}
            >
              Share
            </Button>
          )}
          
          {onDownload && (
            <Button 
              onClick={() => onDownload(currentImage)}
              variant="primary"
              icon={<Download size={16} />}
            >
              Download
            </Button>
          )}
          
          {onDelete && (
            <Button 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this image?')) {
                  onDelete(currentImage);
                  onClose();
                }
              }}
              variant="danger"
              icon={<Trash2 size={16} />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;