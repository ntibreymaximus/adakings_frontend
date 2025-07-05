// Simple token validation utility for debugging
export const checkToken = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('❌ No token found in localStorage');
    return false;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('❌ Invalid JWT token format');
      return false;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Date.now() / 1000;
    const isExpired = payload.exp < currentTime;
    
    console.log('🔍 Token Info:');
    console.log('  - User ID:', payload.user_id);
    console.log('  - Issued at:', new Date(payload.iat * 1000));
    console.log('  - Expires at:', new Date(payload.exp * 1000));
    console.log('  - Current time:', new Date());
    console.log('  - Is expired:', isExpired);
    console.log('  - Time until expiry (min):', Math.round((payload.exp - currentTime) / 60));
    
    if (isExpired) {
      console.log('❌ Token is expired');
      return false;
    }
    
    console.log('✅ Token is valid');
    return true;
    
  } catch (error) {
    console.log('❌ Error parsing token:', error.message);
    return false;
  }
};

// Test API call with current token
export const testApiCall = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('❌ No token to test');
    return;
  }
  
  try {
    console.log('🧪 Testing API call...');
    const response = await fetch('http://localhost:8000/api/menu/items/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 API Test Result:');
    console.log('  - Status:', response.status);
    console.log('  - OK:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('  - Data received:', data.length || data.results?.length || 'unknown', 'items');
      console.log('✅ API call successful');
    } else {
      console.log('❌ API call failed');
      const errorText = await response.text();
      console.log('  - Error:', errorText);
    }
    
  } catch (error) {
    console.log('❌ API test error:', error.message);
  }
};
