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
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid - clear storage and reload
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
      throw new Error('Authentication expired');
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
