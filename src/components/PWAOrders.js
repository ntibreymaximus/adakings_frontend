import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  getOrderStatusClass, 
  getOrderStatusIcon, 
  getOrderStatusColor,
  getPaymentMethodIcon, 
  getPaymentModeDisplay,
  formatPrice,
  formatActivityTime 
} from '../utils/activityTypes';
import { initiatePayment, formatPaymentError } from '../services/paymentService';
import '../styles/mobile-native.css';

const PWAOrders = () => {
  const navigate = useNavigate();
  
  // Enhanced state management with better loading and error handling
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Additional state for filtered data
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    fulfilled: 0,
    cancelled: 0
  });
  
  // Modal and interaction states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPaymentMode, setNewPaymentMode] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [isRefundMode, setIsRefundMode] = useState(false);
  const [paymentModes] = useState([
    { value: 'CASH', label: 'Cash', disabled: false },
    { value: 'TELECEL CASH', label: 'Telecel Cash', disabled: false },
    { value: 'MTN MOMO', label: 'MTN MoMo', disabled: false },
    { value: 'PAYSTACK(USSD)', label: 'Paystack (USSD)', disabled: false },
    { value: 'PAYSTACK(API)', label: 'Paystack (API)', disabled: false }
  ]);
  // Enhanced fetch function with better error handling and offline support
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRetrying(false);
      
      // Check if offline
      if (!navigator.onLine) {
        setIsOffline(true);
        // Try to load cached data
        const cachedOrders = localStorage.getItem('cachedOrders');
        if (cachedOrders) {
          setOrders(JSON.parse(cachedOrders));
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch('http://localhost:8000/api/orders/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error('Failed to fetch orders');
        }
      }

      const data = await response.json();
      console.log('PWAOrders: Raw API response:', data);
      
      // Extract the results array from the paginated response
      const ordersArray = data.results || [];
      console.log('PWAOrders: Extracted orders array:', ordersArray);
      console.log('PWAOrders: Orders array length:', ordersArray.length);
      
      setOrders(ordersArray);
      setLastUpdated(new Date());
      setRetryCount(0);
      
      // Cache the data for offline use
      localStorage.setItem('cachedOrders', JSON.stringify(ordersArray));
      localStorage.setItem('cachedOrdersTimestamp', new Date().toISOString());
      
    } catch (err) {
      console.error('Error fetching orders:', err);
      
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.message.includes('Session expired')) {
        setError(err.message);
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          localStorage.removeItem('userData');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }, 3000);
      } else {
        setError(err.message || 'Failed to fetch data');
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
      await new Promise(resolve => setTimeout(resolve, 500 * retryCount)); // Reduced progressive delay
      await fetchOrders();
      setIsRetrying(false);
    } else {
      toast.error('Maximum retry attempts reached. Please refresh the page.');
    }
  };

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (error && error.includes('offline')) {
        fetchOrders(); // Auto-fetch when back online
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, []);

  // Refresh data function
  const refreshData = () => {
    fetchOrders();
  };

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Update filtered orders when main orders data changes
  useEffect(() => {
    console.log('PWAOrders: Filtering orders. Total orders:', orders?.length || 0);
    console.log('PWAOrders: Selected date:', selectedDate);
    console.log('PWAOrders: Orders array:', orders);
    
    if (orders && orders.length > 0) {
      const filtered = orders.filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        console.log('PWAOrders: Order date:', orderDate, 'Selected date:', selectedDate, 'Match:', orderDate === selectedDate);
        return orderDate === selectedDate;
      });
      console.log('PWAOrders: Filtered orders:', filtered);
      setFilteredOrders(filtered);
      
      // Calculate stats
      const stats = {
        total: filtered.length,
        pending: filtered.filter(order => ['Pending', 'Accepted'].includes(order.status)).length,
        fulfilled: filtered.filter(order => order.status === 'Fulfilled').length,
        cancelled: filtered.filter(order => order.status === 'Cancelled').length
      };
      setOrderStats(stats);
    } else {
      setFilteredOrders([]);
      setOrderStats({ total: 0, pending: 0, fulfilled: 0, cancelled: 0 });
    }
  }, [orders, selectedDate]);
