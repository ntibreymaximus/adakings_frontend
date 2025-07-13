// Payment utilities for handling different payment methods and statuses

export const PAYMENT_METHODS = {
  CASH: 'CASH',
  TELECEL_CASH: 'TELECEL CASH',
  MTN_MOMO: 'MTN MOMO',
  PAYSTACK_USSD: 'PAYSTACK(USSD)',
  PAYSTACK_API: 'PAYSTACK(API)'
};

export const PAYMENT_STATUSES = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  OVERPAID: 'Overpaid',
  PENDING_PAYMENT: 'Pending Payment',
  BOLT: 'BOLT',
  WIX: 'WIX'
};

/**
 * Validate Ghanaian mobile number format
 * @param {string} mobileNumber - The mobile number to validate
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validateGhanaianMobileNumber = (mobileNumber) => {
  if (!mobileNumber || typeof mobileNumber !== 'string') {
    return { isValid: false, message: 'Mobile number is required' };
  }

  const cleanedNumber = mobileNumber.trim().replace(/\s+/g, '');
  
  // Check for valid Ghanaian number format
  // Supports: 0XXXXXXXXX, 233XXXXXXXXX, +233XXXXXXXXX
  const ghanaPattern = /^(\+?233|0)[2-9]\d{8}$/;
  
  if (!ghanaPattern.test(cleanedNumber)) {
    return { 
      isValid: false, 
      message: 'Please enter a valid Ghanaian mobile number (e.g., 0241234567 or 233241234567)' 
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Sanitize mobile number input to allow only valid characters
 * @param {string} input - The input value
 * @returns {string} - Sanitized input
 */
export const sanitizeMobileNumberInput = (input) => {
  // Only allow digits, plus sign, and spaces
  return input.replace(/[^0-9+\s]/g, '');
};

/**
 * Determine payment status based on amount received vs order total
 * @param {number} amountReceived - Amount received
 * @param {number} orderTotal - Order total amount
 * @returns {string} - Payment status
 */
export const determinePaymentStatus = (amountReceived, orderTotal) => {
  const received = parseFloat(amountReceived);
  const total = parseFloat(orderTotal);

  if (received === total) {
    return PAYMENT_STATUSES.PAID;
  } else if (received < total) {
    return PAYMENT_STATUSES.PARTIALLY_PAID;
  } else {
    return PAYMENT_STATUSES.OVERPAID;
  }
};

/**
 * Calculate balance or change based on payment amounts
 * @param {number} amountReceived - Amount received
 * @param {number} orderTotal - Order total amount
 * @returns {object} - { balance: number, change: number, status: string }
 */
export const calculatePaymentBalance = (amountReceived, orderTotal) => {
  const received = parseFloat(amountReceived);
  const total = parseFloat(orderTotal);
  
  const difference = received - total;
  
  return {
    balance: difference < 0 ? Math.abs(difference) : 0,
    change: difference > 0 ? difference : 0,
    status: determinePaymentStatus(received, total)
  };
};

/**
 * Get payment method display information
 * @param {string} paymentMethod - The payment method
 * @returns {object} - { display: string, icon: string, requiresMobile: boolean }
 */
export const getPaymentMethodInfo = (paymentMethod) => {
  switch (paymentMethod?.toUpperCase()) {
    case PAYMENT_METHODS.CASH:
      return { 
        display: 'Cash', 
        icon: 'bi-cash-coin', 
        requiresMobile: false,
        isImmediate: true 
      };
    case PAYMENT_METHODS.TELECEL_CASH:
      return { 
        display: 'Telecel Cash', 
        icon: 'bi-phone-vibrate', 
        requiresMobile: false,
        isImmediate: true 
      };
    case PAYMENT_METHODS.MTN_MOMO:
      return { 
        display: 'MTN MoMo', 
        icon: 'bi-phone', 
        requiresMobile: false,
        isImmediate: true 
      };
    case PAYMENT_METHODS.PAYSTACK_USSD:
      return { 
        display: 'Paystack (USSD)', 
        icon: 'bi-telephone', 
        requiresMobile: false,
        isImmediate: true 
      };
    case PAYMENT_METHODS.PAYSTACK_API:
      return { 
        display: 'Paystack (API)', 
        icon: 'bi-credit-card', 
        requiresMobile: true,
        isImmediate: false 
      };
    default:
      return { 
        display: paymentMethod || 'Unknown', 
        icon: 'bi-question-circle', 
        requiresMobile: false,
        isImmediate: true 
      };
  }
};

/**
 * Get payment status badge variant for Bootstrap
 * @param {string} paymentStatus - The payment status
 * @returns {string} - Bootstrap badge class
 */
export const getPaymentStatusBadgeVariant = (paymentStatus) => {
  switch (paymentStatus?.toLowerCase()) {
    case 'paid':
      return 'bg-success';
    case 'unpaid':
      return 'bg-danger';
    case 'partially paid':
      return 'bg-warning text-dark';
    case 'overpaid':
      return 'bg-info';
    case 'pending payment':
      return 'bg-secondary';
    case 'bolt':
      return 'bg-success';
    case 'wix':
      return 'bg-success';
    default:
      return 'bg-secondary';
  }
};

/**
 * Format amount for display
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted amount with currency symbol
 */
export const formatAmount = (amount) => {
  const num = parseFloat(amount);
  return isNaN(num) ? '₵0.00' : `₵${num.toFixed(2)}`;
};

/**
 * Handle payment window for Paystack integration
 * @param {string} authorizationUrl - Paystack authorization URL
 * @param {function} onSuccess - Callback for successful payment
 * @param {function} onClose - Callback for window close
 * @returns {Window} - Payment window reference
 */
export const openPaymentWindow = (authorizationUrl, onSuccess, onClose) => {
  const paymentWindow = window.open(
    authorizationUrl, 
    '_blank', 
    'width=600,height=600,scrollbars=yes,resizable=yes'
  );

  // Monitor payment window
  const checkClosed = setInterval(() => {
    if (paymentWindow.closed) {
      clearInterval(checkClosed);
      if (onClose) onClose();
    }
  }, 1000);

  // Listen for messages from payment window (if Paystack sends postMessage)
  const handleMessage = (event) => {
    if (event.origin !== 'https://checkout.paystack.com') return;
    
    if (event.data && event.data.type === 'payment_success') {
      clearInterval(checkClosed);
      paymentWindow.close();
      if (onSuccess) onSuccess(event.data);
      window.removeEventListener('message', handleMessage);
    }
  };

  window.addEventListener('message', handleMessage);

  return paymentWindow;
};

const paymentUtils = {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  validateGhanaianMobileNumber,
  sanitizeMobileNumberInput,
  determinePaymentStatus,
  calculatePaymentBalance,
  getPaymentMethodInfo,
  getPaymentStatusBadgeVariant,
  formatAmount,
  openPaymentWindow
};

export default paymentUtils;

