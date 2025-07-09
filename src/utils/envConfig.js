// Environment configuration utility for Adakings Frontend

// Get current environment
export const getCurrentEnvironment = () => {
  // Check for explicit environment variables first
  const reactAppEnv = process.env.REACT_APP_ENVIRONMENT || process.env.REACT_APP_ENV;
  if (reactAppEnv) {
    return reactAppEnv;
  }
  
  // Check if we're running locally (not on Railway)
  const hostname = window?.location?.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname?.startsWith('192.168.') || hostname?.includes('local')) {
    return 'local';
  }
  
  // If we're not local, check NODE_ENV for Railway deployments
  if (process.env.NODE_ENV === 'production') {
    return 'prod';
  }
  
  // Default to dev for Railway development deployments
  return 'dev';
};

// Check if we're in a specific environment
export const isEnvironment = (env) => {
  return getCurrentEnvironment() === env;
};

// Environment checks
export const isLocal = () => {
  const env = getCurrentEnvironment();
  return env === 'local';
};
export const isDevelopment = () => isEnvironment('dev');
export const isProduction = () => isEnvironment('prod');

// Debug mode check
export const isDebugMode = () => {
  return process.env.REACT_APP_DEBUG_MODE === 'true' || isLocal();
};

// Logging enabled check
export const isLoggingEnabled = () => {
  return process.env.REACT_APP_ENABLE_LOGS === 'true' || isDebugMode();
};

// API configuration
export const getApiConfig = () => {
  return {
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
    backendBaseUrl: process.env.REACT_APP_BACKEND_BASE_URL,
    environment: getCurrentEnvironment(),
    debugMode: isDebugMode(),
    loggingEnabled: isLoggingEnabled(),
  };
};

// Console log wrapper that respects environment settings
export const envLog = (...args) => {
  if (isLoggingEnabled()) {
    console.log(`[${getCurrentEnvironment().toUpperCase()}]`, ...args);
  }
};

// Console error wrapper
export const envError = (...args) => {
  if (isLoggingEnabled()) {
    console.error(`[${getCurrentEnvironment().toUpperCase()}] ERROR:`, ...args);
  }
};

// Console warn wrapper
export const envWarn = (...args) => {
  if (isLoggingEnabled()) {
    console.warn(`[${getCurrentEnvironment().toUpperCase()}] WARNING:`, ...args);
  }
};

export default {
  getCurrentEnvironment,
  isEnvironment,
  isLocal,
  isDevelopment,
  isProduction,
  isDebugMode,
  isLoggingEnabled,
  getApiConfig,
  envLog,
  envError,
  envWarn,
};
