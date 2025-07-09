// API Configuration Debugger for Railway and other environments
// This utility helps diagnose API configuration issues

import { API_BASE_URL, BACKEND_BASE_URL } from './api';

export const debugApiConfiguration = () => {
  console.group('🔍 API Configuration Debug Information');
  
  // Environment detection
  const isRailway = window.location.hostname.includes('railway.app');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !isRailway;
  
  console.log('🌍 Environment Detection:');
  console.log(`  - Railway: ${isRailway}`);
  console.log(`  - Localhost: ${isLocalhost}`);
  console.log(`  - Production: ${isProd}`);
  console.log(`  - Current hostname: ${window.location.hostname}`);
  
  if (isRailway) {
    console.log('\n🚂 Railway Environment Detected:');
    console.log('  - Using Railway environment variables from dashboard');
    console.log('  - Environment variables will be injected automatically');
  }
  
  // Environment variables
  console.log('\n📋 Environment Variables:');
  console.log(`  - REACT_APP_API_BASE_URL: ${process.env.REACT_APP_API_BASE_URL || 'undefined'}`);
  console.log(`  - REACT_APP_BACKEND_BASE_URL: ${process.env.REACT_APP_BACKEND_BASE_URL || 'undefined'}`);
  console.log(`  - REACT_APP_ENVIRONMENT: ${process.env.REACT_APP_ENVIRONMENT || 'undefined'}`);
  console.log(`  - REACT_APP_ENVIRONMENT_TYPE: ${process.env.REACT_APP_ENVIRONMENT_TYPE || 'undefined'}`);
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  
  // Computed URLs
  console.log('\n🔗 Computed URLs:');
  console.log(`  - API_BASE_URL: ${API_BASE_URL}`);
  console.log(`  - BACKEND_BASE_URL: ${BACKEND_BASE_URL}`);
  
  // Token status
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const userData = localStorage.getItem('userData');
  
  console.log('\n🔑 Authentication Status:');
  console.log(`  - Token present: ${!!token}`);
  console.log(`  - Refresh token present: ${!!refreshToken}`);
  console.log(`  - User data present: ${!!userData}`);
  
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      const isExpired = payload.exp < now;
      console.log(`  - Token expired: ${isExpired}`);
      console.log(`  - Token expires at: ${new Date(payload.exp * 1000).toISOString()}`);
    } catch (e) {
      console.log('  - Token parsing error:', e.message);
    }
  }
  
  console.groupEnd();
};

export const testApiEndpoints = async () => {
  console.group('🧪 API Endpoint Tests');
  
  const endpoints = [
    { name: 'Menu Items', url: '/api/menu/items/' },
    { name: 'User Profile', url: '/api/users/profile/' },
    { name: 'Orders', url: '/api/orders/' },
    { name: 'Health Check', url: '/api/health/' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing ${endpoint.name}:`);
    console.log(`  URL: ${BACKEND_BASE_URL}${endpoint.url}`);
    
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${BACKEND_BASE_URL}${endpoint.url}`, {
        method: 'GET',
        headers
      });
      
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        const text = await response.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          console.log(`  ❌ Server returned HTML instead of JSON`);
          console.log(`  HTML snippet: ${text.substring(0, 200)}...`);
        } else {
          console.log(`  ❌ Response: ${text}`);
        }
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            console.log(`  ✅ Success: ${JSON.stringify(data).substring(0, 200)}...`);
          } catch (e) {
            console.log(`  ❌ JSON parse error: ${e.message}`);
          }
        } else {
          console.log(`  ⚠️ Unexpected content type: ${contentType}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Network error: ${error.message}`);
    }
  }
  
  console.groupEnd();
};

export const checkBackendHealth = async () => {
  console.group('🏥 Backend Health Check');
  
  try {
    const healthUrl = `${BACKEND_BASE_URL}/api/health/`;
    console.log(`Checking: ${healthUrl}`);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is healthy:', data);
    } else {
      const text = await response.text();
      console.log('❌ Backend health check failed:', text);
    }
  } catch (error) {
    console.log('❌ Backend health check error:', error.message);
  }
  
  console.groupEnd();
};

export const diagnoseApiIssues = async () => {
  console.log('🔧 Starting API Diagnosis...');
  
  // Run all diagnostics
  debugApiConfiguration();
  await checkBackendHealth();
  await testApiEndpoints();
  
  console.log('✅ API Diagnosis Complete');
};

// Auto-run diagnostics in Railway environment
if (window.location.hostname.includes('railway.app')) {
  // Run diagnostics after a short delay to ensure DOM is ready
  setTimeout(() => {
    diagnoseApiIssues();
  }, 2000);
}

export default {
  debugApiConfiguration,
  testApiEndpoints,
  checkBackendHealth,
  diagnoseApiIssues
};
