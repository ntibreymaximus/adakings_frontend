import { useState, useEffect, useCallback } from 'react';
import instantUpdates from '../utils/instantUpdates';

/**
 * React Hook for Instant Updates
 * Provides instant data updates without loading delays
 */
export const useInstantUpdates = (dataType, fetchFunction, options = {}) => {
  const {
    immediate = true,
    optimistic = true,
    enableCache = true
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(!enableCache);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Handle instant updates
  const handleInstantUpdate = useCallback((newData) => {
    setData(newData);
    setLoading(false);
    setError(null);
    setLastUpdated(new Date());
  }, []);

  // Enhanced fetch function with error handling
  const enhancedFetchFunction = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchFunction();
      return result;
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
      throw err;
    }
  }, [fetchFunction]);

  // Register with instant updates system
  useEffect(() => {
    const cleanup = instantUpdates.register(
      dataType, 
      handleInstantUpdate, 
      enhancedFetchFunction
    );

    // Get cached data immediately if available
    if (enableCache) {
      const cachedData = instantUpdates.getData(dataType);
      if (cachedData.length > 0) {
        handleInstantUpdate(cachedData);
      }
    }

    return cleanup;
  }, [dataType, handleInstantUpdate, enhancedFetchFunction, enableCache]);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    setLoading(true);
    instantUpdates.fetchAndUpdate(dataType);
  }, [dataType]);

  // Optimistic create
  const optimisticCreate = useCallback((newItem) => {
    if (optimistic) {
      instantUpdates.addOptimisticUpdate(dataType, {
        ...newItem,
        id: newItem.id || `temp_${Date.now()}`,
        created_at: new Date().toISOString()
      });
    }
  }, [dataType, optimistic]);

  // Optimistic update
  const optimisticUpdate = useCallback((itemId, updates) => {
    if (optimistic) {
      instantUpdates.updateItem(dataType, itemId, updates);
    }
  }, [dataType, optimistic]);

  // Optimistic delete
  const optimisticDelete = useCallback((itemId) => {
    if (optimistic) {
      instantUpdates.removeItem(dataType, itemId);
    }
  }, [dataType, optimistic]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete
  };
};

export default useInstantUpdates;
