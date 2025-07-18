// Example of how to implement autoreload functionality in React components
// This shows different patterns for integrating WebSocket auto-refresh

import React, { useState, useEffect, useCallback } from 'react';
import { useAutoreloadUpdates } from '../hooks/useWebSocket';
import { toast } from 'react-toastify';

// Example 1: Basic autoreload integration for a component
export function BasicAutoreloadExample() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Setup autoreload to refresh data when system events occur
  useAutoreloadUpdates((update) => {
    console.log('📡 Autoreload update received:', update);
    
    // Refresh data without showing loader for smooth experience
    fetchData(false);
    
    // Show non-intrusive notification about the update
    const message = update.type === 'created' 
      ? `New ${update.model.toLowerCase()} created`
      : `${update.model} updated`;
    
    toast.info(message, {
      autoClose: 2000,
      hideProgressBar: true,
      position: "bottom-right"
    });
  });

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      // Your API call here
      const response = await fetch('/api/your-endpoint');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      {loading ? <div>Loading...</div> : <div>Your content here</div>}
    </div>
  );
}

// Example 2: Filtered autoreload - only refresh for specific models
export function FilteredAutoreloadExample() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);

  // Only refresh when Order or Payment models are updated
  useAutoreloadUpdates((update) => {
    if (update.model === 'Order') {
      console.log('📦 Order update:', update);
      refreshOrders();
      
      // Different notification for different event types
      if (update.type === 'created') {
        toast.success('New order received!', { position: "top-center" });
      } else if (update.type === 'updated' && update.changes?.status) {
        toast.info(`Order status changed to ${update.changes.status.new}`, { 
          position: "bottom-right" 
        });
      }
    } else if (update.model === 'Payment') {
      console.log('💳 Payment update:', update);
      refreshPayments();
      
      toast.success('Payment received!', { position: "top-right" });
    }
  });

  const refreshOrders = async () => {
    // Fetch orders without loading state
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  };

  const refreshPayments = async () => {
    // Fetch payments without loading state
    try {
      const response = await fetch('/api/payments');
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error refreshing payments:', error);
    }
  };

  return (
    <div>
      <h2>Orders ({orders.length})</h2>
      <h2>Payments ({payments.length})</h2>
    </div>
  );
}

// Example 3: Autoreload with change tracking
export function ChangeTrackingAutoreloadExample() {
  const [items, setItems] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useAutoreloadUpdates((update) => {
    // Track what changed
    if (update.changes && Object.keys(update.changes).length > 0) {
      console.log('🔄 Changes detected:', update.changes);
      
      // Example: Highlight specific changes
      const changedFields = Object.keys(update.changes);
      const changeMessage = changedFields.map(field => {
        const change = update.changes[field];
        return `${field}: ${change.old} → ${change.new}`;
      }).join(', ');
      
      toast.info(`Updated: ${changeMessage}`, {
        autoClose: 3000,
        position: "bottom-center"
      });
    }
    
    // Update timestamp
    setLastUpdate(update.timestamp);
    
    // Refresh data
    refreshItems();
  });

  const refreshItems = async () => {
    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error refreshing items:', error);
    }
  };

  return (
    <div>
      <h2>Items</h2>
      {lastUpdate && (
        <small>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</small>
      )}
      <div>{/* Your items list */}</div>
    </div>
  );
}

// Example 4: Autoreload with debouncing for high-frequency updates
export function DebouncedAutoreloadExample() {
  const [data, setData] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const debounceTimerRef = React.useRef(null);

  useAutoreloadUpdates((update) => {
    // Increment pending updates counter
    setPendingUpdates(prev => prev + 1);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer to batch updates
    debounceTimerRef.current = setTimeout(() => {
      console.log(`🔄 Processing ${pendingUpdates + 1} batched updates`);
      
      // Reset counter
      setPendingUpdates(0);
      
      // Refresh data once for all updates
      refreshData();
      
      // Show single notification for batched updates
      toast.info(`Data refreshed (${pendingUpdates + 1} updates)`, {
        autoClose: 2000,
        position: "bottom-right"
      });
    }, 1000); // Wait 1 second to batch updates
  });

  const refreshData = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  return (
    <div>
      <h2>Data View</h2>
      {pendingUpdates > 0 && (
        <div className="text-info">
          <small>🔄 {pendingUpdates} updates pending...</small>
        </div>
      )}
      <div>{/* Your data display */}</div>
    </div>
  );
}

// Example 5: Conditional autoreload based on user preferences
export function ConditionalAutoreloadExample() {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [data, setData] = useState([]);
  const [missedUpdates, setMissedUpdates] = useState(0);

  useAutoreloadUpdates((update) => {
    if (autoRefreshEnabled) {
      // Auto-refresh is enabled, update immediately
      console.log('🔄 Auto-refreshing data');
      refreshData();
      
      toast.success('Data auto-refreshed', {
        autoClose: 1500,
        position: "bottom-right",
        hideProgressBar: true
      });
    } else {
      // Auto-refresh is disabled, just count missed updates
      setMissedUpdates(prev => prev + 1);
      console.log('📌 Update received but auto-refresh is disabled');
    }
  });

  const refreshData = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
      setMissedUpdates(0); // Reset missed updates counter
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleManualRefresh = () => {
    refreshData();
    toast.info('Data manually refreshed', {
      autoClose: 1500,
      position: "top-center"
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Data View</h2>
        <div>
          <button 
            className="btn btn-sm btn-outline-primary me-2"
            onClick={handleManualRefresh}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh {missedUpdates > 0 && `(${missedUpdates})`}
          </button>
          <div className="form-check form-switch d-inline-block">
            <input 
              className="form-check-input" 
              type="checkbox" 
              checked={autoRefreshEnabled}
              onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
              id="autoRefreshSwitch"
            />
            <label className="form-check-label" htmlFor="autoRefreshSwitch">
              Auto-refresh
            </label>
          </div>
        </div>
      </div>
      <div>{/* Your data display */}</div>
    </div>
  );
}

// Example 6: Integration with existing ViewTransactionsPage pattern
export function ViewTransactionsAutoreloadExample() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Setup autoreload for transaction updates
  useAutoreloadUpdates((data) => {
    // Only refresh for Payment model updates
    if (data.model === 'Payment') {
      console.log('💳 Payment update received:', data);
      
      // Refresh without showing loader
      fetchTransactions(false);
      
      // Show appropriate notification based on event type
      if (data.type === 'created') {
        toast.success('New payment received!', {
          position: "top-right",
          autoClose: 3000
        });
      } else if (data.type === 'updated') {
        toast.info('Payment updated', {
          position: "bottom-right",
          autoClose: 2000
        });
      }
    }
  });

  const fetchTransactions = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      if (showLoader) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Transactions</h2>
        {isRefreshing && (
          <small className="text-muted">
            <i className="bi bi-arrow-repeat spin me-1"></i>
            Refreshing...
          </small>
        )}
      </div>
      {loading ? (
        <div>Loading transactions...</div>
      ) : (
        <div>
          {/* Transaction list */}
          {transactions.map(transaction => (
            <div key={transaction.id}>
              {/* Transaction item */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default {
  BasicAutoreloadExample,
  FilteredAutoreloadExample,
  ChangeTrackingAutoreloadExample,
  DebouncedAutoreloadExample,
  ConditionalAutoreloadExample,
  ViewTransactionsAutoreloadExample
};
