import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Enhanced Activity List Item Component
 * Provides clickable navigation to appropriate detail pages based on activity type
 */
const ActivityListItem = ({ 
  activity, 
  showNavigation = true,
  onClick = null,
  className = "",
  style = {}
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // If custom onClick is provided, use it
    if (onClick) {
      onClick(activity);
      return;
    }

    // Default navigation logic
    if (activity.eventType === 'payment' && activity.transactionId) {
      // For payment activities, navigate to transaction details or order details
      if (activity.orderId || activity.orderNumber) {
        navigate(`/order-details/${activity.orderNumber || activity.orderId}`);
      } else {
        navigate('/view-transactions');
      }
    } else if (activity.eventType === 'order' && (activity.orderId || activity.orderNumber)) {
      // For order activities, navigate to order details
      navigate(`/order-details/${activity.orderNumber || activity.orderId}`);
    } else {
      // Fallback navigation
      if (activity.eventType === 'payment') {
        navigate('/view-transactions');
      } else {
        navigate('/view-orders');
      }
    }
  };

  const itemStyle = {
    cursor: showNavigation ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    ...style
  };

  const handleMouseEnter = (e) => {
    if (showNavigation) {
      e.currentTarget.style.backgroundColor = '#f8f9fa';
    }
  };

  const handleMouseLeave = (e) => {
    if (showNavigation) {
      e.currentTarget.style.backgroundColor = 'transparent';
    }
  };

  return (
    <div 
      className={`list-group-item d-flex align-items-center ${className}`}
      onClick={showNavigation ? handleClick : undefined}
      style={itemStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={showNavigation ? getNavigationTitle(activity) : undefined}
    >
      <div 
        className="me-3 d-flex align-items-center justify-content-center rounded-circle"
        style={{ 
          background: activity.colorTag || activity.color || '#666',
          color: '#fff'
        }}
      >
        <i className={activity.iconType || activity.icon || 'bi bi-circle'}></i>
      </div>
      
      <div className="flex-grow-1">
        <div className="fw-semibold text-dark">
          {activity.title}
        </div>
        <div className="text-muted small">
          {activity.description || formatActivitySubtitle(activity)}
        </div>
        {activity.metadata && (
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
            {formatActivityMeta(activity)}
          </div>
        )}
      </div>
      
      {activity.amount && (
        <div className="text-end me-2" style={{
          fontWeight: '600', 
          color: getAmountColor(activity),
          fontSize: '0.9rem',
          marginRight: showNavigation ? '8px' : '0'
        }}>
          {formatPrice(activity.amount)}
        </div>
      )}
      
      {activity.status && (
        <div 
          className={`badge ${getStatusClass(activity.status)}`}
          style={{ marginRight: showNavigation ? '8px' : '0' }}
        >
          {activity.status}
        </div>
      )}
      
      {showNavigation && (
        <div className="text-muted" style={{ color: '#666' }}>
          <i className="bi bi-chevron-right"></i>
        </div>
      )}
    </div>
  );
};

/**
 * Helper function to get navigation title for accessibility
 */
const getNavigationTitle = (activity) => {
  if (activity.eventType === 'payment') {
    return `View payment details for Order #${activity.orderNumber || activity.orderId}`;
  } else if (activity.eventType === 'order') {
    return `View order details for Order #${activity.orderNumber || activity.orderId}`;
  }
  return 'View details';
};

/**
 * Format activity subtitle based on activity data
 */
const formatActivitySubtitle = (activity) => {
  const parts = [];
  
  if (activity.orderNumber || activity.orderId) {
    parts.push(`Order #${activity.orderNumber || activity.orderId}`);
  }
  
  if (activity.timeAgo || activity.timestamp) {
    const timeText = activity.timeAgo || formatRelativeTime(activity.timestamp);
    parts.push(timeText);
  }
  
  return parts.join(' • ');
};

/**
 * Format activity metadata for display
 */
const formatActivityMeta = (activity) => {
  const parts = [];
  
  if (activity.metadata?.payment_mode) {
    parts.push(activity.metadata.payment_mode);
  }
  
  if (activity.metadata?.customer_phone) {
    parts.push(activity.metadata.customer_phone);
  }
  
  if (activity.metadata?.delivery_type) {
    parts.push(activity.metadata.delivery_type);
  }
  
  if (activity.metadata?.short_transaction_id) {
    parts.push(`ID: ${activity.metadata.short_transaction_id}`);
  }
  
  return parts.join(' • ');
};

/**
 * Get color for amount display based on activity type
 */
const getAmountColor = (activity) => {
  if (activity.eventType === 'payment') {
    switch (activity.type) {
      case 'payment_received':
        return '#4caf50';
      case 'payment_refunded':
        return '#ff9800';
      case 'payment_failed':
        return '#f44336';
      case 'payment_pending':
        return '#ff9800';
      default:
        return '#1a1a1a';
    }
  }
  return '#1a1a1a';
};

/**
 * Get status CSS class based on status
 */
const getStatusClass = (status) => {
  const statusLower = status?.toLowerCase() || '';
  
  if (['paid', 'overpaid', 'fulfilled', 'completed'].includes(statusLower)) {
    return 'bg-success';
  } else if (['pending', 'pending payment', 'accepted'].includes(statusLower)) {
    return 'bg-warning text-dark';
  } else if (['failed', 'cancelled', 'canceled'].includes(statusLower)) {
    return 'bg-danger';
  } else if (['out for delivery', 'processing'].includes(statusLower)) {
    return 'bg-info';
  }
  
  return 'bg-secondary';
};

/**
 * Format price consistently
 */
const formatPrice = (price) => {
  return `GH₵ ${parseFloat(price || 0).toFixed(2)}`;
};

/**
 * Format relative time from timestamp
 */
const formatRelativeTime = (timestamp) => {
  try {
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
  } catch {
    return 'Invalid time';
  }
};

export default ActivityListItem;
