/**
 * PWA Status Indicator Component
 * Shows current PWA status and provides installation option
 */
import React, { useState, useEffect } from 'react';
import { usePWA } from '../contexts/PWAContext';
import '../styles/pwa.css'; // Import PWA styles

const PWAStatusIndicator = () => {
  const { 
    isPWA, 
    isInstallable, 
    displayMode, 
    installPWA, 
    deferredPrompt,
    isMobile 
  } = usePWA();
  
  const [installing, setInstalling] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Check if prompt was previously dismissed and show prompt accordingly
  useEffect(() => {
    // Only show on mobile devices or mobile view
    if (!isInstallable || !deferredPrompt || isPWA || (!isMobile && !isMobileView)) {
      return;
    }
    
    const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
    let timer;
    
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      // Show again after 24 hours
      if (hoursSinceDismissed >= 24) {
        localStorage.removeItem('pwa-prompt-dismissed');
        // Add delay before showing to ensure proper rendering
        timer = setTimeout(() => {
          setShowInstallPrompt(true);
          console.log('Showing PWA install prompt after 24h dismissal');
        }, 3000);
      }
    } else {
      // Add delay before showing to ensure proper rendering
      timer = setTimeout(() => {
        setShowInstallPrompt(true);
        console.log('Showing PWA install prompt for first time');
      }, 3000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isInstallable, deferredPrompt, isPWA, isMobile, isMobileView]);

  // Debug logging
  useEffect(() => {
    console.log('PWA Status Debug:', {
      isInstallable,
      deferredPrompt: !!deferredPrompt,
      isPWA,
      showInstallPrompt,
      displayMode,
      shouldShowPrompt: isInstallable && deferredPrompt && !isPWA && showInstallPrompt
    });
  }, [isInstallable, deferredPrompt, isPWA, showInstallPrompt, displayMode]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn('No deferred prompt available');
      return;
    }
    
    setInstalling(true);
    try {
      const success = await installPWA();
      if (success) {
        console.log('PWA installed successfully');
        setShowInstallPrompt(false);
      }
    } catch (error) {
      console.error('Install error:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleClose = () => {
    console.log('Closing PWA install prompt');
    setShowInstallPrompt(false);
    // Remember dismissal for 24 hours
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  const getStatusText = () => {
    if (isPWA) {
      return `PWA (${displayMode})`;
    }
    if (isInstallable) {
      return 'Installable';
    }
    return 'Web App';
  };

  const getStatusColor = () => {
    if (isPWA) return 'success';
    if (isInstallable) return 'warning';
    return 'secondary';
  };

  // Determine what to show
  const showStatusIndicator = displayMode !== 'browser' || isInstallable;
  const showPrompt = isInstallable && deferredPrompt && !isPWA && showInstallPrompt && (isMobile || isMobileView);

  return null; // Component disabled - both status indicator and install prompt removed
};

export default PWAStatusIndicator;
