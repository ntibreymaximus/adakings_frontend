/**
 * PWA Install Prompt Component
 * Custom "Add to Home Screen" experience with beforeinstallprompt event handling
 */
import React, { useState, useEffect } from 'react';
import { usePWA } from '../contexts/PWAContext';
import './PWAInstallPrompt.css';

const PWAInstallPrompt = () => {
  const { 
    isInstallable, 
    installPWA, 
    deferredPrompt, 
    isPWA,
    isMobile 
  } = usePWA();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [slideUp, setSlideUp] = useState(false);

  // Check if install prompt was previously dismissed
  useEffect(() => {
    const dismissedTimestamp = localStorage.getItem('pwa-install-dismissed');
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    // Reset dismissal after 24 hours
    if (dismissedTimestamp && parseInt(dismissedTimestamp) < oneDayAgo) {
      localStorage.removeItem('pwa-install-dismissed');
      setDismissed(false);
    } else if (dismissedTimestamp) {
      setDismissed(true);
    }
  }, []);

  // Show prompt when conditions are met
  useEffect(() => {
    // Enhanced mobile detection
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent);
      const isMobileViewport = window.innerWidth <= 768;
      return isMobileDevice || isMobileViewport;
    };

    if (isInstallable && deferredPrompt && !isPWA && !dismissed && checkIsMobile()) {
      // Delay showing prompt by 3 seconds for better UX
      const timer = setTimeout(() => {
        setShowPrompt(true);
        setTimeout(() => setSlideUp(true), 100);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isInstallable, deferredPrompt, isPWA, dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    setInstalling(true);
    
    try {
      const success = await installPWA();
      
      if (success) {
        setInstallResult('success');
        setShowPrompt(false);
        
        // Track installation
        if (typeof gtag !== 'undefined') {
          gtag('event', 'pwa_install', {
            event_category: 'PWA',
            event_label: 'Install Success'
          });
        }
        
        console.log('PWA installation successful');
      } else {
        setInstallResult('dismissed');
        handleDismiss();
      }
    } catch (error) {
      console.error('PWA installation error:', error);
      setInstallResult('error');
      
      // Auto-hide error after 3 seconds
      setTimeout(() => {
        setShowPrompt(false);
      }, 3000);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setSlideUp(false);
    setTimeout(() => {
      setShowPrompt(false);
      setDismissed(true);
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      
      // Track dismissal
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_install_dismiss', {
          event_category: 'PWA',
          event_label: 'Install Dismissed'
        });
      }
    }, 300);
  };

  const handleLater = () => {
    handleDismiss();
  };

  // Don't render if conditions aren't met
  if (!showPrompt || isPWA || !isInstallable) {
    return null;
  }

  return (
    <div className={`pwa-toast ${slideUp ? 'show' : ''}`}>
      <div className="pwa-toast-body">
        <div className="pwa-toast-icon-wrapper">
          <i className="bi bi-app-indicator"></i>
        </div>
        
        <div className="pwa-toast-text">
          <div className="pwa-toast-title">Add ADARESMANSYS to Home Screen</div>
          <div className="pwa-toast-subtitle">Install for quick access</div>
        </div>
      </div>
      
      <div className="pwa-toast-buttons">
        <button
          className="pwa-btn-install"
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? (
            <div className="pwa-loading"></div>
          ) : (
            'Install'
          )}
        </button>
        
        <button
          className="pwa-btn-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
