// Activity service for merging and normalizing order and payment transaction data
// Creates unified activity records with standardized fields for consistent display

import { 
  formatTransactionId, 
  isRefundTransaction, 
  getShortTransactionId 
} from '../utils/transactionUtils';

/**
 * Activity event types
 */
export const ACTIVITY_TYPES = {
  ORDER_CREATED: 'order_created',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_REFUNDED: 'payment_refunded',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_FAILED: 'payment_failed'
};

/**
 * Icon mappings for different activity types and statuses
 */
const ACTIVITY_ICONS = {
  // Order status icons
  order_created: 'bi bi-plus-circle',
  order_pending: 'bi bi-clock',
  order_accepted: 'bi bi-check-circle',
  order_out_for_delivery: 'bi bi-truck',
  order_fulfilled: 'bi bi-check-circle-fill',
  order_cancelled: 'bi bi-x-circle',
  
  // Payment icons
  payment_received: 'bi bi-credit-card',
  payment_refunded: 'bi bi-arrow-left-circle',
  payment_pending: 'bi bi-clock-history',
  payment_failed: 'bi bi-x-circle-fill',
  
  // Payment method icons
  CASH: 'bi bi-cash',
  'MTN MOMO': 'bi bi-phone',
  'TELECEL CASH': 'bi bi-phone-fill',
  'PAYSTACK(USSD)': 'bi bi-credit-card',
  'PAYSTACK(API)': 'bi bi-credit-card-2-front'
};

/**
 * Color mappings for different activity types and statuses
 */
const ACTIVITY_COLORS = {
  // Order status colors
  order_created: '#2196f3',
  order_pending: '#ff9800',
  order_accepted: '#2196f3',
  order_out_for_delivery: '#9c27b0',
  order_fulfilled: '#4caf50',
  order_cancelled: '#f44336',
  
  // Payment colors
  payment_received: '#4caf50',
  payment_refunded: '#ff9800',
  payment_pending: '#ff9800',
  payment_failed: '#f44336',
  
  // Status-based colors
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3',
  danger: '#f44336',
  secondary: '#6c757d'
};

/**
 * Generate activity records from order status changes
 * @param {Array} orders - Array of order objects
 * @returns {Array} - Array of activity records
 */
export const generateOrderActivities = (orders) => {
  const activities = [];
  
  orders.forEach(order => {
    // Always create an order creation activity
    activities.push({
      id: `order_${order.id}_created`,
      type: ACTIVITY_TYPES.ORDER_CREATED,
      eventType: 'order',
      timestamp: order.created_at,
      orderId: order.id,
      orderNumber: order.order_number || order.id,
      title: `Order #${order.order_number || order.id} Created`,
      description: `New ${order.delivery_type || 'Pickup'} order for ${formatPrice(order.total_price)}`,
      amount: order.total_price,
      iconType: ACTIVITY_ICONS.order_created,
      colorTag: ACTIVITY_COLORS.order_created,
      status: 'Created',
      metadata: {
        customer_phone: order.customer_phone,
        delivery_type: order.delivery_type,
        total_items: order.items?.length || 0,
        payment_status: order.payment_status
      }
    });
    
    // Create status change activity if status is not initial
    if (order.status && order.status !== 'Pending') {
      const statusKey = `order_${order.status.toLowerCase().replace(/\s+/g, '_')}`;
      
      activities.push({
        id: `order_${order.id}_status_${order.status.toLowerCase()}`,
        type: ACTIVITY_TYPES.ORDER_STATUS_CHANGED,
        eventType: 'order',
        timestamp: order.updated_at || order.created_at,
        orderId: order.id,
        orderNumber: order.order_number || order.id,
        title: `Order #${order.order_number || order.id} ${getStatusDisplayText(order.status)}`,
        description: `Status changed to ${order.status}`,
        amount: order.total_price,
        iconType: ACTIVITY_ICONS[statusKey] || ACTIVITY_ICONS.order_pending,
        colorTag: ACTIVITY_COLORS[statusKey] || ACTIVITY_COLORS.order_pending,
        status: order.status,
        metadata: {
          previous_status: 'Unknown', // Would need order history to determine
          customer_phone: order.customer_phone,
          delivery_type: order.delivery_type,
          payment_status: order.payment_status
        }
      });
    }
  });
  
  return activities;
};

/**
 * Generate activity records from payment transactions
 * @param {Array} transactions - Array of transaction objects
 * @returns {Array} - Array of activity records
 */
