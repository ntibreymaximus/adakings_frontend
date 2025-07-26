// React Hook for auto-refresh with 15-second polling
// This hook replaces WebSocket functionality with HTTP polling for data updates

import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for auto-refresh with polling
 * @param {function} refreshCallback - Function to call on refresh
 * @param {number} intervalMs - Polling interval in milliseconds (default: 30000)
 * @param {boolean} enabled - Whether auto-refresh is enabled
 * @param {object} options - Additional options
 * @returns {object} - Control functions and status
 */
export function useAutoRefresh(refreshCallback, intervalMs = 15000, enabled = true, options = {}) {
  const callbackRef = useRef(refreshCallback);
  const intervalRef = useRef(null);
  const isActiveRef = useRef(false);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = refreshCallback;
  }, [refreshCallback]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (!enabled || !callbackRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isActiveRef.current = false;
      }
      return;
    }

    // Start polling
    isActiveRef.current = true;
    intervalRef.current = setInterval(() => {
      if (callbackRef.current && isActiveRef.current) {
        // Only refresh if document is visible (tab is active)
        if (!document.hidden || options.refreshWhenHidden) {
          console.log('🔄 Auto-refresh: Polling for updates...');
          callbackRef.current();
        }
      }
    }, intervalMs);

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isActiveRef.current = false;
      }
    };
  }, [intervalMs, enabled, options.refreshWhenHidden]);

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    if (callbackRef.current) {
      console.log('🔄 Manual refresh triggered');
      callbackRef.current();
    }
  }, []);

  // Pause/resume functions
  const pause = useCallback(() => {
    isActiveRef.current = false;
    console.log('⏸️ Auto-refresh paused');
  }, []);

  const resume = useCallback(() => {
    isActiveRef.current = true;
    console.log('▶️ Auto-refresh resumed');
  }, []);

  // Check if currently active
  const isActive = useCallback(() => {
    return isActiveRef.current && intervalRef.current !== null;
  }, []);

  return {
    manualRefresh,
    pause,
    resume,
    isActive
  };
}

/**
 * Hook for order auto-refresh
 * @param {function} refreshCallback - Function to call when refreshing orders
 * @param {boolean} enabled - Whether auto-refresh is enabled
 */
export function useOrderAutoRefresh(refreshCallback, enabled = true) {
  return useAutoRefresh(refreshCallback, 15000, enabled, {
    refreshWhenHidden: false // Don't refresh when tab is not active
  });
}

/**
 * Hook for transaction auto-refresh
 * @param {function} refreshCallback - Function to call when refreshing transactions
 * @param {boolean} enabled - Whether auto-refresh is enabled
 */
export function useTransactionAutoRefresh(refreshCallback, enabled = true) {
  return useAutoRefresh(refreshCallback, 15000, enabled, {
    refreshWhenHidden: false // Don't refresh when tab is not active
  });
}

/**
 * Hook for menu auto-refresh
 * @param {function} refreshCallback - Function to call when refreshing menu
 * @param {boolean} enabled - Whether auto-refresh is enabled
 */
export function useMenuAutoRefresh(refreshCallback, enabled = true) {
  return useAutoRefresh(refreshCallback, 15000, enabled, {
    refreshWhenHidden: false // Don't refresh when tab is not active
  });
}

/**
 * Hook for general data auto-refresh with custom interval
 * @param {function} refreshCallback - Function to call on refresh
 * @param {number} intervalSeconds - Refresh interval in seconds
 * @param {boolean} enabled - Whether auto-refresh is enabled
 */
export function useCustomAutoRefresh(refreshCallback, intervalSeconds = 15, enabled = true) {
  return useAutoRefresh(refreshCallback, intervalSeconds * 1000, enabled, {
    refreshWhenHidden: false
  });
}

/**
 * Hook for modal auto-refresh with autoreload support
 * @param {Object} options - Configuration options
 * @param {string} options.modelType - The model type to refresh (e.g., 'Order', 'Payment')
 * @param {Function} options.onDataUpdate - Callback when data needs to be refreshed
 * @param {boolean} options.enabled - Whether auto-refresh is enabled
 */
export function useModalAutoRefresh({
  modelType = 'Order',
  onDataUpdate,
  enabled = true
}) {
  const refreshCallback = useCallback(() => {
    if (onDataUpdate) {
      console.log(`🔄 Modal auto-refresh: Refreshing ${modelType} data...`);
      onDataUpdate({
        model: modelType,
        type: 'refresh',
        source: 'auto_refresh',
        timestamp: new Date().toISOString()
      });
    }
  }, [modelType, onDataUpdate]);

  return useAutoRefresh(refreshCallback, 15000, enabled, {
    refreshWhenHidden: false
  });
}

export default useAutoRefresh;
