/**
 * Instant Updates Utility
 * Eliminates all loading delays and makes updates truly instant
 */

class InstantUpdates {
  constructor() {
    this.updateCallbacks = new Map();
    this.dataCache = new Map();
    this.lastUpdate = new Map();
    
    // Ultra-fast polling interval
    this.pollInterval = 100; // 100ms for instant updates
    
    // Preload critical data immediately
    this.initializeInstantUpdates();
  }
  
  /**
   * Initialize instant updates system
   */
  initializeInstantUpdates() {
    // Override default fetch to be faster
    this.optimizeFetch();
    
    // Pre-warm connections
    this.preWarmConnections();
    
    // Set up instant event listeners
    this.setupInstantEventListeners();
  }
  
  /**
   * Optimize fetch for instant responses
   */
  optimizeFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      
      // Ultra-fast timeout for instant responses
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 1000); // 1 second max
      
      const optimizedOptions = {
        ...options,
        signal: timeoutController.signal,
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };
      
      try {
        const response = await originalFetch(url, optimizedOptions);
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };
  }
  
  /**
   * Pre-warm connections to backend
   */
  preWarmConnections() {
    const baseUrl = 'http://localhost:8000';
    const endpoints = [
      '/api/orders/',
      '/api/payments/transaction-table/',
      '/api/menu/',
      '/api/users/profile/'
    ];
    
    // Make lightweight requests to warm up connections
    endpoints.forEach(endpoint => {
      fetch(`${baseUrl}${endpoint}`, {
        method: 'HEAD', // Just headers, no body
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }).catch(() => {}); // Ignore errors, just warming up
    });
  }
  
  /**
   * Set up instant event listeners for real-time updates
   */
  setupInstantEventListeners() {
    // Listen for storage changes (cross-tab updates)
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.includes('instant_update_')) {
        const dataType = event.key.replace('instant_update_', '');
        const newData = JSON.parse(event.newValue || '[]');
        this.triggerInstantUpdate(dataType, newData);
      }
    });
    
    // Listen for custom instant update events
    window.addEventListener('instant_update', (event) => {
      const { dataType, data } = event.detail;
      this.triggerInstantUpdate(dataType, data);
    });
    
    // Listen for page visibility changes for instant resume
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Instantly refresh all registered data when tab becomes visible
        this.forceInstantRefreshAll();
      }
    });
  }
  
  /**
   * Register a callback for instant updates
   */
  register(dataType, callback, fetchFunction) {
    if (!this.updateCallbacks.has(dataType)) {
      this.updateCallbacks.set(dataType, new Set());
    }
    
    this.updateCallbacks.get(dataType).add(callback);
    
    // Store fetch function for this data type
    if (fetchFunction) {
      this[`fetch_${dataType}`] = fetchFunction;
    }
    
    // Immediately fetch data if not cached
    if (!this.dataCache.has(dataType)) {
      this.fetchAndUpdate(dataType);
    } else {
      // Use cached data immediately
      callback(this.dataCache.get(dataType));
    }
    
    return () => {
      // Cleanup function
      if (this.updateCallbacks.has(dataType)) {
        this.updateCallbacks.get(dataType).delete(callback);
      }
    };
  }
  
  /**
   * Fetch and update data instantly
   */
  async fetchAndUpdate(dataType) {
    const fetchFunction = this[`fetch_${dataType}`];
    if (!fetchFunction) return;
    
    try {
      const data = await fetchFunction();
      this.setData(dataType, data);
    } catch (error) {
      console.error(`InstantUpdates: Failed to fetch ${dataType}:`, error);
    }
  }
  
  /**
   * Set data and trigger instant updates
   */
  setData(dataType, data) {
    const now = Date.now();
    const lastUpdate = this.lastUpdate.get(dataType) || 0;
    
    // Always update, even if data is similar (for instant feel)
    this.dataCache.set(dataType, data);
    this.lastUpdate.set(dataType, now);
    
    // Store in localStorage for cross-tab updates
    localStorage.setItem(`instant_update_${dataType}`, JSON.stringify(data));
    
    // Trigger callbacks immediately
    this.triggerInstantUpdate(dataType, data);
  }
  
  /**
   * Trigger instant update for all registered callbacks
   */
  triggerInstantUpdate(dataType, data) {
    const callbacks = this.updateCallbacks.get(dataType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`InstantUpdates: Callback error for ${dataType}:`, error);
        }
      });
    }
  }
  
  /**
   * Force instant refresh for all registered data types
   */
  forceInstantRefreshAll() {
    this.updateCallbacks.forEach((callbacks, dataType) => {
      this.fetchAndUpdate(dataType);
    });
  }
  
  /**
   * Add optimistic update (for instant UI feedback)
   */
  addOptimisticUpdate(dataType, newItem) {
    const currentData = this.dataCache.get(dataType) || [];
    const optimisticData = [newItem, ...currentData];
    
    // Mark as optimistic for potential rollback
    newItem._optimistic = true;
    newItem._optimisticTimestamp = Date.now();
    
    this.triggerInstantUpdate(dataType, optimisticData);
    
    // Auto-cleanup optimistic updates after 10 seconds
    setTimeout(() => {
      this.cleanupOptimisticUpdates(dataType);
    }, 10000);
  }
  
  /**
   * Update specific item instantly
   */
  updateItem(dataType, itemId, updates) {
    const currentData = this.dataCache.get(dataType) || [];
    const updatedData = currentData.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    
    this.setData(dataType, updatedData);
  }
  
  /**
   * Remove item instantly
   */
  removeItem(dataType, itemId) {
    const currentData = this.dataCache.get(dataType) || [];
    const filteredData = currentData.filter(item => item.id !== itemId);
    
    this.setData(dataType, filteredData);
  }
  
  /**
   * Cleanup optimistic updates that are too old
   */
  cleanupOptimisticUpdates(dataType) {
    const currentData = this.dataCache.get(dataType) || [];
    const now = Date.now();
    const cleanedData = currentData.filter(item => {
      if (item._optimistic && item._optimisticTimestamp) {
        return (now - item._optimisticTimestamp) < 10000; // Keep for 10 seconds
      }
      return true;
    });
    
    if (cleanedData.length !== currentData.length) {
      this.setData(dataType, cleanedData);
    }
  }
  
  /**
   * Get cached data immediately
   */
  getData(dataType) {
    return this.dataCache.get(dataType) || [];
  }
  
  /**
   * Clear all cached data
   */
  clearCache() {
    this.dataCache.clear();
    this.lastUpdate.clear();
  }
}

// Create singleton instance
const instantUpdates = new InstantUpdates();

// Export for global access
window.instantUpdates = instantUpdates;

export default instantUpdates;
