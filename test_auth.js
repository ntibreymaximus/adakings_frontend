// Simple test to check authentication state
// Run this in browser console

console.log('=== Testing Authentication State ===');

const token = localStorage.getItem('token');
const refreshToken = localStorage.getItem('refreshToken');
const userData = localStorage.getItem('userData');

console.log('1. Storage Check:');
console.log('   Token exists:', !!token);
console.log('   Refresh token exists:', !!refreshToken);
console.log('   User data exists:', !!userData);

if (token) {
  console.log('2. Token Analysis:');
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;
      const isExpired = payload.exp < currentTime;
      
      console.log('   Token format: Valid JWT');
      console.log('   Issued at:', new Date(payload.iat * 1000));
      console.log('   Expires at:', new Date(payload.exp * 1000));
      console.log('   Current time:', new Date());
      console.log('   Is expired:', isExpired);
      console.log('   Time until expiry (min):', Math.round((payload.exp - currentTime) / 60));
      console.log('   User ID:', payload.user_id);
    } else {
      console.log('   Token format: Invalid JWT structure');
    }
  } catch (error) {
    console.log('   Token parsing error:', error.message);
  }
} else {
  console.log('2. Token Analysis: No token found');
}

console.log('3. Manual API Test:');
async function testAPI() {
  try {
    const response = await fetch('http://localhost:8000/api/menu/items/', {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   API Response Status:', response.status);
    console.log('   API Response OK:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   Menu items count:', data.length || data.results?.length || 'unknown structure');
    } else {
      const errorText = await response.text();
      console.log('   Error response:', errorText);
    }
  } catch (error) {
    console.log('   API test failed:', error.message);
  }
}

if (token) {
  testAPI();
} else {
  console.log('   Skipping API test (no token)');
}

console.log('4. Recommendation:');
if (!token || !refreshToken || !userData) {
  console.log('   ❌ Authentication data incomplete - need to login');
  console.log('   Action: Clear storage and redirect to login');
  
  // Uncomment to auto-clear:
  // localStorage.clear();
  // window.location.href = '/login';
} else {
  console.log('   ✅ Authentication data present - check token validity above');
}
