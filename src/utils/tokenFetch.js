// Simple token-based fetch utility
// Replaces all authenticatedFetch functions with a simple token-based approach

/**
 * Make an authenticated API request using token from localStorage
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export const tokenFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  
  // Check for token refresh warning headers from backend
  const refreshWarning = response.headers.get('X-Token-Refresh-Warning');
  const expiresIn = response.headers.get('X-Token-Expires-In');
  
  if (refreshWarning === 'true' && expiresIn) {
    const expiresInSeconds = parseInt(expiresIn);
    console.log(`⚠️ Token refresh warning: expires in ${expiresInSeconds} seconds`);
    
    // If token expires in less than 5 minutes, proactively refresh
    if (expiresInSeconds < 300) {
      console.log('🔄 Proactively refreshing token...');
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshResponse = await fetch(`${response.url.split('/api/')[0]}/api/token/refresh/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken })
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            localStorage.setItem('token', refreshData.access);
            if (refreshData.refresh) {
              localStorage.setItem('refreshToken', refreshData.refresh);
            }
            if (refreshData.access_expires_at) {
              localStorage.setItem('tokenExpiresAt', refreshData.access_expires_at);
            }
            console.log('✅ Token refreshed successfully');
          }
        }
      } catch (error) {
        console.error('⚠️ Proactive token refresh failed:', error);
      }
    }
  }
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid - clear storage and reload
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
      throw new Error('Authentication expired');
    }
    
    // Try to get error details from response body
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails = null;
    try {
      const errorData = await response.json();
      errorDetails = errorData;
      console.error('🔴 API Error Response:', errorData);
      if (errorData.items && Array.isArray(errorData.items)) {
        console.error('🔴 Items errors:', errorData.items);
        errorData.items.forEach((itemError, index) => {
          console.error(`🔴 Item error ${index}:`, itemError);
        });
      }
      
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.errors) {
        // Handle validation errors
        const errors = Object.entries(errorData.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        errorMessage = errors;
      } else if (errorData.items && Array.isArray(errorData.items) && errorData.items.length > 0) {
        // Handle items field errors
        const itemErrors = errorData.items.map(item => {
          if (typeof item === 'object') {
            // Extract error messages from objects
            return Object.entries(item)
              .map(([field, error]) => `${field}: ${Array.isArray(error) ? error.join(', ') : error}`)
              .join('; ');
          }
          return String(item);
        });
        errorMessage = 'Items error: ' + itemErrors.join('. ');
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else {
        // Try to show any field that has an array of errors
        const fieldsWithErrors = Object.entries(errorData)
          .filter(([_, value]) => Array.isArray(value) && value.length > 0)
          .map(([field, errors]) => `${field}: ${errors.join(', ')}`);
        if (fieldsWithErrors.length > 0) {
          errorMessage = fieldsWithErrors.join('; ');
        }
      }
    } catch (e) {
      // If response body is not JSON, use default message
      console.error('Failed to parse error response:', e);
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }
  
  return response;
};

/**
 * Make an authenticated API request and return JSON
 * @param {string} url - The API endpoint URL  
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - JSON response data
 */
export const tokenFetchJson = async (url, options = {}) => {
  const response = await tokenFetch(url, options);
  return await response.json();
};

export default tokenFetch;
