/**
 * PWA Context
 * Manages PWA mode state and provides PWA-related functionality across the app
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  isPWAMode, 
  isPWAInstalled, 
  isPWAInstallable, 
  getDisplayMode, 
  isMobileDevice, 
  shouldShowMobileUI, 
  onDisplayModeChange,
  logPWAInfo 
} from '../utils/pwaDetection';

const PWAContext = createContext();

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export const PWAProvider = ({ children }) => {
  // PWA state
  const [isPWA, setIsPWA] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [displayMode, setDisplayMode] = useState('browser');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileUI, setShowMobileUI] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Update PWA state
  const updatePWAState = useCallback(() => {
    const pwaMode = isPWAMode();
    const installed = isPWAInstalled();
    const installable = isPWAInstallable();
    const mode = getDisplayMode();
    const mobile = isMobileDevice();
    const mobileUI = shouldShowMobileUI();

    setIsPWA(pwaMode);
    setIsInstalled(installed);
    setIsInstallable(installable);
    setDisplayMode(mode);
    setIsMobile(mobile);
    setShowMobileUI(mobileUI);

    // Log PWA info in development
    if (process.env.NODE_ENV === 'development') {
      logPWAInfo();
    }
  }, []);

  // Initialize PWA state
  useEffect(() => {
    updatePWAState();
  }, [updatePWAState]);

  // Listen for display mode changes
  useEffect(() => {
    const cleanup = onDisplayModeChange((isStandalone) => {
      console.log('Display mode changed to:', isStandalone ? 'standalone' : 'browser');
      updatePWAState();
    });

    return cleanup;
  }, [updatePWAState]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('PWA install prompt available');
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setDeferredPrompt(null);
      setIsInstalled(true);
      updatePWAState();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [updatePWAState]);

  // Listen for window resize to update mobile UI state
  useEffect(() => {
    const handleResize = () => {
      setShowMobileUI(shouldShowMobileUI());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Install PWA function
  const installPWA = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return false;
    }

    try {
      const result = await deferredPrompt.prompt();
      console.log('Install prompt result:', result);
      
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setDeferredPrompt(null);
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Check if should show PWA-specific components
  const shouldShowPWAComponents = useCallback(() => {
    return isPWA || showMobileUI;
  }, [isPWA, showMobileUI]);

  // Check if should show bottom navigation
  const shouldShowBottomNav = useCallback(() => {
    return isPWA || (isMobile && window.innerWidth < 768);
  }, [isPWA, isMobile]);

  // Check if should hide standard navbar
  const shouldHideStandardNav = useCallback(() => {
    return isPWA && isMobile;
  }, [isPWA, isMobile]);

  // Get PWA-specific routes
  const getPWARoutes = useCallback(() => {
    if (!isPWA) return [];
    
    return [
      // Add PWA-specific routes here
      // Example: '/pwa-dashboard', '/pwa-settings', etc.
    ];
  }, [isPWA]);

  // Get PWA-specific CSS classes
  const getPWAClasses = useCallback(() => {
    const classes = [];
    
    if (isPWA) classes.push('pwa-mode');
    if (isInstalled) classes.push('pwa-installed');
    if (isMobile) classes.push('mobile-device');
    if (showMobileUI) classes.push('mobile-ui');
    
    classes.push(`display-mode-${displayMode}`);
    
    return classes.join(' ');
  }, [isPWA, isInstalled, isMobile, showMobileUI, displayMode]);

  const value = {
    // State
    isPWA,
    isInstalled,
    isInstallable,
    displayMode,
    isMobile,
    showMobileUI,
    deferredPrompt,

    // Actions
    installPWA,
    updatePWAState,

    // Helpers
    shouldShowPWAComponents,
    shouldShowBottomNav,
    shouldHideStandardNav,
    getPWARoutes,
    getPWAClasses,

    // Utilities (re-exported for convenience)
    logPWAInfo
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};

export default PWAContext;
