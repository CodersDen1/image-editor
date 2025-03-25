// src/components/common/ImageGrid.jsx
import React, { useState } from 'react';
import { 
  Zap, 
  Download, 
  Share2, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  Info,
  CheckSquare,
  Square,
  Eye
} from 'lucide-react';

const ImageGrid = ({ images, selectedImages = [], onSelectImage, onViewImage }) => {
  const [hoveredImage, setHoveredImage] = useState(null);
  const [menuOpenForImage, setMenuOpenForImage] = useState(null);
  
  const toggleMenu = (imageId, e) => {
    e.stopPropagation();
    if (menuOpenForImage === imageId) {
      setMenuOpenForImage(null);
    } else {
      setMenuOpenForImage(imageId);
    }
  };
  
  const closeMenus = () => {
    setMenuOpenForImage(null);
  };
  
  const handleImageClick = (imageId) => {
    if (onSelectImage) {
      onSelectImage(imageId);
    }
  };
  
  const handleViewImage = (image, e) => {
    e.stopPropagation();
    if (onViewImage) {
      onViewImage(image);
    }
  };
  
  // Format date to readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" onClick={closeMenus}>
      {images.map((image) => {
        const isSelected = selectedImages.includes(image.id);
        const isHovered = hoveredImage === image.id;
        const isMenuOpen = menuOpenForImage === image.id;
        
        return (
          <div 
            key={image.id}
            className={`
              relative group rounded-lg border overflow-hidden hover:shadow-md transition-all
              ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
            `}
            onMouseEnter={() => setHoveredImage(image.id)}
            onMouseLeave={() => setHoveredImage(null)}
            onClick={() => handleImageClick(image.id)}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-2 left-2 z-10">
              {isSelected ? (
                <CheckSquare size={20} className="text-blue-500 bg-white rounded-sm" />
              ) : (
                <Square size={20} className={`${isHovered ? 'opacity-70' : 'opacity-0'} text-white bg-black bg-opacity-30 rounded-sm group-hover:opacity-70 transition-opacity`} />
              )}
            </div>
            
            {/* Image */}
            <div className="aspect-square bg-gray-100">
              <img 
                src={image.url} 
                alt={image.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            
            {/* Image Info */}
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-800 truncate" title={image.name}>
                {image.name}
              </h3>
              <p className="text-xs text-gray-500">
                {formatDate(image.createdAt)}
              </p>
            </div>
            
            {/* Hover Actions */}
            {(isHovered || isSelected || isMenuOpen) && (
              <div className="absolute top-0 right-0 m-2 flex space-x-1">
                {/* View Button */}
                <button 
                  className="p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
                  onClick={(e) => handleViewImage(image, e)}
                  title="View Image"
                >
                  <Eye size={16} />
                </button>
                
                {/* More Options Button */}
                <button 
                  className="p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
                  onClick={(e) => toggleMenu(image.id, e)}
                  title="More Options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            )}
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-10 right-2 z-20 w-48 bg-white rounded-md shadow-lg py-1 text-sm text-gray-700 border border-gray-200">
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center">
                  <Zap size={16} className="mr-2 text-blue-500" />
                  <span>Auto Enhance</span>
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center">
                  <Edit size={16} className="mr-2 text-orange-500" />
                  <span>Edit Image</span>
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center">
                  <Share2 size={16} className="mr-2 text-green-500" />
                  <span>Share</span>
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center">
                  <Download size={16} className="mr-2 text-purple-500" />
                  <span>Download</span>
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center">
                  <Info size={16} className="mr-2 text-gray-500" />
                  <span>Properties</span>
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center text-red-600">
                  <Trash2 size={16} className="mr-2" />
                  <span>Delete</span>
                </button>
              </div>
            )}
            
            {/* Processed Badge */}
            {image.isProcessed && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                Enhanced
              </div>
            )}
            
            {/* File Info on Hover */}
            {isHovered && !isMenuOpen && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white p-3 text-xs">
                <div className="flex justify-between items-center">
                  <span>{formatFileSize(image.size)}</span>
                  <span>{image.width} × {image.height}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ImageGrid;