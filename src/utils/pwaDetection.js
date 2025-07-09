/**
 * PWA Detection Utility
 * Provides functions to detect if the app is running as a Progressive Web App
 */

/**
 * Checks if the app is running in PWA mode based on display mode
 * PWA mode is ONLY when the app is actually installed and running in standalone mode
 * This ensures clear separation: PWA ≠ Mobile Web ≠ Desktop Web
 * @returns {boolean} True if running as PWA, false otherwise
 */
export const isPWAMode = () => {
  // STRICT PWA detection - only return true for actual PWA standalone mode
  // This ensures PWA does not interfere with web and mobile views
  
  // Primary check: running in standalone mode (installed PWA)
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Secondary check: running in fullscreen mode (some PWA implementations)
  if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }
  
  // iOS Safari PWA check
  if (window.navigator && window.navigator.standalone) {
    return true;
  }
  
  // For all other cases (including mobile web browsers), return false
  // This ensures mobile web view is treated as web, not PWA
  return false;
};

/**
 * Checks if the app is installed as a PWA
 * @returns {boolean} True if installed, false otherwise
 */
export const isPWAInstalled = () => {
  // Check if running in standalone mode
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // iOS Safari check
  if (window.navigator && window.navigator.standalone) {
    return true;
  }
  
  return false;
};

/**
 * Checks if the app can be installed as a PWA
 * @returns {boolean} True if installable, false otherwise
 */
export const isPWAInstallable = () => {
  // Check if beforeinstallprompt event is available
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Gets the current display mode
 * @returns {string} The current display mode
 */
export const getDisplayMode = () => {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  
  if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  
  if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  
  return 'browser';
};

/**
 * Checks if the device is mobile
 * @returns {boolean} True if mobile device, false otherwise
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Checks if the app should show mobile-optimized UI
 * This is separate from PWA mode - mobile web browsers should show mobile UI
 * @returns {boolean} True if should show mobile UI, false otherwise
 */
export const shouldShowMobileUI = () => {
  // Show mobile UI for mobile devices with narrow screens
  // This is independent of PWA mode - mobile web browsers get mobile UI
  return isMobileDevice() && window.innerWidth < 768;
};

/**
 * Checks if the current view is mobile web (not PWA)
 * @returns {boolean} True if mobile web browser, false otherwise
 */
export const isMobileWeb = () => {
  return isMobileDevice() && !isPWAMode();
};

/**
 * Checks if the current view is desktop web (not PWA)
 * @returns {boolean} True if desktop web browser, false otherwise
 */
export const isDesktopWeb = () => {
  return !isMobileDevice() && !isPWAMode();
};

/**
 * Listens for display mode changes
 * @param {Function} callback - Callback function to execute when display mode changes
 * @returns {Function} Cleanup function to remove the listener
 */
export const onDisplayModeChange = (callback) => {
  const mediaQueryList = window.matchMedia('(display-mode: standalone)');
  const handler = (e) => {
    callback(e.matches);
  };
  
  mediaQueryList.addEventListener('change', handler);
  
  // Return cleanup function
  return () => {
    mediaQueryList.removeEventListener('change', handler);
  };
};

/**
 * Logs PWA detection information to console (for debugging)
 */
export const logPWAInfo = () => {
  console.log('PWA Detection Info:', {
    // Core PWA Detection
    isPWAMode: isPWAMode(),
    isPWAInstalled: isPWAInstalled(),
    isPWAInstallable: isPWAInstallable(),
    displayMode: getDisplayMode(),
    
    // Device Detection
    isMobileDevice: isMobileDevice(),
    shouldShowMobileUI: shouldShowMobileUI(),
    
    // View Type Detection
    isMobileWeb: isMobileWeb(),
    isDesktopWeb: isDesktopWeb(),
    
    // Technical Info
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    standalone: window.navigator?.standalone,
    
    // Environment Info
    environment: process.env.REACT_APP_ENVIRONMENT || 'unknown',
    debugMode: process.env.REACT_APP_DEBUG_MODE || 'false'
  });
};
