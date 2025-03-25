// src/pages/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/auth'
import { 
  User, 
  Mail, 
  Camera, 
  Lock, 
  Save, 
  AlertCircle, 
  Check,
  Zap,
  Trash2,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Upload
} from 'lucide-react';
import watermarkService from '../services/watermarkService';
import Button from '../components/common/Button';
import UploadArea from '../components/upload/UploadArea';

const ProfileSettings = () => {
  const { currentUser, updateProfile, isLoading, error } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    agency: {
      name: '',
      website: ''
    }
  });
  
  // Watermark state
  const [watermarkSettings, setWatermarkSettings] = useState(null);
  const [hasWatermark, setHasWatermark] = useState(false);
  const [isLoadingWatermark, setIsLoadingWatermark] = useState(false);
  const [watermarkError, setWatermarkError] = useState('');
  const [watermarkPreviewUrl, setWatermarkPreviewUrl] = useState('');
  const [watermarkFile, setWatermarkFile] = useState(null);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Success and error messages
  const [successMessage, setSuccessMessage] = useState('');
  
  // Load user data when component mounts
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || '',
        agency: {
          name: currentUser.agency?.name || '',
          website: currentUser.agency?.website || ''
        }
      });
    }
  }, [currentUser]);
  
  // Load watermark settings
  useEffect(() => {
    const fetchWatermarkSettings = async () => {
      setIsLoadingWatermark(true);
      try {
        const result = await watermarkService.getWatermarkSettings();
        
        if (result.success) {
          setHasWatermark(result.hasWatermark);
          if (result.hasWatermark) {
            setWatermarkSettings(result.watermark.settings);
            setWatermarkPreviewUrl(result.watermark.watermarkUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching watermark settings:', error);
        setWatermarkError('Failed to load watermark settings');
      } finally {
        setIsLoadingWatermark(false);
      }
    };
    
    fetchWatermarkSettings();
  }, []);
  
  // Handle profile data changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested agency fields
    if (name.startsWith('agency.')) {
      const agencyField = name.replace('agency.', '');
      setProfileData(prev => ({
        ...prev,
        agency: {
          ...prev.agency,
          [agencyField]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    
    try {
      const result = await updateProfile(profileData);
      
      if (result.success) {
        setSuccessMessage('Profile updated successfully');
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };
  
  // Handle password change
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle password form submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validation
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    try {
      const result = await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (result.success) {
        setPasswordSuccess('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          setPasswordSuccess('');
        }, 3000);
      } else {
        setPasswordError(result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordError('An error occurred while changing password');
    }
  };
  
  // Handle watermark settings change
  const handleWatermarkSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setWatermarkSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) : 
              value
    }));
  };
  
  // Handle watermark file selection
  const handleWatermarkFileSelected = (files) => {
    if (files && files.length > 0) {
      const file = files[0];
      setWatermarkFile(file);
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setWatermarkPreviewUrl(previewUrl);
    }
  };
  
  // Handle watermark upload and settings update
  const handleWatermarkSubmit = async (e) => {
    e.preventDefault();
    setWatermarkError('');
    setSuccessMessage('');
    setIsLoadingWatermark(true);
    
    try {
      let result;
      
      if (watermarkFile) {
        // Upload new watermark with settings
        result = await watermarkService.uploadWatermark(watermarkFile, watermarkSettings);
      } else if (hasWatermark) {
        // Just update settings for existing watermark
        result = await watermarkService.updateWatermarkSettings(watermarkSettings);
      } else {
        setWatermarkError('Please upload a watermark image');
        setIsLoadingWatermark(false);
        return;
      }
      
      if (result.success) {
        setSuccessMessage('Watermark settings saved successfully');
        setHasWatermark(true);
        
        // Reset local file reference
        setWatermarkFile(null);
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setWatermarkError(result.message || 'Failed to save watermark settings');
      }
    } catch (error) {
      console.error('Watermark save error:', error);
      setWatermarkError('An error occurred while saving watermark settings');
    } finally {
      setIsLoadingWatermark(false);
    }
  };
  
  // Handle watermark deletion
  const handleDeleteWatermark = async () => {
    if (!hasWatermark) return;
    
    if (window.confirm('Are you sure you want to delete your watermark?')) {
      setIsLoadingWatermark(true);
      
      try {
        const result = await watermarkService.deleteWatermark();
        
        if (result.success) {
          setHasWatermark(false);
          setWatermarkSettings(null);
          setWatermarkPreviewUrl('');
          setSuccessMessage('Watermark deleted successfully');
          
          // Reset success message after 3 seconds
          setTimeout(() => {
            setSuccessMessage('');
          }, 3000);
        } else {
          setWatermarkError(result.message || 'Failed to delete watermark');
        }
      } catch (error) {
        console.error('Watermark delete error:', error);
        setWatermarkError('An error occurred while deleting watermark');
      } finally {
        setIsLoadingWatermark(false);
      }
    }
  };
  
  // Initialize default watermark settings if none exist
  useEffect(() => {
    if (!watermarkSettings && !isLoadingWatermark) {
      setWatermarkSettings({
        position: 'bottomRight',
        opacity: 0.7,
        size: 30,
        padding: 20,
        autoApply: false
      });
    }
  }, [watermarkSettings, isLoadingWatermark]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Page Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Profile Settings</h1>
          <p className="text-sm text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>
        
        {/* Success Message (if any) */}
        {successMessage && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
            <Check className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'profile' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            <div className="flex items-center">
              <User size={18} className="mr-2" />
              Profile
            </div>
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'watermark' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('watermark')}
          >
            <div className="flex items-center">
              <ImageIcon size={18} className="mr-2" />
              Watermark
            </div>
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'security' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('security')}
          >
            <div className="flex items-center">
              <Lock size={18} className="mr-2" />
              Security
            </div>
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                Personal Information
              </h2>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <form onSubmit={handleProfileSubmit}>
                <div className="space-y-4">
                  {/* Profile Image */}
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center relative">
                      {currentUser?.profileImage ? (
                        <img 
                          src={currentUser.profileImage} 
                          alt={currentUser.name} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User size={32} className="text-gray-500" />
                      )}
                      <button 
                        type="button"
                        className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700"
                      >
                        <Camera size={16} />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Profile photo</p>
                      <p className="text-xs text-gray-500">
                        This will be displayed on your profile
                      </p>
                    </div>
                  </div>
                  
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={16} className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={profileData.name}
                        onChange={handleProfileChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-2 sm:text-sm border border-gray-300 rounded-md"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                  
                  {/* Email (read-only) */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail size={16} className="text-gray-400" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={currentUser?.email || ''}
                        readOnly
                        className="bg-gray-50 focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-2 sm:text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      To change your email, go to the Security tab
                    </p>
                  </div>
                  
                  {/* Agency Details */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-md font-medium text-gray-800 mb-3">
                      Agency Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="agency.name" className="block text-sm font-medium text-gray-700 mb-1">
                          Agency Name
                        </label>
                        <input
                          type="text"
                          name="agency.name"
                          id="agency.name"
                          value={profileData.agency.name}
                          onChange={handleProfileChange}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md"
                          placeholder="Your agency name"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="agency.website" className="block text-sm font-medium text-gray-700 mb-1">
                          Agency Website
                        </label>
                        <input
                          type="url"
                          name="agency.website"
                          id="agency.website"
                          value={profileData.agency.website}
                          onChange={handleProfileChange}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md"
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <div className="flex justify-end mt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isLoading}
                      icon={<Save size={16} />}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
          
          {/* Watermark Tab */}
          {activeTab === 'watermark' && (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-800">
                    Watermark Settings
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload a watermark to brand your images
                  </p>
                </div>
                
                {hasWatermark && (
                  <Button
                    onClick={handleDeleteWatermark}
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    disabled={isLoadingWatermark}
                  >
                    Delete Watermark
                  </Button>
                )}
              </div>
              
              {watermarkError && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{watermarkError}</span>
                </div>
              )}
              
              {isLoadingWatermark ? (
                <div className="text-center py-12">
                  <div className="spinner"></div>
                  <p className="mt-2 text-gray-600">Loading watermark settings...</p>
                </div>
              ) : (
                <form onSubmit={handleWatermarkSubmit} className="space-y-6">
                  {/* Watermark Upload Area */}
                  <div className="border border-gray-300 border-dashed rounded-lg p-4">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Preview Column */}
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Watermark Image
                        </h3>
                        
                        {watermarkPreviewUrl ? (
                          <div className="relative">
                            <img 
                              src={watermarkPreviewUrl} 
                              alt="Watermark Preview" 
                              className="max-h-48 border border-gray-200 rounded-md p-2 bg-gray-50"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              For best results, use a transparent PNG with your logo
                            </p>
                          </div>
                        ) : (
                          <div className="mt-1 border rounded-md bg-gray-50 p-6 flex items-center justify-center">
                            <div className="text-center">
                              <ImageIcon size={32} className="mx-auto text-gray-400" />
                              <p className="text-sm text-gray-500 mt-1">No watermark uploaded</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Upload Column */}
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Upload New Watermark
                        </h3>
                        
                        <UploadArea 
                          onFilesSelected={handleWatermarkFileSelected}
                          isUploading={false}
                          accept="image/png,image/jpeg,image/svg+xml"
                          maxFiles={1}
                          compact={true}
                        />
                        
                        <p className="text-xs text-gray-500 mt-2">
                          Allowed formats: PNG, JPEG, SVG. Maximum size: 2MB
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Watermark Settings */}
                  {watermarkSettings && (
                    <div className="space-y-4">
                      <h3 className="text-md font-medium text-gray-800">
                        Watermark Options
                      </h3>
                      
                      {/* Position */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Position
                        </label>
                        <select
                          name="position"
                          value={watermarkSettings.position}
                          onChange={handleWatermarkSettingChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="topLeft">Top Left</option>
                          <option value="topRight">Top Right</option>
                          <option value="bottomLeft">Bottom Left</option>
                          <option value="bottomRight">Bottom Right</option>
                          <option value="center">Center</option>
                        </select>
                      </div>
                      
                      {/* Opacity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Opacity: {Math.round(watermarkSettings.opacity * 100)}%
                        </label>
                        <input
                          type="range"
                          name="opacity"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={watermarkSettings.opacity}
                          onChange={handleWatermarkSettingChange}
                          className="w-full"
                        />
                      </div>
                      
                      {/* Size */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Size: {watermarkSettings.size}% of image width
                        </label>
                        <input
                          type="range"
                          name="size"
                          min="5"
                          max="50"
                          step="1"
                          value={watermarkSettings.size}
                          onChange={handleWatermarkSettingChange}
                          className="w-full"
                        />
                      </div>
                      
                      {/* Padding */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Padding: {watermarkSettings.padding}px from edge
                        </label>
                        <input
                          type="range"
                          name="padding"
                          min="0"
                          max="100"
                          step="1"
                          value={watermarkSettings.padding}
                          onChange={handleWatermarkSettingChange}
                          className="w-full"
                        />
                      </div>
                      
                      {/* Auto Apply */}
                      <div className="flex items-center">
                        <input
                          id="autoApply"
                          name="autoApply"
                          type="checkbox"
                          checked={watermarkSettings.autoApply}
                          onChange={handleWatermarkSettingChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="autoApply" className="ml-2 block text-sm text-gray-900">
                          Automatically apply watermark to all uploaded images
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <div className="flex justify-end mt-6">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isLoadingWatermark}
                      icon={<Save size={16} />}
                    >
                      {isLoadingWatermark ? 'Saving...' : 'Save Watermark Settings'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
          
          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-6">
                Security Settings
              </h2>
              
              {/* Change Password Form */}
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <h3 className="text-md font-medium text-gray-800 mb-4">
                  Change Password
                </h3>
                
                {passwordError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center text-sm">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}
                
                {passwordSuccess && (
                  <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center text-sm">
                    <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}
                
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="currentPassword"
                        id="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 py-2 sm:text-sm border border-gray-300 rounded-md"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 py-2 sm:text-sm border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                  
                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        id="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 py-2 sm:text-sm border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <div className="flex justify-end mt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      icon={<Save size={16} />}
                    >
                      Change Password
                    </Button>
                  </div>
                </form>
              </div>
              
              {/* Account Management */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-md font-medium text-gray-800 mb-4">
                  Account Management
                </h3>
                
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    icon={<Mail size={16} />}
                  >
                    Change Email Address
                  </Button>
                  
                  <Button
                    variant="danger"
                    icon={<Trash2 size={16} />}
                  >
                    Deactivate Account
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;