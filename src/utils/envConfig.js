// Environment configuration utility for Adakings Frontend

// Get current environment
export const getCurrentEnvironment = () => {
  return process.env.REACT_APP_ENVIRONMENT || process.env.NODE_ENV || 'development';
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
