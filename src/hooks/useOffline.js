// Enhanced Offline Hook
// Provides comprehensive offline capabilities for React components

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { offlineRoutingService } from '../services/offlineRoutingService';
import { apiCacheService } from '../services/apiCacheService';
import { backgroundSyncService } from '../services/backgroundSyncService';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasOfflineSupport, setHasOfflineSupport] = useState(false);
  const [offlineFallback, setOfflineFallback] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Clear offline navigation when back online
      offlineRoutingService.clearOfflineNavigation();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check offline support for current route
  useEffect(() => {
    const currentRoute = location.pathname;
    const hasSupport = offlineRoutingService.hasOfflineSupport(currentRoute);
    setHasOfflineSupport(hasSupport);

    // If offline and no support, show fallback
    if (!isOnline && !hasSupport) {
      const fallback = offlineRoutingService.getRouteFallback(currentRoute);
      setOfflineFallback(fallback);
    } else {
      setOfflineFallback(null);
    }
  }, [location.pathname, isOnline]);

  // Subscribe to sync status updates
  useEffect(() => {
    const updateSyncStatus = () => {
      const status = backgroundSyncService.getSyncStatus();
      setSyncStatus(status);
    };

    const unsubscribeSync = backgroundSyncService.subscribe((event) => {
      updateSyncStatus();
      
      // Handle specific sync events
      switch (event.type) {
        case 'order-created-offline':
          console.log('📱 Order created offline:', event.order);
          break;
        case 'order-synced':
          console.log('✅ Order synced successfully:', event.order);
          break;
        case 'operation-failed':
          console.error('❌ Sync operation failed:', event.operation);
          break;
      }
    });

    // Initial status update
    updateSyncStatus();

    return unsubscribeSync;
  }, []);

  // Subscribe to cache updates
  useEffect(() => {
    const updateCacheStats = () => {
      const stats = apiCacheService.getCacheStats();
      setCacheStats(stats);
    };

    const unsubscribeCache = apiCacheService.subscribe((event) => {
      updateCacheStats();
    });

    // Initial stats update
    updateCacheStats();

    return unsubscribeCache;
  }, []);

  // Navigate with offline support
  const navigateOffline = useCallback((route, options = {}) => {
    if (isOnline) {
      navigate(route, options);
      return;
    }

    // Check if route has offline support
    if (offlineRoutingService.hasOfflineSupport(route)) {
      navigate(route, options);
    } else {
      // Show offline fallback
      const fallback = offlineRoutingService.getRouteFallback(route);
      setOfflineFallback(fallback);
    }
  }, [isOnline, navigate]);

  // Get cached data for current route
  const getCachedData = useCallback(async (endpoint) => {
    if (isOnline) {
      return await apiCacheService.fetch(endpoint);
    } else {
      return apiCacheService.getOfflineData(endpoint);
    }
  }, [isOnline]);

  // Store data for offline use
  const storeOfflineData = useCallback((endpoint, data) => {
    apiCacheService.storeOfflineData(endpoint, data);
  }, []);

  // Create order with offline support
  const createOrderOffline = useCallback(async (orderData) => {
    if (isOnline) {
      // Try normal API call first
      try {
        const response = await fetch('/api/orders/', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(orderData)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        // If online but API fails, queue for background sync
        console.warn('Online API failed, queueing for background sync:', error);
        return await backgroundSyncService.createOrderOffline(orderData);
      }
    } else {
      // Offline - queue for background sync
      return await backgroundSyncService.createOrderOffline(orderData);
    }
  }, [isOnline]);

  // Update profile with offline support
  const updateProfileOffline = useCallback(async (profileData) => {
    if (isOnline) {
      try {
        const response = await fetch('/api/users/profile/', {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(profileData)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.warn('Online profile update failed, queueing for background sync:', error);
        return await backgroundSyncService.updateProfileOffline(profileData);
      }
    } else {
      return await backgroundSyncService.updateProfileOffline(profileData);
    }
  }, [isOnline]);

  // Preload essential data
  const preloadEssentialData = useCallback(async () => {
    try {
      await apiCacheService.preloadEssentialData();
      console.log('✅ Essential data preloaded for offline use');
    } catch (error) {
      console.error('❌ Failed to preload essential data:', error);
    }
  }, []);

  // Force sync all pending operations
  const forceSyncAll = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    try {
      await backgroundSyncService.forceSyncAll();
      console.log('✅ All pending operations synced');
    } catch (error) {
      console.error('❌ Failed to sync operations:', error);
      throw error;
    }
  }, [isOnline]);

  // Clear all caches
  const clearAllCaches = useCallback(() => {
    apiCacheService.clearCache();
    offlineRoutingService.cleanupCache();
    console.log('🗑️ All caches cleared');
  }, []);

  // Get local orders (including pending ones)
  const getLocalOrders = useCallback(() => {
    return backgroundSyncService.getLocalOrders();
  }, []);

  // Get local profile
  const getLocalProfile = useCallback(() => {
    return backgroundSyncService.getLocalProfile();
  }, []);

  // Cancel a specific sync operation
  const cancelSyncOperation = useCallback((operationId) => {
    return backgroundSyncService.cancelOperation(operationId);
  }, []);

  // Get offline capabilities
  const getOfflineCapabilities = useCallback(() => {
    return {
      ...offlineRoutingService.getOfflineCapabilities(),
      syncCapabilities: syncStatus,
      cacheCapabilities: cacheStats
    };
  }, [syncStatus, cacheStats]);

  // Check if data is from cache
  const isDataFromCache = useCallback((data) => {
    return data && (data.fromCache || data.offline);
  }, []);

  // Check if data is stale
  const isDataStale = useCallback((data) => {
    return data && data.stale;
  }, []);

  // Get data freshness info
  const getDataFreshness = useCallback((data) => {
    if (!data) return null;

    return {
      fromCache: !!data.fromCache,
      offline: !!data.offline,
      stale: !!data.stale,
      fallback: !!data.fallback,
      cachedAt: data.cachedAt,
      age: data.cachedAt ? Date.now() - data.cachedAt : null
    };
  }, []);

  return {
    // Connection status
    isOnline,
    
    // Route support
    hasOfflineSupport,
    offlineFallback,
    
    // Status information
    syncStatus,
    cacheStats,
    
    // Navigation
    navigateOffline,
    
    // Data operations
    getCachedData,
    storeOfflineData,
    createOrderOffline,
    updateProfileOffline,
    
    // Management operations
    preloadEssentialData,
    forceSyncAll,
    clearAllCaches,
    
    // Local data access
    getLocalOrders,
    getLocalProfile,
    
    // Sync management
    cancelSyncOperation,
    
    // Utility functions
    getOfflineCapabilities,
    isDataFromCache,
    isDataStale,
    getDataFreshness
  };
}

export default useOffline;
