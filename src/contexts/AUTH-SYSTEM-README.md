# Auto-Logout Authentication System

## Overview

This implementation provides a comprehensive authentication system with automatic logout for token expiration issues. The system ensures users are automatically logged out when their session expires, maintaining security and preventing unauthorized access.

## Key Components

### 1. AuthContext (`src/contexts/AuthContext.js`)

A React Context that provides centralized authentication state management with the following features:

#### Core Features:
- **Automatic Token Validation**: Checks token validity every minute
- **Token Refresh**: Automatically refreshes expired access tokens using refresh tokens
- **Auto-Logout**: Triggers logout when tokens are invalid or expired
- **Cross-Tab Synchronization**: Syncs logout across multiple browser tabs
- **Page Visibility Check**: Validates tokens when page becomes visible

#### Key Functions:
- `login(email, password)` - Authenticates user and stores tokens
- `logout(reason, showMessage)` - Logs out user with contextual messages
- `authenticatedFetch(url, options)` - Enhanced fetch with automatic token handling
- `checkTokenValidity()` - Validates current token and refreshes if needed

#### Auto-Logout Triggers:
1. **Token Expiration**: Automatic logout when token expires
2. **401 Responses**: Immediate logout on unauthorized API responses
3. **Invalid Tokens**: Logout when token cannot be parsed or validated
4. **Manual Logout**: User-initiated logout
5. **Cross-Tab Logout**: Logout when user logs out in another tab

### 2. Global Authentication Interceptor (`src/utils/authInterceptor.js`)

A global fetch interceptor that handles authentication automatically across the entire application.

#### Features:
- **Global 401 Handling**: Automatically detects and handles 401 responses
- **Auto-Logout Protection**: Prevents auto-logout on login/auth endpoints
- **Token Management**: Utilities for token validation and expiry checking
- **Auto-Logout Timer**: Proactive logout before token expires
- **Visibility Check**: Validates tokens when page becomes visible

#### Utility Functions:
- `TokenManager.isTokenValid()` - Check if current token is valid
- `TokenManager.getTokenExpiry()` - Get token expiration date
- `TokenManager.getTimeUntilExpiry()` - Get milliseconds until expiry
- `setupAutoLogoutTimer(callback)` - Set timer to logout before expiry
- `setupVisibilityCheck(callback)` - Check tokens on page visibility

### 3. Enhanced Application Structure

The App component is now wrapped with the AuthProvider to ensure authentication context is available throughout the application.

## Implementation Details

### Token Expiration Handling

The system uses multiple layers to handle token expiration:

1. **Proactive Checking**: Validates tokens every 60 seconds
2. **Request Interception**: Checks tokens before making API requests
3. **Response Handling**: Handles 401 responses globally
4. **Auto-Refresh**: Attempts to refresh expired tokens automatically
5. **Graceful Fallback**: Logs out when refresh fails

### Auto-Logout Scenarios

| Scenario | Trigger | Message | Action |
|----------|---------|---------|--------|
| Token Expired | Timer/Validation | "Your session has expired" | Clear storage, redirect to login |
| Invalid Token | Parse error | "Invalid session" | Clear storage, redirect to login |
| 401 Response | API call | "Access denied" | Clear storage, redirect to login |
| Manual Logout | User action | "Successfully logged out" | Clear storage, redirect to login |
| Cross-Tab Logout | Storage event | "Logged out from another tab" | Clear state, redirect to login |

### Security Features

1. **Automatic Token Cleanup**: Clears all auth data on logout
2. **Cache Invalidation**: Removes cached application data
3. **Cross-Tab Security**: Syncs logout across browser tabs
4. **Proactive Expiry**: Logs out before token expires
5. **Failed Refresh Handling**: Logs out when token refresh fails

## Usage Examples

### Basic Authentication Check
```javascript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, userData, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return <div>Welcome {userData.username}</div>;
}
```

### Making Authenticated API Calls
```javascript
import { useAuth } from '../contexts/AuthContext';

function DataComponent() {
  const { authenticatedFetch } = useAuth();
  
  const fetchData = async () => {
    try {
      const response = await authenticatedFetch('/api/data/');
      const data = await response.json();
      return data;
    } catch (error) {
      if (error.message === 'AUTHENTICATION_EXPIRED') {
        // User has been automatically logged out
        console.log('Session expired, user logged out');
      }
    }
  };
}
```

### Manual Logout
```javascript
import { useAuth } from '../contexts/AuthContext';

function LogoutButton() {
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout('manual'); // Shows "Successfully logged out" message
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

## Configuration

### Token Refresh Settings
```javascript
// In AuthContext.js
const REFRESH_CHECK_INTERVAL = 60000; // Check every minute
const AUTO_LOGOUT_BUFFER = 60000; // Logout 1 minute before expiry
```

### Auto-Logout Messages
Customize logout messages in the AuthContext `logout` function:
- `token_expired`: "Your session has expired. Please log in again."
- `token_invalid`: "Invalid session. Please log in again."
- `unauthorized`: "Access denied. Please log in again."
- `manual`: "Successfully logged out."

## Migration from Legacy System

### Old Pattern (Deprecated)
```javascript
// OLD - Manual token handling
import useAuth from '../hooks/useAuth';

const { logout } = useAuth();
const token = localStorage.getItem('token');

const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (response.status === 401) {
  logout(); // Manual logout handling
}
```

### New Pattern (Recommended)
```javascript
// NEW - Automatic token handling
import { useAuth } from '../contexts/AuthContext';

const { authenticatedFetch } = useAuth();

const response = await authenticatedFetch(url);
// Auto-logout is handled automatically on 401 responses
```

## Testing Auto-Logout

### Manual Testing
1. **Token Expiry**: Wait for token to expire (check console for expiry time)
2. **Invalid Token**: Manually corrupt token in localStorage
3. **401 Response**: Make API call that returns 401
4. **Cross-Tab**: Logout in one tab, check other tabs
5. **Page Visibility**: Leave page for extended time, return and check

### Simulating Token Expiry
```javascript
// In browser console:
// 1. Check current token expiry
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires:', new Date(payload.exp * 1000));

// 2. Set token to expire soon (for testing)
const newPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + 10 }; // Expires in 10 seconds
```

## Troubleshooting

### Common Issues

1. **Infinite Logout Loops**: Check for recursive logout calls in error handlers
2. **Token Not Refreshing**: Verify refresh token endpoint is correct
3. **Cross-Tab Not Working**: Ensure localStorage events are properly handled
4. **Auto-Logout Too Aggressive**: Adjust check intervals and buffer times

### Debug Mode
Enable debug logging by setting in console:
```javascript
localStorage.setItem('AUTH_DEBUG', 'true');
```

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage (consider httpOnly cookies for production)
2. **HTTPS Required**: Always use HTTPS in production
3. **Token Rotation**: Implement short-lived access tokens with refresh tokens
4. **Cross-Site Scripting**: Sanitize all user inputs
5. **Token Expiry**: Set appropriate token expiration times

## Future Enhancements

1. **Remember Me**: Optional long-lived sessions
2. **Session Timeout Warning**: Warn users before auto-logout
3. **Background Refresh**: Refresh tokens in background
4. **Biometric Authentication**: Support for fingerprint/face ID
5. **Multi-Factor Authentication**: Add 2FA support

## Performance Impact

- **Memory**: Minimal impact with efficient event listeners
- **Network**: One token validation request per minute when authenticated
- **CPU**: Lightweight timer-based checks
- **Storage**: Standard localStorage usage

The system is designed to be performant while maintaining security through proactive session management.
