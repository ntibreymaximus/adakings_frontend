/**
 * Activity Type Utilities for Order Status Changes and Payment Transactions
 * 
 * This module provides comprehensive styling, icons, and CSS class mapping
 * for different activity types in the Adakings PWA application.
 */

// ===========================================
// ORDER STATUS ACTIVITY TYPES
// ===========================================

/**
 * Get CSS class name for order status activities
 * @param {string} status - Order status (Pending, Accepted, Fulfilled, etc.)
 * @returns {string} CSS class name
 */
export const getOrderStatusClass = (status) => {
  const statusMap = {
    'Pending': 'pwa-status-pending',
    'Accepted': 'pwa-status-accepted', 
    'Fulfilled': 'pwa-status-fulfilled',
    'Cancelled': 'pwa-status-cancelled',
    'Out for Delivery': 'pwa-status-out-for-delivery'
  };
  return statusMap[status] || 'pwa-status-info';
};

/**
 * Get icon for order status activities
 * @param {string} status - Order status
 * @returns {string} Bootstrap icon class
 */
export const getOrderStatusIcon = (status) => {
  const iconMap = {
    'Pending': 'bi bi-clock',
    'Accepted': 'bi bi-check-circle',
    'Fulfilled': 'bi bi-check-circle-fill',
    'Cancelled': 'bi bi-x-circle',
    'Out for Delivery': 'bi bi-truck'
  };
  return iconMap[status] || 'bi bi-circle';
};

/**
 * Get color for order status activities
 * @param {string} status - Order status
 * @returns {string} Color hex code
 */
export const getOrderStatusColor = (status) => {
  const colorMap = {
    'Pending': '#ff9800',
    'Accepted': '#2196f3',
    'Fulfilled': '#4caf50',
    'Cancelled': '#f44336',
    'Out for Delivery': '#9c27b0'
  };
  return colorMap[status] || '#666';
};

// ===========================================
// PAYMENT TRANSACTION ACTIVITY TYPES
// ===========================================

/**
 * Get CSS class name for payment transaction activities
 * @param {string} status - Payment status (PAID, PENDING, FAILED, etc.)
 * @param {boolean} isRefund - Whether this is a refund transaction
 * @returns {string} CSS class name
 */
export const getPaymentStatusClass = (status, isRefund = false) => {
  if (isRefund) {
    return 'pwa-status-refund';
  }

  const statusMap = {
    'PAID': 'pwa-status-payment',
    'OVERPAID': 'pwa-status-overpayment',
    'PARTIALLY PAID': 'pwa-status-partial-payment',
    'PENDING': 'pwa-status-pending-payment',
    'PENDING PAYMENT': 'pwa-status-pending-payment',
    'FAILED': 'pwa-status-failed-payment',
    'CANCELLED': 'pwa-status-failed-payment'
  };
  return statusMap[status?.toUpperCase()] || 'pwa-status-pending-payment';
};

/**
 * Get icon for payment transaction activities
 * @param {string} status - Payment status
 * @param {boolean} isRefund - Whether this is a refund transaction
 * @returns {string} Bootstrap icon class
 */
export const getPaymentStatusIcon = (status, isRefund = false) => {
  if (isRefund) {
    return 'bi bi-arrow-counterclockwise';
  }

  const iconMap = {
    'PAID': 'bi bi-check-circle-fill',
    'OVERPAID': 'bi bi-plus-circle-fill',
    'PARTIALLY PAID': 'bi bi-pie-chart-fill',
    'PENDING': 'bi bi-clock',
    'PENDING PAYMENT': 'bi bi-clock',
    'FAILED': 'bi bi-x-circle',
    'CANCELLED': 'bi bi-dash-circle'
  };
  return iconMap[status?.toUpperCase()] || 'bi bi-clock';
};

/**
 * Get color for payment transaction activities
 * @param {string} status - Payment status
 * @param {boolean} isRefund - Whether this is a refund transaction
 * @returns {string} Color hex code
 */
export const getPaymentStatusColor = (status, isRefund = false) => {
  if (isRefund) {
    return '#673ab7';
  }

  const colorMap = {
    'PAID': '#4caf50',
    'OVERPAID': '#2196f3',
    'PARTIALLY PAID': '#ffc107',
    'PENDING': '#ff9800',
    'PENDING PAYMENT': '#ff9800',
    'FAILED': '#f44336',
    'CANCELLED': '#9e9e9e'
  };
  return colorMap[status?.toUpperCase()] || '#ff9800';
};

// ===========================================
// PAYMENT METHOD STYLING
// ===========================================

/**
 * Get CSS class for payment method icons
 * @param {string} paymentMode - Payment method (CASH, MTN MOMO, etc.)
 * @returns {string} CSS class name
 */
export const getPaymentMethodClass = (paymentMode) => {
  const mode = paymentMode?.toUpperCase();
  if (mode?.includes('CASH')) return 'pwa-payment-icon cash';
  if (mode?.includes('MTN') || mode?.includes('MOMO')) return 'pwa-payment-icon momo';
  if (mode?.includes('TELECEL')) return 'pwa-payment-icon telecel';
  if (mode?.includes('PAYSTACK')) return 'pwa-payment-icon paystack';
  return 'pwa-payment-icon';
};

/**
 * Get icon for payment methods
 * @param {string} paymentMode - Payment method
 * @returns {string} Bootstrap icon class
 */
export const getPaymentMethodIcon = (paymentMode) => {
  const iconMap = {
    'CASH': 'bi bi-cash',
    'MTN MOMO': 'bi bi-phone',
    'TELECEL CASH': 'bi bi-phone-fill',
    'PAYSTACK(USSD)': 'bi bi-credit-card',
    'PAYSTACK(API)': 'bi bi-credit-card-2-front'
  };
  return iconMap[paymentMode?.toUpperCase()] || 'bi bi-wallet2';
};

