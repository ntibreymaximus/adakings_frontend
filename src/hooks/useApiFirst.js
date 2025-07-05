import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFirstService } from '../services/apiFirstService';

/**
 * React hook for API-first data fetching with selective caching
 * 
 * @param {string} endpoint - API endpoint to fetch
 * @param {object} options - Configuration options
 * @returns {object} - Hook state and actions
 */
export const useApiFirst = (endpoint, options = {}) => {
  const {
    // API options
    method = 'GET',
    useCache = false,
    cacheDuration = 10000,
    fallbackToCache = true,
    autoRefresh = false,
    refreshInterval = 30000,
    
    // Hook options
    fetchOnMount = true,
    dependencies = [],
    onSuccess = null,
    onError = null,
    
    // Request options
    timeout = 8000,
    ...requestOptions
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [source, setSource] = useState('api');

  const isMountedRef = useRef(true);
  const timeoutRef = useRef(null);

  // Fetch function
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current || !endpoint) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`🌐 useApiFirst: Fetching ${endpoint}`);

      const result = await apiFirstService.request(endpoint, {
        method,
        useCache: !forceRefresh && useCache,
        cacheDuration,
        fallbackToCache,
        bypassCache: forceRefresh,
        timeout,
        ...requestOptions
      });

      if (!isMountedRef.current) return;

      setData(result);
      setLastFetch(new Date());
      setSource('api');
      setError(null);

      if (onSuccess) {
        onSuccess(result);
      }

      console.log(`✅ useApiFirst: Successfully fetched ${endpoint}`);

    } catch (err) {
      console.warn(`❌ useApiFirst: Failed to fetch ${endpoint}:`, err.message);

      if (isMountedRef.current) {
        setError(err.message);
        setSource(err.message.includes('cache') ? 'cache' : 'error');

        if (onError) {
          onError(err);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    endpoint,
    method,
    useCache,
    cacheDuration,
    fallbackToCache,
    timeout,
    onSuccess,
    onError,
    JSON.stringify(requestOptions)
  ]);

  // Force refresh function
  const forceRefresh = useCallback(() => {
    console.log(`🔄 useApiFirst: Force refreshing ${endpoint}`);
    return fetchData(true);
  }, [fetchData]);

  // Subscribe to API service events
  useEffect(() => {
    const unsubscribe = apiFirstService.subscribe((event) => {
      if (!isMountedRef.current) return;

      switch (event.type) {
        case 'api-success':
          if (event.endpoint === endpoint) {
            setData(event.data);
            setSource('api');
            setError(null);
            setLastFetch(new Date());
          }
          break;

        case 'cache-fallback':
          if (event.endpoint === endpoint) {
            setData(event.data);
            setSource('cache');
            // Don't clear error - keep it to show user that API failed
          }
          break;

        case 'api-error':
          if (event.endpoint === endpoint) {
            setError(event.error);
            setSource('error');
          }
          break;

        case 'network-online':
          // Refresh data when network comes back online
          if (autoRefresh) {
            fetchData(true);
          }
          break;

        default:
          break;
      }
    });

    return unsubscribe;
  }, [endpoint, autoRefresh, fetchData]);

  // Initial fetch
  useEffect(() => {
    if (fetchOnMount && endpoint) {
      fetchData(false);
    }
  }, [fetchOnMount, endpoint, ...dependencies]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0 || !endpoint) {
      return;
    }

    const startAutoRefresh = () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }

      timeoutRef.current = setInterval(() => {
        if (document.visibilityState === 'visible' && isMountedRef.current) {
          fetchData(false);
        }
      }, refreshInterval);
    };

    // Start auto-refresh
    startAutoRefresh();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh when tab becomes visible
        fetchData(false);
        startAutoRefresh();
      } else {
        // Stop auto-refresh when tab is hidden
        if (timeoutRef.current) {
          clearInterval(timeoutRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, refreshInterval, fetchData, endpoint]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, []);

  return {
    // Data
    data,
    loading,
    error,
    lastFetch,
    source,
    
    // State flags
    isFromCache: source === 'cache',
    isError: source === 'error',
    isEmpty: !loading && !data,
    isStale: lastFetch && (Date.now() - lastFetch.getTime()) > cacheDuration,
    
    // Actions
    refetch: () => fetchData(false),
    forceRefresh,
    
    // Service access
    clearCache: () => apiFirstService.clearCache(),
    getCacheStats: () => apiFirstService.getCacheStats()
  };
};

/**
 * Hook for real-time data that never uses cache
 */
export const useRealTimeApi = (endpoint, options = {}) => {
  return useApiFirst(endpoint, {
    ...options,
    useCache: false,
    fallbackToCache: false,
    autoRefresh: true,
    refreshInterval: options.refreshInterval || 30000
  });
};

/**
 * Hook for static data that can be cached longer
 */
export const useStaticApi = (endpoint, options = {}) => {
  return useApiFirst(endpoint, {
    ...options,
    useCache: true,
    cacheDuration: options.cacheDuration || 120000, // 2 minutes
    fallbackToCache: true,
    autoRefresh: false
  });
};

export default useApiFirst;
