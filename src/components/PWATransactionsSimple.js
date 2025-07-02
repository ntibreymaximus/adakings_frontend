import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import '../styles/mobile-native.css';

const PWATransactionsSimple = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [transactionStats, setTransactionStats] = useState({
    total: 0,
    totalAmount: 0,
    successfulPayments: 0,
    pendingPayments: 0
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enhanced fetch function with auto-refresh support
  const fetchTransactions = async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('PWA Simple: Fetching transactions...', isAutoRefresh ? '(auto-refresh)' : '');
      
      const response = await fetch('http://localhost:8000/api/payments/transaction-table/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(8000) // 8 second timeout
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch transactions`);
      }

      const data = await response.json();
      console.log('PWA Simple: Raw response:', data);
      
      // Handle different response formats
      let transactionsArray = [];
      if (Array.isArray(data)) {
        transactionsArray = data;
      } else if (data.transactions && Array.isArray(data.transactions)) {
        transactionsArray = data.transactions;
      } else if (data.data && Array.isArray(data.data)) {
        transactionsArray = data.data;
      } else if (data.results && Array.isArray(data.results)) {
        transactionsArray = data.results;
      } else {
        console.warn('PWA Simple: Unexpected data format:', data);
        transactionsArray = [];
      }

      console.log('PWA Simple: Parsed transactions count:', transactionsArray.length);
      setTransactions(transactionsArray);
      setLastUpdated(new Date());
      
      // Only show success message for manual refresh, not auto-refresh
      if (isAutoRefresh) {
        console.log('PWA Simple: Auto-refresh completed successfully');
      }
      
    } catch (err) {
      console.error('PWA Simple: Error fetching transactions:', err);
      
      // Only set error state for non-auto-refresh calls to avoid disrupting UX
      if (!isAutoRefresh) {
        setError(err.message);
      } else {
        console.warn('PWA Simple: Auto-refresh failed, keeping existing data');
      }
      
      if (err.message.includes('Session expired') || err.message.includes('401')) {
        // Redirect to login
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return;
      }
      
      // Only show error toast for manual refresh
      if (!isAutoRefresh) {
        toast.error(err.message);
      }
    } finally {
      if (isAutoRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Filter transactions by selected date
  useEffect(() => {
    if (transactions.length > 0) {
      const filtered = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.created_at || transaction.date).toISOString().split('T')[0];
        return transactionDate === selectedDate;
      });
      
      console.log('PWA Simple: Filtered transactions for', selectedDate, ':', filtered.length);
      setFilteredTransactions(filtered);
      
      // Calculate stats using unified logic
      const stats = {
        total: filtered.length,
        totalAmount: filtered.reduce((sum, t) => {
          // Use consistent refund detection logic
          const isRefund = t.payment_type === 'refund' || 
                          t.payment_type === 'Refund' || 
                          t.type === 'refund' ||
                          (t.amount && parseFloat(t.amount) < 0);
          return isRefund ? sum : sum + parseFloat(t.amount || 0);
        }, 0),
        successfulPayments: filtered.filter(t => {
          const isSuccessful = t.status === 'PAID' || t.status === 'OVERPAID' || t.status === 'success' || t.status === 'completed';
          const isRefund = t.payment_type === 'refund' || 
                          t.payment_type === 'Refund' || 
                          t.type === 'refund' ||
                          (t.amount && parseFloat(t.amount) < 0);
          return isSuccessful && !isRefund;
        }).length,
        pendingPayments: filtered.filter(t => t.status === 'PENDING' || t.status === 'pending').length
      };
      
      console.log('PWA Simple - Stats calculation:', {
        totalTransactions: stats.total,
        totalAmount: stats.totalAmount,
        successful: stats.successfulPayments,
        pending: stats.pendingPayments,
        date: selectedDate
      });
      
      setTransactionStats(stats);
    } else {
      setFilteredTransactions([]);
      setTransactionStats({ total: 0, totalAmount: 0, successfulPayments: 0, pendingPayments: 0 });
    }
  }, [transactions, selectedDate]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions(true); // true indicates this is an auto-refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatPriceLocal = (price) => {
    return `GH₵ ${parseFloat(price || 0).toFixed(2)}`;
  };

  const formatTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid time';
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PAID': '#4caf50',
      'OVERPAID': '#2196f3',
      'PENDING': '#ff9800',
      'FAILED': '#f44336',
      'CANCELLED': '#9e9e9e',
      'success': '#4caf50',
      'completed': '#4caf50',
      'pending': '#ff9800',
      'failed': '#f44336',
      'cancelled': '#9e9e9e'
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'PAID': 'bi bi-check-circle-fill',
      'OVERPAID': 'bi bi-plus-circle-fill',
      'PENDING': 'bi bi-clock',
      'FAILED': 'bi bi-x-circle',
      'CANCELLED': 'bi bi-dash-circle',
      'success': 'bi bi-check-circle-fill',
      'completed': 'bi bi-check-circle-fill',
      'pending': 'bi bi-clock',
      'failed': 'bi bi-x-circle',
      'cancelled': 'bi bi-dash-circle'
    };
    return icons[status] || 'bi bi-circle';
  };

  if (loading) {
    return (
      <div className="pwa-content">
        <div className="pwa-loading">
          <div className="pwa-spinner"></div>
          <div className="pwa-loading-text">Loading transactions...</div>
          <div style={{ marginTop: '16px' }}>
            <button 
              className="pwa-btn pwa-btn-secondary"
              onClick={() => window.location.reload()}
              style={{ fontSize: '0.8rem' }}
            >
              Taking too long? Refresh page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pwa-content">
        <div className="pwa-card">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '3rem', color: '#f44336', marginBottom: '16px' }}>
              ⚠️
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
              Unable to Load Transactions
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
              {error}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="pwa-btn pwa-btn-primary"
                onClick={() => fetchTransactions(false)}
                style={{ minWidth: '120px' }}
              >
                <i className="bi bi-arrow-clockwise"></i>
                Try Again
              </button>
              
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => window.location.reload()}
                style={{ minWidth: '120px' }}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-content">

      {/* Transaction Stats */}
      <div className="pwa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="pwa-card-title" style={{ margin: 0, fontSize: '1.1rem' }}>
              {selectedDate === new Date().toISOString().split('T')[0] ? "Today's" : "Selected Day's"} Summary
            </div>
            {isRefreshing && (
              <div className="auto-refresh-indicator" title="Auto-refreshing data...">
                <i className="bi bi-arrow-clockwise spin" style={{ color: '#4CAF50', fontSize: '0.9rem' }}></i>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              className="pwa-form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ 
                width: 'auto', 
                minWidth: '140px',
                fontSize: '0.85rem',
                padding: '6px 8px',
                margin: 0
              }}
            />
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <button
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                style={{ 
                  width: 'auto',
                  minWidth: '32px',
                  height: '32px',
                  padding: '4px 8px',
                  fontSize: '0.8rem'
                }}
                title="Go to today"
              >
                <i className="bi bi-calendar-check"></i>
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2196F3' }}>
              {transactionStats.total}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Transactions</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#4CAF50' }}>
              {formatPriceLocal(transactionStats.totalAmount)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Amount</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4CAF50' }}>
              {transactionStats.successfulPayments}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Successful</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FF9800' }}>
              {transactionStats.pendingPayments}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Pending</div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="pwa-card">
          <div className="pwa-empty">
            <div className="pwa-empty-icon">
              <i className="bi bi-receipt"></i>
            </div>
            <div className="pwa-empty-title">No Transactions Found</div>
            <div className="pwa-empty-subtitle">
              No transactions found for {selectedDate === new Date().toISOString().split('T')[0] ? 'today' : 'the selected date'}
            </div>
            <div style={{ marginTop: '16px' }}>
              <div>Total transactions available: {transactions.length}</div>
              {transactions.length > 0 && (
                <button 
                  className="pwa-btn pwa-btn-secondary"
                  onClick={() => {
                    // Show all transactions by setting date to first transaction's date
                    const firstTransactionDate = new Date(transactions[0].created_at || transactions[0].date).toISOString().split('T')[0];
                    setSelectedDate(firstTransactionDate);
                  }}
                  style={{ fontSize: '0.85rem', marginTop: '8px' }}
                >
                  Show Available Transactions
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="pwa-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="pwa-card-title" style={{ margin: 0 }}>
              Transactions ({filteredTransactions.length})
            </div>
            {lastUpdated && (
              <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          
          <div className="pwa-list">
            {filteredTransactions.map((transaction, index) => {
              // Use consistent refund detection logic
              const isRefund = transaction.payment_type === 'refund' || 
                              transaction.payment_type === 'Refund' || 
                              transaction.type === 'refund' ||
                              (transaction.amount && parseFloat(transaction.amount) < 0);
              
              return (
                <div key={transaction.id || index} className="pwa-list-item">
                  <div 
                    className="pwa-list-icon" 
                    style={{ 
                      background: getStatusColor(transaction.status), 
                      color: 'white' 
                    }}
                  >
                    <i className={getStatusIcon(transaction.status)}></i>
                  </div>
                  <div className="pwa-list-content">
                    <div className="pwa-list-title">
                      {isRefund ? 'Refund' : 'Payment'} - Order #{transaction.order_number || transaction.order_id || 'N/A'}
                    </div>
                    <div className="pwa-list-subtitle">
                      {transaction.payment_method || transaction.payment_mode || 'N/A'} • {formatTime(transaction.created_at || transaction.date)}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginTop: '8px'
                    }}>
                      <div className="pwa-status" style={{
                        background: `${getStatusColor(transaction.status)}20`,
                        color: getStatusColor(transaction.status)
                      }}>
                        {transaction.status}
                      </div>
                    </div>
                  </div>
                  <div style={{ 
                    fontWeight: '600', 
                    color: isRefund ? '#ff9800' : '#4CAF50',
                    fontSize: '0.9rem'
                  }}>
                    {isRefund ? '-' : ''}{formatPriceLocal(transaction.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PWATransactionsSimple;
