// WebSocket Service for Real-time Updates
// This service handles WebSocket connections, authentication, and message processing

import websocketManager from '../config/websocket';
import { toast } from 'react-toastify';

class WebSocketService {
  constructor() {
    this.isAuthenticated = false;
    this.token = null;
    this.subscribers = new Map();
    this.connectionStatus = 'disconnected';
    this.messageQueue = [];
  }

  // Initialize WebSocket connection
  init() {
    websocketManager.on('open', this.handleOpen.bind(this));
    websocketManager.on('message', this.handleMessage.bind(this));
    websocketManager.on('close', this.handleClose.bind(this));
    websocketManager.on('error', this.handleError.bind(this));
    
    websocketManager.connect();
  }

  // Handle WebSocket connection open
  handleOpen() {
    this.connectionStatus = 'connected';
    console.log('WebSocket connected');
    
    // Authenticate if token is available
    if (this.token) {
      this.authenticate(this.token);
    }

    // Process queued messages
    this.processMessageQueue();
  }

  // Handle WebSocket connection close
  handleClose(event) {
    this.connectionStatus = 'disconnected';
    this.isAuthenticated = false;
    console.log('WebSocket disconnected:', event.code, event.reason);
  }

  // Handle WebSocket errors
  handleError(error) {
    this.connectionStatus = 'error';
    console.error('WebSocket error:', error);
  }

  // Authenticate with JWT token
  authenticate(token) {
    this.token = token;
    
    if (this.connectionStatus === 'connected') {
      websocketManager.send({
        type: 'authenticate',
        token: token
      });
    }
  }

  // Subscribe to specific channels
  subscribeToChannels(channels = ['orders', 'menu', 'transactions']) {
    if (this.isAuthenticated) {
      websocketManager.send({
        type: 'subscribe',
        channels: channels
      });
    } else {
      // Queue the subscription request
      this.messageQueue.push({
        type: 'subscribe',
        channels: channels
      });
    }
  }

  // Unsubscribe from channels
  unsubscribeFromChannels(channels) {
    if (this.isAuthenticated) {
      websocketManager.send({
        type: 'unsubscribe',
        channels: channels
      });
    }
  }

  // Process queued messages
  processMessageQueue() {
    if (this.isAuthenticated && this.messageQueue.length > 0) {
      this.messageQueue.forEach(message => {
        websocketManager.send(message);
      });
      this.messageQueue = [];
    }
  }

  // Handle incoming messages
  handleMessage(data) {
    switch (data.type) {
      case 'connection_status':
        this.handleConnectionStatus(data);
        break;
      case 'authentication_status':
        this.handleAuthenticationStatus(data);
        break;
      case 'subscription_status':
        this.handleSubscriptionStatus(data);
        break;
      case 'order_update':
        this.handleOrderUpdate(data);
        break;
      case 'menu_update':
        this.handleMenuUpdate(data);
        break;
      case 'transaction_update':
        this.handleTransactionUpdate(data);
        break;
      case 'autoreload_update':
        this.handleAutoreloadUpdate(data);
        break;
      case 'broadcast':
        this.handleBroadcast(data);
        break;
      case 'notification':
        this.handleNotification(data);
        break;
      case 'heartbeat':
        this.handleHeartbeat(data);
        break;
      case 'error':
        this.handleErrorMessage(data);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  // Handle connection status
  handleConnectionStatus(data) {
    console.log('Connection status:', data.status);
    if (data.status === 'connected') {
      this.connectionStatus = 'connected';
    }
  }

  // Handle authentication status
  handleAuthenticationStatus(data) {
    if (data.status === 'authenticated') {
      this.isAuthenticated = true;
      console.log('WebSocket authenticated for user:', data.user.username);
      
      // Subscribe to default channels
      this.subscribeToChannels();
      
      // Process queued messages
      this.processMessageQueue();
    } else {
      this.isAuthenticated = false;
      console.warn('WebSocket authentication failed');
    }
  }

  // Handle subscription status
  handleSubscriptionStatus(data) {
    console.log('Subscription status:', data.status, 'Channels:', data.channels);
  }

  // Handle order updates
  handleOrderUpdate(data) {
    const order = data.payload.order;
    
    // Show non-intrusive notification
    toast.info(`Order ${order.order_number} updated: ${order.status}`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
    });

    // Notify subscribers
    this.notifySubscribers('order_update', data.payload);
  }

  // Handle menu updates
  handleMenuUpdate(data) {
    const menuItem = data.payload.menu_item;
    
    toast.info(`Menu item "${menuItem.name}" updated`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
    });

    // Notify subscribers
    this.notifySubscribers('menu_update', data.payload);
  }

  // Handle transaction updates
  handleTransactionUpdate(data) {
    const payment = data.payload.payment;
    
    toast.info(`Payment updated: ${payment.payment_method} - ${payment.status}`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
    });

    // Notify subscribers
    this.notifySubscribers('transaction_update', data.payload);
  }

  // Handle autoreload updates
  handleAutoreloadUpdate(data) {
    const { model, type, changes } = data.payload;
    
    // Show subtle notification for autoreload
    toast.success(`${model} ${type} detected`, {
      position: "bottom-right",
      autoClose: 2000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
    });

    // Notify subscribers
    this.notifySubscribers('autoreload_update', data.payload);
  }

  // Handle broadcast messages
  handleBroadcast(data) {
    const { message, type } = data.payload;
    
    // Show broadcast message with appropriate styling
    const toastType = type === 'error' ? toast.error : 
                     type === 'warning' ? toast.warn : 
                     type === 'success' ? toast.success : toast.info;
    
    toastType(message, {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

    // Notify subscribers
    this.notifySubscribers('broadcast', data.payload);
  }

  // Handle user notifications
  handleNotification(data) {
    const { message, type } = data.payload;
    
    toast.info(message, {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

    // Notify subscribers
    this.notifySubscribers('notification', data.payload);
  }

  // Handle heartbeat
  handleHeartbeat(data) {
    // Respond to heartbeat if needed
    // console.log('Heartbeat received');
  }

  // Handle error messages
  handleErrorMessage(data) {
    console.error('WebSocket error message:', data.message);
    toast.error(`Connection error: ${data.message}`, {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  // Subscribe to specific event types
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);
  }

  // Unsubscribe from specific event types
  unsubscribe(eventType, callback) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).delete(callback);
    }
  }

  // Notify subscribers of events
  notifySubscribers(eventType, data) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket subscriber for ${eventType}:`, error);
        }
      });
    }
  }

  // Get connection status
  getConnectionStatus() {
    return this.connectionStatus;
  }

  // Check if authenticated
  isWebSocketAuthenticated() {
    return this.isAuthenticated;
  }

  // Disconnect WebSocket
  disconnect() {
    this.isAuthenticated = false;
    this.token = null;
    this.messageQueue = [];
    this.subscribers.clear();
    websocketManager.disconnect();
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
