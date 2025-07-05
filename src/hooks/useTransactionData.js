import { useState, useEffect, useCallback, useRef } from 'react';
import transactionDataService from '../services/transactionDataService';

/**
 * React hook for accessing unified transaction data
 * Provides consistent data across PWA and webview components
 */
export const useTransactionData = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds default
    onDataUpdate = null,
    onError = null
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [source, setSource] = useState('api');
  
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);

  // Refresh data function
  const refreshData = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 8 seconds')), 8000);
      });
      
      const result = await Promise.race([
        transactionDataService.getTransactions(forceRefresh),
        timeoutPromise
      ]);
      
      if (!isMountedRef.current) return;

      setData(result);
      setLastUpdated(new Date(result.lastUpdated));
      setSource(result.source);
      setError(null);

      // Call onDataUpdate callback if provided
      if (onDataUpdate) {
        onDataUpdate(result);
      }


    } catch (err) {
      
      if (isMountedRef.current) {
        setError(err.message);
        
        // Call onError callback if provided
        if (onError) {
          onError(err);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [onDataUpdate, onError]);

  // Subscribe to data service updates
  useEffect(() => {
    
    const handleDataServiceUpdate = (event) => {
      
      switch (event.type) {
        case 'data-updated':
          if (isMountedRef.current && event.data) {
            setData(event.data);
            setLastUpdated(event.timestamp);
            setSource(event.data.source || 'api');
            setError(null);
            
            if (onDataUpdate) {
              onDataUpdate(event.data);
            }
          }
          break;
          
        case 'network-online':
          // Use forceRefresh to avoid circular dependency
          transactionDataService.clearCache();
          transactionDataService.getTransactions(true);
          break;
          
        case 'network-offline':
          if (isMountedRef.current) {
            setSource('offline');
          }
          break;
          
        case 'auth-error':
          if (isMountedRef.current) {
            setError('Authentication error. Please log in again.');
            if (onError) {
              onError(new Error('Authentication error'));
            }
          }
          break;
          
        default:
          break;
      }
    };

    unsubscribeRef.current = transactionDataService.subscribe(handleDataServiceUpdate);
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [onDataUpdate, onError]);

  // Initial data fetch
  useEffect(() => {
    refreshData(false);
  }, [refreshData]); // Include refreshData in dependencies

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData(false);
      }
    }, refreshInterval);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh when tab becomes visible again
        refreshData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, refreshInterval, refreshData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Manual refresh that clears cache
  const forceRefresh = useCallback(() => {
    transactionDataService.clearCache();
    refreshData(true);
  }, [refreshData]);

  // Get filtered transactions by date
  const getTransactionsByDate = useCallback((dateString) => {
    if (!data?.transactions) return [];
    return transactionDataService.filterTransactionsByDate(data.transactions, dateString);
  }, [data]);

  // Get today's transactions
  const getTodayTransactions = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return getTransactionsByDate(today);
  }, [getTransactionsByDate]);

  // Get transaction statistics
  const getTransactionStats = useCallback((transactions = null) => {
    const transactionsToAnalyze = transactions || data?.transactions || [];
    return transactionDataService.calculateStats(transactionsToAnalyze);
  }, [data]);

  // Get transactions grouped by payment method
  const getTransactionsByPaymentMethod = useCallback((transactions = null) => {
    const transactionsToAnalyze = transactions || data?.transactions || [];
    return transactionDataService.groupByPaymentMethod(transactionsToAnalyze);
  }, [data]);

  return {
    // Data
    data,
    transactions: data?.transactions || [],
    summary: data?.summary || {},
    
    // State
    loading,
    error,
    lastUpdated,
    source,
    isOffline: source === 'offline',
    isEmpty: !loading && (!data?.transactions || data.transactions.length === 0),
    
    // Actions
    refresh: () => refreshData(false),
    forceRefresh,
    
    // Helper functions
    getTransactionsByDate,
    getTodayTransactions,
    getTransactionStats,
    getTransactionsByPaymentMethod,
    
    // Service methods (direct access)
    clearCache: transactionDataService.clearCache.bind(transactionDataService)
  };
};

/**
 * Hook specifically for today's transactions
 */
export const useTodayTransactions = (options = {}) => {
  const {
    data,
    transactions,
    loading,
    error,
    refresh,
    forceRefresh,
    getTransactionStats,
    getTransactionsByPaymentMethod,
    ...rest
  } = useTransactionData(options);

  const todayTransactions = useTransactionData().getTodayTransactions();
  const todayStats = getTransactionStats(todayTransactions);
  const todayByPaymentMethod = getTransactionsByPaymentMethod(todayTransactions);

  return {
    data,
    transactions: todayTransactions,
    stats: todayStats,
    byPaymentMethod: todayByPaymentMethod,
    loading,
    error,
    refresh,
    forceRefresh,
    ...rest
  };
};


export default useTransactionData;
