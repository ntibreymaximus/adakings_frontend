// Authentication Recovery Script
// Run this in the browser console to clear invalid authentication data

console.log('🔧 Starting authentication recovery...');

// Check current authentication state
const token = localStorage.getItem('token');
const refreshToken = localStorage.getItem('refreshToken');
const userData = localStorage.getItem('userData');

console.log('Current state:');
console.log('- Token exists:', !!token);
console.log('- Refresh token exists:', !!refreshToken);
console.log('- User data exists:', !!userData);

if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const isExpired = payload.exp < currentTime;
    console.log('- Token expired:', isExpired);
    console.log('- Token expiry:', new Date(payload.exp * 1000));
  } catch (error) {
    console.log('- Token invalid/malformed');
  }
}

// Clear all authentication data
console.log('🗑️ Clearing authentication data...');
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
localStorage.removeItem('userData');

// Clear any cached data
localStorage.removeItem('instant_update_orders');
localStorage.removeItem('instant_update_transactions');
localStorage.removeItem('instant_update_menu');

// Clear any other potential auth-related items
Object.keys(localStorage).forEach(key => {
  if (key.includes('auth') || key.includes('token') || key.includes('user')) {
    localStorage.removeItem(key);
  }
});

console.log('✅ Authentication data cleared');
console.log('🔄 Please refresh the page to be redirected to login');
console.log('📍 After refresh, you will need to log in again with your credentials');

// Optionally force a page refresh
// window.location.reload();
