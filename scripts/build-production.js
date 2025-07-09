// Custom build script that completely bypasses webpack dev server
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Custom Build Script - Bypassing Webpack Dev Server');

// Set environment variables to force production build
process.env.NODE_ENV = 'production';
process.env.REACT_APP_ENVIRONMENT = process.env.REACT_APP_ENVIRONMENT || 'development';

// Remove any webpack dev server related environment variables
delete process.env.WDS_SOCKET_HOST;
delete process.env.WDS_SOCKET_PORT;
delete process.env.WDS_SOCKET_PATH;
delete process.env.WDS_SOCKET_PROTOCOL;

console.log('🔧 Environment Variables Set:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  REACT_APP_ENVIRONMENT:', process.env.REACT_APP_ENVIRONMENT);

// Clean build directory
const buildDir = path.join(__dirname, '..', 'build');
if (fs.existsSync(buildDir)) {
  console.log('🔧 Cleaning build directory...');
  fs.rmSync(buildDir, { recursive: true, force: true });
}

// Run the build
console.log('🔧 Starting production build...');
try {
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: process.env
  });
  console.log('✅ Production build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
