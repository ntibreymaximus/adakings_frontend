/**
 * Toast Utilities for Optimized Notifications
 * 
 * This utility helps create shorter, more concise toast messages
 * and prevents spamming of notifications
 */

import { toast } from 'react-toastify';

// Track recent messages to prevent duplicates
const recentMessages = new Map();
const DUPLICATE_TIMEOUT = 3000; // 3 seconds

/**
 * Clean up expired messages from the duplicate tracking
 */
const cleanupRecentMessages = () => {
  const now = Date.now();
  for (const [message, timestamp] of recentMessages.entries()) {
    if (now - timestamp > DUPLICATE_TIMEOUT) {
      recentMessages.delete(message);
    }
  }
};

/**
 * Check if a message was recently shown
 */
const isRecentMessage = (message) => {
  cleanupRecentMessages();
  const now = Date.now();
  const lastShown = recentMessages.get(message);
  
  if (lastShown && (now - lastShown) < DUPLICATE_TIMEOUT) {
    return true;
  }
  
  recentMessages.set(message, now);
  return false;
};

/**
 * Shorten long messages while preserving key information
 */
const shortenMessage = (message, maxLength = 60) => {
  if (!message || message.length <= maxLength) {
    return message;
  }
  
  // Try to find a natural break point
  const truncated = message.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

/**
 * Extract the essential part of an error message
 */
const simplifyErrorMessage = (message) => {
  if (!message) return 'An error occurred';
  
  // Common patterns to simplify
  const simplifications = [
    { pattern: /^Error:\s*/i, replacement: '' },
    { pattern: /^HTTP \d+:\s*/i, replacement: '' },
    { pattern: /Network error:\s*/i, replacement: 'Network issue' },
    { pattern: /Failed to fetch/i, replacement: 'Connection failed' },
    { pattern: /Authentication error.*$/i, replacement: 'Login required' },
    { pattern: /Server error.*$/i, replacement: 'Server issue' },
    { pattern: /Please try again.*$/i, replacement: '' },
    { pattern: /\. Please.*$/i, replacement: '' },
  ];
  
  let simplified = message;
  for (const { pattern, replacement } of simplifications) {
    simplified = simplified.replace(pattern, replacement);
  }
  
  return simplified.trim();
};

/**
 * Extract essential part of success messages
 */
const simplifySuccessMessage = (message) => {
  if (!message) return 'Success!';
  
  const simplifications = [
    { pattern: /successfully/i, replacement: '' },
    { pattern: /has been/i, replacement: '' },
    { pattern: /\s+/g, replacement: ' ' }, // Multiple spaces to single
  ];
  
  let simplified = message;
  for (const { pattern, replacement } of simplifications) {
    simplified = simplified.replace(pattern, replacement);
  }
  
  return simplified.trim();
};

/**
 * Optimized toast functions
 */
export const optimizedToast = {
  success: (message, options = {}) => {
    const simplified = simplifySuccessMessage(message);
    const shortened = shortenMessage(simplified, 50);
    
    if (isRecentMessage(shortened)) return;
    
    return toast.success(shortened, {
      autoClose: 2500,
      ...options
    });
  },
  
  error: (message, options = {}) => {
    const simplified = simplifyErrorMessage(message);
    const shortened = shortenMessage(simplified, 55);
    
    if (isRecentMessage(shortened)) return;
    
    return toast.error(shortened, {
      autoClose: 4000,
      ...options
    });
  },
  
  warning: (message, options = {}) => {
    const shortened = shortenMessage(message, 50);
    
    if (isRecentMessage(shortened)) return;
    
    return toast.warning(shortened, {
      autoClose: 3500,
      ...options
    });
  },
  
  info: (message, options = {}) => {
    const shortened = shortenMessage(message, 45);
    
    if (isRecentMessage(shortened)) return;
    
    return toast.info(shortened, {
      autoClose: 3000,
      ...options
    });
  },
  
  // Quick shortcuts for common messages
  loading: (action = 'Loading') => {
    return toast.info(`${action}...`, { autoClose: 2000 });
  },
  
  saved: () => {
    return optimizedToast.success('Saved');
  },
  
  updated: () => {
    return optimizedToast.success('Updated');
  },
  
  deleted: () => {
    return optimizedToast.success('Deleted');
  },
  
  networkError: () => {
    return optimizedToast.error('Connection failed');
  },
  
  authError: () => {
    return optimizedToast.error('Login required');
  },
  
  // Dismiss all toasts
  dismissAll: () => {
    toast.dismiss();
  },
  
  // Custom toast with full control
  custom: (message, type = 'info', options = {}) => {
    const shortened = shortenMessage(message, 60);
    
    if (isRecentMessage(shortened)) return;
    
    return toast[type](shortened, options);
  }
};

/**
 * Enhanced toast functions that provide context
 */
export const contextToast = {
  orderUpdated: (status) => {
    return optimizedToast.success(`Order ${status.toLowerCase()}`);
  },
  
  paymentReceived: (amount, method) => {
    const shortMethod = method.replace(/PAYSTACK\(.*\)/, 'Paystack').replace(/TELECEL CASH/, 'Telecel');
    return optimizedToast.success(`₵${amount} via ${shortMethod}`);
  },
  
  refundProcessed: (amount) => {
    return optimizedToast.success(`₵${amount} refunded`);
  },
  
  formValidation: (field) => {
    return optimizedToast.warning(`${field} required`);
  },
  
  dataRefreshed: () => {
    return optimizedToast.info('Refreshed');
  },
  
  operationPending: () => {
    return optimizedToast.info('Processing...');
  }
};

// Export the original toast for cases where full control is needed
export { toast as originalToast };

// Default export for easy importing
export default optimizedToast;
