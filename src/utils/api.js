// API utility functions with JWT authentication handling

// Check if token is expired (basic check)
function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    // JWT tokens have 3 parts separated by dots
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiry:', error);
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
    window.location.href = '/login';
    throw error;
  }
}

// Get valid authentication headers
async function getAuthHeaders() {
  let token = localStorage.getItem('token');
  
  if (!token) {
    // No token, redirect to login
    localStorage.removeItem('userData');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return null;
  }
  
  // Check if token is expired and try to refresh if needed
  if (isTokenExpired(token)) {
    try {
      token = await refreshAccessToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
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
  
  const defaultOptions = {
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  // Handle 401 Unauthorized responses
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    window.location.href = '/login';
    throw new Error('Authentication failed');
  }
  
  return response;
}

// API endpoints
export const API_BASE_URL = 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  MENU_ITEMS: `${API_BASE_URL}/menu/items/`,
  ORDERS: `${API_BASE_URL}/orders/`,
  NEXT_ORDER_NUMBER: `${API_BASE_URL}/orders/next-order-number/`,
  TRANSACTIONS: `${API_BASE_URL}/transactions/`,
  USERS: `${API_BASE_URL}/users/`,
  LOGIN: `${API_BASE_URL}/users/login/`,
};

