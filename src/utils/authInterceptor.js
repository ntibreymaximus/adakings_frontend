/**
 * Global Authentication Interceptor
 * Automatically handles token expiration and unauthorized responses across the entire app
 */

let authContext = null;

// Store reference to auth context for use in interceptor
export const setAuthContext = (context) => {
  authContext = context;
};

// Original fetch function
const originalFetch = window.fetch;

// Enhanced fetch with automatic authentication handling
window.fetch = async (url, options = {}) => {
  try {
    // Make the original request
    const response = await originalFetch(url, options);
    
    // Handle 401 responses globally
    if (response.status === 401 && authContext) {
      
      // Check if this is an authentication endpoint (don't auto-logout on login failures)
      const isAuthEndpoint = url.includes('/login/') || url.includes('/token/') || url.includes('/register/');
      
      if (!isAuthEndpoint) {
        // Auto-logout for non-auth endpoints
        await authContext.logout('unauthorized');
        
        // Create a new response to indicate authentication failure
        const errorResponse = new Response(
          JSON.stringify({ 
            detail: 'Authentication expired. Please log in again.',
            code: 'AUTHENTICATION_EXPIRED'
          }),
          {
            status: 401,
            statusText: 'Unauthorized',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        return errorResponse;
      }
    }
    
    return response;
  } catch (error) {
    // Handle network errors
    throw error;
  }
};

// Axios-style interceptors for compatibility with existing code
export const setupAxiosInterceptors = () => {
  // This function can be used if the app switches to axios in the future
};

// Additional utility functions for token management
export const TokenManager = {
  // Check if token exists and is valid
  isTokenValid() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  },

  // Get token expiry time
  getTokenExpiry() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  },

  // Get time until token expires (in milliseconds)
  getTimeUntilExpiry() {
    const expiry = this.getTokenExpiry();
    if (!expiry) return 0;
    
    return expiry.getTime() - Date.now();
  },

  // Clear all auth tokens
  clearTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  },

  // Get auth headers for requests
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token || !this.isTokenValid()) {
      return {};
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
};

// Auto-logout timer based on token expiry
let logoutTimer = null;

export const setupAutoLogoutTimer = (logoutCallback) => {
  // Clear existing timer
  if (logoutTimer) {
    clearTimeout(logoutTimer);
  }

  const timeUntilExpiry = TokenManager.getTimeUntilExpiry();
  
  if (timeUntilExpiry > 0) {
    // Set timer to logout 1 minute before token expires
    const logoutTime = Math.max(timeUntilExpiry - 60000, 0);
    
    logoutTimer = setTimeout(() => {
      if (logoutCallback) {
        logoutCallback('token_expired');
      }
    }, logoutTime);
  }
};

export const clearAutoLogoutTimer = () => {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }
};

// Page visibility handler for token validation
let visibilityCheckEnabled = false;

export const setupVisibilityCheck = (checkTokenCallback) => {
  if (visibilityCheckEnabled) return;
  
  const handleVisibilityChange = () => {
    if (!document.hidden && checkTokenCallback) {
      // Page became visible, check token validity
      checkTokenCallback();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  visibilityCheckEnabled = true;
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    visibilityCheckEnabled = false;
  };
};

// Global error handler for authentication errors
export const handleAuthError = (error, logoutCallback) => {
  if (error.message === 'AUTHENTICATION_EXPIRED' || 
      error.message === 'AUTHENTICATION_REQUIRED' ||
      (error.response && error.response.status === 401)) {
    
    if (logoutCallback) {
      logoutCallback('unauthorized');
    }
    
    return true; // Error was handled
  }
  
  return false; // Error was not an auth error
};

export default {
  setAuthContext,
  setupAxiosInterceptors,
  TokenManager,
  setupAutoLogoutTimer,
  clearAutoLogoutTimer,
  setupVisibilityCheck,
  handleAuthError
};
