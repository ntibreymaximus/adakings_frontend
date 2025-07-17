/**
 * Order utility functions
 */

/**
 * Check if an order can be edited based on its status and time constraints
 * @param {Object} order - The order object to check
 * @returns {Object} - Object with 'allowed' boolean and 'reason' string
 */
export const canEditOrder = (order) => {
  // Cancelled orders cannot be edited
  if (order.status === 'Cancelled') {
    return {
      allowed: false,
      reason: 'Cannot edit cancelled orders'
    };
  }

  // Check if order is fulfilled AND paid
  if (order.status === 'Fulfilled' && (order.payment_status === 'PAID' || order.payment_status === 'OVERPAID')) {
    // Check if 2 hours have passed since the order was last updated
    const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const lastUpdated = new Date(order.updated_at || order.created_at);
    const now = new Date();
    const timeDifference = now - lastUpdated;

    if (timeDifference > TWO_HOURS_IN_MS) {
      // Calculate hours passed for better error message
      const hoursPassed = Math.floor(timeDifference / (60 * 60 * 1000));
      return {
        allowed: false,
        reason: `Cannot edit fulfilled and paid orders after 2 hours (${hoursPassed} hours have passed)`
      };
    }

    // Within 2-hour grace period
    const remainingMinutes = Math.floor((TWO_HOURS_IN_MS - timeDifference) / (60 * 1000));
    console.log(`Order can still be edited for ${remainingMinutes} more minutes`);
  }

  // Order is either:
  // - Not fulfilled
  // - Fulfilled but not paid
  // - Fulfilled and paid but within 2-hour window
  return {
    allowed: true,
    reason: ''
  };
};

/**
 * Format remaining edit time for display
 * @param {Object} order - The order object
 * @returns {string|null} - Formatted time remaining or null if not applicable
 */
export const getEditTimeRemaining = (order) => {
  if (order.status === 'Fulfilled' && (order.payment_status === 'PAID' || order.payment_status === 'OVERPAID')) {
    const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;
    const lastUpdated = new Date(order.updated_at || order.created_at);
    const now = new Date();
    const timeDifference = now - lastUpdated;
    
    if (timeDifference < TWO_HOURS_IN_MS) {
      const remainingMs = TWO_HOURS_IN_MS - timeDifference;
      const hours = Math.floor(remainingMs / (60 * 60 * 1000));
      const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m remaining to edit`;
      } else {
        return `${minutes}m remaining to edit`;
      }
    }
  }
  
  return null;
};
