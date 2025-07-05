/**
 * PWA Detection Utility
 * Provides functions to detect if the app is running as a Progressive Web App
 */

/**
 * Checks if the app is running in PWA mode based on display mode
 * @returns {boolean} True if running as PWA, false otherwise
 */
export const isPWAMode = () => {
  // Check if running in standalone mode (primary PWA indicator)
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check if running in fullscreen mode
  if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }
  
  // Check if running in minimal-ui mode
  if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) {
    return true;
  }
  
  // Fallback: Check for navigator.standalone (iOS Safari)
  if (window.navigator && window.navigator.standalone) {
    return true;
  }
  
  // Additional check: Window location doesn't have browser UI
  if (window.location.protocol === 'https:' && 
      window.outerHeight - window.innerHeight < 100 && 
      window.outerWidth - window.innerWidth < 100) {
    return true;
  }
  
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
 * @returns {boolean} True if should show mobile UI, false otherwise
 */
export const shouldShowMobileUI = () => {
  return isPWAMode() || (isMobileDevice() && window.innerWidth < 768);
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
    isPWAMode: isPWAMode(),
    isPWAInstalled: isPWAInstalled(),
    isPWAInstallable: isPWAInstallable(),
    displayMode: getDisplayMode(),
    isMobileDevice: isMobileDevice(),
    shouldShowMobileUI: shouldShowMobileUI(),
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    standalone: window.navigator?.standalone
  });
};
