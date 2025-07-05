// Payment service for handling payment-related API calls

import { 
  generateTransactionId, 
  generateTransactionReference,
  formatTransactionId
} from '../utils/transactionUtils';

// PaymentService will be initialized with authenticatedFetch from AuthContext
let authenticatedFetch = null;

/**
 * Initialize payment service with authenticated fetch function
 */
export const initializePaymentService = (authFetch) => {
  authenticatedFetch = authFetch;
};

/**
 * Initiate a payment
 * @param {object} paymentData - Payment initiation data
 * @returns {Promise<object>} - Payment response
 */
export const initiatePayment = async (paymentData) => {
  if (!authenticatedFetch) {
    throw new Error('PaymentService not initialized. Call initializePaymentService first.');
  }
  
  // Generate custom transaction ID and reference
  const transactionId = generateTransactionId();
  const transactionRef = generateTransactionReference(
    paymentData.order_number, 
    paymentData.payment_type || 'payment'
  );
  
  // Enhanced payment data with custom transaction identifiers
  const enhancedPaymentData = {
    ...paymentData,
    transaction_id: transactionId,
    transaction_reference: transactionRef,
    client_reference: transactionRef, // For frontend tracking
    metadata: {
      ...paymentData.metadata,
      custom_transaction_id: transactionId,
      order_number: paymentData.order_number,
      payment_type: paymentData.payment_type || 'payment',
      generated_at: new Date().toISOString()
    }
  };
  
  
  const response = await authenticatedFetch(`/payments/initiate/`, {
    method: 'POST',
    body: JSON.stringify(enhancedPaymentData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(`Payment failed: ${errorData.detail || 'Unknown error'}`);
  }

  const result = await response.json();
  
  // Include our custom identifiers in the response
  return {
    ...result,
    custom_transaction_id: transactionId,
    transaction_reference: transactionRef,
    formatted_transaction_id: formatTransactionId(transactionId)
  };
};

/**
 * Get payment modes available
 * @returns {Promise<Array>} - Array of payment modes
 */
export const getPaymentModes = async () => {
  if (!authenticatedFetch) {
    return getFallbackPaymentModes();
  }
  
  try {
    const response = await authenticatedFetch(`/payments/payment-modes/`);

    if (response.ok) {
      const data = await response.json();
      return data.payment_modes.map(item => item.value);
    } else {
      return getFallbackPaymentModes();
    }
  } catch (error) {
    return getFallbackPaymentModes();
  }
};

/**
 * Get fallback payment modes
 * @returns {Array} - Default payment modes
 */
const getFallbackPaymentModes = () => [
  'CASH',
  'TELECEL CASH',
  'MTN MOMO',
  'PAYSTACK(USSD)',
  'PAYSTACK(API)'
];

/**
 * Get payment details by reference
 * @param {string} reference - Payment reference (UUID)
 * @returns {Promise<object>} - Payment details
 */
export const getPaymentDetails = async (reference) => {
  const response = await authenticatedFetch(`/payments/${reference}/`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Payment not found' }));
    throw new Error(`Payment not found: ${errorData.detail || 'Unknown error'}`);
  }

  return await response.json();
};

/**
 * Get all payments (admin only)
 * @param {object} filters - Optional filters (status, payment_method, etc.)
 * @returns {Promise<Array>} - Array of payments
 */
export const getPayments = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      queryParams.append(key, value);
    }
  });

  const url = `/payments/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch payments' }));
    throw new Error(`Failed to fetch payments: ${errorData.detail || 'Unknown error'}`);
  }

  return await response.json();
};

/**
 * Verify payment status (check if payment has been completed)
 * @param {string} reference - Payment reference
 * @returns {Promise<object>} - Verification result
 */
export const verifyPaymentStatus = async (reference) => {
  try {
    const paymentDetails = await getPaymentDetails(reference);
    
    return {
      isCompleted: paymentDetails.status === 'completed',
      status: paymentDetails.status,
      amount: paymentDetails.amount,
      payment_method: paymentDetails.payment_method,
      created_at: paymentDetails.created_at,
      updated_at: paymentDetails.updated_at,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Handle payment callback/verification from Paystack
 * @param {string} reference - Payment reference
 * @param {object} callbackData - Callback data from Paystack
 * @returns {Promise<object>} - Verification result
 */
export const handlePaymentCallback = async (reference, callbackData = {}) => {
  // This would typically be handled by the backend
  // But we can use it to check payment status after redirect
  try {
    return await verifyPaymentStatus(reference);
  } catch (error) {
    throw error;
  }
};

/**
 * Calculate payment summary
 * @param {number} amountReceived - Amount received
 * @param {number} orderTotal - Order total
 * @returns {object} - Payment summary
 */
export const calculatePaymentSummary = (amountReceived, orderTotal) => {
  const received = parseFloat(amountReceived);
  const total = parseFloat(orderTotal);
  
  const difference = received - total;
  
  let status, message, variant;
  
  if (received === total) {
    status = 'Paid';
    message = 'Payment Complete';
    variant = 'success';
  } else if (received < total) {
    status = 'Partially Paid';
    message = `Balance Due: ₵${Math.abs(difference).toFixed(2)}`;
    variant = 'warning';
  } else {
    status = 'Overpaid';
    message = `Change Due: ₵${difference.toFixed(2)}`;
    variant = 'info';
  }
  
  return {
    status,
    message,
    variant,
    balance: difference < 0 ? Math.abs(difference) : 0,
    change: difference > 0 ? difference : 0,
    amountReceived: received,
    orderTotal: total
  };
};

/**
 * Format payment error message
 * @param {object} error - Error object from API
 * @returns {string} - User-friendly error message
 */
export const formatPaymentError = (error) => {
  if (!error || !error.status) {
    return 'Network error: Could not process payment';
  }

  const { status, data } = error;

  switch (status) {
    case 400:
      if (data.mobile_number) {
        return `Mobile number error: ${data.mobile_number}`;
      } else if (data.order_number) {
        return `Order error: ${data.order_number}`;
      } else if (data.amount) {
        return `Amount error: ${data.amount}`;
      } else {
        return data.detail || data.message || 'Payment validation failed';
      }
    case 401:
      return 'Authentication required. Please log in again.';
    case 403:
      return 'You do not have permission to process payments. Please contact your administrator.';
    case 404:
      return 'Order not found. Please refresh the page and try again.';
    case 500:
    case 502:
    case 503:
      return 'Server error occurred. Please try again later or contact support.';
    default:
      return data.detail || data.message || 'Failed to process payment';
  }
};

/**
 * Check if payment method requires mobile number
 * @param {string} paymentMethod - Payment method
 * @returns {boolean} - Whether mobile number is required
 */
export const requiresMobileNumber = (paymentMethod) => {
  return paymentMethod === 'PAYSTACK(API)';
};

/**
 * Check if payment method is immediate (non-API)
 * @param {string} paymentMethod - Payment method
 * @returns {boolean} - Whether payment is processed immediately
 */
export const isImmediatePayment = (paymentMethod) => {
  return ['CASH', 'TELECEL CASH', 'MTN MOMO', 'PAYSTACK(USSD)'].includes(paymentMethod);
};

const paymentService = {
  initiatePayment,
  getPaymentModes,
  getPaymentDetails,
  getPayments,
  verifyPaymentStatus,
  handlePaymentCallback,
  calculatePaymentSummary,
  formatPaymentError,
  requiresMobileNumber,
  isImmediatePayment
};

export default paymentService;

