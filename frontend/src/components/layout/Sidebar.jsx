// src/components/layout/Sidebar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Upload, 
  Image, 
  Download, 
  Share2, 
  Settings, 
  Menu, 
  X,
  User 
} from 'lucide-react';

const Sidebar = ({ isOpen, currentUser, currentPath, onToggle }) => {
  // Navigation items
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Home size={20} /> },
    { path: '/upload', label: 'Upload', icon: <Upload size={20} /> },
    { path: '/images', label: 'My Images', icon: <Image size={20} /> },
    { path: '/downloads', label: 'Downloads', icon: <Download size={20} /> },
    { path: '/shares', label: 'Shared Images', icon: <Share2 size={20} /> },
    { path: '/profile', label: 'Profile Settings', icon: <Settings size={20} /> }
  ];

  return (
    <div 
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-gray-900 text-white transition-all duration-300 ease-in-out h-screen flex flex-col`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {isOpen ? (
          <h1 className="text-xl font-bold">ImagePro</h1>
        ) : (
          <span className="text-xl font-bold">IP</span>
        )}
        <button 
          onClick={onToggle} 
          className="p-1 rounded-md hover:bg-gray-800 focus:outline-none"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* User Profile Section */}
      <div className="flex flex-col items-center p-4 border-b border-gray-800">
        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-2">
          {currentUser?.profileImage ? (
            <img 
              src={currentUser.profileImage} 
              alt={currentUser.name} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User size={32} />
          )}
        </div>
        {isOpen && (
          <div className="text-center">
            <h3 className="text-sm font-medium">{currentUser?.name || 'User'}</h3>
            <p className="text-xs text-gray-400">{currentUser?.email || 'user@example.com'}</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`
                  flex items-center ${isOpen ? 'px-4' : 'justify-center'} py-3 rounded-md
                  ${currentPath === item.path ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                  transition-colors duration-200
                `}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-center text-xs text-gray-400">
        {isOpen ? (
          <p>RealEstate ImagePro &copy; {new Date().getFullYear()}</p>
        ) : (
          <p>&copy; {new Date().getFullYear()}</p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;