// WebSocket Service for Real-time Communication
// Handles WebSocket connections with Django Channels backend

import { BACKEND_BASE_URL } from '../utils/api';
import { getWebSocketUrl, logWebSocketConfig } from '../utils/websocketConfig';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.isConnected = false;
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.heartbeatInterval = null;
    this.subscriptions = new Set();
    this.pendingAuth = false;
    this.authToken = null;
    this.user = null;
  }

  // Get WebSocket URL based on environment using configuration utility
  getWebSocketUrl() {
    return getWebSocketUrl();
  }

  // Connect to WebSocket
  connect(authToken = null) {
    if (this.isConnected || this.isConnecting) {
      console.log('🔌 WebSocket already connected or connecting');
      return;
    }

    // Log WebSocket configuration for debugging
    logWebSocketConfig();

    const wsUrl = this.getWebSocketUrl();
    if (!wsUrl) {
      console.error('❌ WebSocket URL not configured');
      console.error('Please check your environment variables');
      return;
    }

    this.isConnecting = true;
    this.authToken = authToken;
    console.log('🔌 Connecting to WebSocket:', wsUrl);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyListeners('connected');
        
        // Auto-authenticate if token provided
        if (this.authToken) {
          this.authenticate(this.authToken);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.pendingAuth = false;
        this.user = null;
        this.stopHeartbeat();
        this.notifyListeners('disconnected');
        this.handleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
        this.notifyListeners('error', error);
      };

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.isConnecting = false;
    }
  }

  // Disconnect from WebSocket
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket');
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();
  }

  // Send message through WebSocket
  send(message) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot send message');
      return false;
    }

    try {
      const messageStr = JSON.stringify(message);
      this.socket.send(messageStr);
      console.log('📤 WebSocket message sent:', message);
      return true;
    } catch (error) {
      console.error('❌ WebSocket send error:', error);
      return false;
    }
  }

  // Authenticate with JWT token
  authenticate(token) {
    if (!this.isConnected || this.pendingAuth) {
      console.warn('⚠️ Cannot authenticate - WebSocket not connected or authentication in progress');
      return;
    }

    this.pendingAuth = true;
    this.authToken = token;
    
    this.send({
      type: 'authenticate',
      token: token
    });
  }

  // Subscribe to specific channels
  subscribe(channels) {
    if (!this.isAuthenticated) {
      console.warn('⚠️ Cannot subscribe - not authenticated');
      return;
    }

    const channelArray = Array.isArray(channels) ? channels : [channels];
    channelArray.forEach(channel => this.subscriptions.add(channel));
    
    this.send({
      type: 'subscribe',
      channels: channelArray
    });
  }

  // Unsubscribe from specific channels
  unsubscribe(channels) {
    if (!this.isAuthenticated) {
      console.warn('⚠️ Cannot unsubscribe - not authenticated');
      return;
    }

    const channelArray = Array.isArray(channels) ? channels : [channels];
    channelArray.forEach(channel => this.subscriptions.delete(channel));
    
    this.send({
      type: 'unsubscribe',
      channels: channelArray
    });
  }

  // Handle incoming messages
  handleMessage(data) {
    const { type, payload, status, user, channels, message } = data;

    switch (type) {
      case 'connection_status':
        if (status === 'connected') {
          this.notifyListeners('connection_established', payload);
        }
        break;
        
      case 'authentication_status':
        this.pendingAuth = false;
        if (status === 'authenticated') {
          this.isAuthenticated = true;
          this.user = user;
          this.notifyListeners('authenticated', { user });
          
          // Re-subscribe to channels after authentication
          if (this.subscriptions.size > 0) {
            this.subscribe(Array.from(this.subscriptions));
          }
        } else {
          this.isAuthenticated = false;
          this.user = null;
          this.notifyListeners('authentication_failed', { message });
        }
        break;
        
      case 'subscription_status':
        if (status === 'subscribed') {
          this.notifyListeners('subscribed', { channels });
        }
        break;
        
      case 'heartbeat':
        // Respond to server heartbeat
        this.send({ type: 'heartbeat' });
        break;
        
      case 'heartbeat_response':
        // Server responded to our heartbeat
        break;
        
      case 'order_update':
        this.notifyListeners('order_update', payload);
        break;
        
      case 'menu_update':
        this.notifyListeners('menu_update', payload);
        break;
        
      case 'transaction_update':
        this.notifyListeners('transaction_update', payload);
        break;
        
      case 'broadcast':
        this.notifyListeners('broadcast', payload);
        break;
        
      case 'notification':
        this.notifyListeners('notification', payload);
        break;
        
      case 'error':
        console.error('❌ WebSocket server error:', message);
        this.notifyListeners('server_error', { message });
        break;
        
      default:
        console.log('📨 Unknown WebSocket message type:', type);
        this.notifyListeners('message', data);
    }
  }

  // Handle reconnection
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max WebSocket reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`🔄 Reconnecting to WebSocket in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  // Start heartbeat to keep connection alive
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'heartbeat' });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Add event listener
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify listeners
  notifyListeners(event, data = null) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ WebSocket listener error:', error);
        }
      });
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      isAuthenticated: this.isAuthenticated,
      pendingAuth: this.pendingAuth,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions),
      user: this.user,
      url: this.getWebSocketUrl()
    };
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