export const generateTransactionActivities = (transactions) => {
  const activities = [];
  
  transactions.forEach(transaction => {
    let activityType;
    let title;
    let description;
    let iconType;
    let colorTag;
    
    // Determine activity type based on transaction properties
    if (isRefundTransaction(transaction.reference || transaction.transaction_id)) {
      activityType = ACTIVITY_TYPES.PAYMENT_REFUNDED;
      title = `Refund Processed`;
      description = `Refund of ${formatPrice(transaction.amount)} via ${transaction.payment_mode}`;
      iconType = ACTIVITY_ICONS.payment_refunded;
      colorTag = ACTIVITY_COLORS.payment_refunded;
    } else {
      // Determine type based on status
      switch (transaction.status?.toUpperCase()) {
        case 'PAID':
        case 'OVERPAID':
          activityType = ACTIVITY_TYPES.PAYMENT_RECEIVED;
          title = `Payment Received`;
          description = `Payment of ${formatPrice(transaction.amount)} via ${transaction.payment_mode}`;
          iconType = ACTIVITY_ICONS.payment_received;
          colorTag = ACTIVITY_COLORS.payment_received;
          break;
        case 'PENDING':
        case 'PENDING PAYMENT':
          activityType = ACTIVITY_TYPES.PAYMENT_PENDING;
          title = `Payment Pending`;
          description = `Payment of ${formatPrice(transaction.amount)} via ${transaction.payment_mode} is pending`;
          iconType = ACTIVITY_ICONS.payment_pending;
          colorTag = ACTIVITY_COLORS.payment_pending;
          break;
        case 'FAILED':
        case 'CANCELLED':
          activityType = ACTIVITY_TYPES.PAYMENT_FAILED;
          title = `Payment Failed`;
          description = `Payment of ${formatPrice(transaction.amount)} via ${transaction.payment_mode} failed`;
          iconType = ACTIVITY_ICONS.payment_failed;
          colorTag = ACTIVITY_COLORS.payment_failed;
          break;
        default:
          activityType = ACTIVITY_TYPES.PAYMENT_RECEIVED;
          title = `Payment Processed`;
          description = `Payment of ${formatPrice(transaction.amount)} via ${transaction.payment_mode}`;
          iconType = ACTIVITY_ICONS.payment_received;
          colorTag = ACTIVITY_COLORS.payment_received;
      }
    }
    
    activities.push({
      id: `transaction_${transaction.id}`,
      type: activityType,
      eventType: 'payment',
      timestamp: transaction.created_at,
      transactionId: transaction.id,
      orderId: transaction.order_id,
      orderNumber: transaction.order_number || transaction.order_id,
      title: title,
      description: description,
      amount: transaction.amount,
      iconType: iconType,
      colorTag: colorTag,
      status: transaction.status,
      metadata: {
        payment_mode: transaction.payment_mode,
        reference: transaction.reference,
        transaction_id: transaction.transaction_id,
        formatted_transaction_id: transaction.transaction_id ? 
          formatTransactionId(transaction.transaction_id) : null,
        short_transaction_id: transaction.transaction_id ? 
          getShortTransactionId(transaction.transaction_id) : null,
        is_refund: isRefundTransaction(transaction.reference || transaction.transaction_id)
      }
    });
  });
  
  return activities;
};

/**
 * Merge and normalize activities from orders and transactions
 * @param {Array} orders - Array of order objects
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} options - Configuration options
 * @returns {Array} - Unified and sorted array of activity records
 */
export const mergeAndNormalizeActivities = (orders = [], transactions = [], options = {}) => {
  const {
    sortOrder = 'desc', // 'asc' or 'desc'
    filterByDate = null, // Date string to filter by (YYYY-MM-DD)
    limit = null, // Limit number of results
    includeOrderCreation = true, // Whether to include order creation activities
    includeStatusChanges = true, // Whether to include order status changes
    includePayments = true, // Whether to include payment activities
    groupByOrder = false // Whether to group activities by order
  } = options;
  
  let activities = [];
  
  // Generate order activities
  if (includeOrderCreation || includeStatusChanges) {
    const orderActivities = generateOrderActivities(orders);
    
    if (!includeOrderCreation) {
      activities.push(...orderActivities.filter(a => a.type !== ACTIVITY_TYPES.ORDER_CREATED));
    } else if (!includeStatusChanges) {
      activities.push(...orderActivities.filter(a => a.type === ACTIVITY_TYPES.ORDER_CREATED));
    } else {
      activities.push(...orderActivities);
    }
  }
  
  // Generate transaction activities
  if (includePayments) {
    const transactionActivities = generateTransactionActivities(transactions);
    activities.push(...transactionActivities);
  }
  
  // Filter by date if specified
  if (filterByDate) {
    activities = activities.filter(activity => {
      const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
      return activityDate === filterByDate;
    });
  }
  
  // Sort activities by timestamp
  activities.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });
  
  // Apply limit if specified
  if (limit && limit > 0) {
    activities = activities.slice(0, limit);
  }
  
  // Group by order if requested
  if (groupByOrder) {
    const groupedActivities = {};
    activities.forEach(activity => {
      const orderKey = activity.orderNumber || activity.orderId || 'unknown';
      if (!groupedActivities[orderKey]) {
        groupedActivities[orderKey] = [];
      }
      groupedActivities[orderKey].push(activity);
    });
    return groupedActivities;
  }
  
  return activities;
};

