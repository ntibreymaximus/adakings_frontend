// Enhanced Offline Status Component
// Shows detailed offline status including sync operations and cache information

import React from 'react';
import useOffline from '../hooks/useOffline';
import './OfflineStatus.css';

const OfflineStatus = ({ showDetails = false, className = '' }) => {
  const {
    isOnline,
    hasOfflineSupport,
    syncStatus,
    cacheStats,
    forceSyncAll,
    getOfflineCapabilities
  } = useOffline();

  if (isOnline && !showDetails) {
    return null; // Don't show anything when online unless details are requested
  }

  const handleSyncNow = async () => {
    if (isOnline) {
      try {
        await forceSyncAll();
      } catch (error) {
        console.error('Failed to sync:', error);
      }
    }
  };

  const capabilities = getOfflineCapabilities();

  return (
    <div className={`offline-status ${className}`}>
      {/* Connection Status */}
      <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
        <div className="status-indicator">
          <i className={`bi ${isOnline ? 'bi-wifi' : 'bi-wifi-off'}`}></i>
          <span className="status-text">
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>
        
        {!isOnline && (
          <div className="offline-message">
            <small>
              {hasOfflineSupport 
                ? 'Some features available offline' 
                : 'Limited functionality while offline'}
            </small>
          </div>
        )}
      </div>

      {/* Sync Status */}
      {syncStatus && (syncStatus.pendingOperations > 0 || !isOnline) && (
        <div className="sync-status">
          <div className="sync-header">
            <i className="bi bi-arrow-repeat"></i>
            <span>Background Sync</span>
            {syncStatus.syncInProgress && (
              <div className="sync-spinner">
                <i className="bi bi-arrow-clockwise rotating"></i>
              </div>
            )}
          </div>
          
          <div className="sync-details">
            {syncStatus.pendingOperations > 0 && (
              <div className="pending-operations">
                <span className="badge bg-warning">
                  {syncStatus.pendingOperations} pending
                </span>
                {isOnline && (
                  <button 
                    className="btn btn-sm btn-outline-primary ms-2"
                    onClick={handleSyncNow}
                    disabled={syncStatus.syncInProgress}
                  >
                    Sync Now
                  </button>
                )}
              </div>
            )}
            
            {syncStatus.retryOperations > 0 && (
              <div className="retry-operations">
                <small className="text-warning">
                  {syncStatus.retryOperations} operations retrying
                </small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cache Information */}
      {showDetails && cacheStats && (
        <div className="cache-status">
          <div className="cache-header">
            <i className="bi bi-hdd"></i>
            <span>Cache Status</span>
          </div>
          
          <div className="cache-details">
            <div className="cache-stat">
              <span className="stat-label">Cached Items:</span>
              <span className="stat-value">{cacheStats.totalEntries}</span>
            </div>
            
            <div className="cache-stat">
              <span className="stat-label">Cache Size:</span>
              <span className="stat-value">
                {formatBytes(cacheStats.totalSize)}
              </span>
            </div>
            
            <div className="cache-stat">
              <span className="stat-label">Hit Rate:</span>
              <span className="stat-value">
                {cacheStats.hitRate?.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Offline Capabilities */}
      {showDetails && !isOnline && (
        <div className="offline-capabilities">
          <div className="capabilities-header">
            <i className="bi bi-check-circle"></i>
            <span>Available Offline</span>
          </div>
          
          <div className="capabilities-list">
            {capabilities.supportedRoutes?.map(route => (
              <div key={route} className="capability-item">
                <i className="bi bi-check text-success"></i>
                <span>{getRouteDisplayName(route)}</span>
              </div>
            ))}
          </div>
          
          {capabilities.hasServiceWorker && (
            <div className="service-worker-status">
              <i className="bi bi-gear text-info"></i>
              <small>Service Worker Active</small>
            </div>
          )}
          
          {capabilities.hasBackgroundSync && (
            <div className="background-sync-status">
              <i className="bi bi-arrow-repeat text-info"></i>
              <small>Background Sync Available</small>
            </div>
          )}
        </div>
      )}

      {/* Operation History */}
      {showDetails && syncStatus?.operations && syncStatus.operations.length > 0 && (
        <div className="operation-history">
          <div className="history-header">
            <i className="bi bi-clock-history"></i>
            <span>Recent Operations</span>
          </div>
          
          <div className="operations-list">
            {syncStatus.operations.slice(0, 5).map(operation => (
              <div key={operation.id} className="operation-item">
                <div className="operation-type">
                  <i className={getOperationIcon(operation.type)}></i>
                  <span>{formatOperationType(operation.type)}</span>
                </div>
                
                <div className="operation-status">
                  <span className={`badge ${getStatusBadgeClass(operation.status)}`}>
                    {operation.status}
                  </span>
                  
                  {operation.retryCount > 0 && (
                    <small className="retry-count">
                      (retry {operation.retryCount})
                    </small>
                  )}
                </div>
                
                <div className="operation-time">
                  <small>{formatTimestamp(operation.timestamp)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getRouteDisplayName(route) {
  const routeNames = {
    '/dashboard': 'Dashboard',
    '/view-orders': 'Orders',
    '/view-menu': 'Menu',
    '/view-transactions': 'Transactions',
    '/profile': 'Profile',
    '/create-order': 'Create Order'
  };
  return routeNames[route] || route;
}

function getOperationIcon(type) {
  const icons = {
    'create-order': 'bi-plus-circle',
    'update-order': 'bi-pencil-square',
    'profile-update': 'bi-person-gear',
    'payment': 'bi-credit-card'
  };
  return icons[type] || 'bi-gear';
}

function formatOperationType(type) {
  const typeNames = {
    'create-order': 'Create Order',
    'update-order': 'Update Order',
    'profile-update': 'Update Profile',
    'payment': 'Payment'
  };
  return typeNames[type] || type;
}

function getStatusBadgeClass(status) {
  const classes = {
    'pending': 'bg-secondary',
    'retrying': 'bg-warning',
    'completed': 'bg-success',
    'failed': 'bg-danger'
  };
  return classes[status] || 'bg-secondary';
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export default OfflineStatus;
