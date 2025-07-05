/**
 * Unified Transaction Data Service with API-First approach
 * Prioritizes direct API calls over caching for real-time transaction data
 */

import { API_BASE_URL } from '../utils/api';
import { apiFirstService } from './apiFirstService';

class TransactionDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTimeout = 30 * 1000; // 30 seconds cache timeout
    this.listeners = new Set();
    this.isOnline = navigator.onLine;
    
    // Monitor network status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.clearCache();
      this.notifyListeners('network-online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('network-offline');
    });
  }

  /**
   * Subscribe to data updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of data changes
   */
  notifyListeners(type, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback({ type, data, timestamp: new Date() });
      } catch (error) {
        // Silent error for listener callbacks
      }
    });
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    // Clear localStorage cache as well
    localStorage.removeItem('cachedTransactions');
    localStorage.removeItem('cachedTransactionsTimestamp');
    localStorage.removeItem('cachedDashboard');
    localStorage.removeItem('cachedDashboardTimestamp');
    // Notify listeners that cache was cleared
    this.notifyListeners('cache-cleared');
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(key) {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < this.cacheTimeout;
  }

  /**
   * Get transactions with API-first approach
   */
  async getTransactions(forceRefresh = false) {
    console.log('🌐 Getting transactions via API-first approach');
    
    try {
      // Use API-first service for real-time transaction data
      const endpoint = `${API_BASE_URL}/payments/transaction-table/?_t=${Date.now()}`;
      
      const data = await apiFirstService.request(endpoint, {
        useCache: false, // Never cache transaction data - always fresh
        fallbackToCache: false, // Don't fall back to cache for real-time data
        bypassCache: forceRefresh,
        timeout: 10000 // Longer timeout for transaction data
      });
      
      // Normalize the response data
      const normalizedData = this.normalizeTransactionData(data);
      
      // Only store in localStorage for offline fallback (not caching)
      localStorage.setItem('cachedTransactions', JSON.stringify(normalizedData.transactions));
      localStorage.setItem('cachedTransactionsTimestamp', new Date().toISOString());
      
      // Notify listeners of new data
      this.notifyListeners('data-updated', normalizedData);
      
      console.log(`✅ API-first returned ${normalizedData.transactions.length} transactions`);
      return normalizedData;
      
    } catch (error) {
      console.warn('❌ API-first failed for transactions:', error.message);
      
      // Only fall back to localStorage for offline scenarios
      const fallbackData = this.getOfflineData();
      if (fallbackData) {
        console.log('🔄 Using offline fallback data for transactions');
        return fallbackData;
      }
      
      throw error;
    }
  }

  /**
   * Normalize transaction data from different API response formats
   */
  normalizeTransactionData(apiResponse) {
    let transactions = [];
    let summary = {};

    // Handle different response formats
    if (Array.isArray(apiResponse)) {
      transactions = apiResponse;
    } else if (apiResponse.transactions && Array.isArray(apiResponse.transactions)) {
      transactions = apiResponse.transactions;
      summary = apiResponse.summary || {};
    } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
      transactions = apiResponse.data;
    } else if (apiResponse.results && Array.isArray(apiResponse.results)) {
      transactions = apiResponse.results;
    } else {
      transactions = [];
    }

    // Ensure all transactions have required fields
    const normalizedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      transaction_id: transaction.transaction_id,
      order_number: transaction.order_number,
      order_id: transaction.order_id,
      customer_phone: transaction.customer_phone,
      payment_method: transaction.payment_method,
      payment_mode: transaction.payment_mode,
      payment_type: transaction.payment_type,
      amount: transaction.amount,
      status: transaction.status,
      is_verified: transaction.is_verified,
      created_at: transaction.created_at || transaction.date,
      date: transaction.date || transaction.created_at,
      currency: transaction.currency || 'GHS',
      payment_reference: transaction.payment_reference,
      order_total: transaction.order_total,
      delivery_type: transaction.delivery_type,
      // Add computed fields
      _normalized_at: new Date().toISOString(),
      _is_refund: this.isRefundTransaction(transaction)
    }));

    // Sort by date (newest first)
    normalizedTransactions.sort((a, b) => {
      const dateA = new Date(a.created_at || a.date);
      const dateB = new Date(b.created_at || b.date);
      return dateB - dateA;
    });

    return {
      transactions: normalizedTransactions,
      summary,
      lastUpdated: new Date().toISOString(),
      source: 'api'
    };
  }

  /**
   * Get offline/fallback data from localStorage
   */
  getOfflineData() {
    try {
      const cachedTransactions = localStorage.getItem('cachedTransactions');
      const cachedTimestamp = localStorage.getItem('cachedTransactionsTimestamp');
      
      if (cachedTransactions) {
        return {
          transactions: JSON.parse(cachedTransactions),
          summary: {},
          lastUpdated: cachedTimestamp || new Date().toISOString(),
          source: 'offline'
        };
      }
    } catch (error) {
      // Silent error for offline data reading
    }
    return null;
  }

  /**
   * Filter transactions by date
   */
  filterTransactionsByDate(transactions, dateString) {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }


    const filtered = transactions.filter(transaction => {
      const transactionDateUTC = new Date(transaction.created_at || transaction.date)
        .toISOString().split('T')[0];
      const transactionDateLocal = new Date(transaction.created_at || transaction.date)
        .toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      // Check both UTC and local date interpretations
      const matchesUTC = transactionDateUTC === dateString;
      const matchesLocal = transactionDateLocal === dateString;
      
      
      return matchesUTC || matchesLocal;
    });
    
    
    return filtered;
  }

  /**
   * Calculate transaction statistics
   */
  calculateStats(transactions) {
    if (!transactions || !Array.isArray(transactions)) {
      return {
        total: 0,
        totalAmount: 0,
        successfulPayments: 0,
        pendingPayments: 0,
        failedPayments: 0
      };
    }

    const stats = {
      total: transactions.length,
      totalAmount: 0,
      successfulPayments: 0,
      pendingPayments: 0,
      failedPayments: 0
    };

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount) || 0;
      const status = transaction.status?.toLowerCase() || '';
      
      // Only count positive amounts (exclude refunds)
      if (!transaction._is_refund && amount > 0) {
        stats.totalAmount += amount;
      }

      // Count by status
      if (['paid', 'overpaid', 'success', 'completed'].includes(status)) {
        stats.successfulPayments++;
      } else if (['pending', 'pending payment', 'processing'].includes(status)) {
        stats.pendingPayments++;
      } else if (['failed', 'cancelled', 'declined', 'error'].includes(status)) {
        stats.failedPayments++;
      }
    });

    return stats;
  }

  /**
   * Check if transaction is a refund
   */
  isRefundTransaction(transaction) {
    if (!transaction) return false;
    
    return transaction.payment_type === 'refund' || 
           transaction.payment_type === 'Refund' || 
           transaction.type === 'refund' ||
           (transaction.amount && parseFloat(transaction.amount) < 0);
  }

  /**
   * Group transactions by payment method
   */
  groupByPaymentMethod(transactions) {
    const groups = {};
    
    transactions.forEach(transaction => {
      const method = transaction.payment_method || transaction.payment_mode || 'Unknown';
      if (!groups[method]) {
        groups[method] = {
          transactions: [],
          totalAmount: 0,
          count: 0
        };
      }
      
      groups[method].transactions.push(transaction);
      groups[method].count++;
      
      // Only add positive amounts (exclude refunds)
      if (!transaction._is_refund) {
        groups[method].totalAmount += parseFloat(transaction.amount) || 0;
      }
    });
    
    return groups;
  }

  /**
   * Get transactions for today
   */
  async getTodayTransactions(forceRefresh = false) {
    const data = await this.getTransactions(forceRefresh);
    const today = new Date().toISOString().split('T')[0];
    return this.filterTransactionsByDate(data.transactions, today);
  }

  /**
   * Get recent transactions (last 7 days)
   */
  async getRecentTransactions(forceRefresh = false) {
    const data = await this.getTransactions(forceRefresh);
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    return data.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.created_at || transaction.date);
      return transactionDate >= lastWeek;
    });
  }
}

// Create and export singleton instance
const transactionDataService = new TransactionDataService();

export default transactionDataService;

// Export for named imports
export {
  transactionDataService,
  TransactionDataService
};
