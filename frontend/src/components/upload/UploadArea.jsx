// src/components/upload/UploadArea.jsx
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, AlertCircle, X } from 'lucide-react';
import ProgressBar from './ProgressBar';

const UploadArea = ({
  onFilesSelected,
  isUploading = false,
  progress = 0,
  accept = 'image/*',
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  compact = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle accepted files
    if (acceptedFiles?.length > 0) {
      setSelectedFiles(acceptedFiles);
      // Only call the handler if not already uploading
      if (!isUploading && onFilesSelected) {
        onFilesSelected(acceptedFiles);
      }
    }
    
    // Handle rejected files
    if (rejectedFiles?.length > 0) {
      const rejectReasons = {
        'file-too-large': `File is too large. Max size is ${formatBytes(maxSize)}.`,
        'file-invalid-type': 'File type not accepted.',
        'too-many-files': `Too many files. Maximum allowed is ${maxFiles}.`
      };
      
      const firstRejection = rejectedFiles[0];
      const reason = firstRejection.errors[0]?.code;
      setError(rejectReasons[reason] || 'File not accepted.');
    }
  }, [onFilesSelected, isUploading, maxSize, maxFiles]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled: isUploading
  });
  
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  const clearError = () => {
    setError('');
  };
  
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg 
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'} 
          ${isUploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-gray-100'} 
          transition-colors duration-200
          ${compact ? 'p-4' : 'p-8'}
        `}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <Upload 
            className={`mx-auto ${compact ? 'h-8 w-8' : 'h-12 w-12'} text-gray-400`} 
          />
          <p className={`${compact ? 'text-sm' : 'text-base'} text-gray-600 mt-2`}>
            {isDragActive
              ? 'Drop the files here...'
              : 'Drag & drop files here, or click to select files'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {`Supports: ${accept.replace('image/*', 'JPG, PNG, HEIC, and more')}`}
          </p>
          {maxFiles > 1 && (
            <p className="text-xs text-gray-500 mt-1">
              {`Maximum ${maxFiles} files, up to ${formatBytes(maxSize)} each`}
            </p>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={clearError} className="ml-2 text-red-700 hover:text-red-800">
            <X size={18} />
          </button>
        </div>
      )}
      
      {/* Selected Files Preview */}
      {!isUploading && selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="relative aspect-square border border-gray-200 rounded-md overflow-hidden bg-gray-100">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      onLoad={() => URL.revokeObjectURL(file)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Image size={24} className="text-gray-400" />
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} className="text-gray-500" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">Uploading...</span>
            <span className="text-gray-500">{progress}%</span>
          </div>
          <ProgressBar progress={progress} />
        </div>
      )}
    </div>
  );
};

export default UploadArea;