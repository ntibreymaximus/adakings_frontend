// Railway-specific build script
const { execSync } = require('child_process');

console.log('🚂 Railway Build Script Started');

// Force production build settings
process.env.NODE_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';

// Remove webpack dev server environment variables
delete process.env.WDS_SOCKET_HOST;
delete process.env.WDS_SOCKET_PORT;
delete process.env.WDS_SOCKET_PATH;
delete process.env.WDS_SOCKET_PROTOCOL;
delete process.env.FAST_REFRESH;

console.log('🚂 Environment configured for Railway production build');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  REACT_APP_ENVIRONMENT:', process.env.REACT_APP_ENVIRONMENT);

// Run the build command
try {
  execSync('react-app-rewired build', { 
    stdio: 'inherit',
    env: process.env
  });
  console.log('✅ Railway build completed successfully');
} catch (error) {
  console.error('❌ Railway build failed:', error.message);
  process.exit(1);
}
