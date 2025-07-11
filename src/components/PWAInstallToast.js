/**
 * PWA Install Toast Component
 * Ultra-minimal toast-style install prompt
 */
import React, { useState, useEffect } from 'react';
import { usePWA } from '../contexts/PWAContext';
import './PWAInstallToast.css';

const PWAInstallToast = () => {
  const { 
    isInstallable, 
    installPWA, 
    deferredPrompt, 
    isPWA,
    isMobile 
  } = usePWA();
  
  const [showToast, setShowToast] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if toast was previously dismissed
  useEffect(() => {
    const dismissedTimestamp = localStorage.getItem('pwa-toast-dismissed');
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    if (dismissedTimestamp && parseInt(dismissedTimestamp) > oneDayAgo) {
      setDismissed(true);
    }
  }, []);

  // Show toast when conditions are met
  useEffect(() => {
    const isMobileView = window.innerWidth <= 768;
    
    if (isInstallable && deferredPrompt && !isPWA && !dismissed && (isMobile || isMobileView)) {
      const timer = setTimeout(() => {
        setShowToast(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isInstallable, deferredPrompt, isPWA, dismissed, isMobile]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    setInstalling(true);
    
    try {
      const success = await installPWA();
      if (success) {
        setShowToast(false);
      }
    } catch (error) {
      console.error('Install error:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
    setDismissed(true);
    localStorage.setItem('pwa-toast-dismissed', Date.now().toString());
  };

  if (!showToast) {
    return null;
  }

  return (
    <div className={`pwa-toast ${showToast ? 'show' : ''}`}>
      <div className="pwa-toast-icon">
        <i className="bi bi-app-indicator"></i>
      </div>
      
      <div className="pwa-toast-content">
        <span className="pwa-toast-title">Install ADARESMANSYS</span>
        <span className="pwa-toast-subtitle">Add to home screen</span>
      </div>
      
      <button
        className="pwa-toast-btn"
        onClick={handleInstall}
        disabled={installing}
      >
        {installing ? (
          <span className="pwa-toast-spinner"></span>
        ) : (
          'Install'
        )}
      </button>
      
      <button
        className="pwa-toast-close"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <i className="bi bi-x"></i>
      </button>
    </div>
  );
};

export default PWAInstallToast;
