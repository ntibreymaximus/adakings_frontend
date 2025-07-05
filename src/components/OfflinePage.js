import React from 'react';
import './OfflinePage.css';

const OfflinePage = ({ 
  title = "Content Not Available Offline", 
  message = "This content is not available when you're offline. Please check your connection and try again.",
  showRetry = true,
  onRetry = () => window.location.reload()
}) => {
  return (
    <div className="offline-page">
      <div className="offline-page-container">
        <div className="offline-icon">
          <i className="bi bi-wifi-off"></i>
        </div>
        
        <h2 className="offline-title">{title}</h2>
        
        <p className="offline-message">{message}</p>
        
        <div className="offline-status">
          <i className="bi bi-circle-fill status-indicator offline"></i>
          <span>Currently offline</span>
        </div>
        
        {showRetry && (
          <div className="offline-actions">
            <button 
              className="btn btn-primary retry-button"
              onClick={onRetry}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Try Again
            </button>
          </div>
        )}
        
        <div className="offline-tips">
          <h6>Tips for offline use:</h6>
          <ul>
            <li>Previously viewed data may still be available</li>
            <li>You can still navigate between pages you've visited</li>
            <li>Your changes will sync when you're back online</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Specific offline page variants for different sections
export const OfflineOrdersPage = () => (
  <OfflinePage 
    title="Orders Not Available Offline"
    message="Order data is not available when you're offline. Previously viewed orders may still be accessible."
  />
);

export const OfflineMenuPage = () => (
  <OfflinePage 
    title="Menu Not Available Offline"
    message="Menu data is not available when you're offline. Please check your connection to view the latest menu."
  />
);

export const OfflineTransactionsPage = () => (
  <OfflinePage 
    title="Transactions Not Available Offline"
    message="Transaction data is not available when you're offline. Previously viewed transactions may still be accessible."
  />
);

export const OfflineProfilePage = () => (
  <OfflinePage 
    title="Profile Not Available Offline"
    message="Profile data is not available when you're offline. Your cached profile information may still be visible."
  />
);

export default OfflinePage;
