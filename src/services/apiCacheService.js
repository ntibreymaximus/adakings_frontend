// Enhanced API Caching Service
// Provides intelligent caching strategies for API calls with offline support

import { API_ENDPOINTS } from '../utils/api';

class ApiCacheService {
  constructor() {
    this.cache = new Map();
    this.cacheMetadata = new Map();
    this.pendingRequests = new Map();
    this.subscribers = new Set();
    
    // Cache configuration for different endpoint types
    this.cacheConfig = {
      // Critical data that should be cached aggressively
      essential: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        strategy: 'cache-first',
        endpoints: [API_ENDPOINTS.MENU_ITEMS, API_ENDPOINTS.ORDERS]
      },
      
      // Frequently accessed data
      frequent: {
        maxAge: 6 * 60 * 60 * 1000, // 6 hours
        strategy: 'network-first',
        endpoints: ['/api/transactions', '/api/activity']
      },
      
      // Real-time data that should be cached briefly
      realtime: {
        maxAge: 5 * 60 * 1000, // 5 minutes
        strategy: 'network-only',
        endpoints: ['/api/orders/status', '/api/payment']
      }
    };

    this.setupNetworkListeners();
    this.startPeriodicCleanup();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 API Cache: Network restored - triggering cache refresh');
      this.refreshEssentialData();
      this.notifySubscribers({ type: 'network-restored' });
    });

    window.addEventListener('offline', () => {
      console.log('📴 API Cache: Network lost - switching to cache-only mode');
      this.notifySubscribers({ type: 'network-lost' });
    });
  }

  // Subscribe to cache events
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify all subscribers of cache events
  notifySubscribers(event) {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error notifying cache subscriber:', error);
      }
    });
  }

  // Get cache configuration for an endpoint
  getCacheConfig(endpoint) {
    for (const [type, config] of Object.entries(this.cacheConfig)) {
      if (config.endpoints.some(ep => endpoint.includes(ep))) {
        return { ...config, type };
      }
    }
    
    // Default configuration for unknown endpoints
    return {
      maxAge: 30 * 60 * 1000, // 30 minutes
      strategy: 'network-first',
      type: 'default'
    };
  }

  // Enhanced fetch with intelligent caching
  async fetch(endpoint, options = {}) {
    const cacheKey = this.generateCacheKey(endpoint, options);
    const config = this.getCacheConfig(endpoint);
    
    console.log(`🔄 API Cache: Fetching ${endpoint} with ${config.strategy} strategy`);

    try {
      switch (config.strategy) {
        case 'cache-first':
          return await this.cacheFirstStrategy(cacheKey, endpoint, options, config);
        case 'network-first':
          return await this.networkFirstStrategy(cacheKey, endpoint, options, config);
        case 'network-only':
          return await this.networkOnlyStrategy(endpoint, options);
        default:
          return await this.networkFirstStrategy(cacheKey, endpoint, options, config);
      }
    } catch (error) {
      console.error(`❌ API Cache: Error fetching ${endpoint}:`, error);
      
      // Try cache as last resort
      const cached = this.getFromCache(cacheKey);
      if (cached && !this.isCacheExpired(cacheKey)) {
        console.log(`💾 API Cache: Serving stale cache for ${endpoint} due to error`);
        return { ...cached.data, fromCache: true, stale: true };
      }
      
      throw error;
    }
  }

  // Cache-first strategy: check cache first, then network as background update
  async cacheFirstStrategy(cacheKey, endpoint, options, config) {
    const cached = this.getFromCache(cacheKey);
    
    if (cached && !this.isCacheExpired(cacheKey)) {
      console.log(`💾 API Cache: Serving from cache (cache-first): ${endpoint}`);
      
      // Background update if online
      if (navigator.onLine) {
        this.backgroundRefresh(cacheKey, endpoint, options, config);
      }
      
      return { ...cached.data, fromCache: true };
    }

    // Cache miss or expired - fetch from network
    return await this.fetchAndCache(cacheKey, endpoint, options, config);
  }

  // Network-first strategy: try network first, fallback to cache
  async networkFirstStrategy(cacheKey, endpoint, options, config) {
    if (!navigator.onLine) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`💾 API Cache: Serving from cache (offline): ${endpoint}`);
        return { ...cached.data, fromCache: true, offline: true };
      }
      throw new Error('Network unavailable and no cache available');
    }

    try {
      return await this.fetchAndCache(cacheKey, endpoint, options, config);
    } catch (error) {
      // Network failed - try cache
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`💾 API Cache: Network failed, serving from cache: ${endpoint}`);
        return { ...cached.data, fromCache: true, fallback: true };
      }
      throw error;
    }
  }

  // Network-only strategy: always fetch from network, no caching
  async networkOnlyStrategy(endpoint, options) {
    console.log(`🌐 API Cache: Network-only fetch: ${endpoint}`);
    return await this.performFetch(endpoint, options);
  }

  // Perform the actual fetch operation
  async performFetch(endpoint, options = {}) {
    // Get authentication token
    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  // Fetch from network and cache the result
  async fetchAndCache(cacheKey, endpoint, options, config) {
    // Check for pending request to avoid duplicate calls
    const pendingKey = `${endpoint}:${JSON.stringify(options)}`;
    if (this.pendingRequests.has(pendingKey)) {
      console.log(`⏳ API Cache: Waiting for pending request: ${endpoint}`);
      return await this.pendingRequests.get(pendingKey);
    }

    // Create new request promise
    const requestPromise = this.performFetch(endpoint, options)
      .then(data => {
        // Cache the successful response
        this.setCache(cacheKey, data, config);
        console.log(`✅ API Cache: Cached response for ${endpoint}`);
        
        // Notify subscribers of successful fetch
        this.notifySubscribers({
          type: 'cache-updated',
          endpoint,
          data,
          cacheKey
        });
        
        return data;
      })
      .finally(() => {
        // Remove from pending requests
        this.pendingRequests.delete(pendingKey);
      });

    // Store pending request
    this.pendingRequests.set(pendingKey, requestPromise);
    
    return await requestPromise;
  }

  // Background refresh without blocking the main request
  backgroundRefresh(cacheKey, endpoint, options, config) {
    setTimeout(async () => {
      try {
        console.log(`🔄 API Cache: Background refresh for ${endpoint}`);
        const data = await this.performFetch(endpoint, options);
        this.setCache(cacheKey, data, config);
        
        this.notifySubscribers({
          type: 'background-updated',
          endpoint,
          data,
          cacheKey
        });
      } catch (error) {
        console.warn(`⚠️ API Cache: Background refresh failed for ${endpoint}:`, error);
      }
    }, 100); // Small delay to avoid blocking
  }

  // Generate cache key for request
  generateCacheKey(endpoint, options = {}) {
    const method = options.method || 'GET';
    const params = options.params ? JSON.stringify(options.params) : '';
    return `${method}:${endpoint}:${params}`;
  }

  // Store data in cache
  setCache(key, data, config) {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      maxAge: config.maxAge,
      type: config.type
    };
    
    this.cache.set(key, cacheEntry);
    this.cacheMetadata.set(key, {
      endpoint: key.split(':')[1],
      size: JSON.stringify(data).length,
      hits: 0,
      lastAccess: Date.now()
    });
  }

  // Get data from cache
  getFromCache(key) {
    const entry = this.cache.get(key);
    if (entry) {
      // Update access statistics
      const metadata = this.cacheMetadata.get(key);
      if (metadata) {
        metadata.hits++;
        metadata.lastAccess = Date.now();
      }
    }
    return entry;
  }

  // Check if cache entry is expired
  isCacheExpired(key) {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    return (Date.now() - entry.timestamp) > entry.maxAge;
  }

  // Preload essential API data for offline use
  async preloadEssentialData() {
    console.log('🚀 API Cache: Preloading essential data for offline use');
    
    // Check if user is authenticated before preloading
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🔐 API Cache: No auth token, skipping preload');
      return;
    }
    
    // Get user data to check permissions
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const isAdmin = userData.role === 'admin' || userData.role === 'superadmin';
    
    let essentialEndpoints = [...this.cacheConfig.essential.endpoints];
    
    // Only add users endpoint if user is admin
    if (isAdmin) {
      essentialEndpoints.push(API_ENDPOINTS.USERS);
    }
    
    console.log('🔍 DEBUG: Essential endpoints to preload:', essentialEndpoints);
    const promises = essentialEndpoints.map(async (endpoint) => {
      try {
        await this.fetch(endpoint);
        console.log(`✅ Preloaded: ${endpoint}`);
      } catch (error) {
        console.warn(`⚠️ Failed to preload: ${endpoint}`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log('🎯 API Cache: Essential data preloading completed');
  }

  // Refresh essential data when back online
  async refreshEssentialData() {
    if (!navigator.onLine) return;

    // Check if user is authenticated before refreshing
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🔐 API Cache: No auth token, skipping refresh');
      return;
    }

    console.log('🔄 API Cache: Refreshing essential data');
    
    const essentialEndpoints = this.cacheConfig.essential.endpoints;
    const promises = essentialEndpoints.map(async (endpoint) => {
      try {
        const cacheKey = this.generateCacheKey(endpoint);
        const config = this.getCacheConfig(endpoint);
        await this.fetchAndCache(cacheKey, endpoint, {}, config);
      } catch (error) {
        console.warn(`⚠️ Failed to refresh: ${endpoint}`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  // Clear all cache
  clearCache() {
    this.cache.clear();
    this.cacheMetadata.clear();
    console.log('🗑️ API Cache: All cache cleared');
    
    this.notifySubscribers({ type: 'cache-cleared' });
  }

  // Clear specific endpoint cache
  clearEndpointCache(endpoint) {
    const keysToRemove = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(endpoint)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      this.cache.delete(key);
      this.cacheMetadata.delete(key);
    });
    
    console.log(`🗑️ API Cache: Cleared cache for ${endpoint}`);
  }

  // Get cache statistics
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      totalSize: 0,
      hitRate: 0,
      typeBreakdown: {},
      oldestEntry: null,
      newestEntry: null
    };

    let totalHits = 0;
    let totalRequests = 0;

    for (const [key, entry] of this.cache.entries()) {
      const metadata = this.cacheMetadata.get(key);
      const size = JSON.stringify(entry.data).length;
      
      stats.totalSize += size;
      
      if (metadata) {
        totalHits += metadata.hits;
        totalRequests += metadata.hits + 1; // +1 for initial fetch
        
        if (!stats.typeBreakdown[entry.type]) {
          stats.typeBreakdown[entry.type] = { count: 0, size: 0 };
        }
        stats.typeBreakdown[entry.type].count++;
        stats.typeBreakdown[entry.type].size += size;
        
        if (!stats.oldestEntry || entry.timestamp < stats.oldestEntry) {
          stats.oldestEntry = entry.timestamp;
        }
        if (!stats.newestEntry || entry.timestamp > stats.newestEntry) {
          stats.newestEntry = entry.timestamp;
        }
      }
    }

    stats.hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    return stats;
  }

  // Start periodic cache cleanup
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  // Cleanup expired cache entries
  cleanupExpiredEntries() {
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isCacheExpired(key)) {
        this.cache.delete(key);
        this.cacheMetadata.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 API Cache: Cleaned ${cleaned} expired entries`);
      this.notifySubscribers({ type: 'cache-cleaned', count: cleaned });
    }
  }

  // Get cached data for offline use
  getOfflineData(endpoint) {
    const cacheKey = this.generateCacheKey(endpoint);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return {
        ...cached.data,
        fromCache: true,
        offline: true,
        cachedAt: cached.timestamp
      };
    }
    
    return null;
  }

  // Store data for offline-first operations
  storeOfflineData(endpoint, data) {
    const cacheKey = this.generateCacheKey(endpoint);
    const config = this.getCacheConfig(endpoint);
    
    this.setCache(cacheKey, data, config);
    console.log(`💾 API Cache: Stored offline data for ${endpoint}`);
  }
}

// Create and export singleton instance
export const apiCacheService = new ApiCacheService();
export default apiCacheService;
