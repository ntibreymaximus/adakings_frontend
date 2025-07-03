import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// Use unified transaction data service for consistency
import { useTransactionData } from '../hooks/useTransactionData';
import transactionDataService from '../services/transactionDataService';
import '../styles/mobile-native.css';

const PWADashboard = ({ userData, onLogout }) => {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Use unified transaction data service for consistency
  const {
    transactions: allTransactions,
    loading: transactionsLoading,
    error: transactionsError,
    refresh: refreshTransactions,
    getTransactionsByDate,
    getTransactionStats
  } = useTransactionData({
    autoRefresh: true,
    refreshInterval: 30000, // 30-second refresh for dashboard
    onError: (error) => {
      console.error('PWA Dashboard transaction error:', error);
    }
  });
  
  // Enhanced state management with better loading and error handling
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [errors, setErrors] = useState({ orders: null, transactions: null });
  
  // Handle transaction errors from the hook
  useEffect(() => {
    if (transactionsError) {
      console.log('DEBUG [PWADashboard]: Transaction error from hook:', transactionsError);
      setErrors(prev => ({ ...prev, transactions: transactionsError }));
    }
  }, [transactionsError]);

  // Monitor transaction data changes for debugging
  useEffect(() => {
    if (allTransactions) {
      console.log('DEBUG [PWADashboard]: Transaction data updated, count:', allTransactions?.length || 0);
    }
  }, [allTransactions?.length]);
  
  // Use unified transaction service for today's data and stats
  const getTodayData = useCallback(() => {
    if (!allTransactions || allTransactions.length === 0) {
      console.log('PWA Dashboard - No transactions available for today calculation');
      return { transactions: [], revenue: 0, count: 0 };
    }
    
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = getTransactionsByDate(today);
    const todayStats = getTransactionStats(todayTransactions);
    
    // Debug date filtering
    console.log('PWA Dashboard - Today data calculation:', {
      todayDate: today,
      allTransactionsCount: allTransactions.length,
      todayTransactionsCount: todayTransactions.length,
      todayRevenue: todayStats.totalAmount,
      sampleTransactionDates: allTransactions.slice(0, 5).map(t => ({
        id: t.id,
        created_at: t.created_at,
        date: t.date,
        parsedDate: new Date(t.created_at || t.date).toISOString().split('T')[0],
        matchesToday: new Date(t.created_at || t.date).toISOString().split('T')[0] === today
      }))
    });
    
    return {
      transactions: todayTransactions,
      revenue: todayStats.totalAmount,
      count: todayTransactions.length
    };
  }, [allTransactions, getTransactionsByDate, getTransactionStats]);

  // Memoize todayStats using unified transaction data
  const todayStats = useMemo(() => {
    const todayData = getTodayData();
    const stats = {
      totalOrders: dashboardData?.totalOrders || 0,
      totalRevenue: todayData.revenue, // Use unified transaction service for revenue
      loading: loading || transactionsLoading
    };
    
    console.log('PWA Dashboard - Today stats calculated:', {
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      loading: stats.loading,
      dashboardDataAvailable: !!dashboardData,
      todayTransactionsCount: todayData.count,
      allTransactionsCount: allTransactions?.length || 0
    });
    
    return stats;
  }, [dashboardData, getTodayData, loading, transactionsLoading, allTransactions?.length]);
  
  const recentActivity = {
    activities: dashboardData?.recentActivity || [],
    loading: loading
  };

  // Enhanced fetch function with parallel loading and graceful error handling
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrors({ orders: null, transactions: null });
      setIsRetrying(false);
      
      // Check if offline
      if (!navigator.onLine) {
        setIsOffline(true);
        // Try to load cached data
        const cachedDashboard = localStorage.getItem('cachedDashboard');
        if (cachedDashboard) {
          setDashboardData(JSON.parse(cachedDashboard));
          setError('You are offline. Showing cached data.');
        } else {
          throw new Error('No internet connection and no cached data available');
        }
        return;
      }
      
      setIsOffline(false);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const today = new Date().toISOString().split('T')[0];
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];
      
      // Set up abort controllers for timeout handling
      const ordersController = new AbortController();
      const transactionsController = new AbortController();
      const recentController = new AbortController();
      
      const timeoutId = setTimeout(() => {
        ordersController.abort();
        transactionsController.abort();
        recentController.abort();
      }, 8000); // 8 second timeout

      // Parallel fetch with individual error handling
      const fetchPromises = [
        // Fetch today's orders
        fetch(`http://localhost:8000/api/orders/?date=${today}&ordering=-updated_at`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: ordersController.signal
        }).then(response => {
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Session expired. Please login again.');
            }
            throw new Error('Failed to fetch orders data');
          }
          return response.json();
        }).catch(err => {
          setErrors(prev => ({ ...prev, orders: err.message }));
          return null;
        }),
        
        // Fetch ALL transactions to ensure consistency with PWA Transactions page
        fetch(`http://localhost:8000/api/payments/transaction-table/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: transactionsController.signal
        }).then(response => {
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Session expired. Please login again.');
            }
            throw new Error('Failed to fetch transactions data');
          }
          return response.json();
        }).catch(err => {
          setErrors(prev => ({ ...prev, transactions: err.message }));
          return null;
        }),
        
        // Fetch recent activity (orders)
        fetch(`http://localhost:8000/api/orders/?created_at__gte=${lastWeekStr}&ordering=-updated_at`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: recentController.signal
        }).then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch recent activity');
          }
          return response.json();
        }).catch(err => {
          console.warn('Recent activity fetch failed:', err);
          return null;
        }),
        
        // Fetch recent transactions for activity feed
        fetch(`http://localhost:8000/api/payments/transaction-table/?created_at__gte=${lastWeekStr}&ordering=-created_at`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: recentController.signal
        }).then(response => {
          console.log('DEBUG: Recent transactions API response status:', response.status);
          if (!response.ok) {
            throw new Error('Failed to fetch recent transactions');
          }
          return response.json();
        }).catch(err => {
          console.warn('Recent transactions fetch failed:', err);
          return null;
        })
      ];

      const [ordersData, , recentOrdersData, recentTransactionsData] = await Promise.all(fetchPromises);
      clearTimeout(timeoutId);

      // Process orders data
      let totalOrders = 0;
      if (ordersData) {
        const orders = ordersData.results || ordersData;
        totalOrders = Array.isArray(orders) ? orders.length : 0;
        console.log('DEBUG [PWADashboard]: Today\'s orders processed:', {
          ordersDataType: typeof ordersData,
          ordersArray: Array.isArray(orders),
          ordersCount: totalOrders,
          hasResults: !!ordersData.results
        });
      } else {
        console.log('DEBUG [PWADashboard]: No orders data received for today');
      }

      // Use unified transaction service for revenue calculation
      // This ensures 100% consistency with PWATransactions page
      const todayData = getTodayData();
      const totalRevenue = todayData.revenue;

      // Process recent activity - combine orders and transactions
      let recentActivity = [];
      
      // Add recent orders
      if (recentOrdersData) {
        const recentOrders = recentOrdersData.results || recentOrdersData;
        const orderActivities = recentOrders.map(order => ({
          id: `order-${order.id}`,
          title: `Order #${(order.order_number || order.id).toString().slice(-3)} ${getActivityTitle(order.status)}`,
          timeAgo: order.time_ago || 'Recently',
          icon: getStatusIcon(order.status),
          color: getStatusColor(order.status),
          statusText: order.status,
          statusClass: getStatusClass(order.status),
          order_id: order.order_number || order.id, // Use order_number for navigation
          status: order.status,
          type: 'order',
          created_at: order.created_at || order.updated_at
        }));
        recentActivity = [...recentActivity, ...orderActivities];
      }
      
        // Add recent transactions
        console.log('DEBUG: Recent transactions data:', recentTransactionsData);
        if (recentTransactionsData) {
          const recentTransactions = Array.isArray(recentTransactionsData) ? recentTransactionsData : 
                                   (recentTransactionsData.transactions || recentTransactionsData.results || recentTransactionsData.data || []);
          console.log('DEBUG: Parsed recent transactions:', recentTransactions);
          console.log('DEBUG: Recent transactions count:', recentTransactions.length);
          
          const transactionActivities = recentTransactions.map((transaction, index) => ({
            id: `transaction-${transaction.id || `temp-${Date.now()}-${index}`}`,
            title: `${getTransactionActivityTitle(transaction)} ₵${parseFloat(transaction.amount || 0).toFixed(2)}`,
            timeAgo: transaction.time_ago || 'Recently',
            icon: getTransactionIcon(transaction),
            color: getTransactionColor(transaction),
            statusText: transaction.status || 'Completed',
            statusClass: getTransactionStatusClass(transaction),
            order_id: transaction.order_number || transaction.order_id || transaction.order, // Use order_number for navigation
            transaction_id: transaction.id,
            status: transaction.status,
            type: 'transaction',
            created_at: transaction.created_at
          }));
          console.log('DEBUG: Transaction activities created:', transactionActivities);
          recentActivity = [...recentActivity, ...transactionActivities];
        } else {
          console.log('DEBUG: No recent transactions data received');
        }
      
      // Sort by created_at and limit to 5 most recent
      console.log('DEBUG: Combined recent activity before sorting:', recentActivity);
      recentActivity = recentActivity
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      console.log('DEBUG: Final recent activity after sorting and limiting:', recentActivity);

      const dashboardResult = {
        totalOrders,
        totalRevenue,
        recentActivity,
        hasOrdersError: !!errors.orders,
        hasTransactionsError: !!errors.transactions
      };
      
      console.log('DEBUG [PWADashboard]: Setting dashboard result:', {
        totalOrders,
        totalRevenue,
        recentActivityCount: recentActivity.length,
        hasOrdersError: !!errors.orders,
        hasTransactionsError: !!errors.transactions
      });

      setDashboardData(dashboardResult);
      setLastUpdated(new Date());
      setRetryCount(0);
      
      // Cache the data for offline use
      localStorage.setItem('cachedDashboard', JSON.stringify(dashboardResult));
      localStorage.setItem('cachedDashboardTimestamp', new Date().toISOString());
      
      // Check for any errors and show appropriate messages
      if (errors.orders && errors.transactions) {
        setError('Unable to load orders and transactions data. Some information may be incomplete.');
      } else if (errors.orders) {
        setError('Unable to load orders data. Transaction data is still available.');
      } else if (errors.transactions) {
        setError('Unable to load transactions data. Order data is still available.');
      }
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.message.includes('Session expired')) {
        setError(err.message);
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          localStorage.removeItem('userData');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          navigate('/login');
        }, 3000);
      } else {
        setError(err.message || 'Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-retry function
  const handleRetry = async () => {
    if (retryCount < 3) {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Progressive delay
      await fetchDashboardData();
      setIsRetrying(false);
    } else {
      setError('Maximum retry attempts reached. Please refresh the page.');
    }
  };

  // Network status monitoring with stable dependencies
  const handleOnlineRef = useRef();
  const handleOfflineRef = useRef();
  
  handleOnlineRef.current = () => {
    setIsOffline(false);
    // Only fetch if we have an offline error
    if (error && error.includes('offline')) {
      fetchDashboardData();
    }
  };
  
  handleOfflineRef.current = () => {
    setIsOffline(true);
  };
  
  useEffect(() => {
    const handleOnline = () => handleOnlineRef.current();
    const handleOffline = () => handleOfflineRef.current();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Remove error dependency

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh data function - also refresh transaction data
  const refreshData = () => {
    // Clear transaction cache and refresh
    transactionDataService.clearCache();
    refreshTransactions();
    fetchDashboardData();
  };

  const handleLogout = () => {
    setShowProfileModal(false);
    if (onLogout) {
      onLogout();
    } else {
      // Fallback if onLogout is not provided
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      navigate('/login');
    }
  };

  // Handle error display
  useEffect(() => {
    if (error) {
      console.error('Dashboard data error:', error);
      // If it's an authentication error, redirect to login
      if (error.includes('Authentication') || error.includes('token')) {
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        navigate('/login');
      }
    }
  }, [error, navigate]);



  // Loading state with detailed indicators
  if (loading || isRetrying) {
    return (
      <div className="pwa-content">
        <div className="pwa-app-header">
          <h1 className="pwa-app-title">Adakings</h1>
          <p className="pwa-app-subtitle">Restaurant Management</p>
        </div>
        
        <div className="pwa-loading">
          <div className="pwa-spinner"></div>
          <div className="pwa-loading-text">
            {isRetrying ? 'Retrying connection...' : 'Loading dashboard...'}
          </div>
          {isOffline && (
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#ff9800' }}>
              📡 You appear to be offline
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state with fallback UI
  if (error && !dashboardData) {
    return (
      <div className="pwa-content">
        <div className="pwa-app-header">
          <h1 className="pwa-app-title">Adakings</h1>
          <p className="pwa-app-subtitle">Restaurant Management</p>
        </div>
        
        <div className="pwa-card">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '3rem', color: '#f44336', marginBottom: '16px' }}>
              ⚠️
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
              Unable to Load Dashboard
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
              {error}
            </div>
            
            {isOffline && (
              <div style={{ 
                background: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '8px', 
                padding: '12px', 
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                📡 You are currently offline. Please check your internet connection and try again.
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="pwa-btn pwa-btn-primary"
                onClick={handleRetry}
                disabled={retryCount >= 3}
                style={{ minWidth: '120px' }}
              >
                <i className="bi bi-arrow-clockwise"></i>
                {retryCount >= 3 ? 'Max Retries' : 'Try Again'}
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
            
            {retryCount > 0 && (
              <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#666' }}>
                Retry attempts: {retryCount}/3
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-content">
      {/* Connection Status Warning */}
      {(isOffline || error) && (
        <div style={{
          background: isOffline ? '#fff3cd' : '#f8d7da',
          border: `1px solid ${isOffline ? '#ffeaa7' : '#f5c6cb'}`,
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '16px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className={`bi ${isOffline ? 'bi-wifi-off' : 'bi-exclamation-triangle'}`}></i>
          {isOffline ? 'Offline - Showing cached data' : error}
        </div>
      )}
      
      {/* App Header */}
      <div className="pwa-app-header">
        <h1 className="pwa-app-title">Adakings</h1>
        <p className="pwa-app-subtitle">Restaurant Management</p>
      </div>

      {/* Welcome Card */}
      <div className="pwa-card" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
        <div className="pwa-card-header">
          <div className="pwa-card-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <i className="bi bi-person-circle"></i>
          </div>
          <div style={{ flex: 1 }}>
            <div className="pwa-card-title">{userData?.username}</div>
            <div className="pwa-card-subtitle">{userData?.role || 'Staff'}</div>
          </div>
          <div style={{ color: '#666', fontSize: '1.2rem' }}>
            <i className="bi bi-chevron-right"></i>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="pwa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="pwa-card-title" style={{ margin: 0 }}>Today's Overview</div>
          <button
            className="pwa-btn pwa-btn-secondary"
            onClick={refreshData}
            style={{ 
              width: 'auto',
              minWidth: '32px',
              height: '32px',
              padding: '4px 8px',
              fontSize: '0.8rem'
            }}
            title={`Last updated: ${lastUpdated?.toLocaleTimeString() || 'Never'}`}
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            {todayStats.loading ? (
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#666' }}>...</div>
            ) : (
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4CAF50' }}>
                {todayStats.totalOrders}
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Orders</div>
            {errors.orders && (
              <div style={{ fontSize: '0.7rem', color: '#f44336', marginTop: '2px' }}>
                Error loading
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            {todayStats.loading ? (
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#666' }}>...</div>
            ) : (
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2196F3' }}>
                ₵{(todayStats.totalRevenue || 0).toFixed(2)}
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Revenue</div>
            {errors.transactions && (
              <div style={{ fontSize: '0.7rem', color: '#f44336', marginTop: '2px' }}>
                Error loading
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Recent Activity - Enhanced Card Option (Commented out) */}
      {/* <div style={{ marginBottom: '16px' }}>
        <RecentActivityCard 
          maxItems={3}
          showFullHistory={true}
          refreshInterval={30000}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}
        />
      </div> */}

      {/* Recent Activity - Legacy Style (Now Default) */}
      <div className="pwa-card">
        <div className="pwa-card-title" style={{ marginBottom: '16px' }}>Recent Activity</div>
        {recentActivity.loading ? (
          <div className="pwa-loading">
            <div className="pwa-spinner"></div>
            <div className="pwa-loading-text">Loading activity...</div>
          </div>
        ) : recentActivity.activities.length > 0 ? (
          <div className="pwa-list">
            {recentActivity.activities.map((activity, index) => {
              const handleActivityClick = () => {
                console.log('DEBUG [PWADashboard]: Activity clicked:', activity);
                
                if (activity.type === 'transaction') {
                  // For transactions, navigate to transactions page or order details if order_id exists
                  if (activity.order_id) {
                    console.log('DEBUG [PWADashboard]: Navigating to order details for transaction:', activity.order_id);
                    navigate(`/order-details/${activity.order_id}`);
                  } else {
                    console.log('DEBUG [PWADashboard]: Navigating to transactions page');
                    navigate('/view-transactions');
                  }
                } else if (activity.order_id) {
                  // Navigate to order details page using order_id from the activity
                  console.log('DEBUG [PWADashboard]: Navigating to order details:', activity.order_id);
                  navigate(`/order-details/${activity.order_id}`);
                } else {
                  // Fallback navigation if no specific order ID
                  console.log('DEBUG [PWADashboard]: Fallback navigation to orders page');
                  navigate('/view-orders');
                }
              };

              return (
                <div 
                  key={activity.id || index} 
                  className="pwa-list-item"
                  onClick={handleActivityClick}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    ':hover': {
                      backgroundColor: '#f8f9fa'
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="pwa-list-icon" style={{ background: activity.color }}>
                    <i className={activity.icon}></i>
                  </div>
                  <div className="pwa-list-content">
                    <div className="pwa-list-title">{activity.title}</div>
                    <div className="pwa-list-subtitle">{activity.timeAgo}</div>
                  </div>
                  <div className={`pwa-status ${activity.statusClass}`}>{activity.statusText}</div>
                  <div className="pwa-list-action" style={{ marginLeft: '8px', color: '#666' }}>
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pwa-empty">
            <div className="pwa-empty-icon">
              <i className="bi bi-clock-history"></i>
            </div>
            <div className="pwa-empty-title">No Recent Activity</div>
            <div className="pwa-empty-subtitle">Order activity will appear here</div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="pwa-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <div className="pwa-modal-title">Account</div>
            </div>
            
            <div className="pwa-list">
              <div className="pwa-list-item">
                <div className="pwa-list-icon">
                  <i className="bi bi-person-circle"></i>
                </div>
                <div className="pwa-list-content">
                  <div className="pwa-list-title">{userData?.username}</div>
                  <div className="pwa-list-subtitle">{userData?.role || 'Staff'}</div>
                </div>
              </div>
              
              <button 
                className="pwa-list-item"
                onClick={() => {
                  setShowProfileModal(false);
                  navigate('/profile');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div className="pwa-list-icon">
                  <i className="bi bi-person"></i>
                </div>
                <div className="pwa-list-content">
                  <div className="pwa-list-title">Profile</div>
                  <div className="pwa-list-subtitle">Manage your account</div>
                </div>
                <div className="pwa-list-action">
                  <i className="bi bi-chevron-right"></i>
                </div>
              </button>
              
              <button 
                className="pwa-list-item"
                onClick={() => {
                  setShowProfileModal(false);
                  // Navigate to settings when implemented
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div className="pwa-list-icon">
                  <i className="bi bi-gear"></i>
                </div>
                <div className="pwa-list-content">
                  <div className="pwa-list-title">Settings</div>
                  <div className="pwa-list-subtitle">App preferences</div>
                </div>
                <div className="pwa-list-action">
                  <i className="bi bi-chevron-right"></i>
                </div>
              </button>
            </div>
            
            <div className="pwa-modal-actions">
              <button 
                className="pwa-btn pwa-btn-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right"></i>
                Logout
              </button>
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for dashboard activity
const getActivityTitle = (status) => {
  switch (status?.toLowerCase()) {
    case 'fulfilled': return 'fulfilled';
    case 'out for delivery': return 'out for delivery';
    case 'accepted': return 'accepted';
    case 'ready': return 'ready';
    case 'pending': return 'received';
    case 'cancelled': return 'cancelled';
    default: return status?.toLowerCase() || 'updated';
  }
};

const getStatusIcon = (status) => {
  const icons = {
    'Fulfilled': 'bi bi-check-circle',
    'Out for Delivery': 'bi bi-truck',
    'Ready': 'bi bi-clock-fill',
    'Accepted': 'bi bi-hand-thumbs-up',
    'Pending': 'bi bi-plus',
    'Cancelled': 'bi bi-x-circle'
  };
  return icons[status] || 'bi bi-circle';
};

const getStatusColor = (status) => {
  const colors = {
    'Fulfilled': '#4CAF50',
    'Out for Delivery': '#FF9800',
    'Ready': '#673AB7',
    'Accepted': '#2196F3',
    'Pending': '#2196F3',
    'Cancelled': '#f44336'
  };
  return colors[status] || '#666';
};

const getStatusClass = (status) => {
  const classes = {
    'Fulfilled': 'pwa-status-success',
    'Out for Delivery': 'pwa-status-warning',
    'Ready': 'pwa-status-accepted',
    'Accepted': 'pwa-status-info',
    'Pending': 'pwa-status-info',
    'Cancelled': 'pwa-status-danger'
  };
  return classes[status] || 'pwa-status-info';
};

// Helper functions for transaction activities
const getTransactionActivityTitle = (transaction) => {
  const isRefund = transaction.payment_type === 'refund' || 
                  transaction.payment_type === 'Refund' || 
                  transaction.type === 'refund' ||
                  (transaction.amount && parseFloat(transaction.amount) < 0);
  
  if (isRefund) {
    return 'Refund processed';
  }
  
  return 'Payment received';
};

const getTransactionIcon = (transaction) => {
  const isRefund = transaction.payment_type === 'refund' || 
                  transaction.payment_type === 'Refund' || 
                  transaction.type === 'refund' ||
                  (transaction.amount && parseFloat(transaction.amount) < 0);
  
  if (isRefund) {
    return 'bi bi-arrow-counterclockwise';
  }
  
  return 'bi bi-credit-card';
};

const getTransactionColor = (transaction) => {
  const isRefund = transaction.payment_type === 'refund' || 
                  transaction.payment_type === 'Refund' || 
                  transaction.type === 'refund' ||
                  (transaction.amount && parseFloat(transaction.amount) < 0);
  
  if (isRefund) {
    return '#ff9800';
  }
  
  return '#4CAF50';
};

const getTransactionStatusClass = (transaction) => {
  const isRefund = transaction.payment_type === 'refund' || 
                  transaction.payment_type === 'Refund' || 
                  transaction.type === 'refund' ||
                  (transaction.amount && parseFloat(transaction.amount) < 0);
  
  if (isRefund) {
    return 'pwa-status-refund';
  }
  
  return 'pwa-status-payment';
};

export default PWADashboard;
