// API utility functions with JWT authentication handling

// Check if token is expired (with 30-second buffer to prevent edge cases)
function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    // JWT tokens have 3 parts separated by dots
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const bufferTime = 30; // 30 seconds buffer
    return payload.exp < (currentTime + bufferTime);
  } catch (error) {
    return true; // Assume expired if we can't parse
  }
}

// Refresh access token using refresh token
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    localStorage.setItem('token', data.access);
    return data.access;
  } catch (error) {
    // Refresh failed, clear tokens and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    // Don't use window.location.href as it causes hard reload
    // Let the App component handle authentication state
    throw new Error('AUTHENTICATION_EXPIRED');
  }
}

// Get valid authentication headers
async function getAuthHeaders() {
  let token = localStorage.getItem('token');
  
  if (!token) {
    // No token, clear data and throw error to let App handle it
    localStorage.removeItem('userData');
    localStorage.removeItem('refreshToken');
    throw new Error('AUTHENTICATION_REQUIRED');
  }
  
  // Check if token is expired and try to refresh if needed
  if (isTokenExpired(token)) {
    try {
      token = await refreshAccessToken();
    } catch (error) {
      return null;
    }
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Note: authenticatedFetch has been replaced with tokenFetch utility
// All API calls now use the simpler tokenFetch from ../utils/tokenFetch.js

// API endpoints - always prioritize Railway environment variables
const getApiBaseUrl = () => {
  // PRIORITY 1: Railway environment variables (for both dev and prod)
  // Always check Railway environment variables first
  if (process.env.REACT_APP_API_BASE_URL) {
    console.log('🔗 Using REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  if (process.env.REACT_APP_BACKEND_BASE_URL) {
    const apiUrl = `${process.env.REACT_APP_BACKEND_BASE_URL}/api`;
    console.log('🔗 Using REACT_APP_BACKEND_BASE_URL + /api:', apiUrl);
    return apiUrl;
  }
  
  // PRIORITY 2: Railway hostname detection (fallback)
  if (window.location.hostname.includes('railway.app')) {
    console.error('❌ Railway deployment detected but no environment variables set!');
    console.error('Required: REACT_APP_BACKEND_BASE_URL or REACT_APP_API_BASE_URL');
    throw new Error('Railway deployment requires REACT_APP_BACKEND_BASE_URL or REACT_APP_API_BASE_URL to be set in Railway dashboard');
  }
  
  // PRIORITY 3: Local development fallback
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔗 Using local development API URL');
    return 'http://localhost:8000/api';
  }
  
  // PRIORITY 4: Generic production fallback (should not be used for Railway)
  console.warn('⚠️ Using generic production fallback - this should not happen for Railway deployments');
  return `http://${window.location.hostname}:8000/api`;
};

// Base URL without /api suffix for direct backend access
const getBackendBaseUrl = () => {
  // PRIORITY 1: Railway environment variables (for both dev and prod)
  // Always check Railway environment variables first
  if (process.env.REACT_APP_BACKEND_BASE_URL) {
    console.log('🔗 Using REACT_APP_BACKEND_BASE_URL:', process.env.REACT_APP_BACKEND_BASE_URL);
    return process.env.REACT_APP_BACKEND_BASE_URL;
  }
  
  // PRIORITY 2: Railway hostname detection (fallback)
  if (window.location.hostname.includes('railway.app')) {
    console.error('❌ Railway deployment detected but no REACT_APP_BACKEND_BASE_URL set!');
    console.error('Required: REACT_APP_BACKEND_BASE_URL must be set in Railway dashboard');
    throw new Error('Railway deployment requires REACT_APP_BACKEND_BASE_URL to be set in Railway dashboard');
  }
  
  // PRIORITY 3: Local development fallback
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔗 Using local development backend URL');
    return 'http://localhost:8000';
  }
  
  // PRIORITY 4: Generic production fallback (should not be used for Railway)
  console.warn('⚠️ Using generic production fallback - this should not happen for Railway deployments');
  return `http://${window.location.hostname}:8000`;
};

export const API_BASE_URL = getApiBaseUrl();
export const BACKEND_BASE_URL = getBackendBaseUrl();

export const API_ENDPOINTS = {
  MENU_ITEMS: `${API_BASE_URL}/menu/items/`,
  ORDERS: `${API_BASE_URL}/orders/`,
  NEXT_ORDER_NUMBER: `${API_BASE_URL}/orders/next-order-number/`,
  TRANSACTIONS: `${API_BASE_URL}/transactions/`,
  USERS: `${API_BASE_URL}/users/`,
  LOGIN: `${API_BASE_URL}/users/login/`,
};

