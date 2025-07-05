/**
 * Global Authentication Context with Auto-Logout for Token Expiration
 * Provides centralized authentication state and automatic logout on token expiration
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [userData, setUserData] = useState(() => {
    try {
      const storedUserData = localStorage.getItem('userData');
      const token = localStorage.getItem('token');
      if (storedUserData && token) {
        return JSON.parse(storedUserData);
      }
    } catch (error) {
      return null;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Check if token is expired
  const isTokenExpired = useCallback((token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }, []);

  // Auto-logout function
  const logout = useCallback(async (reason = 'manual', showMessage = true) => {
    
    setIsLoading(true);
    
    try {
      // Try to call backend logout endpoint if we have a token
      const token = localStorage.getItem('token');
      if (token && !isTokenExpired(token)) {
        await fetch(`${API_BASE_URL}/users/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      // Silent failure for logout API call
    } finally {
      // Clear all authentication data
      setUserData(null);
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Clear any cached data
      localStorage.removeItem('instant_update_orders');
      localStorage.removeItem('instant_update_transactions');
      localStorage.removeItem('instant_update_menu');
      
      setIsLoading(false);
      
      // Show appropriate message
      if (showMessage) {
        switch (reason) {
          case 'token_expired':
            toast.error('Your session has expired. Please log in again.');
            break;
          case 'token_invalid':
            toast.error('Invalid session. Please log in again.');
            break;
          case 'unauthorized':
            toast.error('Access denied. Please log in again.');
            break;
          case 'manual':
            toast.info('Successfully logged out.');
            break;
          default:
            toast.info('Session ended. Please log in again.');
        }
      }
      
      // Navigate to login page
      navigate('/login', { replace: true });
    }
  }, [navigate, isTokenExpired]);

  // Refresh access token
  const refreshToken = useCallback(async () => {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshTokenValue
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access);
      
      return data.access;
    } catch (error) {
      await logout('token_expired');
      throw error;
    }
  }, [logout]);

  // Check and validate token
  const checkTokenValidity = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      if (userData) {
        console.log('🚨 No token found, forcing logout');
        await logout('token_invalid', true);
      }
      return false;
    }

    if (isTokenExpired(token)) {
      console.log('🚨 Token expired, attempting refresh');
      try {
        await refreshToken();
        return true;
      } catch (error) {
        console.log('🚨 Token refresh failed, forcing logout');
        await logout('token_expired', true);
        return false;
      }
    }

    return true;
  }, [userData, logout, isTokenExpired, refreshToken]);

  // Auto-logout on token expiration (check every minute)
  useEffect(() => {
    if (!userData) return;

    const interval = setInterval(async () => {
      await checkTokenValidity();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [userData, checkTokenValidity]);

  // Login function
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      // Store authentication data
      setUserData(data.user);
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.setItem('token', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      
      toast.success(`Welcome back, ${data.user.username || data.user.email}!`);
      navigate('/dashboard');
      
      return data;
    } catch (error) {
      toast.error(error.message || 'Login failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);


  // Listen for storage changes (logout from other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && e.newValue === null && userData) {
        // Token was removed in another tab
        setUserData(null);
        toast.info('You have been logged out from another tab.');
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userData, navigate]);

  // Check authentication on app start and route changes
  useEffect(() => {
    if (location.pathname !== '/login') {
      checkTokenValidity();
    }
  }, [location.pathname, checkTokenValidity]);

  const value = {
    userData,
    isLoading,
    isAuthenticated: !!userData,
    login,
    logout,
    checkTokenValidity,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
