import React, { useState } from 'react';
import { 
  getEnvironmentTag, 
  getBackendServerInfo, 
  isProduction, 
  logEnvironmentInfo,
  getCurrentEnvironment 
} from '../utils/envConfig';
import { useDbStatus } from '../hooks/useDbStatus';

const EnvironmentInfo = ({ 
  position = 'top-right', 
  className = '',
  showBackendInfo = true,
  expandable = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const tag = getEnvironmentTag();
  const serverInfo = getBackendServerInfo();
  const { isChecking, getStatusText, getStatusColor, getStatusIcon, checkConnection, getStatusDetails } = useDbStatus();
  
  // Don't show in production
  if (isProduction() || !tag) {
    return null;
  }

  const baseStyles = {
    position: 'fixed',
    zIndex: 10000,
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    borderRadius: '6px',
    fontFamily: 'monospace',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    userSelect: 'none',
    cursor: expandable ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    maxWidth: isExpanded ? '320px' : '120px',
    minWidth: '80px',
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

  const handleClick = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleDoubleClick = () => {
    logEnvironmentInfo();
    checkConnection(); // Force a database check
  };

  const renderExpandedContent = () => {
    if (!isExpanded) return null;

    return (
      <div style={{ 
        marginTop: '8px', 
        fontSize: '10px', 
        opacity: '0.9',
        borderTop: '1px solid rgba(255,255,255,0.3)',
        paddingTop: '6px'
      }}>
        <div><strong>Environment:</strong> {getCurrentEnvironment()}</div>
        <div><strong>Type:</strong> {tag.type}</div>
        {showBackendInfo && (
          <>
            <div><strong>Backend:</strong> {serverInfo.host}:{serverInfo.port}</div>
            <div><strong>API:</strong> {serverInfo.apiUrl}</div>
            {serverInfo.websocketUrl && (
              <div><strong>WebSocket:</strong> {serverInfo.websocketUrl}</div>
            )}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              marginTop: '4px'
            }}>
              <strong>Database:</strong>
              <span style={{ color: getStatusColor() }}>
                {getStatusIcon()} {getStatusText()}
              </span>
              {!isChecking && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    checkConnection();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: '2px 4px',
                    borderRadius: '2px',
                    opacity: '0.7'
                  }}
                  title="Check database connection"
                >
                  🔄
                </button>
              )}
            </div>
            {getStatusDetails() && (
              <div style={{ fontSize: '9px', opacity: '0.7', marginTop: '2px' }}>
                {getStatusDetails().dbType && (
                  <div>Type: {getStatusDetails().dbType}</div>
                )}
                {getStatusDetails().version && (
                  <div>Version: {getStatusDetails().version}</div>
                )}
              </div>
            )}
          </>
        )}
        <div style={{ 
          marginTop: '4px', 
          fontSize: '9px', 
          opacity: '0.7',
          fontStyle: 'italic'
        }}>
          Double-click to log full info
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`environment-info ${className}`}
      style={combinedStyles}
      title={tag.displayText}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{tag.shortText}</span>
        {expandable && (
          <span style={{ 
            marginLeft: '8px', 
            fontSize: '10px',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}>
            ▼
          </span>
        )}
      </div>
      {renderExpandedContent()}
    </div>
  );
};

export default EnvironmentInfo;
