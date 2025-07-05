/**
 * PWA Manager Component
 * Provides cleanup and manual service worker uninstallation functionality
 */
import React, { useState, useEffect } from 'react';
import { usePWA } from '../contexts/PWAContext';
import './PWAManager.css';

const PWAManager = ({ isVisible, onClose }) => {
  const { isPWA, isInstalled } = usePWA();
  
  const [cacheStatus, setCacheStatus] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [operationResult, setOperationResult] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);

  // Load initial data when component becomes visible
  useEffect(() => {
    if (isVisible) {
      loadPWAStatus();
    }
  }, [isVisible]);

  // Load PWA status information
  const loadPWAStatus = async () => {
    try {
      // Get cache status
      await getCacheStatus();
      
      // Get storage information
      await getStorageInfo();
      
      // Get service worker registrations
      await getServiceWorkerRegistrations();
      
    } catch (error) {
      console.error('Error loading PWA status:', error);
    }
  };

  // Get cache status from service worker
  const getCacheStatus = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.active) {
          // Create a message channel to get response
          const messageChannel = new MessageChannel();
          
          return new Promise((resolve) => {
            messageChannel.port1.onmessage = (event) => {
              if (event.data.type === 'CACHE_STATUS') {
                setCacheStatus(event.data.data);
                resolve();
              }
            };
            
            registration.active.postMessage(
              { type: 'GET_CACHE_STATUS' },
              [messageChannel.port2]
            );
            
            // Timeout after 5 seconds
            setTimeout(() => {
              setCacheStatus({ error: 'Timeout getting cache status' });
              resolve();
            }, 5000);
          });
        }
      }
    } catch (error) {
      console.error('Error getting cache status:', error);
      setCacheStatus({ error: error.message });
    }
  };

  // Get storage information
  const getStorageInfo = async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        
        setStorageInfo({
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage,
          usageDetails: estimate.usageDetails || {}
        });
      }
    } catch (error) {
      console.error('Error getting storage info:', error);
      setStorageInfo({ error: error.message });
    }
  };

  // Get service worker registrations
  const getServiceWorkerRegistrations = async () => {
    try {
      if ('serviceWorker' in navigator && 'getRegistrations' in navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        setRegistrations(regs.map((reg, index) => ({
          id: index,
          scope: reg.scope,
          active: !!reg.active,
          waiting: !!reg.waiting,
          installing: !!reg.installing,
          updateViaCache: reg.updateViaCache,
          registration: reg
        })));
      }
    } catch (error) {
      console.error('Error getting registrations:', error);
      setRegistrations([]);
    }
  };

  // Clear all caches
  const clearAllCaches = async () => {
    setIsClearing(true);
    setOperationResult(null);
    setSelectedAction('clear_cache');
    
    try {
      // Clear via service worker first
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          registration.active.postMessage({ type: 'CLEAR_CACHE' });
        }
      }
      
      // Also clear directly via Cache API
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Clear localStorage items related to PWA
      const pwaKeys = Object.keys(localStorage).filter(key => 
        key.includes('pwa') || 
        key.includes('cache') || 
        key.includes('sw') ||
        key.includes('install')
      );
      
      pwaKeys.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage as well
      const sessionKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('pwa') || 
        key.includes('cache') || 
        key.includes('sw')
      );
      
      sessionKeys.forEach(key => sessionStorage.removeItem(key));
      
      setOperationResult({
        type: 'success',
        message: `Successfully cleared ${cacheNames.length} caches and ${pwaKeys.length + sessionKeys.length} storage items.`
      });
      
      // Reload status
      setTimeout(() => {
        loadPWAStatus();
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing caches:', error);
      setOperationResult({
        type: 'error',
        message: `Failed to clear caches: ${error.message}`
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Uninstall service worker
  const uninstallServiceWorker = async () => {
    setIsUninstalling(true);
    setOperationResult(null);
    setSelectedAction('uninstall_sw');
    
    try {
      let unregisteredCount = 0;
      
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        for (const registration of registrations) {
          const success = await registration.unregister();
          if (success) {
            unregisteredCount++;
          }
        }
      }
      
      setOperationResult({
        type: 'success',
        message: `Successfully uninstalled ${unregisteredCount} service worker(s). Please refresh the page.`
      });
      
      // Reload status
      setTimeout(() => {
        loadPWAStatus();
      }, 1000);
      
    } catch (error) {
      console.error('Error uninstalling service worker:', error);
      setOperationResult({
        type: 'error',
        message: `Failed to uninstall service worker: ${error.message}`
      });
    } finally {
      setIsUninstalling(false);
    }
  };

  // Reset PWA completely
  const resetPWA = async () => {
    setSelectedAction('reset_pwa');
    setOperationResult(null);
    
    try {
      // Clear caches first
      await clearAllCaches();
      
      // Then uninstall service worker
      await uninstallServiceWorker();
      
      setOperationResult({
        type: 'success',
        message: 'PWA has been completely reset. The page will reload in 3 seconds.'
      });
      
      // Reload page after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Error resetting PWA:', error);
      setOperationResult({
        type: 'error',
        message: `Failed to reset PWA: ${error.message}`
      });
    }
  };

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate cache usage percentage
  const getCacheUsagePercentage = () => {
    if (!storageInfo || !storageInfo.quota) return 0;
    return Math.round((storageInfo.usage / storageInfo.quota) * 100);
  };

  if (!isVisible) return null;

  return (
    <div className="pwa-manager-overlay">
      <div className="pwa-manager-modal">
        <div className="pwa-manager-header">
          <h3>PWA Management</h3>
          <button 
            className="close-btn"
            onClick={onClose}
            aria-label="Close PWA manager"
          >
            ×
          </button>
        </div>

        <div className="pwa-manager-content">
          {/* Status Overview */}
          <div className="status-section">
            <h4>Status Overview</h4>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">PWA Mode:</span>
                <span className={`status-value ${isPWA ? 'active' : 'inactive'}`}>
                  {isPWA ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Installed:</span>
                <span className={`status-value ${isInstalled ? 'active' : 'inactive'}`}>
                  {isInstalled ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Service Workers:</span>
                <span className="status-value">
                  {registrations.length} registered
                </span>
              </div>
            </div>
          </div>

          {/* Storage Information */}
          {storageInfo && !storageInfo.error && (
            <div className="storage-section">
              <h4>Storage Usage</h4>
              <div className="storage-info">
                <div className="storage-bar">
                  <div 
                    className="storage-used"
                    style={{ width: `${getCacheUsagePercentage()}%` }}
                  ></div>
                </div>
                <div className="storage-details">
                  <div className="storage-item">
                    <span>Used: {formatBytes(storageInfo.usage)}</span>
                  </div>
                  <div className="storage-item">
                    <span>Available: {formatBytes(storageInfo.available)}</span>
                  </div>
                  <div className="storage-item">
                    <span>Total: {formatBytes(storageInfo.quota)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cache Status */}
          {cacheStatus && !cacheStatus.error && (
            <div className="cache-section">
              <h4>Cache Information</h4>
              <div className="cache-list">
                {Object.entries(cacheStatus.caches || {}).map(([cacheName, info]) => (
                  <div key={cacheName} className="cache-item">
                    <div className="cache-name">{cacheName}</div>
                    <div className="cache-details">
                      {info.entryCount} entries
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Worker Registrations */}
          {registrations.length > 0 && (
            <div className="sw-section">
              <h4>Service Worker Registrations</h4>
              <div className="sw-list">
                {registrations.map((reg) => (
                  <div key={reg.id} className="sw-item">
                    <div className="sw-scope">{reg.scope}</div>
                    <div className="sw-status">
                      {reg.active && <span className="sw-badge active">Active</span>}
                      {reg.waiting && <span className="sw-badge waiting">Waiting</span>}
                      {reg.installing && <span className="sw-badge installing">Installing</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="actions-section">
            <h4>Actions</h4>
            <div className="action-buttons">
              <button
                className="action-btn clear-cache"
                onClick={clearAllCaches}
                disabled={isClearing || isUninstalling}
              >
                {isClearing && selectedAction === 'clear_cache' ? (
                  <>
                    <span className="spinner"></span>
                    Clearing...
                  </>
                ) : (
                  <>
                    🗑️ Clear All Caches
                  </>
                )}
              </button>

              <button
                className="action-btn uninstall-sw"
                onClick={uninstallServiceWorker}
                disabled={isClearing || isUninstalling}
              >
                {isUninstalling && selectedAction === 'uninstall_sw' ? (
                  <>
                    <span className="spinner"></span>
                    Uninstalling...
                  </>
                ) : (
                  <>
                    ⚙️ Uninstall Service Worker
                  </>
                )}
              </button>

              <button
                className="action-btn reset-pwa danger"
                onClick={resetPWA}
                disabled={isClearing || isUninstalling}
              >
                {selectedAction === 'reset_pwa' ? (
                  <>
                    <span className="spinner"></span>
                    Resetting...
                  </>
                ) : (
                  <>
                    🔄 Complete Reset
                  </>
                )}
              </button>
            </div>

            <div className="action-descriptions">
              <small>
                <strong>Clear Caches:</strong> Removes all cached data but keeps service worker active.<br/>
                <strong>Uninstall Service Worker:</strong> Removes service worker registration.<br/>
                <strong>Complete Reset:</strong> Clears everything and reloads the page.
              </small>
            </div>
          </div>

          {/* Operation Result */}
          {operationResult && (
            <div className={`operation-result ${operationResult.type}`}>
              <div className="result-icon">
                {operationResult.type === 'success' ? '✅' : '⚠️'}
              </div>
              <div className="result-message">
                {operationResult.message}
              </div>
            </div>
          )}

          {/* Error Messages */}
          {(cacheStatus?.error || storageInfo?.error) && (
            <div className="error-section">
              <h4>Errors</h4>
              {cacheStatus?.error && (
                <div className="error-item">
                  Cache Status: {cacheStatus.error}
                </div>
              )}
              {storageInfo?.error && (
                <div className="error-item">
                  Storage Info: {storageInfo.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAManager;
