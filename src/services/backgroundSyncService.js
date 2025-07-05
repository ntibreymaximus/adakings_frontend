// Enhanced Background Sync Service
// Provides background sync capabilities for offline operations and order retry mechanisms

class BackgroundSyncService {
  constructor() {
    this.pendingOperations = new Map();
    this.syncQueue = [];
    this.retryQueue = [];
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.subscribers = new Set();
    
    // Retry configuration for different operation types
    this.retryConfig = {
      'create-order': {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 60000,
        backoffFactor: 2
      },
      'update-order': {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 1.5
      },
      'profile-update': {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 20000,
        backoffFactor: 1.5
      },
      'payment': {
        maxRetries: 2,
        baseDelay: 5000,
        maxDelay: 30000,
        backoffFactor: 2
      }
    };

    this.setupNetworkListeners();
    this.setupServiceWorkerIntegration();
    this.startPeriodicSync();
    this.loadPendingOperations();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Background Sync: Network restored - starting sync');
      this.isOnline = true;
      this.processSyncQueue();
      this.notifySubscribers({ type: 'network-restored' });
    });

    window.addEventListener('offline', () => {
      console.log('📴 Background Sync: Network lost - queueing operations');
      this.isOnline = false;
      this.notifySubscribers({ type: 'network-lost' });
    });
  }

  setupServiceWorkerIntegration() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
    }
  }

  handleServiceWorkerMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'SYNC_COMPLETED':
        this.handleSyncCompleted(payload);
        break;
      case 'SYNC_FAILED':
        this.handleSyncFailed(payload);
        break;
      case 'BACKGROUND_FETCH_SUCCESS':
        this.handleBackgroundFetchSuccess(payload);
        break;
    }
  }

  // Subscribe to sync events
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify all subscribers
  notifySubscribers(event) {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error notifying sync subscriber:', error);
      }
    });
  }

  // Queue an operation for background sync
  async queueOperation(operationType, operationData, options = {}) {
    const operation = {
      id: this.generateOperationId(),
      type: operationType,
      data: operationData,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.retryConfig[operationType]?.maxRetries || 3,
      status: 'pending',
      ...options
    };

    this.pendingOperations.set(operation.id, operation);
    this.syncQueue.push(operation.id);
    
    console.log(`📝 Background Sync: Queued ${operationType} operation:`, operation.id);
    
    // Save to persistent storage
    await this.savePendingOperations();
    
    // Try immediate sync if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
    
    // Register background sync if available
    this.registerBackgroundSync(operationType);
    
    this.notifySubscribers({
      type: 'operation-queued',
      operation
    });

    return operation.id;
  }

  // Create order with offline support
  async createOrderOffline(orderData) {
    console.log('🛒 Background Sync: Creating order offline');
    
    const operationId = await this.queueOperation('create-order', {
      endpoint: '/api/orders/',
      method: 'POST',
      body: orderData,
      timestamp: Date.now()
    });

    // Store order locally for immediate UI feedback
    const localOrder = {
      ...orderData,
      id: `temp_${operationId}`,
      status: 'pending_sync',
      created_offline: true,
      sync_operation_id: operationId
    };

    this.storeLocalOrder(localOrder);

    this.notifySubscribers({
      type: 'order-created-offline',
      order: localOrder,
      operationId
    });

    return localOrder;
  }

  // Update profile with offline support
  async updateProfileOffline(profileData) {
    console.log('👤 Background Sync: Updating profile offline');
    
    const operationId = await this.queueOperation('profile-update', {
      endpoint: '/api/profile/',
      method: 'PUT',
      body: profileData,
      timestamp: Date.now()
    });

    // Store profile locally
    this.storeLocalProfile(profileData);

    this.notifySubscribers({
      type: 'profile-updated-offline',
      profile: profileData,
      operationId
    });

    return operationId;
  }

  // Process the sync queue
  async processSyncQueue() {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Background Sync: Processing ${this.syncQueue.length} operations`);

    while (this.syncQueue.length > 0 && this.isOnline) {
      const operationId = this.syncQueue.shift();
      const operation = this.pendingOperations.get(operationId);

      if (!operation) {
        continue;
      }

      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error(`❌ Background Sync: Operation ${operationId} failed:`, error);
        await this.handleOperationFailure(operation, error);
      }
    }

    this.syncInProgress = false;
    await this.savePendingOperations();
  }

  // Execute a single operation
  async executeOperation(operation) {
    console.log(`⚡ Background Sync: Executing ${operation.type} operation:`, operation.id);

    const { endpoint, method, body, headers = {} } = operation.data;

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...headers
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Mark operation as completed
    operation.status = 'completed';
    operation.completedAt = Date.now();
    operation.result = result;

    // Handle successful operation
    await this.handleOperationSuccess(operation, result);

    // Remove from pending operations
    this.pendingOperations.delete(operation.id);

    console.log(`✅ Background Sync: ${operation.type} operation completed:`, operation.id);
  }

  // Handle successful operation
  async handleOperationSuccess(operation, result) {
    switch (operation.type) {
      case 'create-order':
        await this.handleOrderCreated(operation, result);
        break;
      case 'update-order':
        await this.handleOrderUpdated(operation, result);
        break;
      case 'profile-update':
        await this.handleProfileUpdated(operation, result);
        break;
    }

    this.notifySubscribers({
      type: 'operation-completed',
      operation,
      result
    });
  }

  // Handle order creation success
  async handleOrderCreated(operation, result) {
    // Remove local temporary order
    this.removeLocalOrder(`temp_${operation.id}`);
    
    // Store the real order
    this.storeLocalOrder(result);

    this.notifySubscribers({
      type: 'order-synced',
      operation,
      order: result
    });
  }

  // Handle profile update success
  async handleProfileUpdated(operation, result) {
    // Update local profile with server response
    this.storeLocalProfile(result);

    this.notifySubscribers({
      type: 'profile-synced',
      operation,
      profile: result
    });
  }

  // Handle operation failure
  async handleOperationFailure(operation, error) {
    operation.retryCount++;
    operation.lastError = error.message;
    operation.lastAttempt = Date.now();

    const config = this.retryConfig[operation.type] || this.retryConfig['create-order'];

    if (operation.retryCount < config.maxRetries) {
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, operation.retryCount - 1),
        config.maxDelay
      );

      console.log(`🔄 Background Sync: Retrying ${operation.type} in ${delay}ms (attempt ${operation.retryCount}/${config.maxRetries})`);

      // Schedule retry
      setTimeout(() => {
        if (this.isOnline) {
          this.syncQueue.push(operation.id);
          this.processSyncQueue();
        } else {
          this.retryQueue.push(operation.id);
        }
      }, delay);

      operation.status = 'retrying';
    } else {
      // Max retries exceeded
      operation.status = 'failed';
      operation.failedAt = Date.now();

      console.error(`❌ Background Sync: ${operation.type} failed permanently:`, operation.id);

      this.notifySubscribers({
        type: 'operation-failed',
        operation,
        error
      });

      // Handle permanent failure
      await this.handlePermanentFailure(operation);
    }
  }

  // Handle permanent operation failure
  async handlePermanentFailure(operation) {
    switch (operation.type) {
      case 'create-order':
        // Mark local order as failed
        const localOrder = this.getLocalOrder(`temp_${operation.id}`);
        if (localOrder) {
          localOrder.status = 'sync_failed';
          localOrder.sync_error = operation.lastError;
          this.storeLocalOrder(localOrder);
        }
        break;
    }
  }

  // Register background sync with service worker
  registerBackgroundSync(tag) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register(`sync-${tag}`)
          .then(() => {
            console.log(`🔄 Background Sync: Registered background sync for ${tag}`);
          })
          .catch(error => {
            console.error('Background sync registration failed:', error);
          });
      });
    }
  }

  // Start periodic sync attempts
  startPeriodicSync() {
    setInterval(() => {
      if (this.isOnline && (this.syncQueue.length > 0 || this.retryQueue.length > 0)) {
        // Move retry queue items back to sync queue
        while (this.retryQueue.length > 0) {
          this.syncQueue.push(this.retryQueue.shift());
        }
        this.processSyncQueue();
      }
    }, 30000); // Every 30 seconds
  }

  // Generate unique operation ID
  generateOperationId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get authentication headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Save pending operations to persistent storage
  async savePendingOperations() {
    try {
      const operations = Array.from(this.pendingOperations.values());
      localStorage.setItem('pendingOperations', JSON.stringify({
        operations,
        syncQueue: this.syncQueue,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save pending operations:', error);
    }
  }

  // Load pending operations from persistent storage
  loadPendingOperations() {
    try {
      const stored = localStorage.getItem('pendingOperations');
      if (stored) {
        const { operations, syncQueue, timestamp } = JSON.parse(stored);
        
        // Only load operations from the last 24 hours
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < maxAge) {
          operations.forEach(op => {
            this.pendingOperations.set(op.id, op);
          });
          this.syncQueue = syncQueue || [];
          
          console.log(`📥 Background Sync: Loaded ${operations.length} pending operations`);
        }
      }
    } catch (error) {
      console.error('Failed to load pending operations:', error);
    }
  }

  // Local storage helpers for orders
  storeLocalOrder(order) {
    try {
      const orders = this.getLocalOrders();
      const existingIndex = orders.findIndex(o => o.id === order.id);
      
      if (existingIndex >= 0) {
        orders[existingIndex] = order;
      } else {
        orders.push(order);
      }
      
      localStorage.setItem('localOrders', JSON.stringify(orders));
    } catch (error) {
      console.error('Failed to store local order:', error);
    }
  }

  getLocalOrder(orderId) {
    const orders = this.getLocalOrders();
    return orders.find(o => o.id === orderId);
  }

  getLocalOrders() {
    try {
      const stored = localStorage.getItem('localOrders');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get local orders:', error);
      return [];
    }
  }

  removeLocalOrder(orderId) {
    try {
      const orders = this.getLocalOrders();
      const filtered = orders.filter(o => o.id !== orderId);
      localStorage.setItem('localOrders', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove local order:', error);
    }
  }

  // Local storage helpers for profile
  storeLocalProfile(profile) {
    try {
      localStorage.setItem('localProfile', JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to store local profile:', error);
    }
  }

  getLocalProfile() {
    try {
      const stored = localStorage.getItem('localProfile');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get local profile:', error);
      return null;
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingOperations: this.pendingOperations.size,
      queuedOperations: this.syncQueue.length,
      retryOperations: this.retryQueue.length,
      operations: Array.from(this.pendingOperations.values()).map(op => ({
        id: op.id,
        type: op.type,
        status: op.status,
        retryCount: op.retryCount,
        timestamp: op.timestamp
      }))
    };
  }

  // Force sync all pending operations
  async forceSyncAll() {
    if (!this.isOnline) {
      throw new Error('Cannot force sync while offline');
    }

    console.log('🚀 Background Sync: Force syncing all pending operations');
    
    // Move all pending operations to sync queue
    for (const operationId of this.pendingOperations.keys()) {
      if (!this.syncQueue.includes(operationId)) {
        this.syncQueue.push(operationId);
      }
    }

    await this.processSyncQueue();
  }

  // Clear all pending operations
  clearAllOperations() {
    this.pendingOperations.clear();
    this.syncQueue = [];
    this.retryQueue = [];
    
    localStorage.removeItem('pendingOperations');
    
    console.log('🗑️ Background Sync: Cleared all pending operations');
    
    this.notifySubscribers({ type: 'operations-cleared' });
  }

  // Cancel a specific operation
  cancelOperation(operationId) {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      this.pendingOperations.delete(operationId);
      
      // Remove from queues
      this.syncQueue = this.syncQueue.filter(id => id !== operationId);
      this.retryQueue = this.retryQueue.filter(id => id !== operationId);
      
      this.savePendingOperations();
      
      console.log(`❌ Background Sync: Cancelled operation: ${operationId}`);
      
      this.notifySubscribers({
        type: 'operation-cancelled',
        operationId,
        operation
      });
      
      return true;
    }
    
    return false;
  }
}

// Create and export singleton instance
export const backgroundSyncService = new BackgroundSyncService();
export default backgroundSyncService;
