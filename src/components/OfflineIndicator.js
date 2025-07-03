import React from 'react';
import { useOfflineHandler } from '../utils/offlineHandler';

const OfflineIndicator = ({ className = '' }) => {
  const { isOnline } = useOfflineHandler();

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <div className={`pwa-offline-indicator ${className}`}>
      <div className="pwa-offline-badge">
        <i className="bi bi-wifi-off"></i>
        <span>Offline</span>
      </div>
    </div>
  );
};

export default OfflineIndicator;
