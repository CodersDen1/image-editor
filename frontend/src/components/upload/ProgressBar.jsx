// src/components/upload/ProgressBar.jsx
import React from 'react';

const ProgressBar = ({ progress, height = 8, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-500',
    indigo: 'bg-indigo-600',
    purple: 'bg-purple-600'
  };

  const colorClass = colorClasses[color] || colorClasses.blue;

  return (
    <div 
      className="w-full bg-gray-200 rounded-full overflow-hidden" 
      style={{ height: `${height}px` }}
    >
      <div 
        className={`${colorClass} transition-all duration-300 ease-in-out`}
        style={{ 
          width: `${progress}%`,
          height: '100%'
        }}
      />
    </div>
  );
};

export default ProgressBar;