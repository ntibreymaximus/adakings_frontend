import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for real-time data updates with automatic refresh
 * @param {Function} fetchFunction - Function to fetch data
 * @param {number} refreshInterval - Refresh interval in milliseconds (default: 30 seconds)
 * @param {boolean} enabled - Whether auto-refresh is enabled
 * @returns {Object} { data, loading, error, refreshData, lastUpdated }
 */
export const useRealTimeData = (fetchFunction, refreshInterval = 30000, enabled = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const refreshData = useCallback(async (showLoadingSpinner = false) => {
    if (!isMountedRef.current) return;
    
    try {
      if (showLoadingSpinner) {
        setLoading(true);
      }
      setError(null);
      
      const result = await fetchFunction();
      
      if (isMountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching real-time data:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFunction]);

  // Initial fetch
  useEffect(() => {
    refreshData(true);
  }, [refreshData]);

  // Set up automatic refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) {
      return;
    }

    const startInterval = () => {
      intervalRef.current = setInterval(() => {
        refreshData(false); // Silent refresh without loading spinner
      }, refreshInterval);
    };

    // Start the interval
    startInterval();

    // Handle visibility change - pause when tab is hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, clear interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Tab is visible, restart interval and refresh immediately
        if (!intervalRef.current) {
          refreshData(false);
          startInterval();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refreshInterval, refreshData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refreshData: () => refreshData(true),
    lastUpdated,
    isAutoRefreshEnabled: enabled && refreshInterval > 0
  };
};

/**
 * Hook specifically for orders with real-time updates
 * @param {number} refreshInterval - Refresh interval in milliseconds
 * @returns {Object} Orders data with real-time updates
 */
export const useRealTimeOrders = (refreshInterval = 30000) => {
  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch('http://localhost:8000/api/orders/', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    return await response.json();
  }, []);

  return useRealTimeData(fetchOrders, refreshInterval);
};

/**
 * Hook specifically for transactions with real-time updates
 * @param {number} refreshInterval - Refresh interval in milliseconds
 * @returns {Object} Transactions data with real-time updates
 */
export const useRealTimeTransactions = (refreshInterval = 30000) => {
  const fetchTransactions = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch('http://localhost:8000/api/payments/transaction-table/', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    return await response.json();
  }, []);

  return useRealTimeData(fetchTransactions, refreshInterval);
};

/**
 * Hook for dashboard stats with real-time updates
 * @param {number} refreshInterval - Refresh interval in milliseconds
 * @returns {Object} Dashboard stats with real-time updates
 */
export const useRealTimeDashboardStats = (refreshInterval = 60000) => {
  const fetchDashboardStats = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Fetch today's orders
    const ordersResponse = await fetch(`http://localhost:8000/api/orders/?date=${today}&ordering=-updated_at`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!ordersResponse.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }

    const ordersData = await ordersResponse.json();
    const orders = ordersData.results || ordersData;

    // Calculate stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + (parseFloat(order.total_price) || 0);
    }, 0);

    // Get recent activity from last 7 days
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];

    const recentOrdersResponse = await fetch(`http://localhost:8000/api/orders/?created_at__gte=${lastWeekStr}&ordering=-updated_at`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    let recentActivity = [];
    if (recentOrdersResponse.ok) {
      const recentOrdersData = await recentOrdersResponse.json();
      const recentOrders = recentOrdersData.results || recentOrdersData;
      
      recentActivity = recentOrders.slice(0, 5).map(order => ({
        id: order.id,
        title: `Order #${(order.order_number || order.id).toString().slice(-3)} ${getActivityTitle(order.status)}`,
        timeAgo: order.time_ago || 'Recently', // Use backend time_ago
        icon: getStatusIcon(order.status),
        color: getStatusColor(order.status),
        statusText: order.status,
        statusClass: getStatusClass(order.status),
        order_id: order.id,
        status: order.status
      }));
    }

    return {
      totalOrders,
      totalRevenue,
      recentActivity
    };
  }, []);

  return useRealTimeData(fetchDashboardStats, refreshInterval);
};

// Helper functions for dashboard activity
const getActivityTitle = (status) => {
  switch (status?.toLowerCase()) {
    case 'fulfilled': return 'fulfilled';
    case 'out for delivery': return 'out for delivery';
    case 'accepted': return 'accepted';
    case 'ready': return 'ready';
    case 'pending': return 'received';
    case 'cancelled': return 'cancelled';
    default: return status?.toLowerCase() || 'updated';
  }
};

const getStatusIcon = (status) => {
  const icons = {
    'Fulfilled': 'bi bi-check-circle',
    'Out for Delivery': 'bi bi-truck',
    'Ready': 'bi bi-clock-fill',
    'Accepted': 'bi bi-hand-thumbs-up',
    'Pending': 'bi bi-plus',
    'Cancelled': 'bi bi-x-circle'
  };
  return icons[status] || 'bi bi-circle';
};

const getStatusColor = (status) => {
  const colors = {
    'Fulfilled': '#4CAF50',
    'Out for Delivery': '#FF9800',
    'Ready': '#673AB7',
    'Accepted': '#2196F3',
    'Pending': '#2196F3',
    'Cancelled': '#f44336'
  };
  return colors[status] || '#666';
};

const getStatusClass = (status) => {
  const classes = {
    'Fulfilled': 'pwa-status-success',
    'Out for Delivery': 'pwa-status-warning',
    'Ready': 'pwa-status-accepted',
    'Accepted': 'pwa-status-info',
    'Pending': 'pwa-status-info',
    'Cancelled': 'pwa-status-danger'
  };
  return classes[status] || 'pwa-status-info';
};
