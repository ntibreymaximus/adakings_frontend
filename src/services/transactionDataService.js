/**
 * Unified Transaction Data Service
 * Ensures consistent transaction data across PWA and webview contexts
 */

class TransactionDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTimeout = 5 * 1000; // 5 seconds cache timeout for real-time consistency
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
        console.error('Error in transaction data listener:', error);
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
    console.log('[TransactionDataService] Cache cleared (including dashboard cache)');
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
   * Get transactions with unified caching strategy
   */
  async getTransactions(forceRefresh = false) {
    const cacheKey = 'transactions';
    
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      console.log('[TransactionDataService] Returning cached data');
      return this.cache.get(cacheKey);
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      console.log('[TransactionDataService] Fetching fresh transaction data');
      
      // Add cache-busting parameter to prevent service worker caching issues
      const cacheBuster = `?_t=${Date.now()}&refresh=${forceRefresh ? '1' : '0'}`;
      const url = `http://localhost:8000/api/payments/transaction-table/${cacheBuster}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.notifyListeners('auth-error');
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch transactions`);
      }

      const data = await response.json();
      console.log('[TransactionDataService] Raw API response:', data);
      
      // Normalize the response data
      const normalizedData = this.normalizeTransactionData(data);
      
      // Update cache
      this.cache.set(cacheKey, normalizedData);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      // Update localStorage for offline fallback
      localStorage.setItem('cachedTransactions', JSON.stringify(normalizedData.transactions));
      localStorage.setItem('cachedTransactionsTimestamp', new Date().toISOString());
      
      // Notify listeners of new data
      this.notifyListeners('data-updated', normalizedData);
      
      console.log('[TransactionDataService] Processed transactions:', normalizedData.transactions.length);
      return normalizedData;
      
    } catch (error) {
      console.error('[TransactionDataService] Error fetching transactions:', error);
      
      // Try to return cached data if available
      if (this.cache.has(cacheKey)) {
        console.log('[TransactionDataService] Returning stale cached data due to error');
        return this.cache.get(cacheKey);
      }
      
      // Try localStorage fallback
      const fallbackData = this.getOfflineData();
      if (fallbackData) {
        console.log('[TransactionDataService] Using localStorage fallback data');
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
      console.warn('[TransactionDataService] Unexpected API response format:', apiResponse);
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
      console.error('[TransactionDataService] Error reading offline data:', error);
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

    console.log('[TransactionDataService] Filtering transactions by date:', {
      dateString,
      totalTransactions: transactions.length,
      sampleDates: transactions.slice(0, 3).map(t => ({
        id: t.id,
        created_at: t.created_at,
        date: t.date,
        parsedUTC: new Date(t.created_at || t.date).toISOString().split('T')[0],
        parsedLocal: new Date(t.created_at || t.date).toLocaleDateString('en-CA')
      }))
    });

    const filtered = transactions.filter(transaction => {
      const transactionDateUTC = new Date(transaction.created_at || transaction.date)
        .toISOString().split('T')[0];
      const transactionDateLocal = new Date(transaction.created_at || transaction.date)
        .toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      // Check both UTC and local date interpretations
      const matchesUTC = transactionDateUTC === dateString;
      const matchesLocal = transactionDateLocal === dateString;
      
      if (matchesUTC || matchesLocal) {
        console.log('[TransactionDataService] Transaction matches date filter:', {
          transactionId: transaction.id,
          dateString,
          transactionDateUTC,
          transactionDateLocal,
          matchesUTC,
          matchesLocal
        });
      }
      
      return matchesUTC || matchesLocal;
    });
    
    console.log('[TransactionDataService] Filtered results:', {
      dateString,
      filteredCount: filtered.length,
      totalCount: transactions.length
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
