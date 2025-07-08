import React, { useEffect } from 'react';
import EnvironmentTag from './EnvironmentTag';
import EnvironmentInfo from './EnvironmentInfo';
import { 
  getCurrentEnvironment, 
  getEnvironmentTag, 
  getBackendServerInfo, 
  logEnvironmentInfo,
  envLog,
  envError,
  envWarn
} from '../utils/envConfig';

const EnvironmentUsageExample = () => {
  useEffect(() => {
    // Log environment info on component mount
    logEnvironmentInfo();
    
    // Example usage of logging functions
    envLog('Application initialized');
    envWarn('This is a warning message');
    envError('This is an error message');
  }, []);

  const currentEnv = getCurrentEnvironment();
  const tag = getEnvironmentTag();
  const serverInfo = getBackendServerInfo();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Environment Configuration Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Current Environment Info:</h3>
        <p><strong>Environment:</strong> {currentEnv}</p>
        {tag && (
          <>
            <p><strong>Type:</strong> {tag.type}</p>
            <p><strong>Name:</strong> {tag.name}</p>
            <p><strong>Backend Server:</strong> {tag.backendServer}</p>
            <p><strong>Display Text:</strong> {tag.displayText}</p>
          </>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Backend Server Info:</h3>
        <p><strong>Backend URL:</strong> {serverInfo.backendUrl}</p>
        <p><strong>API URL:</strong> {serverInfo.apiUrl}</p>
        <p><strong>Host:</strong> {serverInfo.host}</p>
        <p><strong>Port:</strong> {serverInfo.port}</p>
        <p><strong>WebSocket URL:</strong> {serverInfo.websocketUrl}</p>
        <p><strong>Media URL:</strong> {serverInfo.mediaUrl}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Available Components:</h3>
        <p>1. <strong>EnvironmentTag</strong> - Simple tag display (top-right corner)</p>
        <p>2. <strong>EnvironmentInfo</strong> - Expandable info panel (bottom-right corner)</p>
        <p>3. Check your browser console for detailed environment information</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Component Usage:</h3>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          fontSize: '12px',
          overflow: 'auto'
        }}>
{`// Simple tag
<EnvironmentTag position="top-right" />

// Expandable info panel
<EnvironmentInfo 
  position="bottom-right"
  showBackendInfo={true}
  expandable={true}
/>

// Use environment utilities
import { envLog, getEnvironmentTag } from '../utils/envConfig';

envLog('This logs only in development environments');
const tag = getEnvironmentTag();
if (tag) {
  console.log('Running in:', tag.displayText);
}`}
        </pre>
      </div>

      {/* Environment Tag Component */}
      <EnvironmentTag position="top-right" />
      
      {/* Environment Info Component */}
      <EnvironmentInfo 
        position="bottom-right"
        showBackendInfo={true}
        expandable={true}
      />
    </div>
  );
};

export default EnvironmentUsageExample;
