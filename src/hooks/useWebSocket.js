// React Hook for WebSocket functionality
// Provides easy WebSocket integration for React components

import { useEffect, useState, useCallback } from 'react';
import websocketService from '../services/websocketService';

export const useWebSocket = (autoConnect = true) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  // Update connection status
  const updateStatus = useCallback(() => {
    const status = websocketService.getStatus();
    setIsConnected(status.isConnected);
    setIsConnecting(status.isConnecting);
  }, []);

  // Handle connection events
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    const handleError = (errorData) => {
      setError(errorData);
      setIsConnecting(false);
    };

    const handleMessage = (data) => {
      setLastMessage(data);
    };

    // Add event listeners
    websocketService.addEventListener('connected', handleConnected);
    websocketService.addEventListener('disconnected', handleDisconnected);
    websocketService.addEventListener('error', handleError);
    websocketService.addEventListener('message', handleMessage);

    // Auto-connect if enabled
    if (autoConnect) {
      websocketService.connect();
    }

    // Initial status update
    updateStatus();

    // Cleanup
    return () => {
      websocketService.removeEventListener('connected', handleConnected);
      websocketService.removeEventListener('disconnected', handleDisconnected);
      websocketService.removeEventListener('error', handleError);
      websocketService.removeEventListener('message', handleMessage);
    };
  }, [autoConnect, updateStatus]);

  // Connect function
  const connect = useCallback(() => {
    setIsConnecting(true);
    websocketService.connect();
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  // Send message function
  const sendMessage = useCallback((message) => {
    return websocketService.send(message);
  }, []);

  // Subscribe to specific message types
  const subscribe = useCallback((messageType, callback) => {
    websocketService.addEventListener(messageType, callback);
    return () => websocketService.removeEventListener(messageType, callback);
  }, []);

  return {
    isConnected,
    isConnecting,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    subscribe
  };
};

// Hook for specific message types
export const useWebSocketSubscription = (messageType, callback) => {
  useEffect(() => {
    const unsubscribe = websocketService.addEventListener(messageType, callback);
    return unsubscribe;
  }, [messageType, callback]);
};

// Hook for order updates
export const useOrderUpdates = (callback) => {
  useWebSocketSubscription('order_update', callback);
};

// Hook for menu updates
export const useMenuUpdates = (callback) => {
  useWebSocketSubscription('menu_update', callback);
};

// Hook for transaction updates
export const useTransactionUpdates = (callback) => {
  useWebSocketSubscription('transaction_update', callback);
};

export default useWebSocket;
