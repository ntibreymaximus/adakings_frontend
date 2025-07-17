/**
 * Order utility functions
 */

/**
 * Check if an order can be edited based on its status and time constraints
 * @param {Object} order - The order object to check
 * @returns {Object} - Object with 'allowed' boolean and 'reason' string
 */
export const canEditOrder = (order) => {
  // Input validation
  if (!order) {
    console.error('❌ canEditOrder: No order provided');
    return {
      allowed: false,
      reason: 'Invalid order data'
    };
  }

  // Add logging for debugging
  console.log('🔍 Checking edit permissions for order:', {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    updated_at: order.updated_at,
    created_at: order.created_at
  });

  // Cancelled orders cannot be edited
  if (order.status === 'Cancelled') {
    console.log('🚫 Order is cancelled - cannot edit');
    return {
      allowed: false,
      reason: 'Cannot edit cancelled orders'
    };
  }

  // Check if order is fulfilled AND paid
  if (order.status === 'Fulfilled' && (order.payment_status === 'PAID' || order.payment_status === 'OVERPAID')) {
    console.log('⚖️ Order is fulfilled and paid - checking 2-hour grace period');
    
    const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    // Use updated_at if available, otherwise use created_at
    const lastUpdatedStr = order.updated_at || order.created_at;
    if (!lastUpdatedStr) {
      console.warn('⚠️ No timestamp available for order', order.id);
      return { 
        allowed: false, 
        reason: 'Order timestamp unavailable - cannot verify edit window' 
      };
    }

    const lastUpdated = new Date(lastUpdatedStr);
    const now = new Date();
    
    // Validate date parsing
    if (isNaN(lastUpdated.getTime())) {
      console.error('❌ Invalid date format:', lastUpdatedStr);
      return { 
        allowed: false, 
        reason: 'Invalid order timestamp format' 
      };
    }

    const timeDifference = now - lastUpdated;
    
    console.log('⏰ Time check details:', {
      lastUpdated: lastUpdated.toISOString(),
      now: now.toISOString(),
      timeDifference: timeDifference,
      timeDifferenceHours: (timeDifference / (60 * 60 * 1000)).toFixed(2),
      twoHoursMs: TWO_HOURS_IN_MS,
      canEdit: timeDifference <= TWO_HOURS_IN_MS
    });

    if (timeDifference > TWO_HOURS_IN_MS) {
      // Calculate hours passed for better error message
      const hoursPassed = Math.floor(timeDifference / (60 * 60 * 1000));
      const minutesPassed = Math.floor((timeDifference % (60 * 60 * 1000)) / (60 * 1000));
      console.log(`❌ Edit window expired: ${hoursPassed}h ${minutesPassed}m have passed`);
      return {
        allowed: false,
        reason: `Cannot edit fulfilled and paid orders after 2 hours (${hoursPassed}h ${minutesPassed}m have passed)`
      };
    }

    // Within 2-hour grace period
    const remainingMinutes = Math.floor((TWO_HOURS_IN_MS - timeDifference) / (60 * 1000));
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingMins = remainingMinutes % 60;
    console.log(`✅ Order can still be edited for ${remainingHours}h ${remainingMins}m`);
  }

  // Order is either:
  // - Not fulfilled
  // - Fulfilled but not paid
  // - Fulfilled and paid but within 2-hour window
  console.log('✅ Order can be edited');
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
