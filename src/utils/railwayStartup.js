// Railway-specific startup and configuration script
// This script runs on Railway to configure and debug the app

import { diagnoseApiIssues } from './apiDebugger';

export const initializeRailwayApp = async () => {
  console.log('🚂 Railway App Initialization Started');
  
  // Check Railway environment variables
  const backendUrl = process.env.REACT_APP_BACKEND_BASE_URL;
  const apiUrl = process.env.REACT_APP_API_BASE_URL;
  
  console.log('🔗 Railway Environment Variables:');
  console.log(`  - REACT_APP_BACKEND_BASE_URL: ${backendUrl || 'NOT SET'}`);
  console.log(`  - REACT_APP_API_BASE_URL: ${apiUrl || 'NOT SET'}`);
  console.log(`  - REACT_APP_ENVIRONMENT: ${process.env.REACT_APP_ENVIRONMENT || 'NOT SET'}`);
  
  // Set Railway-specific configurations
  window.RAILWAY_ENVIRONMENT = true;
  window.BACKEND_URL = backendUrl || 'Railway backend URL not configured';
  
  if (!backendUrl && !apiUrl) {
    console.error('❌ WARNING: No Railway environment variables detected!');
    console.error('Make sure REACT_APP_BACKEND_BASE_URL or REACT_APP_API_BASE_URL is set in Railway dashboard');
  }
  
  // Disable service worker on Railway due to MIME type issues
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      console.log('🔧 Unregistering service worker for Railway deployment');
      await registration.unregister();
    }
  }
  
  // Configure localStorage defaults for Railway
  if (!localStorage.getItem('railway-configured')) {
    localStorage.setItem('railway-configured', 'true');
    if (process.env.REACT_APP_API_BASE_URL) {
      localStorage.setItem('api-base-url', process.env.REACT_APP_API_BASE_URL);
    }
    if (process.env.REACT_APP_BACKEND_BASE_URL) {
      localStorage.setItem('backend-base-url', process.env.REACT_APP_BACKEND_BASE_URL);
    }
    console.log('✅ Railway localStorage configured');
  }
  
  // Run API diagnostics
  setTimeout(() => {
    diagnoseApiIssues();
  }, 1000);
  
  console.log('✅ Railway App Initialization Complete');
};

// Check if we're on Railway and initialize
if (window.location.hostname.includes('railway.app')) {
  document.addEventListener('DOMContentLoaded', () => {
    initializeRailwayApp();
  });
  
  // Also run if DOM is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRailwayApp);
  } else {
    initializeRailwayApp();
  }
}

export default { initializeRailwayApp };
