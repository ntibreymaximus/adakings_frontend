// Enhanced Offline Routing Service
// Provides intelligent fallbacks for navigation requests when offline

class OfflineRoutingService {
  constructor() {
    this.offlineRoutes = new Map();
    this.routeTemplates = new Map();
    this.isOnline = navigator.onLine;
    
    // Setup online/offline listeners
    this.setupNetworkListeners();
    
    // Register default route fallbacks
    this.registerDefaultFallbacks();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📡 Network restored - Online routing enabled');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Network lost - Offline routing engaged');
    });
  }

  // Register default offline fallbacks for each route
  registerDefaultFallbacks() {
    // Dashboard route - show cached data or offline dashboard
    this.registerOfflineRoute('/dashboard', {
      component: 'OfflineDashboard',
      fallbackData: {
        title: 'Dashboard (Offline)',
        message: 'Showing cached dashboard data. Some features may be limited.',
        allowedActions: ['view-cached-orders', 'view-menu']
      }
    });

    // Orders route - show cached orders
    this.registerOfflineRoute('/view-orders', {
      component: 'OfflineOrders',
      fallbackData: {
        title: 'Orders (Offline)',
        message: 'Showing cached orders. New orders will sync when online.',
        allowedActions: ['view-details', 'create-order-offline']
      }
    });

    // Menu route - show cached menu
    this.registerOfflineRoute('/view-menu', {
      component: 'OfflineMenu',
      fallbackData: {
        title: 'Menu (Offline)',
        message: 'Showing cached menu. Prices and availability may not be current.',
        allowedActions: ['view-items', 'add-to-cart-offline']
      }
    });

    // Profile route - show cached profile
    this.registerOfflineRoute('/profile', {
      component: 'OfflineProfile',
      fallbackData: {
        title: 'Profile (Offline)',
        message: 'Showing cached profile data. Changes will sync when online.',
        allowedActions: ['view-profile', 'edit-profile-offline']
      }
    });

    // Transactions route - show cached transactions
    this.registerOfflineRoute('/view-transactions', {
      component: 'OfflineTransactions',
      fallbackData: {
        title: 'Transactions (Offline)',
        message: 'Showing cached transaction history.',
        allowedActions: ['view-history']
      }
    });

    // Create order route - enable offline order creation
    this.registerOfflineRoute('/create-order', {
      component: 'OfflineCreateOrder',
      fallbackData: {
        title: 'Create Order (Offline)',
        message: 'Orders created offline will be submitted when connection is restored.',
        allowedActions: ['create-order-offline', 'save-draft']
      }
    });
  }

  // Register a route for offline handling
  registerOfflineRoute(route, config) {
    this.offlineRoutes.set(route, {
      ...config,
      registeredAt: Date.now()
    });
    
    console.log(`🛣️ Registered offline route: ${route}`);
  }

  // Get offline configuration for a route
  getOfflineRoute(route) {
    return this.offlineRoutes.get(route);
  }

  // Check if a route has offline support
  hasOfflineSupport(route) {
    return this.offlineRoutes.has(route);
  }

  // Get appropriate fallback for a route when offline
  getRouteFallback(route, userData = null) {
    if (this.isOnline) {
      return null; // No fallback needed when online
    }

    const offlineConfig = this.getOfflineRoute(route);
    if (!offlineConfig) {
      return this.getGenericOfflinePage(route);
    }

    return {
      ...offlineConfig.fallbackData,
      route,
      component: offlineConfig.component,
      userContext: userData,
      timestamp: Date.now(),
      isOfflineFallback: true
    };
  }

  // Get generic offline page for unsupported routes
  getGenericOfflinePage(route) {
    return {
      title: 'Page Not Available Offline',
      message: `The "${route}" page is not available when offline. Please check your connection and try again.`,
      component: 'GenericOfflinePage',
      route,
      allowedActions: ['retry', 'go-back'],
      isOfflineFallback: true,
      timestamp: Date.now()
    };
  }

  // Navigate to offline version of a route
  navigateOffline(route, history, userData = null) {
    const fallback = this.getRouteFallback(route, userData);
    
    if (fallback) {
      // Store offline navigation context
      sessionStorage.setItem('offlineNavigation', JSON.stringify({
        originalRoute: route,
        fallback,
        timestamp: Date.now()
      }));

      console.log(`🛣️ Offline navigation to ${route}:`, fallback);
      return fallback;
    }

    return null;
  }

  // Check if current navigation is in offline mode
  isOfflineNavigation() {
    const offlineNav = sessionStorage.getItem('offlineNavigation');
    if (!offlineNav) return false;

    try {
      const navData = JSON.parse(offlineNav);
      // Check if navigation is recent (within last hour)
      const maxAge = 60 * 60 * 1000; // 1 hour
      return (Date.now() - navData.timestamp) < maxAge;
    } catch (error) {
      return false;
    }
  }

  // Clear offline navigation state when back online
  clearOfflineNavigation() {
    sessionStorage.removeItem('offlineNavigation');
    console.log('🛣️ Cleared offline navigation state');
  }

  // Get cached data for a route (integrate with existing cache services)
  async getCachedRouteData(route) {
    try {
      // Check if service worker is available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Request cached data from service worker
        const response = await this.requestCachedData(route);
        return response;
      }

      // Fallback to localStorage/sessionStorage
      return this.getLocalStorageFallback(route);
    } catch (error) {
      console.error('Error getting cached route data:', error);
      return null;
    }
  }

  // Request cached data from service worker
  requestCachedData(route) {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      navigator.serviceWorker.controller.postMessage({
        type: 'GET_CACHED_ROUTE_DATA',
        route
      }, [channel.port2]);

      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });
  }

  // Get fallback data from localStorage
  getLocalStorageFallback(route) {
    const cacheKey = `offline_route_${route.replace(/\//g, '_')}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const data = JSON.parse(cached);
        // Check if cache is not too old (24 hours)
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data.content;
        }
      } catch (error) {
        console.error('Error parsing cached route data:', error);
      }
    }
    
    return null;
  }

  // Cache route data for offline use
  cacheRouteData(route, data) {
    const cacheKey = `offline_route_${route.replace(/\//g, '_')}`;
    const cacheData = {
      content: data,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`💾 Cached data for route: ${route}`);
    } catch (error) {
      console.error('Error caching route data:', error);
    }
  }

  // Get offline capabilities summary
  getOfflineCapabilities() {
    return {
      supportedRoutes: Array.from(this.offlineRoutes.keys()),
      isOnline: this.isOnline,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      cacheStats: this.getCacheStats()
    };
  }

  // Get cache statistics
  getCacheStats() {
    const stats = {
      localStorageEntries: 0,
      totalSize: 0
    };

    try {
      for (let key in localStorage) {
        if (key.startsWith('offline_route_')) {
          stats.localStorageEntries++;
          stats.totalSize += localStorage.getItem(key).length;
        }
      }
    } catch (error) {
      console.error('Error calculating cache stats:', error);
    }

    return stats;
  }

  // Cleanup old cache entries
  cleanupCache() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff = Date.now() - maxAge;
    let cleaned = 0;

    try {
      for (let key in localStorage) {
        if (key.startsWith('offline_route_')) {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.timestamp < cutoff) {
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} old cache entries`);
      }
    } catch (error) {
      console.error('Error cleaning cache:', error);
    }

    return cleaned;
  }
}

// Create and export singleton instance
export const offlineRoutingService = new OfflineRoutingService();
export default offlineRoutingService;
