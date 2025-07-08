// Environment configuration utility for Adakings Frontend

// Get current environment
export const getCurrentEnvironment = () => {
  return process.env.REACT_APP_ENVIRONMENT || process.env.NODE_ENV || 'development';
};

// Get environment type (used for tagging)
export const getEnvironmentType = () => {
  return process.env.REACT_APP_ENVIRONMENT_TYPE || 'DEVELOPMENT';
};

// Get environment name (used for tagging)
export const getEnvironmentName = () => {
  return process.env.REACT_APP_ENVIRONMENT_NAME || getCurrentEnvironment();
};

// Check if we're in a specific environment
export const isEnvironment = (env) => {
  return getCurrentEnvironment() === env;
};

// Environment checks
export const isLocal = () => isEnvironment('local');
export const isDevelopment = () => isEnvironment('development');
export const isProduction = () => isEnvironment('production');

// Debug mode check
export const isDebugMode = () => {
  return process.env.REACT_APP_DEBUG_MODE === 'true' || isLocal();
};

// Logging enabled check
export const isLoggingEnabled = () => {
  return process.env.REACT_APP_ENABLE_LOGS === 'true' || isDebugMode();
};

// Get backend server information
export const getBackendServerInfo = () => {
  const environment = getCurrentEnvironment();
  const backendUrl = process.env.REACT_APP_BACKEND_BASE_URL || process.env.REACT_APP_BACKEND_URL;
  const apiUrl = process.env.REACT_APP_API_BASE_URL;
  
  // Extract host and port from backend URL if available
  let host = process.env.REACT_APP_API_HOST || 'localhost';
  let port = process.env.REACT_APP_API_PORT || '8000';
  
  // If we have a backend URL, try to extract host and port from it
  if (backendUrl) {
    try {
      const url = new URL(backendUrl);
      host = url.hostname;
      port = url.port || (url.protocol === 'https:' ? '443' : '80');
    } catch (error) {
      // If URL parsing fails, keep the defaults or env vars
      console.warn('Failed to parse backend URL:', backendUrl);
    }
  }
  
  return {
    environment,
    backendUrl,
    apiUrl,
    host,
    port,
    websocketUrl: process.env.REACT_APP_WEBSOCKET_URL,
    mediaUrl: process.env.REACT_APP_MEDIA_URL,
  };
};

// Get environment tag for display
export const getEnvironmentTag = () => {
  const env = getCurrentEnvironment();
  const envType = getEnvironmentType();
  const envName = getEnvironmentName();
  
  // For production, don't show tags
  if (isProduction() && envType === 'PRODUCTION') {
    return null;
  }
  
  const serverInfo = getBackendServerInfo();
  const backendHost = serverInfo.host;
  const backendPort = serverInfo.port;
  
  return {
    environment: env,
    type: envType,
    name: envName,
    backendServer: `${backendHost}:${backendPort}`,
    fullBackendUrl: serverInfo.backendUrl,
    displayText: `${envType} (${envName}) → Backend: ${backendHost}:${backendPort}`,
    shortText: `${envName.toUpperCase()}`,
  };
};

// API configuration
export const getApiConfig = () => {
  const serverInfo = getBackendServerInfo();
  
  return {
    apiBaseUrl: serverInfo.apiUrl,
    backendBaseUrl: serverInfo.backendUrl,
    environment: getCurrentEnvironment(),
    debugMode: isDebugMode(),
    loggingEnabled: isLoggingEnabled(),
    serverInfo,
    environmentTag: getEnvironmentTag(),
  };
};

// Console log wrapper that respects environment settings and includes backend info
export const envLog = (...args) => {
  if (isLoggingEnabled()) {
    const tag = getEnvironmentTag();
    const prefix = tag ? `[${tag.shortText}]` : `[${getCurrentEnvironment().toUpperCase()}]`;
    console.log(prefix, ...args);
  }
};

// Console error wrapper
export const envError = (...args) => {
  if (isLoggingEnabled()) {
    const tag = getEnvironmentTag();
    const prefix = tag ? `[${tag.shortText}] ERROR:` : `[${getCurrentEnvironment().toUpperCase()}] ERROR:`;
    console.error(prefix, ...args);
  }
};

// Console warn wrapper
export const envWarn = (...args) => {
  if (isLoggingEnabled()) {
    const tag = getEnvironmentTag();
    const prefix = tag ? `[${tag.shortText}] WARNING:` : `[${getCurrentEnvironment().toUpperCase()}] WARNING:`;
    console.warn(prefix, ...args);
  }
};

// Initialize environment info display (for debugging)
export const logEnvironmentInfo = () => {
  if (isLoggingEnabled()) {
    const tag = getEnvironmentTag();
    const serverInfo = getBackendServerInfo();
    
    console.group('🌍 Environment Information');
    console.log('Environment:', getCurrentEnvironment());
    console.log('Type:', getEnvironmentType());
    console.log('Name:', getEnvironmentName());
    console.log('Debug Mode:', isDebugMode());
    console.log('Logging Enabled:', isLoggingEnabled());
    
    console.group('🔗 Backend Server Information');
    console.log('Backend URL:', serverInfo.backendUrl);
    console.log('API URL:', serverInfo.apiUrl);
    console.log('Host:', serverInfo.host);
    console.log('Port:', serverInfo.port);
    console.log('WebSocket URL:', serverInfo.websocketUrl);
    console.log('Media URL:', serverInfo.mediaUrl);
    console.groupEnd();
    
    if (tag) {
      console.group('🏷️ Environment Tag');
      console.log('Display Text:', tag.displayText);
      console.log('Short Text:', tag.shortText);
      console.groupEnd();
    }
    
    console.group('🔗 Database Status');
    console.log('Database health endpoint:', `${serverInfo.backendUrl}/api/health/`);
    console.log('Status will be checked automatically...');
    console.groupEnd();
    
    console.groupEnd();
  }
};

const envConfig = {
  getCurrentEnvironment,
  getEnvironmentType,
  getEnvironmentName,
  isEnvironment,
  isLocal,
  isDevelopment,
  isProduction,
  isDebugMode,
  isLoggingEnabled,
  getBackendServerInfo,
  getEnvironmentTag,
  getApiConfig,
  envLog,
  envError,
  envWarn,
  logEnvironmentInfo,
};

export default envConfig;
