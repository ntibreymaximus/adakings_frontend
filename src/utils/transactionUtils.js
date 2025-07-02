// Transaction utility functions for generating transaction IDs and references

/**
 * Generate a custom transaction ID similar to order numbers
 * Format: TXN-YYYYMMDD-HHMMSS-XXX
 * Where XXX is a random 3-digit number
 * @returns {string} - Custom transaction ID
 */
export const generateTransactionId = () => {
  const now = new Date();
  
  // Format date as YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Format time as HHMMSS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}${minutes}${seconds}`;
  
  // Generate random 3-digit suffix
  const randomSuffix = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  
  return `TXN-${dateStr}-${timeStr}-${randomSuffix}`;
};

/**
 * Generate a payment reference based on order number
 * Format: PAY-{ORDER_NUMBER}-{TIMESTAMP}
 * @param {string} orderNumber - The order number
 * @returns {string} - Payment reference
 */
export const generatePaymentReference = (orderNumber) => {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  return `PAY-${orderNumber}-${timestamp}`;
};

/**
 * Generate a refund reference based on order number
 * Format: REF-{ORDER_NUMBER}-{TIMESTAMP}
 * @param {string} orderNumber - The order number
 * @returns {string} - Refund reference
 */
export const generateRefundReference = (orderNumber) => {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  return `REF-${orderNumber}-${timestamp}`;
};

/**
 * Generate a transaction reference based on payment type and order
 * @param {string} orderNumber - The order number
 * @param {string} paymentType - 'payment' or 'refund'
 * @returns {string} - Transaction reference
 */
export const generateTransactionReference = (orderNumber, paymentType = 'payment') => {
  if (paymentType === 'refund') {
    return generateRefundReference(orderNumber);
  }
  return generatePaymentReference(orderNumber);
};

/**
 * Parse transaction ID to extract information
 * @param {string} transactionId - The transaction ID to parse
 * @returns {object} - Parsed information or null if invalid format
 */
export const parseTransactionId = (transactionId) => {
  // Check if it matches our custom format: TXN-YYYYMMDD-HHMMSS-XXX
  const customPattern = /^TXN-(\d{8})-(\d{6})-(\d{3})$/;
  const customMatch = transactionId.match(customPattern);
  
  if (customMatch) {
    const [, dateStr, timeStr, suffix] = customMatch;
    
    const year = parseInt(dateStr.substr(0, 4));
    const month = parseInt(dateStr.substr(4, 2)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substr(6, 2));
    
    const hour = parseInt(timeStr.substr(0, 2));
    const minute = parseInt(timeStr.substr(2, 2));
    const second = parseInt(timeStr.substr(4, 2));
    
    const createdAt = new Date(year, month, day, hour, minute, second);
    
    return {
      type: 'custom',
      prefix: 'TXN',
      date: dateStr,
      time: timeStr,
      suffix: suffix,
      createdAt: createdAt,
      isValid: true
    };
  }
  
  // Check if it's a payment/refund reference
  const refPattern = /^(PAY|REF)-(.+)-(\d{6})$/;
  const refMatch = transactionId.match(refPattern);
  
  if (refMatch) {
    const [, prefix, orderNumber, timestamp] = refMatch;
    return {
      type: 'reference',
      prefix: prefix,
      orderNumber: orderNumber,
      timestamp: timestamp,
      isValid: true
    };
  }
  
  // If it doesn't match our patterns, return basic info
  return {
    type: 'unknown',
    value: transactionId,
    isValid: false
  };
};

/**
 * Format transaction ID for display
 * @param {string} transactionId - The transaction ID
 * @returns {string} - Formatted transaction ID
 */
export const formatTransactionId = (transactionId) => {
  const parsed = parseTransactionId(transactionId);
  
  if (parsed.type === 'custom') {
    // Format as TXN-YYYY/MM/DD-HH:MM:SS-XXX for better readability
    const dateFormatted = `${parsed.date.substr(0, 4)}/${parsed.date.substr(4, 2)}/${parsed.date.substr(6, 2)}`;
    const timeFormatted = `${parsed.time.substr(0, 2)}:${parsed.time.substr(2, 2)}:${parsed.time.substr(4, 2)}`;
    return `TXN-${dateFormatted}-${timeFormatted}-${parsed.suffix}`;
  }
  
  if (parsed.type === 'reference') {
    return `${parsed.prefix}-${parsed.orderNumber}-${parsed.timestamp}`;
  }
  
  // Return as-is if we can't parse it
  return transactionId;
};

/**
 * Validate transaction ID format
 * @param {string} transactionId - The transaction ID to validate
 * @returns {boolean} - Whether the transaction ID is valid
 */
export const isValidTransactionId = (transactionId) => {
  const parsed = parseTransactionId(transactionId);
  return parsed.isValid;
};

/**
 * Extract order number from transaction reference
 * @param {string} transactionRef - Transaction reference
 * @returns {string|null} - Order number or null if not found
 */
export const extractOrderNumber = (transactionRef) => {
  const parsed = parseTransactionId(transactionRef);
  return parsed.type === 'reference' ? parsed.orderNumber : null;
};

/**
 * Check if transaction ID indicates a refund
 * @param {string} transactionId - The transaction ID
 * @returns {boolean} - Whether it's a refund transaction
 */
export const isRefundTransaction = (transactionId) => {
  const parsed = parseTransactionId(transactionId);
  return parsed.type === 'reference' && parsed.prefix === 'REF';
};

/**
 * Generate a short display version of transaction ID
 * @param {string} transactionId - The full transaction ID
 * @returns {string} - Short version for display
 */
export const getShortTransactionId = (transactionId) => {
  const parsed = parseTransactionId(transactionId);
  
  if (parsed.type === 'custom') {
    // Return last 6 characters of custom transaction ID
    return `...${transactionId.slice(-6)}`;
  }
  
  if (parsed.type === 'reference') {
    // Return prefix and last part
    return `${parsed.prefix}-...${parsed.timestamp}`;
  }
  
  // For unknown format, return first and last 4 characters
  if (transactionId.length > 8) {
    return `${transactionId.slice(0, 4)}...${transactionId.slice(-4)}`;
  }
  
  return transactionId;
};

export default {
  generateTransactionId,
  generatePaymentReference,
  generateRefundReference,
  generateTransactionReference,
  parseTransactionId,
  formatTransactionId,
  isValidTransactionId,
  extractOrderNumber,
  isRefundTransaction,
  getShortTransactionId
};
