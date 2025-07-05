/**
 * API-First Service with Selective Caching
 * 
 * This service prioritizes direct API calls over caching, using cache only when:
 * 1. Network is offline
 * 2. API call fails (fallback to stale cache)
 * 3. Expensive operations that rarely change
 * 4. Explicitly requested by the caller
 * 
 * Key principles:
 * - Always try API first
 * - Cache only serves as fallback
 * - Cache is invalidated aggressively
 * - Real-time data never uses cache
 */

import { API_ENDPOINTS } from '../utils/api';
import { tokenFetch } from '../utils/tokenFetch';

class ApiFirstService {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.listeners = new Set();
    this.isOnline = navigator.onLine;
    this.activeRequests = new Map(); // Prevent duplicate requests
    
    // Very short cache duration - cache is primarily for offline fallback
    this.DEFAULT_CACHE_DURATION = 10 * 1000; // 10 seconds - minimal caching
    this.EXPENSIVE_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for expensive operations only
    
    // Monitor network status
    this.setupNetworkMonitoring();
  }

  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.clearCache(); // Clear all cache when coming online
      this.notifyListeners({ type: 'network-online' });
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners({ type: 'network-offline' });
    });
  }

  /**
   * Add listener for service updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Make API-first request with selective caching
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      useCache = false, // Cache disabled by default
      cacheDuration = this.DEFAULT_CACHE_DURATION,
      retryOnFailure = true,
      timeout = 8000,
      bypassCache = false, // Force API call even if cache exists
      fallbackToCache = true, // Use cache as fallback on API failure
      cacheKey = null,
      ...fetchOptions
    } = options;

    const key = cacheKey || `${method}:${endpoint}`;
    const isGET = method.toUpperCase() === 'GET';

    // For POST/PUT/PATCH/DELETE requests, clear related cache
    if (!isGET) {
      this.invalidateRelatedCache(endpoint);
    }

    // Check if we should use cache (only for GET requests)
    if (isGET && useCache && !bypassCache && this.isCacheValid(key, cacheDuration)) {
      const cachedData = this.cache.get(key);
      if (cachedData) {
        console.log(`📋 Using cached data for ${endpoint} (cache hit)`);
        return Promise.resolve(cachedData);
      }
    }

    // Prevent duplicate requests
    if (this.activeRequests.has(key)) {
      console.log(`⏳ Request already in progress for ${endpoint}`);
      return this.activeRequests.get(key);
    }

    // Create API request promise
    const requestPromise = this.makeApiRequest(endpoint, {
      method,
      timeout,
      ...fetchOptions
    });

    // Store active request
    this.activeRequests.set(key, requestPromise);

    try {
      console.log(`🌐 Making API-first request to ${endpoint}`);
      const data = await requestPromise;
      
      // Cache only GET responses if caching is enabled
      if (isGET && useCache) {
        this.cache.set(key, data);
        this.cacheTimestamps.set(key, Date.now());
        console.log(`💾 Cached response for ${endpoint} (${cacheDuration}ms TTL)`);
      }

      // Notify listeners of successful API response
      this.notifyListeners({
        type: 'api-success',
        endpoint,
        data,
        source: 'api'
      });

      return data;

    } catch (error) {
      console.warn(`❌ API request failed for ${endpoint}:`, error.message);

      // Try to return cached data as fallback (only for GET requests)
      if (isGET && fallbackToCache) {
        const cachedData = this.cache.get(key);
        if (cachedData) {
          console.log(`🔄 Using stale cache as fallback for ${endpoint}`);
          this.notifyListeners({
            type: 'cache-fallback',
            endpoint,
            data: cachedData,
            source: 'cache',
            error: error.message
          });
          return cachedData;
        }
      }

      // Notify listeners of API failure
      this.notifyListeners({
        type: 'api-error',
        endpoint,
        error: error.message
      });

      throw error;

    } finally {
      // Clean up active request
      this.activeRequests.delete(key);
    }
  }

  /**
   * Make the actual API request with timeout
   */
  async makeApiRequest(endpoint, options) {
    const { timeout = 8000, ...fetchOptions } = options;

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);
    });

    // Make the API call with timeout using tokenFetch
    const response = await Promise.race([
      tokenFetch(endpoint, fetchOptions),
      timeoutPromise
    ]);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(key, duration) {
    const timestamp = this.cacheTimestamps.get(key);
    return timestamp && (Date.now() - timestamp) < duration;
  }

  /**
   * Invalidate cache entries related to an endpoint
   */
  invalidateRelatedCache(endpoint) {
    const keysToDelete = [];
    
    for (const [key] of this.cache) {
      if (key.includes(endpoint) || this.isRelatedEndpoint(key, endpoint)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries related to ${endpoint}`);
    }
  }

  /**
   * Check if endpoints are related (for cache invalidation)
   */
  isRelatedEndpoint(cacheKey, endpoint) {
    // Extract base endpoint from cache key
    const baseEndpoint = cacheKey.split(':')[1]?.split('?')[0];
    const targetBase = endpoint.split('?')[0];
    
    // Consider endpoints related if they share the same base path
    return baseEndpoint && targetBase && (
      baseEndpoint.includes(targetBase) || 
      targetBase.includes(baseEndpoint)
    );
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log('🗑️ All cache cleared');
    this.notifyListeners({ type: 'cache-cleared' });
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(key) {
    this.cache.delete(key);
    this.cacheTimestamps.delete(key);
    console.log(`🗑️ Cache entry cleared: ${key}`);
  }

  /**
   * Force refresh - bypass cache and make fresh API call
   */
  async forceRefresh(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      bypassCache: true,
      useCache: false
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      entries: [],
      networkStatus: this.isOnline ? 'online' : 'offline',
      activeRequests: this.activeRequests.size
    };

    for (const [key, data] of this.cache) {
      const timestamp = this.cacheTimestamps.get(key);
      const age = timestamp ? Date.now() - timestamp : 0;
      
      stats.entries.push({
        key,
        size: JSON.stringify(data).length,
        age,
        isValid: this.isCacheValid(key, this.DEFAULT_CACHE_DURATION)
      });
    }

    return stats;
  }

  // =============================================================================
  // SPECIFIC API METHODS WITH API-FIRST APPROACH
  // =============================================================================

  /**
   * Get menu items - Always API first, minimal caching
   */
  async getMenuItems(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.item_type) queryParams.append('item_type', filters.item_type);
    if (filters.availability) queryParams.append('availability', filters.availability);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.ordering) queryParams.append('ordering', filters.ordering);

    const endpoint = `${API_ENDPOINTS.MENU_ITEMS}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    return this.request(endpoint, {
      useCache: false, // No caching for menu items - always fresh
      cacheKey: `menu_items_${JSON.stringify(filters)}`
    });
  }

  /**
   * Get transactions - Always API first, no caching for real-time data
   */
  async getTransactions(forceRefresh = false) {
    const endpoint = `${API_ENDPOINTS.TRANSACTIONS}?_t=${Date.now()}`;
    
    return this.request(endpoint, {
      useCache: false, // Never cache transaction data
      bypassCache: forceRefresh,
      fallbackToCache: false // Don't fall back to cache for transactions
    });
  }

  /**
   * Get orders - Always API first, no caching for real-time data
   */
  async getOrders(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const endpoint = `${API_ENDPOINTS.ORDERS}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    return this.request(endpoint, {
      useCache: false, // Never cache order data
      fallbackToCache: false
    });
  }

  /**
   * Create order - Always API call, invalidates order cache
   */
  async createOrder(orderData) {
    return this.request(API_ENDPOINTS.ORDERS, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  /**
   * Update order - Always API call, invalidates order cache
   */
  async updateOrder(orderId, orderData) {
    return this.request(`${API_ENDPOINTS.ORDERS}${orderId}/`, {
      method: 'PATCH',
      body: JSON.stringify(orderData)
    });
  }

  /**
   * Get next order number - Always API first, very short cache (expensive operation)
   */
  async getNextOrderNumber() {
    return this.request(API_ENDPOINTS.NEXT_ORDER_NUMBER, {
      useCache: true, // Allow minimal caching for this expensive operation
      cacheDuration: 5000, // 5 seconds only
      cacheKey: 'next_order_number'
    });
  }

  /**
   * Get user data - API first with short cache for expensive operations only
   */
  async getUserData(userId) {
    return this.request(`${API_ENDPOINTS.USERS}${userId}/`, {
      useCache: true, // Allow caching for user data (changes less frequently)
      cacheDuration: this.EXPENSIVE_CACHE_DURATION,
      cacheKey: `user_${userId}`
    });
  }

  /**
   * Login - Always API call, never cached
   */
  async login(credentials) {
    return this.request(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
      useCache: false,
      fallbackToCache: false
    });
  }
}

// Create and export singleton instance
export const apiFirstService = new ApiFirstService();

// Export class for testing
export { ApiFirstService };

export default apiFirstService;
