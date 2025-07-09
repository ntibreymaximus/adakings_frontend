// Railway Environment Variable Validation Utility
// Ensures Railway environment variables are properly configured for both dev and prod

export const validateRailwayEnvironment = () => {
  const isRailway = window.location.hostname.includes('railway.app');
  
  if (!isRailway) {
    console.log('🏠 Not on Railway - skipping Railway environment validation');
    return true;
  }
  
  console.log('🚂 Railway Environment Validation Started');
  
  // Check required environment variables
  const requiredVars = {
    'REACT_APP_BACKEND_BASE_URL': process.env.REACT_APP_BACKEND_BASE_URL,
    'REACT_APP_API_BASE_URL': process.env.REACT_APP_API_BASE_URL,
    'REACT_APP_ENVIRONMENT': process.env.REACT_APP_ENVIRONMENT,
    'NODE_ENV': process.env.NODE_ENV
  };
  
  let allValid = true;
  let hasBackendUrl = false;
  
  console.log('📋 Required Environment Variables Check:');
  
  Object.entries(requiredVars).forEach(([key, value]) => {
    const isSet = value && value !== 'undefined';
    const status = isSet ? '✅' : '❌';
    
    console.log(`  ${status} ${key}: ${value || 'NOT SET'}`);
    
    if (key === 'REACT_APP_BACKEND_BASE_URL' && isSet) {
      hasBackendUrl = true;
    }
    
    if (key === 'REACT_APP_API_BASE_URL' && isSet) {
      hasBackendUrl = true;
    }
  });
  
  // Check if at least one backend URL is set
  if (!hasBackendUrl) {
    console.error('❌ CRITICAL: No backend URL configured!');
    console.error('At least one of these must be set in Railway dashboard:');
    console.error('  - REACT_APP_BACKEND_BASE_URL');
    console.error('  - REACT_APP_API_BASE_URL');
    allValid = false;
  }
  
  // Environment-specific validation
  const environment = process.env.REACT_APP_ENVIRONMENT;
  const hostname = window.location.hostname;
  
  console.log('🌍 Environment Configuration:');
  console.log(`  - Current hostname: ${hostname}`);
  console.log(`  - Environment: ${environment || 'NOT SET'}`);
  
  if (hostname.includes('-dev.') && environment === 'production') {
    console.warn('⚠️ WARNING: Dev hostname detected but environment is set to production');
  }
  
  if (hostname.includes('-prod.') && environment === 'development') {
    console.warn('⚠️ WARNING: Prod hostname detected but environment is set to development');
  }
  
  // Final validation result
  if (allValid) {
    console.log('✅ Railway environment validation passed');
    return true;
  } else {
    console.error('❌ Railway environment validation failed');
    return false;
  }
};

// Auto-run validation on Railway
if (window.location.hostname.includes('railway.app')) {
  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(validateRailwayEnvironment, 500);
    });
  } else {
    setTimeout(validateRailwayEnvironment, 500);
  }
}

export default validateRailwayEnvironment;
