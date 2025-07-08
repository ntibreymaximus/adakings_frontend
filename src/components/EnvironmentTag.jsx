import React from 'react';
import { getEnvironmentTag, isProduction } from '../utils/envConfig';

const EnvironmentTag = ({ position = 'top-right', className = '' }) => {
  const tag = getEnvironmentTag();
  
  // Don't show tag in production
  if (isProduction() || !tag) {
    return null;
  }

  const baseStyles = {
    position: 'fixed',
    zIndex: 10000,
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 'bold',
    borderRadius: '4px',
    fontFamily: 'monospace',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const positionStyles = {
    'top-right': { top: '10px', right: '10px' },
    'top-left': { top: '10px', left: '10px' },
    'bottom-right': { bottom: '10px', right: '10px' },
    'bottom-left': { bottom: '10px', left: '10px' },
  };

  const environmentColors = {
    'LOCAL': { 
      background: '#28a745', 
      color: 'white',
      borderLeft: '4px solid #1e7e34'
    },
    'DEVELOPMENT': { 
      background: '#17a2b8', 
      color: 'white',
      borderLeft: '4px solid #138496'
    },
    'PRODUCTION': { 
      background: '#dc3545', 
      color: 'white',
      borderLeft: '4px solid #c82333'
    },
  };

  const envColor = environmentColors[tag.type] || {
    background: '#6c757d',
    color: 'white',
    borderLeft: '4px solid #545b62'
  };

  const combinedStyles = {
    ...baseStyles,
    ...positionStyles[position],
    ...envColor,
  };

  return (
    <div 
      className={`environment-tag ${className}`}
      style={combinedStyles}
      title={tag.displayText}
    >
      {tag.shortText}
    </div>
  );
};

export default EnvironmentTag;
