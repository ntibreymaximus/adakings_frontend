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
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
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

// Enhanced fetch with authentication
export async function authenticatedFetch(url, options = {}) {
  const authHeaders = await getAuthHeaders();
  
  if (!authHeaders) {
    throw new Error('Authentication required');
  }
  
  // Only cache GET requests, never cache POST/PATCH/PUT/DELETE
  const method = options.method || 'GET';
  const shouldCache = method.toUpperCase() === 'GET';
  
  const defaultOptions = {
    headers: {
      ...authHeaders,
      ...options.headers,
    },
    // Only apply caching for GET requests
    ...(shouldCache && { cache: 'default' }),
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  // Handle 401 Unauthorized responses
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    // Don't use hard redirect, let React Router handle navigation
    throw new Error('AUTHENTICATION_EXPIRED');
  }
  
  return response;
}

// API endpoints - dynamically determine based on how the frontend is accessed
const getApiBaseUrl = () => {
  // If accessing from network (not localhost), use network IP
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
};

// Base URL without /api suffix for direct backend access
const getBackendBaseUrl = () => {
  // If accessing from network (not localhost), use network IP
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
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