// ===========================================
// ACTIVITY TYPE DETECTION
// ===========================================

/**
 * Determine activity type from transaction or order data
 * @param {Object} item - Transaction or order object
 * @returns {string} Activity type ('order', 'payment', 'refund')
 */
export const getActivityType = (item) => {
  // Check if it's a refund
  if (item.transaction_type === 'REFUND' || 
      item.payment_mode?.includes('REFUND') ||
      (item.amount && parseFloat(item.amount) < 0)) {
    return 'refund';
  }
  
  // Check if it's a payment transaction
  if (item.payment_mode || item.payment_status || item.transaction_id) {
    return 'payment';
  }
  
  // Default to order activity
  return 'order';
};

/**
 * Get comprehensive activity styling data
 * @param {Object} item - Activity item (order or transaction)
 * @returns {Object} Complete styling information
 */
export const getActivityStyling = (item) => {
  const activityType = getActivityType(item);
  
  let status, cssClass, icon, color, containerClass;
  
  switch (activityType) {
    case 'order':
      status = item.status;
      cssClass = getOrderStatusClass(status);
      icon = getOrderStatusIcon(status);
      color = getOrderStatusColor(status);
      containerClass = 'pwa-activity-order';
      break;
      
    case 'refund':
      status = 'REFUND';
      cssClass = 'pwa-status-refund';
      icon = 'bi bi-arrow-counterclockwise';
      color = '#673ab7';
      containerClass = 'pwa-activity-payment';
      break;
      
    case 'payment':
    default:
      status = item.status || item.payment_status;
      cssClass = getPaymentStatusClass(status, activityType === 'refund');
      icon = getPaymentStatusIcon(status, activityType === 'refund');
      color = getPaymentStatusColor(status, activityType === 'refund');
      containerClass = 'pwa-activity-payment';
      break;
  }
  
  return {
    activityType,
    status,
    cssClass,
    icon,
    color,
    containerClass,
    paymentMethod: item.payment_mode ? {
      class: getPaymentMethodClass(item.payment_mode),
      icon: getPaymentMethodIcon(item.payment_mode),
      display: getPaymentModeDisplay(item.payment_mode)
    } : null
  };
};

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get display-friendly payment mode text
 * @param {string} paymentMode - Raw payment mode
 * @returns {string} Display text
 */
export const getPaymentModeDisplay = (paymentMode) => {
  const displayMap = {
    'CASH': 'Cash',
    'MTN MOMO': 'MTN MoMo',
    'TELECEL CASH': 'Telecel Cash',
    'PAYSTACK(USSD)': 'Paystack (USSD)',
    'PAYSTACK(API)': 'Paystack (API)'
  };
  return displayMap[paymentMode?.toUpperCase()] || paymentMode || '-';
};

/**
 * Format price for display
 * @param {number|string} price - Price value
 * @returns {string} Formatted price
 */
export const formatPrice = (price) => {
  return `GH₵ ${parseFloat(price || 0).toFixed(2)}`;
};

/**
 * Format time for activity display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time
 */
export const formatActivityTime = (dateString) => {
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid time';
  }
};

/**
 * Get activity title based on type and data
 * @param {Object} item - Activity item
 * @returns {string} Activity title
 */
export const getActivityTitle = (item) => {
  const activityType = getActivityType(item);
  
  switch (activityType) {
    case 'order':
      return `Order #${item.order_number || item.id} ${item.status}`;
      
    case 'refund':
      return `Refund Processed`;
      
    case 'payment':
    default:
      if (item.transaction_id) {
        return `Payment ${item.status || 'Processed'}`;
      }
      return `Transaction #${item.id}`;
  }
};

/**
 * Get activity subtitle with contextual information
 * @param {Object} item - Activity item
 * @returns {string} Activity subtitle
 */
export const getActivitySubtitle = (item) => {
  const activityType = getActivityType(item);
  const time = formatActivityTime(item.created_at);
  
  switch (activityType) {
    case 'order':
      return `${item.delivery_type || 'Order'} • ${time}`;
      
    case 'refund':
      return `Order #${item.order_id} • ${time}`;
      
    case 'payment':
    default:
      return `Order #${item.order_id} • ${time}`;
  }
};

// ===========================================
// TIMELINE ACTIVITY HELPERS
// ===========================================

/**
 * Get timeline CSS class for activity item
 * @param {Object} item - Activity item
 * @returns {string} Timeline CSS class
 */
export const getTimelineClass = (item) => {
  const activityType = getActivityType(item);
  const status = item.status || item.payment_status;
  
  if (activityType === 'refund') return 'pwa-activity-timeline-item refund';
  if (activityType === 'payment') {
    if (status?.toUpperCase() === 'FAILED') return 'pwa-activity-timeline-item failed';
    return 'pwa-activity-timeline-item payment';
  }
  return 'pwa-activity-timeline-item order';
};

/**
 * Sort activities by date (newest first)
 * @param {Array} activities - Array of activity items
 * @returns {Array} Sorted activities
 */
export const sortActivitiesByDate = (activities) => {
  return [...activities].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
};

/**
 * Group activities by date
 * @param {Array} activities - Array of activity items
 * @returns {Object} Activities grouped by date
 */
export const groupActivitiesByDate = (activities) => {
  const grouped = {};
  
  activities.forEach(item => {
    const date = new Date(item.created_at).toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(item);
  });
  
  return grouped;
};
