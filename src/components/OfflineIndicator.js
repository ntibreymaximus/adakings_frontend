import React, { useState, useEffect } from 'react';
import { isAppOffline } from '../utils/serviceWorkerRegistration';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(isAppOffline());
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showToast) {
    return null;
  }

  return (
    <>
      {/* Persistent offline banner */}
      {isOffline && (
        <div className="offline-banner">
          <div className="offline-banner-content">
            <i className="bi bi-wifi-off me-2"></i>
            <span>You're currently offline. Some features may be limited.</span>
          </div>
        </div>
      )}

      {/* Connection status toast */}
      {showToast && (
        <div className={`connection-toast ${isOffline ? 'offline' : 'online'}`}>
          <div className="toast-content">
            <i className={`bi ${isOffline ? 'bi-wifi-off' : 'bi-wifi'} me-2`}></i>
            <span>
              {isOffline 
                ? 'Connection lost. Working offline.' 
                : 'Connection restored. Back online!'
              }
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;
