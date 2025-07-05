// Debug script to check authentication state
// Run this in the browser console

console.log('=== Authentication Debug Information ===');

// Check localStorage tokens
const token = localStorage.getItem('token');
const refreshToken = localStorage.getItem('refreshToken');
const userData = localStorage.getItem('userData');

console.log('Token exists:', !!token);
console.log('Refresh token exists:', !!refreshToken);
console.log('User data exists:', !!userData);

if (token) {
  try {
    // Parse JWT token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const isExpired = payload.exp < currentTime;
    
    console.log('Token expiry:', new Date(payload.exp * 1000));
    console.log('Current time:', new Date());
    console.log('Token expired:', isExpired);
    console.log('Time until expiry (minutes):', Math.round((payload.exp - currentTime) / 60));
  } catch (error) {
    console.error('Error parsing token:', error);
  }
}

if (userData) {
  try {
    const user = JSON.parse(userData);
    console.log('User:', user);
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
}

// Test API endpoint
async function testAuthEndpoint() {
  try {
    const response = await fetch('http://localhost:8000/api/menu/items/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log('API test response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('API test successful, menu items count:', data.length || data.results?.length || 'unknown');
    } else {
      console.log('API test failed:', response.statusText);
    }
  } catch (error) {
    console.error('API test error:', error);
  }
}

if (token) {
  testAuthEndpoint();
}
