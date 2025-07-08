import React from 'react';
import { 
  getCurrentEnvironment, 
  getEnvironmentTag, 
  getBackendServerInfo, 
  isProduction 
} from '../utils/envConfig';
import { useDbStatus } from '../hooks/useDbStatus';

const EnvironmentDebug = () => {
  const env = getCurrentEnvironment();
  const tag = getEnvironmentTag();
  const serverInfo = getBackendServerInfo();
  const { isChecking, getStatusText, getStatusColor, getStatusIcon, checkConnection } = useDbStatus();
  
  // Show debug info only in non-production environments
  if (isProduction()) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '15px',
      fontSize: '12px',
      fontFamily: 'monospace',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000,
      maxWidth: '300px'
    }}>
      <h6 style={{ margin: '0 0 10px 0', color: '#495057' }}>Environment Debug</h6>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Current Environment:</strong> {env}
      </div>
      
      {tag && (
        <div style={{ marginBottom: '8px' }}>
          <strong>Tag:</strong> {tag.displayText}
        </div>
      )}
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Backend URL:</strong> {serverInfo.backendUrl}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>API URL:</strong> {serverInfo.apiUrl}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Host:Port:</strong> {serverInfo.host}:{serverInfo.port}
      </div>
      
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <strong>Database:</strong>
        <span style={{ color: getStatusColor() }}>
          {getStatusIcon()} {getStatusText()}
        </span>
        {!isChecking && (
          <button
            onClick={checkConnection}
            style={{
              background: 'none',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
            title="Check database connection"
          >
            🔄
          </button>
        )}
      </div>
      
      <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '10px' }}>
        Check console for full environment info
      </div>
    </div>
  );
};

export default EnvironmentDebug;
