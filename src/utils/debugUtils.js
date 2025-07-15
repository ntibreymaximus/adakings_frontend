// Debug utilities for production debugging
// This file provides utilities to help diagnose issues in production

export const debugLog = (category, message, data = null) => {
  // Only log in development or if debug mode is enabled
  const isDebugMode = process.env.REACT_APP_DEBUG_MODE === 'true' || 
                      process.env.NODE_ENV === 'development' ||
                      localStorage.getItem('debugMode') === 'true';
  
  if (isDebugMode) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      category,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    console.log(`[${category}] ${message}`, data || '');
    
    // Store in session storage for debugging
    try {
      const debugLogs = JSON.parse(sessionStorage.getItem('debugLogs') || '[]');
      debugLogs.push(logEntry);
      // Keep only last 100 entries
      if (debugLogs.length > 100) {
        debugLogs.shift();
      }
      sessionStorage.setItem('debugLogs', JSON.stringify(debugLogs));
    } catch (e) {
      // Ignore storage errors
    }
  }
};

export const getDebugInfo = () => {
  const debugInfo = {
    environment: {
      nodeEnv: process.env.NODE_ENV,
      reactAppEnv: process.env.REACT_APP_ENVIRONMENT,
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
      backendBaseUrl: process.env.REACT_APP_BACKEND_BASE_URL,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      pathname: window.location.pathname
    },
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    },
    localStorage: {
      hasToken: !!localStorage.getItem('token'),
      hasRefreshToken: !!localStorage.getItem('refreshToken'),
      hasUserData: !!localStorage.getItem('userData')
    },
    sessionStorage: {
      debugLogs: JSON.parse(sessionStorage.getItem('debugLogs') || '[]')
    },
    timestamp: new Date().toISOString()
  };
  
  return debugInfo;
};

// Export debug info to clipboard for easy sharing
export const exportDebugInfo = async () => {
  const debugInfo = getDebugInfo();
  const debugText = JSON.stringify(debugInfo, null, 2);
  
  try {
    await navigator.clipboard.writeText(debugText);
    console.log('Debug info copied to clipboard');
    return true;
  } catch (error) {
    console.error('Failed to copy debug info:', error);
    // Fallback: create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = debugText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
};

// Enable debug mode temporarily (survives page refresh but not browser close)
export const enableDebugMode = () => {
  localStorage.setItem('debugMode', 'true');
  console.log('Debug mode enabled. Refresh the page to see debug logs.');
};

export const disableDebugMode = () => {
  localStorage.removeItem('debugMode');
  sessionStorage.removeItem('debugLogs');
  console.log('Debug mode disabled.');
};

// Check API connectivity
export const checkApiConnectivity = async (apiBaseUrl) => {
  const results = {
    apiBaseUrl,
    healthCheck: false,
    tokenValid: false,
    ridersEndpoint: false,
    errors: []
  };
  
  try {
    // Test health endpoint (no auth required)
    const healthResponse = await fetch(`${apiBaseUrl}/health/`);
    results.healthCheck = healthResponse.ok;
    if (!healthResponse.ok) {
      results.errors.push(`Health check failed: ${healthResponse.status}`);
    }
  } catch (error) {
    results.errors.push(`Health check error: ${error.message}`);
  }
  
  // Test authenticated endpoint
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const ridersResponse = await fetch(`${apiBaseUrl}/deliveries/riders/available/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      results.ridersEndpoint = ridersResponse.ok;
      results.tokenValid = ridersResponse.status !== 401;
      if (!ridersResponse.ok) {
        results.errors.push(`Riders endpoint failed: ${ridersResponse.status}`);
      }
    } catch (error) {
      results.errors.push(`Riders endpoint error: ${error.message}`);
    }
  } else {
    results.errors.push('No authentication token found');
  }
  
  return results;
};

// Log API errors with context
export const logApiError = (endpoint, error, requestData = null) => {
  const errorInfo = {
    endpoint,
    error: {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      stack: error.stack
    },
    requestData,
    timestamp: new Date().toISOString(),
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'Not set'
  };
  
  debugLog('API_ERROR', `API Error at ${endpoint}`, errorInfo);
  
  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service like Sentry
  }
};

// Global debug commands for console
if (typeof window !== 'undefined') {
  window.adakingsDebug = {
    enable: enableDebugMode,
    disable: disableDebugMode,
    exportInfo: exportDebugInfo,
    getInfo: getDebugInfo,
    checkApi: () => {
      const apiUrl = process.env.REACT_APP_API_BASE_URL || 
                     (window.location.hostname.includes('railway.app') 
                       ? 'https://adakingsbackend-prod.up.railway.app/api' 
                       : 'http://localhost:8000/api');
      return checkApiConnectivity(apiUrl);
    },
    logs: () => JSON.parse(sessionStorage.getItem('debugLogs') || '[]')
  };
  
  console.log('Adakings debug utilities loaded. Use window.adakingsDebug for debugging.');
}
