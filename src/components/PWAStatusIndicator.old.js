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
    deferredPrompt 
  } = usePWA();
  
  const [installing, setInstalling] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  // Check if prompt was previously dismissed and show prompt accordingly
  useEffect(() => {
    if (!isInstallable || !deferredPrompt || isPWA) {
      return;
    }
    
    const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      // Show again after 24 hours
      if (hoursSinceDismissed >= 24) {
        localStorage.removeItem('pwa-prompt-dismissed');
        // Add delay before showing to ensure proper rendering
        const timer = setTimeout(() => {
          setShowInstallPrompt(true);
          console.log('Showing PWA install prompt after 24h dismissal');
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      // Add delay before showing to ensure proper rendering
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
        console.log('Showing PWA install prompt for first time');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, deferredPrompt, isPWA]);

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

  return (
    <>
      {/* Status indicator */}
      <div className={`pwa-status-indicator bg-${getStatusColor()}`}>
        {getStatusText()}
      </div>

      {/* Install prompt */}
      {isInstallable && deferredPrompt && !isPWA && showInstallPrompt && (
        <div className="pwa-install-prompt" key="pwa-prompt">
          <div>
            <strong>Install ADARESMANSYS</strong>
            <small>Get the full app experience!</small>
          </div>
          <div>
            <button 
              className="install-button"
              onClick={handleInstallClick}
              disabled={installing}
            >
              {installing ? 'Installing...' : 'Install'}
            </button>
            <button 
              className="close-button"
              onClick={() => {
                console.log('Closing PWA install prompt');
                setShowInstallPrompt(false);
                // Remember dismissal for 24 hours
                localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAStatusIndicator;
