import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [isPWA, setIsPWA] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if app is running in PWA mode
    const checkPWAMode = () => {
      // Method 1: Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // Method 2: Check if launched from home screen (iOS)
      const isIOSStandalone = window.navigator.standalone === true;
      
      // Method 3: Check URL parameters (fallback)
      const urlParams = new URLSearchParams(window.location.search);
      const isUrlPWA = urlParams.get('pwa') === 'true';
      
      // Method 5: Development test mode
      const isTestMode = urlParams.get('test-pwa') === 'true';
      
      // Method 4: Check document referrer (Android)
      const isAndroidPWA = document.referrer.includes('android-app://');
      
      return isStandalone || isIOSStandalone || isUrlPWA || isAndroidPWA || isTestMode;
    };

    setIsPWA(checkPWAMode());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      // Force PWA mode after installation
      setIsPWA(true);
    };

    // Listen for display mode changes
    const handleDisplayModeChange = (e) => {
      setIsPWA(e.matches);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  return {
    isPWA,
    isInstallable,
    installPWA
  };
};

export default usePWA;
