# Adakings Frontend React App - Branch-Specific Versioning Deployment System

## 🎯 Current Deployment Status

### Version Tracking
```
feature=1.0.0      # Development only (no builds)
dev=1.0.0          # Test builds enabled
production=1.0.0   # Optimized builds enabled
```

### 📁 React Project Structure
```
adakings_frontend/
├── src/
│   ├── components/         # React components
│   ├── pages/             # Application pages
│   ├── styles/            # CSS/SCSS files
│   └── utils/             # Utility functions
├── build/          # Generated for dev/production
├── node_modules/   # Dependencies
├── package.json    # Project configuration
└── smart_deploy.py # Deployment automation
```

## ✅ React-Specific Features

- **Intelligent Build Process**: Automatic builds for dev/production environments
- **Build Optimization**: Production builds are minified and optimized
- **Dependency Management**: Automatic npm install if needed
- **Version Synchronization**: Package.json version matches deployment version
- **Build Artifact Management**: Clean builds and size reporting
- **Source Map Control**: Enabled for dev, disabled for production

## 🚀 Usage

```bash
# Deploy feature (no build, development only)
python smart_deploy.py feature/name patch "Description"

# Deploy to dev (test build with source maps)
python smart_deploy.py dev minor "Dev release"

# Deploy to production (optimized build, no source maps)
python smart_deploy.py production major "Production release"
```

## 📊 Build Information
- **Feature Deployments**: No build process (fastest deployment)
- **Dev Deployments**: Development build with debugging features
- **Production Deployments**: Optimized build for performance

## 📊 Latest Deployment
- **Feature Version**: 1.0.0
- **Dev Version**: 1.0.0 (no builds yet)
- **Production Version**: 1.0.0 (no builds yet)
- **Last Updated**: 2025-07-02 21:16:00

## 🔧 React Commands Integration
- `npm start` - Development server
- `npm test` - Test runner
- `npm run build` - Production build (used by smart deploy)
- `npm install` - Install dependencies (automatic in deploy script)
