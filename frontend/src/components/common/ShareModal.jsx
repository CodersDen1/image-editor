// src/components/common/ShareModal.jsx
import React, { useState } from 'react';
import { X, Copy, Share2, Key, Clock, Eye, Check } from 'lucide-react';
import Button from './Button';

const ShareModal = ({ 
  isOpen, 
  onClose, 
  selectedImages = [], 
  onShareCreate,
  isLoading = false,
}) => {
  const [shareSettings, setShareSettings] = useState({
    title: '',
    description: '',
    password: '',
    expirationDays: 7,
    maxAccess: 0,
    isPasswordProtected: false,
    isExpirationEnabled: true,
    isMaxAccessEnabled: false,
  });
  
  const [shareResult, setShareResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types
    if (type === 'checkbox') {
      setShareSettings(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'expirationDays' || name === 'maxAccess') {
      setShareSettings(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setShareSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCopyLink = () => {
    if (shareResult?.shareUrl) {
      navigator.clipboard.writeText(shareResult.shareUrl);
      setCopied(true);
      
      // Reset copied state after 3 seconds
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare share data
    const shareData = {
      imageIds: selectedImages.map(img => typeof img === 'string' ? img : img.id),
      title: shareSettings.title || `Shared Images (${selectedImages.length})`,
      description: shareSettings.description,
      expirationDays: shareSettings.isExpirationEnabled ? shareSettings.expirationDays : 0,
    };
    
    // Add password if enabled
    if (shareSettings.isPasswordProtected && shareSettings.password) {
      shareData.password = shareSettings.password;
    }
    
    // Add max access if enabled
    if (shareSettings.isMaxAccessEnabled && shareSettings.maxAccess > 0) {
      shareData.maxAccess = shareSettings.maxAccess;
    }
    
    // Call the share creation function
    const result = await onShareCreate(shareData);
    
    if (result.success) {
      setShareResult(result);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {shareResult ? 'Share Created' : 'Share Images'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {!shareResult ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Images being shared */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Sharing {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedImages.slice(0, 5).map((img, index) => (
                      <div key={index} className="w-16 h-16 relative">
                        <img
                          src={typeof img === 'string' ? '' : img.url || img.thumbnails?.small}
                          alt="Thumbnail"
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                    {selectedImages.length > 5 && (
                      <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center">
                        <span className="text-sm text-gray-600">+{selectedImages.length - 5}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={shareSettings.title}
                    onChange={handleChange}
                    placeholder={`Shared Images (${selectedImages.length})`}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={shareSettings.description}
                    onChange={handleChange}
                    rows="2"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add a description for the recipient"
                  />
                </div>
                
                {/* Password Protection */}
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Key size={16} className="text-gray-600" />
                      <label htmlFor="isPasswordProtected" className="text-sm font-medium text-gray-700">
                        Password Protection
                      </label>
                    </div>
                    <input
                      type="checkbox"
                      id="isPasswordProtected"
                      name="isPasswordProtected"
                      checked={shareSettings.isPasswordProtected}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  {shareSettings.isPasswordProtected && (
                    <div className="mt-2">
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={shareSettings.password}
                        onChange={handleChange}
                        placeholder="Enter a password"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Recipients will need this password to access the shared images
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Expiration */}
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-gray-600" />
                      <label htmlFor="isExpirationEnabled" className="text-sm font-medium text-gray-700">
                        Expiration
                      </label>
                    </div>
                    <input
                      type="checkbox"
                      id="isExpirationEnabled"
                      name="isExpirationEnabled"
                      checked={shareSettings.isExpirationEnabled}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  {shareSettings.isExpirationEnabled && (
                    <div className="mt-2">
                      <select
                        id="expirationDays"
                        name="expirationDays"
                        value={shareSettings.expirationDays}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="1">1 day</option>
                        <option value="3">3 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Share will expire after this period
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Max Access Limit */}
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Eye size={16} className="text-gray-600" />
                      <label htmlFor="isMaxAccessEnabled" className="text-sm font-medium text-gray-700">
                        Limit Views
                      </label>
                    </div>
                    <input
                      type="checkbox"
                      id="isMaxAccessEnabled"
                      name="isMaxAccessEnabled"
                      checked={shareSettings.isMaxAccessEnabled}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  {shareSettings.isMaxAccessEnabled && (
                    <div className="mt-2">
                      <input
                        type="number"
                        id="maxAccess"
                        name="maxAccess"
                        value={shareSettings.maxAccess}
                        onChange={handleChange}
                        min="1"
                        max="100"
                        placeholder="Number of views"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Share will be disabled after this many views
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading}
                  isLoading={isLoading}
                  icon={<Share2 size={16} />}
                >
                  Create Share Link
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-700 p-3 rounded-md border border-green-200 flex items-start">
                <Check className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Share created successfully!</p>
                  <p className="text-sm mt-1">You can now share the link with others.</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Share URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={shareResult.shareUrl}
                    readOnly
                    className="flex-1 p-2 border border-r-0 border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3 py-2 rounded-r-md ${
                      copied ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              
              {shareSettings.isPasswordProtected && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Password</p>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200 flex items-center">
                    <Key size={16} className="text-gray-600 mr-2" />
                    <p className="text-gray-700">{shareSettings.password}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Remember to share this password securely with the recipient
                  </p>
                </div>
              )}
              
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Share Details</p>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Images</span>
                    <span className="text-sm font-medium">{selectedImages.length}</span>
                  </div>
                  
                  {shareSettings.isExpirationEnabled && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Expires</span>
                      <span className="text-sm font-medium">
                        {shareSettings.expirationDays} days
                      </span>
                    </div>
                  )}
                  
                  {shareSettings.isMaxAccessEnabled && shareSettings.maxAccess > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">View Limit</span>
                      <span className="text-sm font-medium">{shareSettings.maxAccess} views</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <Button
                  onClick={onClose}
                  variant="outline"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShareResult(null);
                    setShareSettings({
                      title: '',
                      description: '',
                      password: '',
                      expirationDays: 7,
                      maxAccess: 0,
                      isPasswordProtected: false,
                      isExpirationEnabled: true,
                      isMaxAccessEnabled: false,
                    });
                  }}
                  variant="primary"
                  icon={<Share2 size={16} />}
                >
                  Create New Share
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;