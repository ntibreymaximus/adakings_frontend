import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import pollingManager from '../utils/pollingManager';

/**
 * Real-time updates hook for instant order synchronization
 * Uses polling, WebSockets (when available), and optimistic updates
 */
export const useRealTimeUpdates = (options = {}) => {
  const {
    endpoint,
    pollInterval = 500, // Ultra-fast 500ms polling for instant updates
    enableWebSocket = true,
    enableOptimisticUpdates = true,
    onUpdate,
    onError,
    autoStart = true
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);

  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const lastDataHash = useRef(null);
  const optimisticUpdates = useRef(new Map());
  const retryAttempts = useRef(0);
  const consecutiveErrors = useRef(0);
  const maxRetries = 3;
  const componentId = useRef(`rtUpdates_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Global polling coordinator to prevent conflicts
  const globalPollingCoordinator = useRef(window.globalPollingCoordinator || {
    activeEndpoints: new Map(),
    register: function(id, endpoint, interval, callback) {
      console.log(`[PollingCoordinator] Registering ${id} for ${endpoint}`);
      
      // If same endpoint is already being polled, just add callback
      if (this.activeEndpoints.has(endpoint)) {
        const existing = this.activeEndpoints.get(endpoint);
        existing.callbacks.set(id, callback);
        console.log(`[PollingCoordinator] Added callback to existing polling for ${endpoint}`);
        return existing.intervalId;
      }
      
      // Create new polling for this endpoint
      const callbacks = new Map();
      callbacks.set(id, callback);
      
      const intervalId = setInterval(() => {
        console.log(`[PollingCoordinator] Executing coordinated polling for ${endpoint}`);
        callbacks.forEach((cb, cbId) => {
          try {
            cb();
          } catch (error) {
            console.error(`[PollingCoordinator] Callback error for ${cbId}:`, error);
          }
        });
      }, interval);
      
      this.activeEndpoints.set(endpoint, {
        intervalId,
        callbacks,
        interval
      });
      
      console.log(`[PollingCoordinator] Created new polling for ${endpoint} with interval ${interval}ms`);
      return intervalId;
    },
    
    unregister: function(id, endpoint) {
      console.log(`[PollingCoordinator] Unregistering ${id} from ${endpoint}`);
      
      if (!this.activeEndpoints.has(endpoint)) return;
      
      const existing = this.activeEndpoints.get(endpoint);
      existing.callbacks.delete(id);
      
      // If no more callbacks, clear the interval
      if (existing.callbacks.size === 0) {
        clearInterval(existing.intervalId);
        this.activeEndpoints.delete(endpoint);
        console.log(`[PollingCoordinator] Cleared polling for ${endpoint}`);
      }
    }
  });
  
  // Make coordinator globally available
  if (!window.globalPollingCoordinator) {
    window.globalPollingCoordinator = globalPollingCoordinator.current;
  }

  // Calculate data hash for change detection
  const calculateHash = useCallback((data) => {
    return JSON.stringify(data).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
  }, []);

  // Debounce timer to prevent excessive requests
  const debounceRef = useRef(null);
  
  // Local cache to reduce redundant requests
  const cacheRef = useRef({
    data: null,
    timestamp: 0,
    ttl: 1000 // 1 second cache TTL for instant updates
  });
  
  // Check if cached data is still valid
  const isCacheValid = useCallback(() => {
    const now = Date.now();
    return cacheRef.current.data && (now - cacheRef.current.timestamp) < cacheRef.current.ttl;
  }, []);
  
  // Fetch data with error handling and retry logic
  const fetchData = useCallback(async (isBackground = false, useCache = true) => {
    // Check cache first for background requests
    if (isBackground && useCache && isCacheValid()) {
      const cachedData = cacheRef.current.data;
      const dataArray = cachedData.results || cachedData.data || cachedData || [];
      
      // Apply optimistic updates to cached data
      let finalData = [...dataArray];
      optimisticUpdates.current.forEach((update, id) => {
        const index = finalData.findIndex(item => item.id === id);
        if (index >= 0) {
          finalData[index] = { ...finalData[index], ...update };
        } else if (update._isNew) {
          finalData.unshift(update);
        }
      });
      
      setData(finalData);
      return; // Use cached data
    }
    
    try {
      if (!isBackground) setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(2000) // Ultra-fast 2 second timeout for instant responsiveness
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('AUTHENTICATION_EXPIRED');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newData = await response.json();
      const dataArray = newData.results || newData.data || newData || [];
      
      // Update cache
      cacheRef.current = {
        data: newData,
        timestamp: Date.now(),
        ttl: isBackground ? 1000 : 2000 // Minimal cache for instant updates
      };
      
      // Check if data actually changed
      const newHash = calculateHash(dataArray);
      if (lastDataHash.current !== newHash) {
        lastDataHash.current = newHash;
        
        // Apply optimistic updates
        let finalData = [...dataArray];
        optimisticUpdates.current.forEach((update, id) => {
          const index = finalData.findIndex(item => item.id === id);
          if (index >= 0) {
            finalData[index] = { ...finalData[index], ...update };
          } else if (update._isNew) {
            finalData.unshift(update);
          }
        });
        
        setData(finalData);
        setLastUpdated(new Date());
        setUpdateCount(prev => prev + 1);
        
        if (onUpdate) {
          onUpdate(finalData);
        }
      }

      retryAttempts.current = 0;
      consecutiveErrors.current = 0; // Reset error count on success
      
    } catch (err) {
      // Handle different types of errors more gracefully
      const isTimeoutError = err.name === 'TimeoutError' || err.name === 'AbortError' || err.message.includes('timeout');
      const isNetworkError = err.name === 'TypeError' || err.message.includes('Failed to fetch');
      
      if (err.message.includes('AUTHENTICATION_EXPIRED')) {
        if (onError) {
          onError(err);
        }
        return;
      }

      // Only log non-timeout errors to avoid console spam
      if (!isTimeoutError && !isBackground) {
        console.error('Real-time fetch error:', err);
      }
      
      retryAttempts.current += 1;
      
      if (!isBackground && retryAttempts.current <= maxRetries) {
        // Minimal backoff for instant recovery
        const baseDelay = isTimeoutError ? 500 : 200;
        const delay = Math.min(baseDelay * Math.pow(1.5, retryAttempts.current - 1), 2000);
        setTimeout(() => fetchData(isBackground), delay);
      } else {
        // Only set user-visible errors for non-timeout issues or after max retries
        if (!isTimeoutError || retryAttempts.current > maxRetries) {
          const userFriendlyMessage = isTimeoutError 
            ? 'Connection is slow. Orders will update when connection improves.'
            : isNetworkError 
            ? 'Unable to connect to server. Please check your connection.'
            : err.message;
          setError(userFriendlyMessage);
        }
        
        consecutiveErrors.current += 1; // Track consecutive errors
        
        if (onError && (!isTimeoutError || retryAttempts.current > maxRetries)) {
          onError(err);
        }
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [endpoint, onUpdate, onError, calculateHash, isCacheValid]);

  // WebSocket connection for real-time updates with instant reconnection
  const wsReconnectAttempts = useRef(0);
  const wsReconnectDelay = useRef(100); // Start with 100ms for instant reconnection
  const maxReconnectDelay = 3000; // Max 3 seconds for faster recovery
  const maxReconnectAttempts = 20;
  const wsHeartbeatInterval = useRef(null);
  const wsLastHeartbeat = useRef(null);
  
  const connectWebSocket = useCallback(() => {
    if (!enableWebSocket || !endpoint) return;

    try {
      // Convert HTTP to WebSocket URL and construct proper WebSocket endpoint
      const baseUrl = endpoint.replace(/^http/, 'ws').replace(/\/api\/orders\/$/, '');
      const wsUrl = `${baseUrl}/ws/orders/`;
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('[WebSocket] No authentication token available');
        return;
      }
      
      console.log(`[WebSocket] Connecting to: ${wsUrl} (attempt ${wsReconnectAttempts.current + 1})`);
      wsRef.current = new WebSocket(`${wsUrl}?token=${token}`);
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          console.warn('[WebSocket] Connection timeout, closing...');
          wsRef.current.close();
        }
      }, 3000); // 3 second timeout for faster recovery
      
      wsRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('[RealTime] WebSocket connected successfully');
        setIsConnected(true);
        
        // Reset reconnection parameters on successful connection
        wsReconnectAttempts.current = 0;
        wsReconnectDelay.current = 100;
        
        // Start client-side heartbeat
        startHeartbeat();
        
        // Show success notification only after the first connection or after reconnection
        if (wsReconnectAttempts.current > 0 || !wsLastHeartbeat.current) {
          toast.success('Real-time updates connected', {
            position: 'bottom-right',
            autoClose: 2000,
            hideProgressBar: true
          });
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle heartbeat responses
          if (message.type === 'heartbeat' || message.type === 'heartbeat_ack') {
            wsLastHeartbeat.current = Date.now();
            return;
          }
          
          if (message.type === 'data_update') {
            // Instant update from WebSocket
            setData(message.data);
            setLastUpdated(new Date());
            setUpdateCount(prev => prev + 1);
            
            if (onUpdate) {
              onUpdate(message.data);
            }
          } else if (message.type === 'item_created') {
            // Add new item optimistically
            setData(prev => [message.item, ...prev]);
            setUpdateCount(prev => prev + 1);
          } else if (message.type === 'item_updated') {
            // Update existing item
            setData(prev => prev.map(item => 
              item.id === message.item.id ? { ...item, ...message.item } : item
            ));
            setUpdateCount(prev => prev + 1);
          } else if (message.type === 'item_deleted') {
            // Remove deleted item
            setData(prev => prev.filter(item => item.id !== message.item_id));
            setUpdateCount(prev => prev + 1);
          }
        } catch (err) {
          console.error('[RealTime] WebSocket message error:', err);
        }
      };
      
      wsRef.current.onclose = (event) => {
        clearTimeout(connectionTimeout);
        stopHeartbeat();
        setIsConnected(false);
        
        const wasCleanClose = event.code === 1000;
        const wasAuthError = event.code === 4001;
        
        if (wasAuthError) {
          console.error('[WebSocket] Authentication failed');
          toast.error('Authentication expired. Please login again.', {
            position: 'bottom-right',
            autoClose: 5000
          });
          return;
        }
        
        console.log(`[RealTime] WebSocket disconnected (code: ${event.code}, clean: ${wasCleanClose})`);
        
        // Attempt to reconnect with exponential backoff
        if (autoStart && wsReconnectAttempts.current < maxReconnectAttempts) {
          wsReconnectAttempts.current += 1;
          
          // Minimal backoff with small jitter for instant reconnection
          const jitter = Math.random() * 100; // 0-100ms jitter
          const delay = Math.min(wsReconnectDelay.current + jitter, maxReconnectDelay);
          wsReconnectDelay.current = Math.min(wsReconnectDelay.current * 1.2, maxReconnectDelay);
          
          console.log(`[WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${wsReconnectAttempts.current}/${maxReconnectAttempts})`);
          
          setTimeout(() => {
            if (autoStart) {
              connectWebSocket();
            }
          }, delay);
        } else if (wsReconnectAttempts.current >= maxReconnectAttempts) {
          console.error('[WebSocket] Max reconnection attempts reached');
          toast.error('Connection lost. Please refresh the page.', {
            position: 'bottom-right',
            autoClose: 0 // Don't auto-close
          });
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('[RealTime] WebSocket error:', error);
        setIsConnected(false);
      };
      
    } catch (err) {
      console.error('[RealTime] WebSocket connection failed:', err);
      setIsConnected(false);
    }
  }, [enableWebSocket, endpoint, onUpdate, autoStart]);
  
  // Client-side heartbeat to detect connection issues
  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // Clear any existing heartbeat
    
    wsHeartbeatInterval.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now()
          }));
          
          // Check if we've missed heartbeats (connection might be stale)
          const now = Date.now();
          if (wsLastHeartbeat.current && (now - wsLastHeartbeat.current) > 60000) {
            console.warn('[WebSocket] Heartbeat timeout, forcing reconnection');
            wsRef.current.close(1000, 'Heartbeat timeout');
          }
        } catch (err) {
          console.error('[WebSocket] Error sending heartbeat:', err);
        }
      }
    }, 30000); // Send heartbeat every 30 seconds
  }, []);
  
  const stopHeartbeat = useCallback(() => {
    if (wsHeartbeatInterval.current) {
      clearInterval(wsHeartbeatInterval.current);
      wsHeartbeatInterval.current = null;
    }
  }, []);

  // Start polling for updates with coordinated intervals
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      globalPollingCoordinator.current.unregister(componentId.current, endpoint);
      pollIntervalRef.current = null;
    }
    
    // Adaptive polling: slower when there are consecutive errors
    const adaptiveInterval = consecutiveErrors.current > 3 
      ? pollInterval * Math.min(2, consecutiveErrors.current / 2) // Slow down on errors
      : pollInterval;
    
    // Use coordinated polling to prevent conflicts
    pollIntervalRef.current = globalPollingCoordinator.current.register(
      componentId.current,
      endpoint,
      adaptiveInterval,
      () => fetchData(true)
    );
  }, [fetchData, pollInterval, endpoint]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      globalPollingCoordinator.current.unregister(componentId.current, endpoint);
      pollIntervalRef.current = null;
    }
  }, [endpoint]);

  // Optimistic update - apply immediately, sync later
  const optimisticUpdate = useCallback((id, updates) => {
    if (!enableOptimisticUpdates) return;
    
    optimisticUpdates.current.set(id, updates);
    
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
    
    // Remove optimistic update after 10 seconds (should be synced by then)
    setTimeout(() => {
      optimisticUpdates.current.delete(id);
    }, 10000);
  }, [enableOptimisticUpdates]);

  // Optimistic create - add new item immediately
  const optimisticCreate = useCallback((newItem) => {
    if (!enableOptimisticUpdates) return;
    
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticItem = { ...newItem, id: tempId, _isNew: true, _isOptimistic: true };
    
    optimisticUpdates.current.set(tempId, optimisticItem);
    setData(prev => [optimisticItem, ...prev]);
    
    return tempId;
  }, [enableOptimisticUpdates]);

  // Force refresh
  const refresh = useCallback(() => {
    optimisticUpdates.current.clear();
    fetchData(false);
  }, [fetchData]);

  // Manual update trigger
  const triggerUpdate = useCallback((newData) => {
    setData(newData);
    setLastUpdated(new Date());
    setUpdateCount(prev => prev + 1);
  }, []);

  // Initialize
  useEffect(() => {
    if (!autoStart) return;
    
    fetchData(false);
    startPolling();
    connectWebSocket();
    
    return () => {
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close();
      }
      // Copy the current value to avoid stale closure
      const currentOptimisticUpdates = optimisticUpdates.current;
      currentOptimisticUpdates.clear();
    };
  }, [autoStart, fetchData, startPolling, connectWebSocket, stopPolling]);

  // Handle visibility change - pause/resume updates when tab is hidden/visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        fetchData(true); // Immediate update when tab becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startPolling, stopPolling, fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    isConnected,
    updateCount,
    refresh,
    optimisticUpdate,
    optimisticCreate,
    triggerUpdate,
    startPolling,
    stopPolling
  };
};

export default useRealTimeUpdates;
