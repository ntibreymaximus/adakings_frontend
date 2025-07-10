import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Badge } from 'react-bootstrap';
import { API_BASE_URL } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { getRelativeTime } from '../services/activityService';

/**
 * Recent Activity Card Component
 * Displays recent orders and transactions in a unified activity feed
 */
const RecentActivityCard = ({ 
  maxItems = 5, 
  showFullHistory = true,
  refreshInterval = 30000, // 30 seconds for reasonable updates
  className = "",
  style = {}
}) => {
  const navigate = useNavigate();
  
  // State management
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [isCurrentlyFetching, setIsCurrentlyFetching] = useState(false);

  // Fetch recent activity data with intelligent throttling
  const fetchRecentActivity = async (forceRefresh = false) => {
    const now = Date.now();
    const MIN_FETCH_INTERVAL = 10000; // Minimum 10 seconds between fetches
    
    // Prevent concurrent fetches
    if (isCurrentlyFetching) {
      console.log('📈 Activity fetch already in progress, skipping...');
      return;
    }
    
    // Throttle requests (unless forced)
    if (!forceRefresh && (now - lastFetchTime) < MIN_FETCH_INTERVAL) {
      console.log('📈 Activity fetch throttled, too soon since last fetch');
      return;
    }
    
    try {
      setIsCurrentlyFetching(true);
      setLoading(true);
      setError(null);
      setLastFetchTime(now);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Calculate date range for recent activity (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];
      

      // Parallel fetch of all activity sources - only use existing endpoints
      const fetchPromises = [
        // Fetch recent orders (with all statuses)
        fetch(`${API_BASE_URL}/orders/?created_at__gte=${lastWeekStr}&ordering=-updated_at`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        // Try main transaction endpoint without date filter first (get latest transactions)
        fetch(`${API_BASE_URL}/payments/transaction-table/?ordering=-created_at&limit=50`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ];

      const [ordersResponse, transactionsResponse] = await Promise.all(fetchPromises);

      // Handle response errors for authentication
      if (!ordersResponse.ok && ordersResponse.status === 401) {
        throw new Error('Session expired. Please login again.');
      }
      if (!transactionsResponse.ok && transactionsResponse.status === 401) {
        throw new Error('Session expired. Please login again.');
      }

      // Parse all data sources
      const ordersData = ordersResponse.ok ? await ordersResponse.json() : null;
      const transactionsData = transactionsResponse.ok ? await transactionsResponse.json() : null;


      // Extract arrays from response objects and merge all transaction sources
      const orders = ordersData ? (ordersData.results || ordersData) : [];
      
      // Combine all transaction sources
      let allTransactions = [];
      
      // Main transactions
      if (transactionsData) {
        const mainTrans = transactionsData.transactions || transactionsData.results || transactionsData.data || transactionsData;
        if (Array.isArray(mainTrans)) allTransactions = [...allTransactions, ...mainTrans];
      }
      
      // No alternative transaction sources since we removed the 404 endpoints
      
      // Remove duplicates based on ID
      const transactions = allTransactions.filter((transaction, index, self) => 
        index === self.findIndex(t => t.id === transaction.id)
      );
      
      // Filter transactions to recent ones only
      const recentTransactions = transactions.filter(transaction => {
        if (!transaction.created_at) return true; // Include if no date
        const transactionDate = new Date(transaction.created_at);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        return transactionDate >= cutoffDate;
      });
      

      // Create comprehensive activity list
let allActivities = [];

      // Placeholder - Needs proper fetching or initialization
      let paymentHistory = [];
      let orderHistory = [];
      let refunds = [];

      // Get today's date as a string (local timezone)
      const today = new Date().toISOString().split('T')[0];

      // Process orders into activities
      orders.forEach(order => {
        // Validate timestamp before processing
        const orderTimestamp = order.created_at || order.date || new Date().toISOString();
        if (!isValidTimestamp(orderTimestamp)) {
          return; // Skip this order
        }
        
        // Order creation activity
        allActivities.push({
          id: `order-created-${order.id}`,
          type: 'order_created',
          eventType: 'order',
          timestamp: orderTimestamp,
          orderId: order.id,
          orderNumber: order.order_number || order.id,
          title: `Order #${order.order_number || order.id} Created`,
          description: `New ${order.delivery_type || 'order'} for ${order.customer_phone || 'customer'}`,
          amount: order.total_price,
          iconType: 'bi bi-plus-circle',
          colorTag: '#2196f3',
          status: 'Created',
          metadata: {
            customer_phone: order.customer_phone,
            delivery_type: order.delivery_type,
            total_items: order.items?.length || 0,
            payment_status: order.payment_status
          }
        });

        // Order status change activity (if status is not initial)
        if (order.status && order.status !== 'Pending' && order.updated_at !== order.created_at) {
          const statusTimestamp = order.updated_at || order.created_at || new Date().toISOString();
          if (!isValidTimestamp(statusTimestamp)) {
            return; // Skip this status change
          }
          
          allActivities.push({
            id: `order-status-${order.id}-${order.status}`,
            type: 'order_status_changed',
            eventType: 'order',
            timestamp: statusTimestamp,
            orderId: order.id,
            orderNumber: order.order_number || order.id,
            title: `Order #${order.order_number || order.id} ${getStatusDisplayText(order.status)}`,
            description: `Status changed to ${order.status}`,
            amount: order.total_price,
            iconType: getOrderStatusIcon(order.status),
            colorTag: getOrderStatusColor(order.status),
            status: order.status,
            metadata: {
              previous_status: 'Unknown',
              customer_phone: order.customer_phone,
              delivery_type: order.delivery_type,
              payment_status: order.payment_status
            }
          });
        }
      });

      // Process all transactions into detailed activities
      recentTransactions.forEach(transaction => {
        // Validate timestamp before processing
        const transactionTimestamp = transaction.created_at || transaction.date || transaction.timestamp || new Date().toISOString();
        if (!isValidTimestamp(transactionTimestamp)) {
          return; // Skip this transaction
        }
        
        const isRefund = isRefundTransaction(transaction);
        const activityType = getTransactionActivityType(transaction);
        
        allActivities.push({
          id: `transaction-${transaction.id}`,
          type: activityType,
          eventType: 'payment',
          timestamp: transactionTimestamp,
          transactionId: transaction.id,
          orderId: transaction.order_id || transaction.order,
          orderNumber: transaction.order_number || transaction.order_id,
          title: getTransactionTitle(transaction),
          description: getTransactionDescription(transaction),
          amount: transaction.amount,
          iconType: getTransactionIcon(transaction),
          colorTag: getTransactionColor(transaction),
          status: transaction.status,
          metadata: {
            payment_mode: transaction.payment_mode,
            reference: transaction.reference,
            transaction_id: transaction.transaction_id,
            payment_status: transaction.status,
            is_refund: isRefund,
            payment_provider: transaction.payment_provider || transaction.provider,
            failure_reason: transaction.failure_reason || transaction.error_message
          }
        });
      });

      // Process payment history changes
      paymentHistory.forEach(payment => {
        allActivities.push({
          id: `payment-history-${payment.id}`,
          type: 'payment_status_changed',
          eventType: 'payment',
          timestamp: payment.created_at || payment.updated_at,
          transactionId: payment.transaction_id,
          orderId: payment.order_id,
          orderNumber: payment.order_number,
          title: `Payment Status Changed`,
          description: `Payment status updated to ${payment.status}`,
          amount: payment.amount,
          iconType: 'bi bi-arrow-repeat',
          colorTag: '#ff9800',
          status: payment.status,
          metadata: {
            previous_status: payment.previous_status,
            payment_mode: payment.payment_mode,
            reason: payment.change_reason
          }
        });
      });

      // Process order status history
      orderHistory.forEach(history => {
        allActivities.push({
          id: `order-history-${history.id}`,
          type: 'order_status_changed',
          eventType: 'order',
          timestamp: history.created_at || history.timestamp,
          orderId: history.order_id,
          orderNumber: history.order_number,
          title: `Order Status Updated`,
          description: `Status changed from ${history.previous_status} to ${history.new_status}`,
          iconType: 'bi bi-arrow-repeat',
          colorTag: getOrderStatusColor(history.new_status),
          status: history.new_status,
          metadata: {
            previous_status: history.previous_status,
            changed_by: history.changed_by,
            reason: history.change_reason
          }
        });
      });

      // Process refunds specifically
      refunds.forEach(refund => {
        allActivities.push({
          id: `refund-${refund.id}`,
          type: 'payment_refunded',
          eventType: 'payment',
          timestamp: refund.created_at,
          transactionId: refund.transaction_id,
          orderId: refund.order_id,
          orderNumber: refund.order_number,
          title: `Refund Processed`,
          description: `Refund of ${formatPrice(refund.amount)} ${refund.reason ? `- ${refund.reason}` : ''}`,
          amount: refund.amount,
          iconType: 'bi bi-arrow-counterclockwise',
          colorTag: '#673ab7',
          status: refund.status || 'Processed',
          metadata: {
            refund_reason: refund.reason,
            refund_method: refund.refund_method,
            processed_by: refund.processed_by,
            original_transaction_id: refund.original_transaction_id
          }
        });
      });

      // Sort all activities by timestamp (newest first) and limit
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
// Filter activities to only include today's (if enabled)
      let filteredActivities = allActivities;
      
      if (showTodayOnly) {
        filteredActivities = allActivities.filter(activity => {
          const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
          const isToday = activityDate === today;
          
          
          return isToday;
        });
      }

      const mergedActivities = filteredActivities.slice(0, maxItems);
      

      setActivities(mergedActivities);
      setLastUpdated(new Date());
      setRetryCount(0);
      
    } catch (err) {
      setError(err.message);
      
      // Auto-retry for network errors with longer delays to prevent reload loops
      if (retryCount < 2 && !err.message.includes('Session expired') && !err.message.includes('AUTHENTICATION')) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchRecentActivity(true), 10000 * (retryCount + 1)); // Longer retry delays
      }
    } finally {
      setLoading(false);
      setIsCurrentlyFetching(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRecentActivity();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchRecentActivity, refreshInterval);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval]);

  // Manual refresh function
  const handleRefresh = () => {
    fetchRecentActivity(true); // Force refresh on manual action
  };

  // Navigate to full activity history
  const handleViewAllActivity = () => {
    navigate('/view-orders');
  };

  // Handle activity item click
  const handleActivityClick = (activity) => {
    if (activity.eventType === 'order' && activity.orderId) {
      // Navigate to view orders page with order ID to auto-open the modal
      navigate(`/view-orders?openOrder=${activity.orderId}`);
    } else if (activity.eventType === 'payment' && activity.orderId) {
      // Navigate to view orders page with order ID for payment-related activity
      navigate(`/view-orders?openOrder=${activity.orderId}`);
    } else {
      // Fallback navigation
      if (activity.eventType === 'payment') {
        navigate('/view-transactions');
      } else {
        navigate('/view-orders');
      }
    }
  };

  // Render loading state
  if (loading && activities.length === 0) {
    return (
      <Card className={`ada-quick-action-card ${className}`} style={style}>
        <Card.Header>
          <i className="bi bi-clock-history me-2"></i>
          Recent Activity
        </Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" className="me-2" />
          <span>Loading recent activity...</span>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && activities.length === 0) {
    return (
      <Card className={`ada-quick-action-card ${className}`} style={style}>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-clock-history me-2"></i>
            Recent Activity
          </span>
          <button 
            className="btn btn-sm btn-outline-light"
            onClick={handleRefresh}
            title="Refresh"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning" className="mb-0">
            <Alert.Heading className="h6">Unable to load activity</Alert.Heading>
            <p className="mb-2 small">{error}</p>
            <button 
              className="btn btn-sm btn-outline-warning"
              onClick={handleRefresh}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Try Again
            </button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className={`ada-quick-action-card ${className}`} style={style}>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>
          <i className="bi bi-clock-history me-2"></i>
          Recent Activity {showTodayOnly ? '(Today)' : '(All)'}
        </span>
        <div className="d-flex align-items-center gap-2">
          {lastUpdated && (
            <small className="text-light opacity-75">
              Updated {getSafeRelativeTime(lastUpdated.toISOString())}
            </small>
          )}
          <button 
            className={`btn btn-sm ${showTodayOnly ? 'btn-outline-light' : 'btn-outline-warning'}`}
            onClick={() => setShowTodayOnly(!showTodayOnly)}
            title={showTodayOnly ? 'Show all activities' : 'Show today only'}
          >
            <i className={`bi ${showTodayOnly ? 'bi-calendar-day' : 'bi-calendar'}`}></i>
          </button>
          <button 
            className="btn btn-sm btn-outline-light"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh Activity"
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'ada-spin' : ''}`}></i>
          </button>
        </div>
      </Card.Header>
      
      <Card.Body className="p-0">
        {activities.length > 0 ? (
          <>
            <div className="list-group list-group-flush">
              {activities.map((activity, index) => (
                <div 
                  key={activity.id || `activity-${index}`}
                  className="list-group-item list-group-item-action border-0 py-2 px-3"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleActivityClick(activity)}
                >
                  <div className="d-flex align-items-center">
                    {/* Activity Icon */}
                    <div 
                      className="flex-shrink-0 me-3 rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: activity.colorTag || '#666',
                        color: 'white',
                        fontSize: '1.1rem'
                      }}
                    >
                      <i className={activity.iconType || 'bi bi-circle'}></i>
                    </div>
                    
                    {/* Activity Content */}
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: '0.9rem' }}>
                        {activity.title}
                      </div>
                      <div className="text-muted small">
                        {activity.description}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {getSafeRelativeTime(activity.timestamp)}
                      </div>
                    </div>
                    
                    {/* Activity Amount/Status */}
                    <div className="flex-shrink-0 text-end ms-2">
                      {activity.amount && (
                        <div className="fw-bold small text-success">
                          GH₵ {parseFloat(activity.amount).toFixed(2)}
                        </div>
                      )}
                      {activity.status && (
                        <div className={`badge ${getStatusBadgeClass(activity.status)} small`}>
                          {activity.status}
                        </div>
                      )}
                    </div>
                    
                    {/* Chevron */}
                    <div className="flex-shrink-0 ms-2 text-muted">
                      <i className="bi bi-chevron-right"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* View All Footer */}
            {showFullHistory && (
              <div className="card-footer bg-light border-0">
                <button 
                  className="btn btn-sm btn-outline-primary w-100"
                  onClick={handleViewAllActivity}
                >
                  <i className="bi bi-list-ul me-1"></i>
                  View All Activity
                </button>
              </div>
            )}
          </>
        ) : (
          // Empty state
          <div className="text-center py-4">
            <div className="text-muted mb-3" style={{ fontSize: '2.5rem' }}>
              <i className="bi bi-clock-history"></i>
            </div>
            <h6 className="text-muted">No Recent Activity</h6>
            <p className="text-muted small mb-3">
              Order and payment activity will appear here
            </p>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => navigate('/create-order')}
            >
              <i className="bi bi-plus-circle me-1"></i>
              Create First Order
            </button>
          </div>
        )}
      </Card.Body>
      
      {error && activities.length > 0 && (
        <div className="card-footer bg-warning bg-opacity-10 border-warning">
          <small className="text-warning">
            <i className="bi bi-exclamation-triangle me-1"></i>
            {error}
          </small>
        </div>
      )}
    </Card>
  );
};

/**
 * Helper function to get status badge CSS class
 */
const getStatusBadgeClass = (status) => {
  const statusLower = status?.toLowerCase() || '';
  
  if (['fulfilled', 'paid', 'overpaid', 'completed'].includes(statusLower)) {
    return 'bg-success';
  } else if (['pending', 'pending payment', 'accepted'].includes(statusLower)) {
    return 'bg-warning text-dark';
  } else if (['failed', 'cancelled', 'canceled'].includes(statusLower)) {
    return 'bg-danger';
  } else if (['out for delivery', 'processing'].includes(statusLower)) {
    return 'bg-info text-dark';
  }
  
  return 'bg-secondary';
};

/**
 * Helper function to determine if a transaction is a refund
 */
const isRefundTransaction = (transaction) => {
  if (!transaction) return false;
  
  // Check various refund indicators
  const isRefundType = transaction.transaction_type === 'REFUND' || 
                      transaction.payment_type === 'refund' || 
                      transaction.payment_type === 'Refund' || 
                      transaction.type === 'refund';
  
  const isNegativeAmount = transaction.amount && parseFloat(transaction.amount) < 0;
  
  const hasRefundReference = transaction.reference && 
                            (transaction.reference.includes('REFUND') || 
                             transaction.reference.includes('refund'));
  
  const hasRefundId = transaction.transaction_id && 
                     (transaction.transaction_id.includes('REF') || 
                      transaction.transaction_id.includes('refund'));
  
  return isRefundType || isNegativeAmount || hasRefundReference || hasRefundId;
};

/**
 * Helper function to get transaction activity type
 */
const getTransactionActivityType = (transaction) => {
  if (isRefundTransaction(transaction)) {
    return 'payment_refunded';
  }
  
  const status = transaction.status?.toUpperCase() || '';
  
  switch (status) {
    case 'PAID':
    case 'OVERPAID':
    case 'SUCCESS':
    case 'COMPLETED':
      return 'payment_received';
    case 'PENDING':
    case 'PENDING PAYMENT':
    case 'PROCESSING':
      return 'payment_pending';
    case 'FAILED':
    case 'CANCELLED':
    case 'DECLINED':
    case 'ERROR':
      return 'payment_failed';
    default:
      return 'payment_processed';
  }
};

/**
 * Helper function to get transaction title
 */
const getTransactionTitle = (transaction) => {
  if (isRefundTransaction(transaction)) {
    return 'Refund Processed';
  }
  
  const status = transaction.status?.toUpperCase() || '';
  const amount = formatPrice(transaction.amount);
  
  switch (status) {
    case 'PAID':
    case 'OVERPAID':
    case 'SUCCESS':
    case 'COMPLETED':
      return `Payment Received - ${amount}`;
    case 'PENDING':
    case 'PENDING PAYMENT':
    case 'PROCESSING':
      return `Payment Pending - ${amount}`;
    case 'FAILED':
    case 'CANCELLED':
    case 'DECLINED':
    case 'ERROR':
      return `Payment Failed - ${amount}`;
    default:
      return `Payment ${status || 'Processed'} - ${amount}`;
  }
};

/**
 * Helper function to get transaction description
 */
const getTransactionDescription = (transaction) => {
  const paymentMode = transaction.payment_mode || 'Payment';
  const orderId = transaction.order_id || transaction.order || transaction.order_number;
  
  if (isRefundTransaction(transaction)) {
    const reason = transaction.refund_reason || transaction.reason || '';
    return `Refund via ${paymentMode}${orderId ? ` for Order #${orderId}` : ''}${reason ? ` - ${reason}` : ''}`;
  }
  
  const status = transaction.status?.toLowerCase() || '';
  let actionText = '';
  
  switch (status) {
    case 'paid':
    case 'overpaid':
    case 'success':
    case 'completed':
      actionText = 'completed';
      break;
    case 'pending':
    case 'pending payment':
    case 'processing':
      actionText = 'is pending';
      break;
    case 'failed':
    case 'cancelled':
    case 'declined':
    case 'error':
      actionText = 'failed';
      const reason = transaction.failure_reason || transaction.error_message || '';
      return `Payment via ${paymentMode} ${actionText}${orderId ? ` for Order #${orderId}` : ''}${reason ? ` - ${reason}` : ''}`;
    default:
      actionText = status || 'processed';
  }
  
  return `Payment via ${paymentMode} ${actionText}${orderId ? ` for Order #${orderId}` : ''}`;
};

/**
 * Helper function to get transaction icon
 */
const getTransactionIcon = (transaction) => {
  if (isRefundTransaction(transaction)) {
    return 'bi bi-arrow-counterclockwise';
  }
  
  const status = transaction.status?.toUpperCase() || '';
  const paymentMode = transaction.payment_mode?.toUpperCase() || '';
  
  // Payment method specific icons
  if (paymentMode.includes('CASH')) {
    return 'bi bi-cash';
  } else if (paymentMode.includes('MTN') || paymentMode.includes('MOMO')) {
    return 'bi bi-phone';
  } else if (paymentMode.includes('TELECEL')) {
    return 'bi bi-phone-fill';
  } else if (paymentMode.includes('PAYSTACK')) {
    return 'bi bi-credit-card';
  }
  
  // Status specific icons
  switch (status) {
    case 'PAID':
    case 'OVERPAID':
    case 'SUCCESS':
    case 'COMPLETED':
      return 'bi bi-check-circle-fill';
    case 'PENDING':
    case 'PENDING PAYMENT':
    case 'PROCESSING':
      return 'bi bi-clock';
    case 'FAILED':
    case 'CANCELLED':
    case 'DECLINED':
    case 'ERROR':
      return 'bi bi-x-circle';
    default:
      return 'bi bi-credit-card';
  }
};

/**
 * Helper function to get transaction color
 */
const getTransactionColor = (transaction) => {
  if (isRefundTransaction(transaction)) {
    return '#673ab7'; // Purple for refunds
  }
  
  const status = transaction.status?.toUpperCase() || '';
  
  switch (status) {
    case 'PAID':
    case 'OVERPAID':
    case 'SUCCESS':
    case 'COMPLETED':
      return '#4caf50'; // Green for success
    case 'PENDING':
    case 'PENDING PAYMENT':
    case 'PROCESSING':
      return '#ff9800'; // Orange for pending
    case 'FAILED':
    case 'CANCELLED':
    case 'DECLINED':
    case 'ERROR':
      return '#f44336'; // Red for failures
    default:
      return '#2196f3'; // Blue for others
  }
};

/**
 * Helper function to get order status display text
 */
const getStatusDisplayText = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'Received';
    case 'accepted': return 'Accepted';
    case 'out for delivery': return 'Out for Delivery';
    case 'fulfilled': return 'Fulfilled';
    case 'cancelled': return 'Cancelled';
    case 'ready': return 'Ready';
    default: return status || 'Updated';
  }
};

/**
 * Helper function to get order status icon
 */
const getOrderStatusIcon = (status) => {
  const icons = {
    'Pending': 'bi bi-clock',
    'Accepted': 'bi bi-check-circle',
    'Ready': 'bi bi-clock-fill',
    'Out for Delivery': 'bi bi-truck',
    'Fulfilled': 'bi bi-check-circle-fill',
    'Cancelled': 'bi bi-x-circle'
  };
  return icons[status] || 'bi bi-circle';
};

/**
 * Helper function to get order status color
 */
const getOrderStatusColor = (status) => {
  const colors = {
    'Pending': '#ff9800',
    'Accepted': '#2196f3',
    'Ready': '#673ab7',
    'Out for Delivery': '#9c27b0',
    'Fulfilled': '#4caf50',
    'Cancelled': '#f44336'
  };
  return colors[status] || '#666';
};

/**
 * Helper function to validate timestamp
 */
const isValidTimestamp = (timestamp) => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
};

/**
 * Safe version of getRelativeTime with error handling
 */
const getSafeRelativeTime = (timestamp) => {
  try {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid time';
    }
    
    return getRelativeTime(timestamp);
  } catch (error) {
    return 'Time error';
  }
};

/**
 * Helper function to format price
 */
const formatPrice = (price) => {
  return `GH₵ ${parseFloat(price || 0).toFixed(2)}`;
};

export default RecentActivityCard;
