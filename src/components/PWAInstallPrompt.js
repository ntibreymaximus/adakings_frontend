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
    if (isInstallable && deferredPrompt && !isPWA && !dismissed) {
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
    <>
      {/* Backdrop */}
      <div 
        className={`pwa-install-backdrop ${slideUp ? 'show' : ''}`}
        onClick={handleDismiss}
      />
      
      {/* Install Prompt Modal */}
      <div className={`pwa-install-prompt ${slideUp ? 'slide-up' : ''}`}>
        <div className="pwa-install-content">
          {/* Header */}
          <div className="pwa-install-header">
            <div className="app-icon">
              <img 
                src="/logo192.png" 
                alt="AdaKings" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="app-icon-fallback">🍽️</div>
            </div>
            
            <div className="app-info">
              <h3>Install AdaKings</h3>
              <p>Restaurant Management System</p>
            </div>
            
            <button 
              className="close-btn"
              onClick={handleDismiss}
              aria-label="Close install prompt"
            >
              ×
            </button>
          </div>

          {/* Features */}
          <div className="pwa-install-features">
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Fast & Reliable</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📱</span>
              <span>Works Offline</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔄</span>
              <span>Auto Sync</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🏠</span>
              <span>Home Screen Access</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="pwa-install-benefits">
            <h4>Why install?</h4>
            <ul>
              <li>
                <span className="benefit-icon">🚀</span>
                Instant access from your home screen
              </li>
              <li>
                <span className="benefit-icon">💨</span>
                Faster loading times
              </li>
              <li>
                <span className="benefit-icon">📶</span>
                Works even when you're offline
              </li>
              <li>
                <span className="benefit-icon">🔔</span>
                Get important notifications
              </li>
            </ul>
          </div>

          {/* Device-specific instructions */}
          {isMobile && (
            <div className="pwa-install-instructions">
              <small>
                Installing gives you a native app experience with faster performance and offline access.
              </small>
            </div>
          )}

          {/* Actions */}
          <div className="pwa-install-actions">
            <button
              className="btn-install"
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? (
                <>
                  <span className="spinner"></span>
                  Installing...
                </>
              ) : (
                <>
                  <span className="install-icon">⬇️</span>
                  Install App
                </>
              )}
            </button>
            
            <button
              className="btn-later"
              onClick={handleLater}
              disabled={installing}
            >
              Maybe Later
            </button>
          </div>

          {/* Result Messages */}
          {installResult === 'error' && (
            <div className="pwa-install-result error">
              <span className="result-icon">⚠️</span>
              Installation failed. Please try again.
            </div>
          )}
          
          {installResult === 'dismissed' && (
            <div className="pwa-install-result info">
              <span className="result-icon">ℹ️</span>
              Installation was cancelled.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PWAInstallPrompt;
