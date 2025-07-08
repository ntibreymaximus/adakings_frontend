# Adakings Frontend Environment Configuration

This frontend is configured to work with three different environments:

## 🏠 Local Development (`.env.local`)
- **Purpose**: For development work on your local machine
- **Backend**: Connects to local backend running on `http://localhost:8000`
- **Database**: Uses local SQLite database
- **Features**: 
  - Full debugging enabled
  - Hot reloading
  - Development tools enabled
  - Console logging enabled

### Running Locally:
```bash
npm run start:local
```

### Building for Local:
```bash
npm run build:local
```

## 🚧 Development Environment (`.env.dev`)
- **Purpose**: For Railway development deployment
- **Backend**: Connects to Railway dev backend via `$REACT_APP_DEV_API_URL`
- **Database**: Uses Railway PostgreSQL (development instance)
- **Features**:
  - **Full debugging enabled** (same as local)
  - **Development tools enabled**
  - **Console logging enabled**
  - HTTPS enforced
  - Optimized for Railway deployment

### Running in Dev Mode:
```bash
npm run start:dev
```

### Building for Dev:
```bash
npm run build:dev
```

## 🚀 Production Environment (`.env.production`)
- **Purpose**: For Railway production deployment
- **Backend**: Connects to Railway prod backend via `$REACT_APP_PROD_API_URL`
- **Database**: Uses Railway PostgreSQL (production instance)
- **Features**:
  - No debugging
  - No console logging
  - HTTPS enforced
  - Optimized performance

### Building for Production:
```bash
npm run build:prod
```

## 🔧 Environment Variables

### Required Railway Environment Variables:
For Railway deployments, you need to set these environment variables in your Railway project:

#### Development Railway Project:
```
REACT_APP_DEV_API_URL=https://your-dev-backend.railway.app
```

#### Production Railway Project:
```
REACT_APP_PROD_API_URL=https://your-prod-backend.railway.app
```

### Environment Files:
- `.env.local` - Local development
- `.env.dev` - Railway development
- `.env.production` - Railway production
- `.env.development` - Your existing development config (can be kept for compatibility)

## 🚀 Deployment Workflows

### Local Development Workflow:
1. Run your local backend: `python manage.py runserver`
2. Start frontend: `npm run start:local`
3. Develop and test locally

### Railway Development Workflow:
1. Make changes locally
2. Test with: `npm run build:dev`
3. Deploy to Railway dev environment
4. Test on Railway dev URL

### Railway Production Workflow:
1. Test thoroughly in local and dev environments
2. Build for production: `npm run build:prod`
3. Deploy to Railway production environment

## 🔍 Environment Detection

The app includes an environment utility (`src/utils/envConfig.js`) that provides:

```javascript
import { getCurrentEnvironment, isLocal, isDevelopment, isProduction } from './utils/envConfig';

// Check current environment
const env = getCurrentEnvironment(); // 'local', 'development', or 'production'

// Environment checks
if (isLocal()) {
  // Local development code
}

if (isProduction()) {
  // Production-only code
}
```

## 🐛 Debugging

### Debug Logging:
Use the environment-aware logging functions:

```javascript
import { envLog, envError, envWarn } from './utils/envConfig';

envLog('This will only log in environments where logging is enabled');
envError('This will only show errors when logging is enabled');
envWarn('This will only show warnings when logging is enabled');
```

### Environment Status:
The app will automatically use the correct API endpoints based on the environment variables. Check the browser console in development modes to see which environment is active.

## 📝 Notes

- Local environment uses SQLite for the backend database
- Development and Production environments use PostgreSQL on Railway
- API URLs are automatically configured based on environment variables
- Debug features are automatically enabled/disabled based on environment
- HTTPS is enforced on Railway environments but not locally
