// WebSocket Configuration Utility for Adakings Frontend
// Provides centralized WebSocket URL configuration and validation

import { getBackendServerInfo } from './envConfig';

/**
 * Get WebSocket URL based on environment configuration
 * @returns {string|null} WebSocket URL or null if not configured
 */
export const getWebSocketUrl = () => {
  console.log('🔌 WebSocket Configuration Check:');
  
  const environment = process.env.REACT_APP_ENVIRONMENT || 'development';
  const hostname = window.location.hostname;
  
  console.log('  - Environment:', environment);
  console.log('  - Hostname:', hostname);
  
  // For local development, always use localhost
  if (environment === 'local' || hostname === 'localhost' || hostname === '127.0.0.1') {
    const localUrl = 'ws://localhost:8000/ws/';
    console.log('🏠 Using local development URL:', localUrl);
    return localUrl;
  }
  
  // For Railway deployment (dev/prod), use environment variables
  if (hostname.includes('railway.app') || environment === 'development' || environment === 'production') {
    // Priority 1: Explicit WebSocket URL environment variable
    if (process.env.REACT_APP_WEBSOCKET_URL) {
      console.log('✅ Using REACT_APP_WEBSOCKET_URL:', process.env.REACT_APP_WEBSOCKET_URL);
      return process.env.REACT_APP_WEBSOCKET_URL;
    }
    
    // Priority 2: Construct from backend server info
    const serverInfo = getBackendServerInfo();
    if (serverInfo.websocketUrl) {
      console.log('✅ Using WebSocket URL from server info:', serverInfo.websocketUrl);
      return serverInfo.websocketUrl;
    }
    
    // Priority 3: Construct from backend URL
    if (serverInfo.backendUrl) {
      const wsUrl = serverInfo.backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      const fullWsUrl = `${wsUrl}/ws/`;
      console.log('✅ Constructed WebSocket URL from backend URL:', fullWsUrl);
      return fullWsUrl;
    }
    
    // Error: Railway deployment without proper configuration
    console.error('❌ Railway/Production deployment detected but no WebSocket URL configured!');
    console.error('Please set REACT_APP_WEBSOCKET_URL in Railway dashboard');
    console.error('Example: wss://your-backend-domain.railway.app/ws/');
    return null;
  }
  
  // Fallback for other environments
  const fallbackUrl = 'ws://localhost:8000/ws/';
  console.log('⚠️ Using fallback URL:', fallbackUrl);
  return fallbackUrl;
};

/**
 * Validate WebSocket URL format
 * @param {string} url - WebSocket URL to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const validateWebSocketUrl = (url) => {
  if (!url) return false;
  
  try {
    const wsUrl = new URL(url);
    return wsUrl.protocol === 'ws:' || wsUrl.protocol === 'wss:';
  } catch (error) {
    return false;
  }
};

/**
 * Get WebSocket connection status information
 * @returns {object} Status information
 */
export const getWebSocketStatus = () => {
  const url = getWebSocketUrl();
  const isValid = validateWebSocketUrl(url);
  const environment = process.env.REACT_APP_ENVIRONMENT || 'development';
  
  return {
    url,
    isValid,
    environment,
    isSecure: url ? url.startsWith('wss://') : false,
    isLocal: url ? url.includes('localhost') || url.includes('127.0.0.1') : false,
    isRailway: window.location.hostname.includes('railway.app')
  };
};

/**
 * Log WebSocket configuration for debugging
 */
export const logWebSocketConfig = () => {
  console.group('🔌 WebSocket Configuration');
  
  const status = getWebSocketStatus();
  console.log('URL:', status.url);
  console.log('Valid:', status.isValid);
  console.log('Environment:', status.environment);
  console.log('Secure:', status.isSecure);
  console.log('Local:', status.isLocal);
  console.log('Railway:', status.isRailway);
  
  console.group('Environment Variables');
  console.log('REACT_APP_WEBSOCKET_URL:', process.env.REACT_APP_WEBSOCKET_URL);
  console.log('REACT_APP_BACKEND_BASE_URL:', process.env.REACT_APP_BACKEND_BASE_URL);
  console.log('REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
  console.groupEnd();
  
  if (!status.isValid) {
    console.error('❌ WebSocket configuration is invalid!');
    console.error('Please check your environment variables');
  }
  
  console.groupEnd();
};

/**
 * Get recommended WebSocket URL for current environment
 * @returns {string} Recommended WebSocket URL
 */
export const getRecommendedWebSocketUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const port = window.location.protocol === 'https:' ? '' : ':8000';
  
  if (hostname.includes('railway.app')) {
    return `wss://${hostname.replace('frontend', 'backend')}/ws/`;
  }
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:8000/ws/';
  }
  
  return `${protocol}//${hostname}${port}/ws/`;
};

export default {
  getWebSocketUrl,
  validateWebSocketUrl,
  getWebSocketStatus,
  logWebSocketConfig,
  getRecommendedWebSocketUrl
};
