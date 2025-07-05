// Menu Service with API-First approach and selective caching
import { API_ENDPOINTS } from '../utils/api';
import { apiFirstService } from './apiFirstService';

class MenuService {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.CACHE_DURATION = 30 * 1000; // Reduced to 30 seconds - minimal caching
    this.isLoading = new Map();
    this.listeners = new Set();
    
    // Subscribe to API-first service events
    this.apiFirstUnsubscribe = apiFirstService.subscribe(this.handleApiFirstEvent.bind(this));
  }

  // Add listener for cache updates
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(data) {
    this.listeners.forEach(callback => callback(data));
  }

  // Check if cache is fresh
  isCacheFresh(key) {
    const timestamp = this.cacheTimestamps.get(key);
    return timestamp && (Date.now() - timestamp) < this.CACHE_DURATION;
  }

  // Get cache key for menu items
  getCacheKey(filters = {}) {
    const { item_type, availability, search, ordering } = filters;
    return `menu_items_${item_type || 'all'}_${availability || 'all'}_${search || ''}_${ordering || 'default'}`;
  }

  // Handle API-first service events
  handleApiFirstEvent(event) {
    if (event.type === 'api-success' && event.endpoint.includes('menu')) {
      this.notifyListeners(event.data);
    } else if (event.type === 'cache-cleared') {
      this.clearCache();
    }
  }

  // Get menu items with API-first approach
  async getMenuItems(filters = {}) {
    console.log('🌐 Getting menu items via API-first approach');
    
    try {
      // Use API-first service - always tries API first
      const data = await apiFirstService.getMenuItems(filters);
      
      // Handle different response structures
      let items = data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        items = data.results || data.items || data.data || [];
      }
      
      // Ensure we have an array
      if (!Array.isArray(items)) {
        items = [];
      }

      console.log(`✅ API-first returned ${items.length} menu items`);
      this.notifyListeners(items);
      
      return items;
      
    } catch (error) {
      console.error('❌ API-first failed for menu items:', error);
      
      // Fallback to local cache only if available (last resort)
      const cacheKey = this.getCacheKey(filters);
      const fallbackData = this.cache.get(cacheKey);
      
      if (fallbackData) {
        console.log('🔄 Using local fallback cache for menu items');
        return fallbackData;
      }
      
      throw error;
    }
  }

  // Force refresh menu items (bypass all caching)
  async forceRefreshMenuItems(filters = {}) {
    console.log('🔄 Force refreshing menu items');
    return apiFirstService.forceRefresh(API_ENDPOINTS.MENU_ITEMS, {
      method: 'GET'
    });
  }

  // Preload menu items for instant access (disabled in API-first approach)
  async preloadMenuItems() {
    // In API-first approach, we don't preload to avoid unnecessary API calls
    // Data will be fetched on-demand when actually needed
    console.log('🙅‍♂️ Preloading disabled in API-first mode - data fetched on-demand');
    return Promise.resolve();
  }

  // Update menu item in cache
  updateMenuItemInCache(updatedItem) {
    // Update all relevant cache entries
    this.cache.forEach((items, key) => {
      const updatedItems = items.map(item => 
        item.id === updatedItem.id ? { ...item, ...updatedItem } : item
      );
      this.cache.set(key, updatedItems);
    });
    
    // Notify listeners
    this.notifyListeners(updatedItem);
    console.log('🔄 Updated menu item in cache');
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log('🗑️ Menu cache cleared');
  }

  // Clear specific cache entry
  clearCacheEntry(filters = {}) {
    const cacheKey = this.getCacheKey(filters);
    this.cache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
  }

  // Get cache stats
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      entries: Array.from(this.cache.keys()),
      timestamps: Array.from(this.cacheTimestamps.entries()),
    };
  }

  // Cleanup on service destruction
  destroy() {
    if (this.apiFirstUnsubscribe) {
      this.apiFirstUnsubscribe();
    }
    this.clearCache();
    this.listeners.clear();
  }
}

// Create and export singleton instance
export const menuService = new MenuService();

// Legacy export for backward compatibility
export const menuCacheService = menuService;

// No preloading in API-first approach - data fetched on-demand
console.log('🌐 Menu service initialized with API-first approach');

export default menuService;
