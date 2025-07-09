# Railway Deployment Guide for Adakings Frontend

## Issues Found and Solutions

### 1. **Missing manifest.json** ✅ FIXED
**Issue**: `manifest.json:1 Manifest: Line: 1, column: 1, Syntax error.`
**Solution**: Created `public/manifest.json` with proper PWA configuration.

### 2. **HTML returned instead of JSON** ❌ NEEDS RAILWAY ENV VARS
**Issue**: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
**Cause**: Backend API endpoints returning HTML error pages instead of JSON
**Solution**: Environment variables need to be set on Railway

### 3. **401 Unauthorized Errors** ❌ AUTHENTICATION ISSUE
**Issue**: Multiple endpoints returning 401 errors
**Cause**: Authentication tokens are expired or missing
**Solution**: Users need to log in again, or backend authentication needs to be fixed

## Railway Environment Variables

✅ **Environment variables are already set in Railway dashboard**

The application will automatically use the environment variables you've configured in Railway:
- `REACT_APP_BACKEND_BASE_URL` - Your backend service URL
- `REACT_APP_API_BASE_URL` - Your API base URL
- Other environment-specific variables

No hardcoded URLs are needed - the app will read from Railway's environment variables.

## Setting Railway Environment Variables

### Option 1: Railway CLI
```bash
railway login
railway link
railway variables set REACT_APP_BACKEND_BASE_URL=https://adakingsbackend-dev.up.railway.app
railway variables set REACT_APP_API_BASE_URL=https://adakingsbackend-dev.up.railway.app/api
railway variables set REACT_APP_ENVIRONMENT=development
railway variables set REACT_APP_ENVIRONMENT_TYPE=RAILWAY
railway variables set GENERATE_SOURCEMAP=false
railway variables set SKIP_PREFLIGHT_CHECK=true
railway variables set ESLINT_NO_DEV_ERRORS=true
railway variables set REACT_APP_DEPLOYMENT_PLATFORM=railway
railway variables set REACT_APP_DISABLE_SERVICE_WORKER=true
```

### Option 2: Railway Dashboard
1. Go to your Railway project
2. Click on your frontend service
3. Go to the "Variables" tab
4. Add each environment variable listed above

## Backend Issues to Check

### 1. CORS Configuration
Make sure your Django backend has proper CORS settings for Railway:

```python
# In your Django settings.py
CORS_ALLOWED_ORIGINS = [
    "https://adakingsfrontend-dev.up.railway.app",  # Your frontend URL
    "http://localhost:3000",  # Local development
]

CORS_ALLOW_CREDENTIALS = True
```

### 2. Django Settings for Railway
```python
# Allow Railway domain
ALLOWED_HOSTS = [
    'adakingsbackend-dev.up.railway.app',
    'localhost',
    '127.0.0.1',
]

# Database configuration for Railway
# Make sure you have proper database URL configuration
```

## Debugging Tools

### 1. API Diagnostics
The app now includes automatic API diagnostics that run on Railway. Check the browser console for:
- 🔍 API Configuration Debug Information
- 🧪 API Endpoint Tests
- 🏥 Backend Health Check

### 2. Manual Testing
You can manually test API endpoints:

```javascript
// Run this in the browser console on Railway
import { diagnoseApiIssues } from './utils/apiDebugger';
diagnoseApiIssues();
```

### 3. Check Backend Health
Test if your backend is responding:
```bash
curl https://adakingsbackend-dev.up.railway.app/api/health/
```

## Common Issues and Solutions

### Issue: "Server returned HTML instead of JSON"
**Cause**: Backend is returning error pages instead of API responses
**Solutions**:
1. Check backend logs on Railway
2. Verify database connection
3. Check Django settings for Railway environment
4. Ensure proper CORS configuration

### Issue: "401 Unauthorized"
**Cause**: Authentication tokens expired or missing
**Solutions**:
1. Clear browser storage and login again
2. Check if backend authentication is working
3. Verify JWT token configuration on backend

### Issue: "Network error"
**Cause**: Cannot reach backend API
**Solutions**:
1. Verify backend Railway service is running
2. Check environment variables are set correctly
3. Verify backend URL is accessible

## Files Added/Modified

### New Files:
- `public/manifest.json` - PWA manifest
- `.env.railway` - Railway environment configuration
- `src/utils/apiDebugger.js` - API diagnostics utility
- `src/utils/railwayStartup.js` - Railway-specific startup script
- `RAILWAY_DEPLOYMENT_GUIDE.md` - This guide

### Modified Files:
- `src/services/apiCacheService.js` - Better error handling for HTML responses
- `src/utils/api.js` - Railway fallback URLs

## Next Steps

1. **Set environment variables** in Railway dashboard
2. **Check backend health** and logs
3. **Test authentication** - users may need to log in again
4. **Monitor console** for diagnostic information

## Testing the Fix

After setting environment variables and redeploying:

1. Open browser console on Railway app
2. Look for the automatic diagnostic output
3. Check if API endpoints are working
4. Test authentication flow

The app should now properly connect to the backend and display appropriate error messages instead of crashing.
