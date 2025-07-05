/**
 * PWA Status Indicator Component
 * Shows current PWA status and provides installation option
 */
import React, { useState } from 'react';
import { usePWA } from '../contexts/PWAContext';

const PWAStatusIndicator = () => {
  const { 
    isPWA, 
    isInstallable, 
    displayMode, 
    installPWA, 
    deferredPrompt 
  } = usePWA();
  
  const [installing, setInstalling] = useState(false);

  // Don't show indicator if running in browser mode
  if (displayMode === 'browser' && !isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    setInstalling(true);
    try {
      const success = await installPWA();
      if (success) {
        console.log('PWA installed successfully');
      }
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

  return (
    <>
      {/* Status indicator */}
      <div className={`pwa-status-indicator bg-${getStatusColor()}`}>
        {getStatusText()}
      </div>

      {/* Install prompt */}
      {isInstallable && deferredPrompt && !isPWA && (
        <div className="pwa-install-prompt">
          <div>
            <strong>Install AdaKings</strong>
            <br />
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
              onClick={() => console.log('Install prompt dismissed')}
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
