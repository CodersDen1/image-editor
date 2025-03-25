// src/components/layout/Header.jsx
import React, { useState } from 'react';
import { Bell, User, LogOut, Settings, Menu, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = ({ username, onToggleSidebar, onLogout }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
    // Close notifications if open
    if (notificationsOpen) setNotificationsOpen(false);
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    // Close user menu if open
    if (userMenuOpen) setUserMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm h-16 z-10">
      <div className="px-4 h-full flex items-center justify-between">
        {/* Left section: Sidebar toggle and breadcrumb */}
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="mr-4 p-2 rounded-md hover:bg-gray-100 focus:outline-none md:hidden"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-medium text-gray-800">
            RealEstate ImagePro
          </h2>
        </div>

        {/* Right section: Notifications and User menu */}
        <div className="flex items-center space-x-4">
          {/* Help Button */}
          <button className="p-2 rounded-full hover:bg-gray-100 focus:outline-none">
            <HelpCircle size={18} />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="p-2 rounded-full hover:bg-gray-100 focus:outline-none relative"
            >
              <Bell size={18} />
              <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                2
              </span>
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">Notifications</h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <div className="px-4 py-2 hover:bg-gray-50 border-b border-gray-100">
                    <p className="text-sm text-gray-600">Your image processing is complete</p>
                    <p className="text-xs text-gray-400">5 minutes ago</p>
                  </div>
                  <div className="px-4 py-2 hover:bg-gray-50">
                    <p className="text-sm text-gray-600">Your shared link was accessed</p>
                    <p className="text-xs text-gray-400">1 hour ago</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-200">
                  <button className="text-xs text-blue-500 hover:text-blue-700">
                    Mark all as read
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={toggleUserMenu}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={16} />
              </div>
              <span className="text-sm hidden md:inline-block">{username}</span>
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                  <User size={16} className="mr-2" />
                  Profile
                </Link>
                <Link to="/profile/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                  <Settings size={16} className="mr-2" />
                  Settings
                </Link>
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <LogOut size={16} className="mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;