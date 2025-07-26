# Environment Configuration Guide

This document outlines the environment setup for both Adakings frontend applications that share the same backend.

## Project Structure
```
Adakings/
├── WebApps/
│   ├── adakingsrestaurant/    # Customer-facing restaurant app
│   └── adaresmansys/          # Restaurant management system
└── backend/                   # Shared Django backend
```

## Shared Backend Configuration
Both frontend applications connect to the same Django backend but serve different purposes:
- **adakingsrestaurant**: Customer-facing app for ordering food
- **adaresmansys**: Restaurant management system for staff

## Environment Variables

### Required Environment Variables (for both frontends)
```bash
# Backend API URL
REACT_APP_API_BASE_URL=https://your-backend-url.railway.app
REACT_APP_BACKEND_BASE_URL=https://your-backend-url.railway.app

# Environment specification
REACT_APP_ENV=production              # or 'development', 'local'
REACT_APP_ENVIRONMENT=production      # Alternative environment variable

# Optional - Debug and Logging
REACT_APP_DEBUG_MODE=false            # Set to 'true' for debugging
REACT_APP_ENABLE_LOGS=false          # Set to 'true' to enable console logs
```

### Environment Detection Logic
The applications automatically detect the environment:
1. **Local Development**: `localhost`, `127.0.0.1`, `192.168.*`, or contains 'local'
2. **Production**: `NODE_ENV=production` or explicit `REACT_APP_ENV=production`
3. **Development**: Default fallback for Railway dev deployments

## Railway Deployment Configuration

### Both projects include:

#### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install --force && npm run build:railway"
  },
  "deploy": {
    "startCommand": "npx serve -s build -l $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Package.json Scripts
```json
{
  "scripts": {
    "start": "react-scripts start",
    "start:production": "serve -s build -l $PORT",
    "start:local": "cross-env REACT_APP_ENV=local react-scripts start",
    "start:dev": "cross-env REACT_APP_ENV=development react-scripts start",
    "build": "react-scripts build",
    "build:local": "cross-env REACT_APP_ENV=local react-scripts build",
    "build:dev": "cross-env REACT_APP_ENV=development react-scripts build",
    "build:prod": "cross-env REACT_APP_ENV=production react-scripts build",
    "build:railway": "cross-env REACT_APP_ENV=production CI=true DISABLE_ESLINT_PLUGIN=true react-scripts build"
  }
}
```

## Railway Environment Setup

### For adakingsrestaurant:
1. Create new Railway service
2. Connect to repository (feature/restaurant branch)
3. Set environment variables:
   ```
   REACT_APP_API_BASE_URL=https://adakings-backend.railway.app
   REACT_APP_ENV=production
   ```

### For adaresmansys:
1. Create new Railway service
2. Connect to repository (feature/codebaserefactor branch)
3. Set environment variables:
   ```
   REACT_APP_API_BASE_URL=https://adakings-backend.railway.app
   REACT_APP_ENV=production
   ```

## Local Development

### Setup for both projects:
```bash
# Install dependencies
npm install

# Run locally
npm run start:local

# Build for specific environment
npm run build:local      # Local build
npm run build:dev        # Development build  
npm run build:prod       # Production build
```

## Environment Configuration Features

### envConfig.js provides:
- **Environment Detection**: Automatic detection of local, development, and production
- **API Configuration**: Dynamic API base URL based on environment
- **Debug Logging**: Environment-aware console logging
- **WebSocket Support**: Automatic WebSocket URL generation
- **Configuration Export**: Complete environment configuration object

### Usage Example:
```javascript
import { getCurrentEnvironment, getApiBaseUrl, envLog } from './utils/envConfig';

// Get current environment
const env = getCurrentEnvironment(); // 'local', 'dev', or 'prod'

// Get API URL for current environment
const apiUrl = getApiBaseUrl();

// Environment-aware logging
envLog('Application started in', env, 'environment');
```

## Production Deployment Checklist

### Before deploying:
1. ✅ Ensure `REACT_APP_API_BASE_URL` points to production backend
2. ✅ Set `REACT_APP_ENV=production` in Railway environment
3. ✅ Test build with `npm run build:railway`
4. ✅ Verify environment detection in browser console
5. ✅ Confirm API connectivity to shared backend

### Railway Deployment Commands:
```bash
# Test Railway build locally
npm run build:railway

# The Railway service will automatically:
# 1. Run: npm install --force && npm run build:railway
# 2. Start: npx serve -s build -l $PORT
```

## Troubleshooting

### Common Issues:
1. **Build Failures**: Check ESLint errors are fixed with `CI=true DISABLE_ESLINT_PLUGIN=true`
2. **API Connection**: Verify `REACT_APP_API_BASE_URL` is set correctly
3. **Environment Detection**: Check browser console for environment logs
4. **CORS Issues**: Ensure backend allows both frontend domains

### Debug Mode:
Set `REACT_APP_DEBUG_MODE=true` to enable detailed logging and debugging features.
