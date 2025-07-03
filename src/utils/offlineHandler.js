// Offline handler utility for PWA
import React from 'react';
import { toast } from 'react-toastify';

class OfflineHandler {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  handleOnline() {
    console.log('[OfflineHandler] Back online');
    // Add debouncing to prevent rapid online/offline switching
    clearTimeout(this.onlineTimeout);
    this.onlineTimeout = setTimeout(() => {
      if (this.isOnline !== true) {
        this.isOnline = true;
        this.notifyListeners({ type: 'online', isOnline: true });
        
        // Show success toast only if we were offline for a while
        if (this.wasOffline) {
          toast.success('Connection restored! 🎉', {
            position: 'bottom-center',
            autoClose: 2000, // Shorter display time
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false, // Don't pause to avoid clutter
            draggable: true,
          });
        }
        
        // Trigger background sync if available with delay
        setTimeout(() => this.triggerBackgroundSync(), 1000);
        this.wasOffline = false;
      }
    }, 500); // 500ms debounce
  }

  handleOffline() {
    console.log('[OfflineHandler] Gone offline');
    // Add debouncing to prevent rapid online/offline switching
    clearTimeout(this.offlineTimeout);
    this.offlineTimeout = setTimeout(() => {
      if (this.isOnline !== false) {
        this.isOnline = false;
        this.wasOffline = true;
        this.notifyListeners({ type: 'offline', isOnline: false });
        
        // Show offline warning with less aggressive settings
        toast.warning('You are offline. Some features may be limited.', {
          position: 'bottom-center',
          autoClose: 3000, // Shorter display time
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: false, // Don't pause to avoid clutter
          draggable: true,
        });
      }
    }, 1000); // 1 second debounce for offline (longer to avoid false positives)
  }

  addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[OfflineHandler] Listener error:', error);
      }
    });
  }

  async triggerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync-orders');
        await registration.sync.register('background-sync-transactions');
        console.log('[OfflineHandler] Background sync triggered');
      } catch (error) {
        console.error('[OfflineHandler] Background sync failed:', error);
      }
    }
  }

  // Store data for offline sync
  async storeOfflineData(type, data) {
    try {
      const storageKey = `offline-${type}`;
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingData.push({
        ...data,
        timestamp: Date.now(),
        id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      localStorage.setItem(storageKey, JSON.stringify(existingData));
      console.log(`[OfflineHandler] Stored offline ${type}:`, data);
    } catch (error) {
      console.error(`[OfflineHandler] Failed to store offline ${type}:`, error);
    }
  }

  // Get offline data
  getOfflineData(type) {
    try {
      const storageKey = `offline-${type}`;
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch (error) {
      console.error(`[OfflineHandler] Failed to get offline ${type}:`, error);
      return [];
    }
  }

  // Remove offline data after successful sync
  removeOfflineData(type, id) {
    try {
      const storageKey = `offline-${type}`;
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filteredData = existingData.filter(item => item.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(filteredData));
      console.log(`[OfflineHandler] Removed offline ${type} with id:`, id);
    } catch (error) {
      console.error(`[OfflineHandler] Failed to remove offline ${type}:`, error);
    }
  }

  // Check if device is online
  checkConnection() {
    return this.isOnline;
  }

  // Enhanced fetch with offline handling
  async fetch(url, options = {}) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.error('[OfflineHandler] Fetch failed:', error);
      
      if (!this.isOnline) {
        // Try to return cached data for GET requests
        if (!options.method || options.method === 'GET') {
          const cachedResponse = await this.getCachedResponse(url);
          if (cachedResponse) {
            console.log('[OfflineHandler] Returning cached response for:', url);
            return cachedResponse;
          }
        }
        
        // For non-GET requests, store for later sync
        if (options.method && options.method !== 'GET') {
          await this.handleOfflineRequest(url, options);
        }
      }
      
      throw error;
    }
  }

  async getCachedResponse(url) {
    if ('caches' in window) {
      try {
        const cacheResponse = await caches.match(url);
        return cacheResponse;
      } catch (error) {
        console.error('[OfflineHandler] Cache lookup failed:', error);
      }
    }
    return null;
  }

  async handleOfflineRequest(url, options) {
    try {
      const requestData = {
        url,
        method: options.method,
        headers: options.headers,
        body: options.body
      };

      // Determine data type based on URL
      if (url.includes('/orders')) {
        await this.storeOfflineData('orders', requestData);
      } else if (url.includes('/transactions')) {
        await this.storeOfflineData('transactions', requestData);
      } else {
        await this.storeOfflineData('requests', requestData);
      }

      toast.info('Request saved for when you\'re back online', {
        position: 'bottom-center',
        autoClose: 4000,
      });
    } catch (error) {
      console.error('[OfflineHandler] Failed to handle offline request:', error);
    }
  }

  // Clean up event listeners
  destroy() {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    this.listeners.clear();
  }
}

// Create singleton instance
const offlineHandler = new OfflineHandler();

export default offlineHandler;

// Hook for React components
export const useOfflineHandler = () => {
  const [isOnline, setIsOnline] = React.useState(offlineHandler.isOnline);

  React.useEffect(() => {
    const unsubscribe = offlineHandler.addListener((event) => {
      setIsOnline(event.isOnline);
    });

    return unsubscribe;
  }, []);

  return {
    isOnline,
    storeOfflineData: offlineHandler.storeOfflineData.bind(offlineHandler),
    getOfflineData: offlineHandler.getOfflineData.bind(offlineHandler),
    removeOfflineData: offlineHandler.removeOfflineData.bind(offlineHandler),
    fetch: offlineHandler.fetch.bind(offlineHandler)
  };
};
