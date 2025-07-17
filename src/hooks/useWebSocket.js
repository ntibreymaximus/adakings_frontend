// React Hook for WebSocket subscriptions
// This hook allows components to subscribe to WebSocket events and receive real-time updates

import { useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';

/**
 * Custom hook for WebSocket subscriptions
 * @param {string} eventType - The type of event to subscribe to
 * @param {function} callback - Function to call when event is received
 * @param {boolean} enabled - Whether the subscription is enabled
 * @returns {object} - WebSocket status and control functions
 */
export function useWebSocket(eventType, callback, enabled = true) {
  const callbackRef = useRef(callback);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!enabled || !eventType) return;

    const wrappedCallback = (data) => {
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    };

    websocketService.subscribe(eventType, wrappedCallback);

    return () => {
      websocketService.unsubscribe(eventType, wrappedCallback);
    };
  }, [eventType, enabled]);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return websocketService.getConnectionStatus();
  }, []);

  // Check if authenticated
  const isAuthenticated = useCallback(() => {
    return websocketService.isWebSocketAuthenticated();
  }, []);

  return {
    getConnectionStatus,
    isAuthenticated,
    websocketService
  };
}

/**
 * Hook for order updates
 * @param {function} callback - Function to call when order is updated
 * @param {boolean} enabled - Whether the subscription is enabled
 */
export function useOrderUpdates(callback, enabled = true) {
  return useWebSocket('order_update', callback, enabled);
}

/**
 * Hook for menu updates
 * @param {function} callback - Function to call when menu is updated
 * @param {boolean} enabled - Whether the subscription is enabled
 */
export function useMenuUpdates(callback, enabled = true) {
  return useWebSocket('menu_update', callback, enabled);
}

/**
 * Hook for transaction updates
 * @param {function} callback - Function to call when transaction is updated
 * @param {boolean} enabled - Whether the subscription is enabled
 */
export function useTransactionUpdates(callback, enabled = true) {
  return useWebSocket('transaction_update', callback, enabled);
}

/**
 * Hook for autoreload updates
 * @param {function} callback - Function to call when autoreload event occurs
 * @param {boolean} enabled - Whether the subscription is enabled
 */
export function useAutoreloadUpdates(callback, enabled = true) {
  return useWebSocket('autoreload_update', callback, enabled);
}

/**
 * Hook for broadcast messages
 * @param {function} callback - Function to call when broadcast is received
 * @param {boolean} enabled - Whether the subscription is enabled
 */
export function useBroadcastMessages(callback, enabled = true) {
  return useWebSocket('broadcast', callback, enabled);
}

/**
 * Hook for user notifications
 * @param {function} callback - Function to call when notification is received
 * @param {boolean} enabled - Whether the subscription is enabled
 */
export function useUserNotifications(callback, enabled = true) {
  return useWebSocket('notification', callback, enabled);
}

/**
 * Hook for multiple WebSocket subscriptions
 * @param {object} subscriptions - Object with eventType as key and callback as value
 * @param {boolean} enabled - Whether the subscriptions are enabled
 */
export function useMultipleWebSocketSubscriptions(subscriptions, enabled = true) {
  const subscriptionsRef = useRef(subscriptions);
  
  useEffect(() => {
    subscriptionsRef.current = subscriptions;
  }, [subscriptions]);

  useEffect(() => {
    if (!enabled || !subscriptions) return;

    const wrappedCallbacks = {};
    
    // Subscribe to all events
    Object.entries(subscriptions).forEach(([eventType, callback]) => {
      if (callback) {
        wrappedCallbacks[eventType] = (data) => {
          const currentCallback = subscriptionsRef.current[eventType];
          if (currentCallback) {
            currentCallback(data);
          }
        };
        websocketService.subscribe(eventType, wrappedCallbacks[eventType]);
      }
    });

    return () => {
      // Unsubscribe from all events
      Object.entries(wrappedCallbacks).forEach(([eventType, wrappedCallback]) => {
        websocketService.unsubscribe(eventType, wrappedCallback);
      });
    };
  }, [enabled]);

  return {
    getConnectionStatus: () => websocketService.getConnectionStatus(),
    isAuthenticated: () => websocketService.isWebSocketAuthenticated(),
    websocketService
  };
}

export default useWebSocket;