const handleUpdateStatus = () => {
  setShowOrderModal(false);
  setNewStatus(selectedOrder.status);
  setShowStatusModal(true);
};
const handleStatusUpdate = async () => {
  if (!selectedOrder || !newStatus) {
    toast.error('Please select a status');
    return;
  }
  
  // Check if the new status is "Cancelled" and show confirmation modal
  if (newStatus === 'Cancelled') {
    setShowCancellationModal(true);
    return;
  }
  
  // If not cancellation, proceed with regular status update
  await performStatusUpdate();
};

const performStatusUpdate = async () => {
  // Enhanced payment status validation
  const paymentStatus = selectedOrder.payment_status?.toUpperCase();
  const isPaymentConfirmed = paymentStatus === 'PAID' || paymentStatus === 'OVERPAID';
  const isPartiallyPaid = paymentStatus === 'PARTIALLY PAID';
  const hasNoPayment = !paymentStatus || paymentStatus === 'UNPAID';
  const hasPendingPayment = paymentStatus === 'PENDING PAYMENT';
  const isDeliveryOrder = selectedOrder.delivery_type === 'Delivery';
  
  // Different validation logic for delivery vs pickup orders
  if (isDeliveryOrder) {
    // For delivery orders: payment only required for "Fulfilled" status
    if (newStatus === 'Fulfilled' && !isPaymentConfirmed) {
      toast.error('Cannot mark delivery order as "Fulfilled" - Payment must be fully confirmed first.');
      return;
    }
  } else {
    // For pickup orders: payment required for Accepted and Fulfilled statuses
    const restrictedStatuses = ['Accepted', 'Fulfilled'];
    const isRestrictedStatus = restrictedStatuses.includes(newStatus);
    
    if (isRestrictedStatus) {
      if (hasNoPayment) {
        toast.error(`Cannot update pickup order to "${newStatus}" - Payment required. Please process payment first.`);
        return;
      }
      if (hasPendingPayment) {
        toast.error(`Cannot update pickup order to "${newStatus}" - Payment is still pending. Please wait for payment confirmation.`);
        return;
      }
      if (isPartiallyPaid && newStatus === 'Fulfilled') {
        toast.error('Cannot mark pickup order as "Fulfilled" - Full payment required.');
        return;
      }
      if (isPartiallyPaid) {
        toast.warning(`Pickup order is only partially paid. Proceeding to "${newStatus}".`);
        // Allow but warn for partially paid orders (except Fulfilled)
      }
    }
  }
  
  try {
    const token = localStorage.getItem('token');
    const orderNumber = selectedOrder.order_number || selectedOrder.id;
    const response = await fetch(`http://localhost:8000/api/orders/${orderNumber}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      // Refresh orders data to get updated information
      await refreshData();
      
      // Update selected order
      setSelectedOrder({ ...selectedOrder, status: newStatus });
      
      toast.success(`Order status updated to ${newStatus}`);
      
      setShowStatusModal(false);
      setNewStatus('');
    } else {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('Update failed:', errorData);
      toast.error(errorData.detail || errorData.message || 'Failed to update order status');
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    toast.error('Network error: Could not update order status');
  }
};
// Function to get status options based on order type
const getStatusOptions = (order) => {
  if (!order) return ['Pending', 'Accepted', 'Fulfilled', 'Cancelled'];
  
  if (order.delivery_type === 'Delivery') {
    // Delivery orders: Accepted → Out for Delivery → Fulfilled/Cancelled
    return ['Accepted', 'Out for Delivery', 'Fulfilled', 'Cancelled'];
  } else {
    // Pickup orders: Pending → Accepted → Fulfilled/Cancelled
    return ['Pending', 'Accepted', 'Fulfilled', 'Cancelled'];
  }
};

  const handleUpdatePayment = () => {
    setShowOrderModal(false);
    setNewPaymentMode('');
    setPaymentAmount('');
    setMobileNumber('');
    setShowPaymentConfirmation(false);
    
    // Check if order is overpaid OR cancelled with payments and switch to refund mode
    const isOverpaid = selectedOrder.payment_status === 'OVERPAID' || 
                      (selectedOrder.amount_overpaid && parseFloat(selectedOrder.amount_overpaid) > 0);
    const isCancelledWithPayments = selectedOrder.status === 'Cancelled' && 
                                   selectedOrder.amount_paid && parseFloat(selectedOrder.amount_paid) > 0;
    
    if (isOverpaid) {
      setIsRefundMode(true);
      setNewPaymentMode('CASH'); // Default to cash for refunds
      setPaymentAmount(selectedOrder.amount_overpaid || '0.00'); // Set refund amount to overpaid amount
    } else if (isCancelledWithPayments) {
      setIsRefundMode(true);
      setNewPaymentMode('CASH'); // Default to cash for refunds
      setPaymentAmount(selectedOrder.amount_paid || '0.00'); // Set refund amount to amount paid
    } else {
      setIsRefundMode(false);
    }
    
    setShowPaymentModal(true);
  };

  const handlePaymentUpdate = async () => {
    if (!selectedOrder || !newPaymentMode || !paymentAmount) {
      toast.error('Please select payment mode and enter amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setShowPaymentConfirmation(true);
  };

  const confirmPayment = async () => {
    try {
      const token = localStorage.getItem('token');
      const amount = parseFloat(paymentAmount);
      
      // Prepare payment data for backend payment API
      const paymentData = {
        order_number: selectedOrder.order_number || selectedOrder.id,
        amount: amount,
        payment_method: newPaymentMode,
        payment_type: isRefundMode ? 'refund' : 'payment'
      };
      
      console.log('Sending payment data:', paymentData);
      
      // Add mobile number only for PAYSTACK(API)
      if (newPaymentMode === 'PAYSTACK(API)') {
        if (!mobileNumber || mobileNumber.trim() === '') {
          toast.error('Mobile number is required for Paystack API payments');
          return;
        }
        
        // Basic mobile number validation
        const cleanNumber = mobileNumber.trim().replace(/\s+/g, '');
        if (!/^(\+233|0)\d{9}$/.test(cleanNumber)) {
          toast.error('Please enter a valid Ghana mobile number');
          return;
        }
        
        paymentData.mobile_number = cleanNumber;
      }
      
      // Use the payment service instead of direct fetch
      const paymentResponse = await initiatePayment(paymentData);
      console.log('Payment response:', paymentResponse);
        
        // Handle different payment methods responses
        if (newPaymentMode === 'PAYSTACK(API)') {
          // For Paystack API payments, handle authorization URL
          if (paymentResponse.authorization_url) {
            toast.success('Payment initiated successfully!');
            toast.info('Redirecting to Paystack for payment...');
            
            // Open Paystack payment window
            window.open(paymentResponse.authorization_url, '_blank');
          } else {
            toast.warning('Payment initiated but no authorization URL received.');
          }
        } else {
          // For cash, Telecel Cash, MTN MoMo, PAYSTACK(USSD) - payment is processed immediately
          if (isRefundMode) {
            toast.success(`Refund of ${formatPrice(amount)} processed via ${getPaymentModeDisplay(newPaymentMode)}`);
            toast.info('Cash refund completed. Please provide the refund amount to the customer.');
          } else {
            toast.success(`Payment of ${formatPrice(amount)} received via ${getPaymentModeDisplay(newPaymentMode)}`);
            
            // Check if this is a delivery order - it should auto-change to "Fulfilled" when payment confirmed
            if (selectedOrder.delivery_type === 'Delivery') {
              toast.info('🚚 Payment confirmed! Delivery order automatically marked as "Fulfilled".');
            }
          }
          
          // Show transaction details if available
          if (paymentResponse.custom_transaction_id) {
            toast.info(`Transaction ID: ${paymentResponse.formatted_transaction_id || paymentResponse.custom_transaction_id}`);
          }
        }
        
        // Payment/refund was successful, refresh order data
        await refreshData();
        
        // Update selected order with fresh data
        const updatedOrder = await fetchOrderDetails(selectedOrder.id);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
        
        setShowPaymentModal(false);
        setShowPaymentConfirmation(false);
        setNewPaymentMode('');
        setPaymentAmount('');
        setMobileNumber('');
        
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorMessage = formatPaymentError ? formatPaymentError(error) : 'Network error: Could not process payment';
      toast.error(errorMessage);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/orders/${orderId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
    return null;
  };

  const getPaymentModeDisplay = (paymentMode) => {
    switch (paymentMode?.toUpperCase()) {
      case 'CASH': return 'Cash';
      case 'TELECEL CASH': return 'Telecel Cash';
      case 'MTN MOMO': return 'MTN MoMo';
      case 'PAYSTACK(USSD)': return 'Paystack (USSD)';
      case 'PAYSTACK(API)': return 'Paystack (API)';
      default: return paymentMode || '-';
    }
  };

  const handleEditOrder = () => {
    console.log('Handling edit for order:', selectedOrder.id);
    setShowOrderModal(false);
    // Add logic for edit order using existing web flow
  };



  // Use imported utility functions instead of local definitions
  const getStatusColor = getOrderStatusColor;
  const getStatusIcon = getOrderStatusIcon;

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

if (loading || isRetrying) {
    return (
      <div className="pwa-content">
        <div className="pwa-loading">
          <div className="pwa-spinner"></div>
          <div className="pwa-loading-text">{isRetrying ? 'Retrying...' : 'Loading orders...'}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pwa-content">
        <div className="pwa-error-alert">
          <p>{error}</p>
          <button className="pwa-btn pwa-btn-primary" onClick={handleRetry}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-content">
      {/* Order Stats */}
      <div className="pwa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="pwa-card-title" style={{ margin: 0, fontSize: '1.1rem' }}>
            {selectedDate === new Date().toISOString().split('T')[0] ? "Today's" : "Selected Day's"} Orders
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2196F3' }}>
              {orderStats.total}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Total</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FF9800' }}>
              {orderStats.pending}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Pending</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4CAF50' }}>
              {orderStats.fulfilled}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Fulfilled</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F44336' }}>
              {orderStats.cancelled}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Cancelled</div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="pwa-empty">
          <div className="pwa-empty-icon">
            <i className="bi bi-inbox"></i>
          </div>
          <div className="pwa-empty-title">No Orders Found</div>
          <div className="pwa-empty-subtitle">
            No orders found for {selectedDate === new Date().toISOString().split('T')[0] ? 'today' : 'the selected date'}
          </div>
        </div>
      ) : (
        <div className="pwa-card">
          <div className="pwa-card-title" style={{ marginBottom: '16px' }}>
            Orders ({filteredOrders.length})
          </div>
          
          <div className="pwa-list">
            {filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className="pwa-list-item"
                onClick={() => {
                  navigate(`/order-details/${order.order_number}`);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div 
                  className="pwa-list-icon" 
                  style={{ background: getStatusColor(order.status), color: 'white' }}
                >
                  <i className={getStatusIcon(order.status)}></i>
                </div>
                <div className="pwa-list-content">
                  <div className="pwa-list-title">
                    Order #{order.order_number || order.id}
                  </div>
                  <div className="pwa-list-subtitle">
                    {order.customer_phone || 'No customer info'} • {order.time_ago || formatTime(order.created_at)}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '8px'
                  }}>
                    <div className={`pwa-status ${getOrderStatusClass(order.status)}`}>
                      {order.status}
                    </div>
                  <div style={{ 
                    fontWeight: '600', 
                    color: '#1a1a1a',
                    fontSize: '0.9rem'
                  }}>
                    {formatPrice(order.total_price)}
                  </div>
                </div>
                </div>
                <div className="pwa-list-action">
                  <i className="bi bi-chevron-right"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="pwa-modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="pwa-modal-header">
              <div className="pwa-modal-title">Order #{selectedOrder.order_number || selectedOrder.id}</div>
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowOrderModal(false)}
                style={{ 
                  width: 'auto', 
                  minWidth: '32px', 
                  height: '32px', 
                  padding: '0',
                  fontSize: '1rem'
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div style={{ padding: '16px 0' }}>
              {/* Order Status and Info */}
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Status:</span>
                  <div className="pwa-status" style={{
                    background: `${getStatusColor(selectedOrder.status)}20`,
                    color: getStatusColor(selectedOrder.status)
                  }}>
                    {selectedOrder.status}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Order Type:</span>
                  <span style={{ fontSize: '0.85rem' }}>{selectedOrder.delivery_type || 'Pickup'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Customer:</span>
                  <span style={{ fontSize: '0.85rem' }}>{selectedOrder.customer_phone || 'No info'}</span>
                </div>
                {selectedOrder.delivery_type === 'Delivery' && selectedOrder.delivery_location && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Location:</span>
                    <span style={{ fontSize: '0.85rem' }}>{selectedOrder.delivery_location}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Total:</span>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1a1a' }}>{formatPrice(selectedOrder.total_price)}</span>
                </div>
              </div>
              
              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Items:</div>
                  <div style={{
                    background: '#fff',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    padding: '8px'
                  }}>
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: index < selectedOrder.items.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                            {item.menu_item_name || item.name || `Item ${index + 1}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            {formatPrice(item.unit_price || item.price || 0)} × {item.quantity}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                          {formatPrice((item.unit_price || item.price || 0) * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Notes */}
              {selectedOrder.notes && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Notes:</div>
                  <div style={{
                    background: '#f8f9fa',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    border: '1px solid #e9ecef'
                  }}>
                    "{selectedOrder.notes}"
                  </div>
                </div>
              )}
              
              {/* Payment Info */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Payment:</div>
                <div style={{
                  background: '#fff',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px',
                  padding: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem' }}>Status:</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{selectedOrder.payment_status || 'Unpaid'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem' }}>Method:</span>
                    <span style={{ fontSize: '0.8rem' }}>{selectedOrder.payment_mode || 'None'}</span>
                  </div>
                  {selectedOrder.amount_paid && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem' }}>Amount Paid:</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#4caf50' }}>{formatPrice(selectedOrder.amount_paid)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pwa-modal-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button 
                className="pwa-btn pwa-btn-warning"
                onClick={handleUpdateStatus}
                style={{ fontSize: '0.8rem', padding: '8px 4px' }}
              >
                <i className="bi bi-pencil-square"></i>
                <span style={{ display: 'block', marginTop: '2px' }}>Status</span>
              </button>
              <button 
                className="pwa-btn pwa-btn-success"
                onClick={handleUpdatePayment}
                style={{ fontSize: '0.8rem', padding: '8px 4px' }}
              >
                <i className="bi bi-credit-card"></i>
                <span style={{ display: 'block', marginTop: '2px' }}>Payment</span>
              </button>
              <button 
                className="pwa-btn pwa-btn-primary"
                onClick={handleEditOrder}
                style={{ fontSize: '0.8rem', padding: '8px 4px' }}
              >
                <i className="bi bi-pencil"></i>
                <span style={{ display: 'block', marginTop: '2px' }}>Edit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="pwa-modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <div className="pwa-modal-title">Update Order Status</div>
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowStatusModal(false)}
                style={{ 
                  width: 'auto', 
                  minWidth: '32px', 
                  height: '32px', 
                  padding: '0',
                  fontSize: '1rem'
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div style={{ padding: '16px 0' }}>
              {selectedOrder && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                      <strong>Order:</strong> #{selectedOrder.order_number || selectedOrder.id}
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#666',
                      marginBottom: '8px'
                    }}>
                      <strong>Current Status:</strong> 
                      <span className="pwa-status" style={{
                        background: `${getStatusColor(selectedOrder.status)}20`,
                        color: getStatusColor(selectedOrder.status),
                        marginLeft: '8px'
                      }}>
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pwa-form-group">
                    <label className="pwa-form-label">New Status</label>
                    
                    {/* Show payment warning if payment is not confirmed */}
                    {(() => {
                      const paymentStatus = selectedOrder.payment_status?.toUpperCase();
                      return paymentStatus !== 'PAID' && paymentStatus !== 'OVERPAID';
                    })() && (
                      <div style={{ 
                        background: '#fff3cd',
                        border: '1px solid #ffeaa7',
                        borderRadius: '4px',
                        padding: '8px',
                        marginBottom: '12px',
                        fontSize: '0.8rem'
                      }}>
                        <strong>Payment Status: {selectedOrder.payment_status || 'Unpaid'}</strong><br/>
                        {selectedOrder.payment_status === 'PARTIALLY PAID' 
                          ? 'Order is only partially paid. Some status updates may be restricted.' 
                          : selectedOrder.payment_status === 'PENDING PAYMENT'
                          ? 'Payment is pending. Please wait for payment confirmation before updating status.'
                          : 'Payment required for most status updates. Only \'Pending\' and \'Cancelled\' are available.'}
                      </div>
                    )}
                    
                    <select
                      className="pwa-form-input"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="">Select new status...</option>
                      {getStatusOptions(selectedOrder).map((status) => {
                        // Enhanced payment status checking
                        const paymentStatus = selectedOrder.payment_status?.toUpperCase();
                        const isPaymentConfirmed = paymentStatus === 'PAID' || paymentStatus === 'OVERPAID';
                        const isPartiallyPaid = paymentStatus === 'PARTIALLY PAID';
                        const isDeliveryOrder = selectedOrder.delivery_type === 'Delivery';
                        
                        // Special validation for "Out for Delivery" status
                        if (status === 'Out for Delivery') {
                          // Only show for delivery orders
                          if (!isDeliveryOrder) {
                            return null;
                          }
                        }
                        
                        // Payment validation based on order type
                        let isAllowed = true;
                        
                        if (isDeliveryOrder) {
                          // For delivery orders: payment only required for "Fulfilled" status
                          if (status === 'Fulfilled' && !isPaymentConfirmed) {
                            isAllowed = false;
                          }
                        } else {
                          // For pickup orders: payment required for Accepted and Fulfilled statuses
                          const restrictedStatuses = ['Accepted', 'Fulfilled'];
                          if (restrictedStatuses.includes(status) && !isPaymentConfirmed) {
                            isAllowed = false;
                          }
                          // Allow with partial payment for Accepted status, but not Fulfilled
                          if (status === 'Accepted' && isPartiallyPaid) {
                            isAllowed = true;
                          }
                        }
                        
                        return (
                          <option 
                            key={status} 
                            value={status}
                            disabled={!isAllowed}
                            style={{ color: isAllowed ? 'inherit' : '#999' }}
                          >
                            {status} {!isAllowed ? '(Payment required)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div className="pwa-modal-actions">
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </button>
              <button 
                className="pwa-btn pwa-btn-primary"
                onClick={handleStatusUpdate}
                disabled={!newStatus || newStatus === selectedOrder?.status}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Cancellation Confirmation Modal */}
      {showCancellationModal && (
        <div className="pwa-modal-overlay" onClick={() => setShowCancellationModal(false)}>
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <div className="pwa-modal-title">Confirm Order Cancellation</div>
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowCancellationModal(false)}
                style={{ 
                  width: 'auto', 
                  minWidth: '32px', 
                  height: '32px', 
                  padding: '0',
                  fontSize: '1rem'
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div style={{ padding: '16px 0' }}>
              {selectedOrder && (
                <>
                  <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px' }}>
                      ⚠️ Warning: You are about to cancel this order
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>
                      This action cannot be undone.
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                      <strong>Order #:</strong> {selectedOrder.order_number || selectedOrder.id}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong>Customer:</strong> {selectedOrder.customer_phone || 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong>Total:</strong> {formatPrice(selectedOrder.total_price)}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                      <strong>Payment Status:</strong> {selectedOrder.payment_status || 'Not Paid'}
                    </div>
                  </div>
                  
                  {/* Payment warning if there are payments */}
                  {selectedOrder.amount_paid && parseFloat(selectedOrder.amount_paid) > 0 && (
                    <div style={{
                      background: '#d1ecf1',
                      border: '1px solid #bee5eb',
                      borderRadius: '6px',
                      padding: '8px',
                      marginBottom: '16px',
                      fontSize: '0.8rem'
                    }}>
                      <strong>Payment Notice:</strong> This order has received payment of {formatPrice(selectedOrder.amount_paid)}. 
                      You may need to process a refund after cancellation.
                    </div>
                  )}
                  
                  <div className="pwa-form-group">
                    <label className="pwa-form-label">Reason for Cancellation *</label>
                    <textarea
                      className="pwa-form-input"
                      rows={3}
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Please provide a reason for cancelling this order..."
                      style={{ resize: 'vertical' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                      This reason will be recorded for reference.
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="pwa-modal-actions">
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => {
                  setShowCancellationModal(false);
                  setCancellationReason('');
                }}
              >
                Keep Order
              </button>
              <button 
                className="pwa-btn pwa-btn-danger"
                onClick={async () => {
                  if (!cancellationReason.trim()) {
                    toast.error('Please provide a reason for cancellation');
                    return;
                  }
                  
                  // Close the cancellation modal first
                  setShowCancellationModal(false);
                  
                  // Proceed with the actual cancellation
                  await performStatusUpdate();
                  
                  // Reset the reason
                  setCancellationReason('');
                }}
                disabled={!cancellationReason.trim()}
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Update Modal */}
      {showPaymentModal && (
        <div className="pwa-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="pwa-modal-header">
              <div className="pwa-modal-title">
                {isRefundMode ? 'Process Refund' : 'Update Payment Details'}
              </div>
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowPaymentModal(false)}
                style={{ 
                  width: 'auto', 
                  minWidth: '32px', 
                  height: '32px', 
                  padding: '0',
                  fontSize: '1rem'
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div style={{ padding: '16px 0' }}>
              {selectedOrder && (
                <>
                  {/* Order Total - Prominent Display */}
                  <div style={{
                    background: '#e7f3ff',
                    border: '2px solid #0dcaf0',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#0c63e4' }}>
                          Order Total
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0c63e4' }}>
                          {formatPrice(selectedOrder.total_price)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                      <strong>Current Payment Status:</strong> {selectedOrder.payment_status || 'Unpaid'}
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                      <strong>Current Payment Mode:</strong> {selectedOrder.payment_mode ? getPaymentModeDisplay(selectedOrder.payment_mode) : 'None'}
                    </div>
                    {selectedOrder.amount_paid && (
                      <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                        <strong>Amount Received:</strong> 
                        <span style={{ color: '#4caf50', fontWeight: '600', marginLeft: '8px' }}>
                          {formatPrice(selectedOrder.amount_paid)}
                        </span>
                        {selectedOrder.balance_due > 0 && (
                          <span style={{ marginLeft: '12px' }}>
                            <strong style={{ color: '#ff9800' }}>Balance Due:</strong> 
                            <span style={{ color: '#ff9800', fontWeight: '600', marginLeft: '4px' }}>{formatPrice(selectedOrder.balance_due)}</span>
                          </span>
                        )}
                        {selectedOrder.amount_overpaid > 0 && (
                          <span style={{ marginLeft: '12px' }}>
                            <strong style={{ color: '#2196f3' }}>Change Due:</strong> 
                            <span style={{ color: '#2196f3', fontWeight: '600', marginLeft: '4px' }}>{formatPrice(selectedOrder.amount_overpaid)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {!showPaymentConfirmation ? (
                    <>
                      <div className="pwa-form-group">
                        <label className="pwa-form-label">Payment Mode</label>
                        <select
                          className="pwa-form-input"
                          value={newPaymentMode}
                          onChange={(e) => {
                            const selectedMode = e.target.value;
                            setNewPaymentMode(selectedMode);
                            // Reset mobile number when payment mode changes
                            if (selectedMode !== 'PAYSTACK(API)') {
                              setMobileNumber('');
                            }
                          }}
                          disabled={isRefundMode} // Disabled in refund mode (cash only)
                        >
                          <option value="">{isRefundMode ? 'Cash Only (Refunds)' : 'Select payment mode...'}</option>
                          {(isRefundMode ? [{value: 'CASH', label: 'Cash', disabled: false}] : paymentModes).map((mode) => {
                            return (
                              <option 
                                key={mode.value} 
                                value={mode.value}
                                disabled={mode.disabled}
                              >
                                {mode.label}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      
                      <div className="pwa-form-group">
                        <label className="pwa-form-label">
                          {isRefundMode ? 'Refund Amount' : 'Amount Received'}
                        </label>
                        <input
                          type="number"
                          className="pwa-form-input"
                          step="0.01"
                          min="0"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      
                      {/* Mobile Number Input for PAYSTACK(API) */}
                      {newPaymentMode === 'PAYSTACK(API)' && (
                        <div className="pwa-form-group">
                          <label className="pwa-form-label">
                            Mobile Number *
                            <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '8px' }}>(Required for Paystack API)</span>
                          </label>
                          <input
                            type="tel"
                            className="pwa-form-input"
                            value={mobileNumber}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9+]/g, '');
                              setMobileNumber(value);
                            }}
                            placeholder="e.g., 0241234567 or +233241234567"
                            maxLength="15"
                          />
                          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                            Enter Ghanaian mobile number (MTN, Vodafone, AirtelTigo)
                          </div>
                        </div>
                      )}
                      
                      <div style={{
                        background: '#f8f9fa',
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        color: '#666'
                      }}>
                        💡 Payment status will be automatically determined based on the amount received compared to the order total.
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        background: isRefundMode ? '#e7f3ff' : '#fff3cd',
                        border: `1px solid ${isRefundMode ? '#0dcaf0' : '#ffeaa7'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px' }}>
                          {isRefundMode ? '💰 Confirm Refund' : '💳 Confirm Payment'}
                        </div>
                        {isRefundMode && (
                          <div style={{
                            background: '#fff3cd',
                            border: '1px solid #ffeaa7',
                            borderRadius: '4px',
                            padding: '8px',
                            marginBottom: '12px',
                            fontSize: '0.8rem'
                          }}>
                            <strong>Refund Notice:</strong> This will issue a cash refund to the customer. Please ensure you have the amount ready.
                          </div>
                        )}
                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                          <strong>{isRefundMode ? 'Refund Mode' : 'Payment Mode'}:</strong> {getPaymentModeDisplay(newPaymentMode)}
                        </div>
                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                          <strong>{isRefundMode ? 'Refund Amount' : 'Amount Received'}:</strong> {formatPrice(paymentAmount)}
                        </div>
                        <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                          <strong>Order Total:</strong> {formatPrice(selectedOrder.total_price)}
                        </div>
                        <hr style={{ margin: '8px 0' }} />
                        {(() => {
                          const amount = parseFloat(paymentAmount);
                          const total = parseFloat(selectedOrder.total_price || 0);
                          if (amount === total) {
                            return <div style={{ color: '#4caf50', fontWeight: '600' }}>Status: Payment Complete</div>;
                          } else if (amount < total) {
                            return (
                              <>
                                <div style={{ color: '#ff9800', fontWeight: '600' }}>Status: Partial Payment</div>
                                <div style={{ fontSize: '0.85rem' }}>Balance Due: {formatPrice(total - amount)}</div>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <div style={{ color: '#2196f3', fontWeight: '600' }}>Status: Overpayment</div>
                                <div style={{ fontSize: '0.85rem' }}>Change Due: {formatPrice(amount - total)}</div>
                              </>
                            );
                          }
                        })()}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        Please confirm the payment details above.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="pwa-modal-actions">
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </button>
              {!showPaymentConfirmation ? (
                <button 
                  className="pwa-btn pwa-btn-warning"
                  onClick={handlePaymentUpdate}
                  disabled={!newPaymentMode || !paymentAmount}
                >
                  Review Payment
                </button>
              ) : (
                <button 
                  className={`pwa-btn ${isRefundMode ? 'pwa-btn-primary' : 'pwa-btn-success'}`}
                  onClick={confirmPayment}
                >
                  {isRefundMode ? 'Process Refund' : 'Confirm Payment'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PWAOrders;