/**
 * Get activity statistics
 * @param {Array} activities - Array of activity records
 * @returns {Object} - Statistics object
 */
export const getActivityStats = (activities) => {
  const stats = {
    total: activities.length,
    byType: {},
    byDate: {},
    totalAmount: 0,
    paymentAmount: 0,
    refundAmount: 0
  };
  
  activities.forEach(activity => {
    // Count by type
    stats.byType[activity.type] = (stats.byType[activity.type] || 0) + 1;
    
    // Count by date
    const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
    stats.byDate[activityDate] = (stats.byDate[activityDate] || 0) + 1;
    
    // Sum amounts
    const amount = parseFloat(activity.amount || 0);
    if (activity.eventType === 'payment') {
      if (activity.type === ACTIVITY_TYPES.PAYMENT_REFUNDED) {
        stats.refundAmount += amount;
      } else if (activity.type === ACTIVITY_TYPES.PAYMENT_RECEIVED) {
        stats.paymentAmount += amount;
      }
    } else if (activity.eventType === 'order') {
      stats.totalAmount += amount;
    }
  });
  
  return stats;
};

/**
 * Filter activities by criteria
 * @param {Array} activities - Array of activity records
 * @param {Object} filters - Filter criteria
 * @returns {Array} - Filtered activities
 */
export const filterActivities = (activities, filters = {}) => {
  const {
    eventType, // 'order' or 'payment'
    type, // Specific activity type
    status, // Activity status
    orderNumber, // Specific order number
    dateRange, // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
    amountRange, // { min: number, max: number }
    paymentMode, // Specific payment mode
    searchText // Text to search in title/description
  } = filters;
  
  return activities.filter(activity => {
    // Filter by event type
    if (eventType && activity.eventType !== eventType) {
      return false;
    }
    
    // Filter by activity type
    if (type && activity.type !== type) {
      return false;
    }
    
    // Filter by status
    if (status && activity.status !== status) {
      return false;
    }
    
    // Filter by order number
    if (orderNumber && activity.orderNumber !== orderNumber) {
      return false;
    }
    
    // Filter by date range
    if (dateRange) {
      const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
      if (dateRange.start && activityDate < dateRange.start) {
        return false;
      }
      if (dateRange.end && activityDate > dateRange.end) {
        return false;
      }
    }
    
    // Filter by amount range
    if (amountRange) {
      const amount = parseFloat(activity.amount || 0);
      if (amountRange.min !== undefined && amount < amountRange.min) {
        return false;
      }
      if (amountRange.max !== undefined && amount > amountRange.max) {
        return false;
      }
    }
    
    // Filter by payment mode
    if (paymentMode && activity.metadata?.payment_mode !== paymentMode) {
      return false;
    }
    
    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const titleMatch = activity.title.toLowerCase().includes(searchLower);
      const descriptionMatch = activity.description.toLowerCase().includes(searchLower);
      const orderNumberMatch = activity.orderNumber?.toString().includes(searchText);
      
      if (!titleMatch && !descriptionMatch && !orderNumberMatch) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Helper function to get status display text
 * @param {string} status - Status value
 * @returns {string} - Display text
 */
const getStatusDisplayText = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'Received';
    case 'accepted': return 'Accepted';
    case 'out for delivery': return 'Out for Delivery';
    case 'fulfilled': return 'Fulfilled';
    case 'cancelled': return 'Cancelled';
    default: return status || 'Updated';
  }
};

/**
 * Helper function to format price consistently
 * @param {number|string} price - Price value
 * @returns {string} - Formatted price
 */
const formatPrice = (price) => {
  return `GH₵ ${parseFloat(price || 0).toFixed(2)}`;
};

/**
 * Get relative time string
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Relative time string
 */
export const getRelativeTime = (timestamp) => {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

/**
 * Format timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted time
 */
export const formatTime = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid time';
  }
};

/**
 * Format date for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted date
 */
export const formatDate = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
};

export default {
  ACTIVITY_TYPES,
  generateOrderActivities,
  generateTransactionActivities,
  mergeAndNormalizeActivities,
  getActivityStats,
  filterActivities,
  getRelativeTime,
  formatTime,
  formatDate
};
