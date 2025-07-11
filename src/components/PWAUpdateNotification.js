/**
 * PWA Update Notification Component
 * Displays update notifications and reload prompts when a new service worker becomes available
 */
import React, { useState, useEffect } from 'react';
import { usePWA } from '../contexts/PWAContext';
import './PWAUpdateNotification.css';

const PWAUpdateNotification = () => {
  const { isPWA } = usePWA();
  
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [updateSize, setUpdateSize] = useState(null);
  const [slideIn, setSlideIn] = useState(false);

  // Listen for service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        // Listen for waiting service worker
        if (reg.waiting) {
          setUpdateAvailable(true);
          showUpdatePrompt();
        }
        
        // Listen for new service worker installing
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker available');
                setUpdateAvailable(true);
                showUpdatePrompt();
                
                // Try to get update size (if available)
                estimateUpdateSize();
              }
            });
          }
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data || {};
        
        switch (type) {
          case 'UPDATE_AVAILABLE':
            setUpdateAvailable(true);
            showUpdatePrompt();
            break;
            
          case 'UPDATE_APPLIED':
            setUpdateResult('success');
            setIsUpdating(false);
            
            // Auto-reload after successful update
            setTimeout(() => {
              window.location.reload();
            }, 1500);
            break;
            
          case 'UPDATE_ERROR':
            setUpdateResult('error');
            setIsUpdating(false);
            console.error('Service worker update failed:', data);
            break;
            
          default:
            break;
        }
      });
    }
  }, []);

  // Show update prompt with animation
  const showUpdatePrompt = () => {
    setShowNotification(true);
    setTimeout(() => setSlideIn(true), 100);
    
    // Track update prompt shown
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_update_prompt_shown', {
        event_category: 'PWA',
        event_label: 'Update Available'
      });
    }
  };

  // Estimate update size
  const estimateUpdateSize = async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = Math.round(estimate.usage / (1024 * 1024) * 100) / 100;
        setUpdateSize(usedMB);
      }
    } catch (error) {
      console.warn('Could not estimate update size:', error);
    }
  };

  // Handle update installation
  const handleUpdate = async () => {
    if (!registration || !registration.waiting) {
      console.error('No waiting service worker available');
      return;
    }
    
    setIsUpdating(true);
    setUpdateResult(null);
    
    try {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Track update acceptance
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_update_accepted', {
          event_category: 'PWA',
          event_label: 'Update Accepted'
        });
      }
      
      // Wait for the new service worker to take control
      const handleControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        console.log('New service worker took control');
        
        setUpdateResult('success');
        
        // Reload the page to get fresh content
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      };
      
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      
      // Set a timeout in case controllerchange doesn't fire
      setTimeout(() => {
        if (isUpdating) {
          console.log('Update timeout, forcing reload');
          window.location.reload();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error during service worker update:', error);
      setUpdateResult('error');
      setIsUpdating(false);
    }
  };

  // Handle dismissing the notification
  const handleDismiss = () => {
    setSlideIn(false);
    setTimeout(() => {
      setShowNotification(false);
      setUpdateAvailable(false);
    }, 300);
    
    // Track dismissal
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_update_dismissed', {
        event_category: 'PWA',
        event_label: 'Update Dismissed'
      });
    }
  };

  // Handle remind later
  const handleRemindLater = () => {
    handleDismiss();
    
    // Show reminder after 30 minutes
    setTimeout(() => {
      if (updateAvailable) {
        showUpdatePrompt();
      }
    }, 30 * 60 * 1000);
  };

  // Don't render if no update available or notification hidden
  if (!updateAvailable || !showNotification) {
    return null;
  }

  return (
    <div className={`pwa-update-notification ${slideIn ? 'slide-in' : ''}`}>
      <div className="pwa-update-content">
        {/* Header */}
        <div className="pwa-update-header">
          <div className="update-icon">
            {isUpdating ? (
              <div className="update-spinner"></div>
            ) : updateResult === 'success' ? (
              '✅'
            ) : updateResult === 'error' ? (
              '⚠️'
            ) : (
              '🔄'
            )}
          </div>
          
          <div className="update-info">
            <h4>
              {isUpdating 
                ? 'Updating App...' 
                : updateResult === 'success' 
                  ? 'Update Complete!' 
                  : updateResult === 'error'
                    ? 'Update Failed'
                    : 'App Update Available'
              }
            </h4>
            <p>
              {isUpdating 
                ? 'Please wait while we update the app'
                : updateResult === 'success' 
                  ? 'The app will reload automatically'
                  : updateResult === 'error'
                    ? 'Please try again or reload manually'
                    : 'A new version of ADARESMANSYS is ready'
              }
            </p>
          </div>
          
          {!isUpdating && !updateResult && (
            <button 
              className="close-btn"
              onClick={handleDismiss}
              aria-label="Close update notification"
            >
              ×
            </button>
          )}
        </div>

        {/* Update details */}
        {!isUpdating && !updateResult && (
          <div className="pwa-update-details">
            <div className="update-features">
              <div className="feature">
                <span className="feature-icon">🚀</span>
                <span>Performance improvements</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🐛</span>
                <span>Bug fixes</span>
              </div>
              <div className="feature">
                <span className="feature-icon">✨</span>
                <span>New features</span>
              </div>
            </div>
            
            {updateSize && (
              <div className="update-size">
                <small>Update size: ~{updateSize} MB</small>
              </div>
            )}
          </div>
        )}

        {/* Progress bar for updating */}
        {isUpdating && (
          <div className="pwa-update-progress">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <small>Downloading and installing updates...</small>
          </div>
        )}

        {/* Actions */}
        {!isUpdating && !updateResult && (
          <div className="pwa-update-actions">
            <button
              className="btn-update-now"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              <span className="update-btn-icon">⬇️</span>
              Update Now
            </button>
            
            <button
              className="btn-remind-later"
              onClick={handleRemindLater}
              disabled={isUpdating}
            >
              Remind Later
            </button>
          </div>
        )}

        {/* Network status warning */}
        {!navigator.onLine && (
          <div className="pwa-update-warning">
            <span className="warning-icon">📶</span>
            <small>You're offline. Update will be applied when back online.</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAUpdateNotification;
