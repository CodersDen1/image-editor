// src/pages/SharesPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import imageService from '../services/imageService';
import {
  Search,
  Link as LinkIcon,
  Copy,
  Check,
  AlertCircle,
  Trash2,
  Calendar,
  Lock,
  Unlock,
  Eye,
  Image as ImageIcon,
  Clock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import Button from '../components/common/Button';

const SharesPage = () => {
  const [shares, setShares] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [copiedId, setCopiedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch shares on load
  useEffect(() => {
    fetchShares();
  }, [activeTab]);

  // Fetch shares from API
  const fetchShares = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await imageService.getUserShares({
        active: activeTab === 'active' ? true : activeTab === 'expired' ? false : null
      });
      
      if (result.success) {
        setShares(result.shares || []);
      } else {
        setError(result.message || 'Failed to load shares');
      }
    } catch (err) {
      console.error('Error fetching shares:', err);
      setError('An error occurred while loading shares');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle copy link
  const handleCopyLink = (shareToken) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/share/${shareToken}`;
    
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(shareToken);
    
    // Reset copied state after 3 seconds
    setTimeout(() => {
      setCopiedId(null);
    }, 3000);
  };

  // Handle delete share
  const handleDeleteShare = async (shareId) => {
    if (!shareId) return;
    
    setDeleteLoading(true);
    try {
      const result = await imageService.deleteShare(shareId);
      
      if (result.success) {
        // Remove from list
        setShares(prevShares => prevShares.filter(share => share.id !== shareId));
        setConfirmDelete(null);
      } else {
        setError(result.message || 'Failed to delete share');
      }
    } catch (err) {
      console.error('Error deleting share:', err);
      setError('An error occurred while deleting the share');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Refresh shares
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchShares();
    setRefreshing(false);
  };

  // Filter shares by search query
  const filteredShares = shares.filter(share => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (share.title && share.title.toLowerCase().includes(query)) ||
      (share.shareToken && share.shareToken.toLowerCase().includes(query))
    );
  });

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate days remaining
  const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return 'Never';
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Shared Links</h1>
            <p className="text-gray-600 mt-1">
              Manage your shared image collections
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={<RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-gray-200">
          {/* Tabs */}
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'all' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'active' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('active')}
            >
              Active
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'expired' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('expired')}
            >
              Expired
            </button>
          </div>
          
          {/* Search */}
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <input
              type="text"
              placeholder="Search shares..."
              className="px-3 py-2 focus:outline-none text-sm sm:w-60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200">
              <Search size={16} />
            </button>
          </div>
        </div>
        
        {/* Shares List */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading shares...</p>
            </div>
          ) : filteredShares.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Share
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Images
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Security
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredShares.map(share => (
                  <tr key={share.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center">
                          <LinkIcon size={20} className="text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {share.title || 'Untitled Share'}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {share.shareToken}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ImageIcon size={16} className="text-gray-500 mr-2" />
                        <span className="text-sm text-gray-900">{share.imageCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {share.isPasswordProtected ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          <Lock size={14} className="mr-1" /> Password
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          <Unlock size={14} className="mr-1" /> Public
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Eye size={16} className="text-gray-500 mr-2" />
                        <span className="text-sm text-gray-900">
                          {share.accessCount || 0}
                          {share.maxAccess > 0 && ` / ${share.maxAccess}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {share.expiresAt ? (
                        <div className="flex items-center">
                          <Clock size={16} className={`mr-2 ${
                            share.isExpired ? 'text-red-500' : 'text-gray-500'
                          }`} />
                          <span className={`text-sm ${
                            share.isExpired ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {getDaysRemaining(share.expiresAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(share.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-2">
                        <button
                          onClick={() => handleCopyLink(share.shareToken)}
                          className={`p-1 rounded-md ${
                            copiedId === share.shareToken
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Copy Link"
                        >
                          {copiedId === share.shareToken ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                        <a
                          href={`/share/${share.shareToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                          title="Open Share"
                        >
                          <ExternalLink size={16} />
                        </a>
                        {confirmDelete === share.id ? (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleDeleteShare(share.id)}
                              className="p-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                              disabled={deleteLoading}
                            >
                              {deleteLoading ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <Check size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="p-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                              disabled={deleteLoading}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(share.id)}
                            className="p-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                            title="Delete Share"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <LinkIcon size={48} />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No shares found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? (
                  'No shares match your search criteria.'
                ) : activeTab === 'active' ? (
                  'You don\'t have any active shares.'
                ) : activeTab === 'expired' ? (
                  'You don\'t have any expired shares.'
                ) : (
                  'You haven\'t created any shares yet.'
                )}
              </p>
              {searchQuery && (
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Share View Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Share with Your Clients</h3>
        <p className="text-sm text-blue-700">
          Copy the share link and send it to your clients. They can view and download the images without needing an account.
          For added security, enable password protection on your shares.
        </p>
      </div>
    </div>
  );
};

export default SharesPage;