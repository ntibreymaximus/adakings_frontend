import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { initiatePayment, formatPaymentError } from '../services/paymentService';
import '../styles/mobile-native.css';

const PWAOrderDetails = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
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

  useEffect(() => {
    fetchOrderDetails();
  }, [orderNumber]);

  const fetchOrderDetails = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication token not found');
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/orders/${orderNumber}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      toast.error(err.message);
      navigate('/pwa/orders');
    } finally {
      setLoading(false);
    }
  };

  // Status update functions (same as in PWAOrders)
  const handleUpdateStatus = () => {
    setNewStatus(order.status);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!order || !newStatus) {
      toast.error('Please select a status');
      return;
    }
    
    if (newStatus === 'Cancelled') {
      setShowCancellationModal(true);
      return;
    }
    
    await performStatusUpdate();
  };

  const performStatusUpdate = async () => {
    // Payment validation logic (same as PWAOrders)
    const paymentStatus = order.payment_status?.toUpperCase();
    const isPaymentConfirmed = paymentStatus === 'PAID' || paymentStatus === 'OVERPAID';
    const isPartiallyPaid = paymentStatus === 'PARTIALLY PAID';
    const hasNoPayment = !paymentStatus || paymentStatus === 'UNPAID';
    const hasPendingPayment = paymentStatus === 'PENDING PAYMENT';
    const isDeliveryOrder = order.delivery_type === 'Delivery';
    
    if (isDeliveryOrder) {
      if (newStatus === 'Fulfilled' && !isPaymentConfirmed) {
        toast.error('Cannot mark delivery order as "Fulfilled" - Payment must be fully confirmed first.');
        return;
      }
    } else {
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
        }
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      const orderNumber = order.order_number || order.id;
      const response = await fetch(`http://localhost:8000/api/orders/${orderNumber}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setOrder({ ...order, status: newStatus });
        toast.success(`Order status updated to ${newStatus}`);
        setShowStatusModal(false);
        setNewStatus('');
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        toast.error(errorData.detail || errorData.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Network error: Could not update order status');
    }
  };

  const getStatusOptions = (order) => {
    if (!order) return ['Pending', 'Accepted', 'Fulfilled', 'Cancelled'];
    
    if (order.delivery_type === 'Delivery') {
      return ['Accepted', 'Out for Delivery', 'Fulfilled', 'Cancelled'];
    } else {
      return ['Pending', 'Accepted', 'Fulfilled', 'Cancelled'];
    }
  };

  // Payment update functions (same as in PWAOrders)
  const handleUpdatePayment = () => {
    setNewPaymentMode('');
    setPaymentAmount('');
    setMobileNumber('');
    setShowPaymentConfirmation(false);
    
    const isOverpaid = order.payment_status === 'OVERPAID' || 
                      (order.amount_overpaid && parseFloat(order.amount_overpaid) > 0);
    const isCancelledWithPayments = order.status === 'Cancelled' && 
                                   order.amount_paid && parseFloat(order.amount_paid) > 0;
    
    if (isOverpaid) {
      setIsRefundMode(true);
      setNewPaymentMode('CASH');
      setPaymentAmount(order.amount_overpaid || '0.00');
    } else if (isCancelledWithPayments) {
      setIsRefundMode(true);
      setNewPaymentMode('CASH');
      setPaymentAmount(order.amount_paid || '0.00');
    } else {
      setIsRefundMode(false);
    }
    
    setShowPaymentModal(true);
  };

  const handlePaymentUpdate = async () => {
    if (!order || !newPaymentMode || !paymentAmount) {
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
      const amount = parseFloat(paymentAmount);
      
      const paymentData = {
        order_number: order.order_number || order.id,
        amount: amount,
        payment_method: newPaymentMode,
        payment_type: isRefundMode ? 'refund' : 'payment'
      };
      
      if (newPaymentMode === 'PAYSTACK(API)') {
        if (!mobileNumber || mobileNumber.trim() === '') {
          toast.error('Mobile number is required for Paystack API payments');
          return;
        }
        
        const cleanNumber = mobileNumber.trim().replace(/\s+/g, '');
        if (!/^(\+233|0)\d{9}$/.test(cleanNumber)) {
          toast.error('Please enter a valid Ghana mobile number');
          return;
        }
        
        paymentData.mobile_number = cleanNumber;
      }
      
      // Use the payment service instead of direct fetch
      const paymentResponse = await initiatePayment(paymentData);
        
        if (newPaymentMode === 'PAYSTACK(API)') {
          if (paymentResponse.authorization_url) {
            toast.success('Payment initiated successfully!');
            toast.info('Redirecting to Paystack for payment...');
            window.open(paymentResponse.authorization_url, '_blank');
          } else {
            toast.warning('Payment initiated but no authorization URL received.');
          }
        } else {
          if (isRefundMode) {
            toast.success(`Refund of ${formatPrice(amount)} processed via ${getPaymentModeDisplay(newPaymentMode)}`);
            toast.info('Cash refund completed. Please provide the refund amount to the customer.');
          } else {
            toast.success(`Payment of ${formatPrice(amount)} received via ${getPaymentModeDisplay(newPaymentMode)}`);
            
            if (order.delivery_type === 'Delivery') {
              toast.info('🚚 Payment confirmed! Delivery order automatically marked as "Fulfilled".');
            }
          }
          
          if (paymentResponse.custom_transaction_id) {
            toast.info(`Transaction ID: ${paymentResponse.formatted_transaction_id || paymentResponse.custom_transaction_id}`);
          }
        }
        
        // Refresh order data
        await fetchOrderDetails();
        
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
    console.log('Handling edit for order:', order.id);
    // TODO: Implement edit order functionality
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': '#ff9800',
      'Accepted': '#2196f3',
      'Fulfilled': '#4caf50',
      'Cancelled': '#f44336',
      'Out for Delivery': '#9c27b0'
    };
    return colors[status] || '#666';
  };

  const formatPrice = (price) => {
    return `GH₵ ${parseFloat(price).toFixed(2)}`;
  };

  const formatTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid time';
    }
  };

  if (loading) {
    return (
      <div className="pwa-content">
        <div className="pwa-loading">
          <div className="pwa-spinner"></div>
          <div className="pwa-loading-text">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="pwa-content">
        <div className="pwa-empty">
          <div className="pwa-empty-icon">
            <i className="bi bi-exclamation-circle"></i>
          </div>
          <div className="pwa-empty-title">Order Not Found</div>
          <div className="pwa-empty-subtitle">
            The requested order could not be found
          </div>
          <button 
            className="pwa-btn pwa-btn-primary"
            onClick={() => navigate('/pwa/orders')}
            style={{ marginTop: '16px' }}
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-content">
      {/* Header */}
      <div className="pwa-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="pwa-btn pwa-btn-secondary"
            onClick={() => navigate('/pwa/orders')}
            style={{ 
              width: 'auto',
              minWidth: '44px',
              height: '44px',
              padding: '8px 12px',
              borderRadius: '12px'
            }}
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <div className="pwa-card-title" style={{ margin: 0, fontSize: '1.1rem' }}>
              Order #{order.order_number || order.id}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
              {formatTime(order.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Order Status and Info */}
      <div className="pwa-card">
        <div className="pwa-card-title" style={{ marginBottom: '16px' }}>Order Information</div>
        <div style={{
          background: '#f8f9fa',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Status:</span>
            <div className="pwa-status" style={{
              background: `${getStatusColor(order.status)}20`,
              color: getStatusColor(order.status)
            }}>
              {order.status}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Order Type:</span>
            <span style={{ fontSize: '0.85rem' }}>{order.delivery_type || 'Pickup'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Customer:</span>
            <span style={{ fontSize: '0.85rem' }}>{order.customer_phone || 'No info'}</span>
          </div>
          {order.delivery_type === 'Delivery' && order.delivery_location && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Location:</span>
              <span style={{ fontSize: '0.85rem' }}>{order.delivery_location}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Total:</span>
            <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1a1a' }}>{formatPrice(order.total_price)}</span>
          </div>
        </div>
      </div>

      {/* Order Items */}
      {order.items && order.items.length > 0 && (
        <div className="pwa-card">
          <div className="pwa-card-title" style={{ marginBottom: '16px' }}>Items ({order.items.length})</div>
          <div style={{
            background: '#fff',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            padding: '8px'
          }}>
            {order.items.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: index < order.items.length - 1 ? '1px solid #f0f0f0' : 'none'
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                    {item.menu_item_name || item.name || `Item ${index + 1}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    {formatPrice(item.unit_price || item.price || 0)} × {item.quantity}
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                  {formatPrice((item.unit_price || item.price || 0) * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Information */}
      <div className="pwa-card">
        <div className="pwa-card-title" style={{ marginBottom: '16px' }}>Payment Information</div>
        <div style={{
          background: '#fff',
          border: '1px solid #e9ecef',
          borderRadius: '6px',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem' }}>Status:</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{order.payment_status || 'Unpaid'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem' }}>Method:</span>
            <span style={{ fontSize: '0.9rem' }}>{order.payment_mode ? getPaymentModeDisplay(order.payment_mode) : 'None'}</span>
          </div>
          {order.amount_paid && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem' }}>Amount Paid:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4caf50' }}>{formatPrice(order.amount_paid)}</span>
              </div>
              {order.balance_due > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem' }}>Balance Due:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#ff9800' }}>{formatPrice(order.balance_due)}</span>
                </div>
              )}
              {order.amount_overpaid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem' }}>Change Due:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2196f3' }}>{formatPrice(order.amount_overpaid)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="pwa-card">
          <div className="pwa-card-title" style={{ marginBottom: '16px' }}>Special Notes</div>
          <div style={{
            background: '#f8f9fa',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontStyle: 'italic',
            border: '1px solid #e9ecef'
          }}>
            "{order.notes}"
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pwa-card">
        <div className="pwa-card-title" style={{ marginBottom: '16px' }}>Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <button 
            className="pwa-btn pwa-btn-warning"
            onClick={handleUpdateStatus}
            style={{ fontSize: '0.85rem', padding: '12px 8px' }}
          >
            <i className="bi bi-pencil-square"></i>
            <span style={{ display: 'block', marginTop: '4px' }}>Update Status</span>
          </button>
          <button 
            className="pwa-btn pwa-btn-success"
            onClick={handleUpdatePayment}
            style={{ fontSize: '0.85rem', padding: '12px 8px' }}
          >
            <i className="bi bi-credit-card"></i>
            <span style={{ display: 'block', marginTop: '4px' }}>Update Payment</span>
          </button>
          <button 
            className="pwa-btn pwa-btn-primary"
            onClick={handleEditOrder}
            style={{ fontSize: '0.85rem', padding: '12px 8px' }}
          >
            <i className="bi bi-pencil"></i>
            <span style={{ display: 'block', marginTop: '4px' }}>Edit Order</span>
          </button>
        </div>
      </div>

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
              {order && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                      <strong>Order:</strong> #{order.order_number || order.id}
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#666',
                      marginBottom: '8px'
                    }}>
                      <strong>Current Status:</strong> 
                      <span className="pwa-status" style={{
                        background: `${getStatusColor(order.status)}20`,
                        color: getStatusColor(order.status),
                        marginLeft: '8px'
                      }}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pwa-form-group">
                    <label className="pwa-form-label">New Status</label>
                    
                    {/* Show payment warning if payment is not confirmed */}
                    {(() => {
                      const paymentStatus = order.payment_status?.toUpperCase();
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
                        <strong>Payment Status: {order.payment_status || 'Unpaid'}</strong><br/>
                        {order.payment_status === 'PARTIALLY PAID' 
                          ? 'Order is only partially paid. Some status updates may be restricted.' 
                          : order.payment_status === 'PENDING PAYMENT'
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
                      {getStatusOptions(order).map((status) => {
                        // Enhanced payment status checking
                        const paymentStatus = order.payment_status?.toUpperCase();
                        const isPaymentConfirmed = paymentStatus === 'PAID' || paymentStatus === 'OVERPAID';
                        const isPartiallyPaid = paymentStatus === 'PARTIALLY PAID';
                        const isDeliveryOrder = order.delivery_type === 'Delivery';
                        
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
                disabled={!newStatus || newStatus === order?.status}
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
              {order && (
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
                      <strong>Order #:</strong> {order.order_number || order.id}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong>Customer:</strong> {order.customer_phone || 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong>Total:</strong> {formatPrice(order.total_price)}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                      <strong>Payment Status:</strong> {order.payment_status || 'Not Paid'}
                    </div>
                  </div>
                  
                  {/* Payment warning if there are payments */}
                  {order.amount_paid && parseFloat(order.amount_paid) > 0 && (
                    <div style={{
                      background: '#d1ecf1',
                      border: '1px solid #bee5eb',
                      borderRadius: '6px',
                      padding: '8px',
                      marginBottom: '16px',
                      fontSize: '0.8rem'
                    }}>
                      <strong>Payment Notice:</strong> This order has received payment of {formatPrice(order.amount_paid)}. 
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
              {order && (
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
                          {formatPrice(order.total_price)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                      <strong>Current Payment Status:</strong> {order.payment_status || 'Unpaid'}
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                      <strong>Current Payment Mode:</strong> {order.payment_mode ? getPaymentModeDisplay(order.payment_mode) : 'None'}
                    </div>
                    {order.amount_paid && (
                      <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                        <strong>Amount Received:</strong> 
                        <span style={{ color: '#4caf50', fontWeight: '600', marginLeft: '8px' }}>
                          {formatPrice(order.amount_paid)}
                        </span>
                        {order.balance_due > 0 && (
                          <span style={{ marginLeft: '12px' }}>
                            <strong style={{ color: '#ff9800' }}>Balance Due:</strong> 
                            <span style={{ color: '#ff9800', fontWeight: '600', marginLeft: '4px' }}>{formatPrice(order.balance_due)}</span>
                          </span>
                        )}
                        {order.amount_overpaid > 0 && (
                          <span style={{ marginLeft: '12px' }}>
                            <strong style={{ color: '#2196f3' }}>Change Due:</strong> 
                            <span style={{ color: '#2196f3', fontWeight: '600', marginLeft: '4px' }}>{formatPrice(order.amount_overpaid)}</span>
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
                          <strong>Order Total:</strong> {formatPrice(order.total_price)}
                        </div>
                        <hr style={{ margin: '8px 0' }} />
                        {(() => {
                          const amount = parseFloat(paymentAmount);
                          const total = parseFloat(order.total_price || 0);
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

export default PWAOrderDetails;
