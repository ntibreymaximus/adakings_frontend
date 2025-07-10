import React, { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { Container, Table, Card, Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import optimizedToast, { contextToast } from '../utils/toastUtils';
import { useAuth } from '../contexts/AuthContext';
import {
    validateGhanaianMobileNumber,
    sanitizeMobileNumberInput,
    openPaymentWindow
} from '../utils/paymentUtils';
import {
    initiatePayment,
    formatPaymentError
} from '../services/paymentService';
import { API_BASE_URL } from '../utils/api';
import SimpleUserTracking from './SimpleUserTracking';

// Optimized ViewOrdersPage with instant loading
const ViewOrdersPage = memo(() => {
    const { logout, userData } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [newPaymentMode, setNewPaymentMode] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
    const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
    const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
    const [isRefundMode, setIsRefundMode] = useState(false);
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => {
        // Default to today's date
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [allOrders, setAllOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [paymentModes, setPaymentModes] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showStats, setShowStats] = useState(!isMobile); // Stats visible by default on desktop
    const [showStatsModal, setShowStatsModal] = useState(false);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    fulfilled: 0,
    outForDelivery: 0
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [paginatedOrders, setPaginatedOrders] = useState([]);
  
  // Ref to track if we're already handling a modal opening
  const isHandlingModalRef = useRef(false);

    // Fetch orders from API - with consistent loading
    const fetchOrders = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
            
            const token = localStorage.getItem('token');
            if (!token) {
                logout();
                return;
            }

            // Check if we're looking at today's date - use optimized endpoint
            const today = new Date().toISOString().split('T')[0];
            const isToday = selectedDate === today;
            
            const endpoint = isToday 
                ? `${API_BASE_URL}/orders/today/` // Fast today's orders endpoint
                : `${API_BASE_URL}/orders/?date=${selectedDate}`; // Regular endpoint with date filter

            console.log('🔍 Fetching orders:', {
                endpoint,
                selectedDate,
                isToday,
                showLoader
            });

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': isToday ? 'max-age=60' : 'max-age=300' // Cache today's orders for 1 min, others for 5 min
                },
            });

            console.log('📡 Response status:', response.status, response.statusText);

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                // Try to get error details from response
                let errorDetails = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.detail || errorData.message) {
                        errorDetails += `: ${errorData.detail || errorData.message}`;
                    }
                } catch (parseError) {
                    // If we can't parse the error response, use the status text
                    if (response.statusText) {
                        errorDetails += `: ${response.statusText}`;
                    }
                }
                
                throw new Error(errorDetails);
            }

            const data = await response.json();
            const orders = Array.isArray(data) ? data : (data.results || []);
            
            console.log('✅ Orders fetched successfully:', {
                totalOrders: orders.length,
                data: data,
                selectedDate
            });
            
            // Update state immediately
            setAllOrders(orders);
            
        } catch (error) {
            console.error('Error fetching orders:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Failed to load orders';
            
            if (error.message.includes('HTTP 404')) {
                errorMessage = `No orders found for ${new Date(selectedDate).toLocaleDateString()}`;
            } else if (error.message.includes('HTTP 403')) {
                errorMessage = 'Access denied. Please check your permissions.';
            } else if (error.message.includes('HTTP 500')) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('HTTP')) {
                errorMessage = `Server error (${error.message}). Please try again.`;
            }
            
            optimizedToast.error(errorMessage);
        } finally {
            if (showLoader) {
                setLoading(false);
            } else {
                setIsRefreshing(false);
            }
        }
    }, [logout, selectedDate]);

    // Fetch a specific order by ID (for when order is not in current date filter)
    const fetchSpecificOrder = useCallback(async (orderId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                logout();
                return;
            }

            console.log('🔍 Fetching specific order:', orderId);

            const response = await fetch(`${API_BASE_URL}/orders/${orderId}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }
                if (response.status === 404) {
                    optimizedToast.error('Order not found');
                    isHandlingModalRef.current = false;
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const order = await response.json();
            
            console.log('✅ Specific order fetched:', order);
            
            // Set the selected order and open modal with proper initialization
            console.log('✅ Order data received:', {
                id: order.id,
                order_number: order.order_number,
                status: order.status,
                total_price: order.total_price,
                customer_phone: order.customer_phone
            });
            
            // Clear any existing modal state first
            setShowOrderDetailsModal(false);
            setSelectedOrder(null);
            
            // Small delay to ensure state is clear before setting new values
            setTimeout(() => {
                setSelectedOrder(order);
                setShowOrderDetailsModal(true);
                isHandlingModalRef.current = false; // Reset the ref
            }, 100);
            
        } catch (error) {
            console.error('Error fetching specific order:', error);
            optimizedToast.error('Failed to load order details');
            
            // Reset the ref on error
            isHandlingModalRef.current = false;
        }
    }, [logout]);

    useEffect(() => {
        const fetchPaymentModes = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const response = await fetch(`${API_BASE_URL}/payments/payment-modes/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    // Map payment modes with their disabled status
                    const modes = data.payment_modes.map(item => ({
                        value: item.value,
                        label: getPaymentModeDisplay(item.value),
                        disabled: item.disabled || false
                    }));
                    setPaymentModes(modes);
                } else {
                    // Use fallback payment modes if API fails
                    setPaymentModes([
                        { value: 'CASH', label: 'Cash', disabled: false },
                        { value: 'TELECEL CASH', label: 'Telecel Cash', disabled: false },
                        { value: 'MTN MOMO', label: 'MTN MoMo', disabled: false },
                        { value: 'PAYSTACK(USSD)', label: 'Paystack (USSD)', disabled: false },
                        { value: 'PAYSTACK(API)', label: 'Paystack (API) - Coming Soon', disabled: true }
                    ]);
                }
            } catch (err) {
                // Use fallback payment modes if API fails
                setPaymentModes([
                    { value: 'CASH', label: 'Cash', disabled: false },
                    { value: 'TELECEL CASH', label: 'Telecel Cash', disabled: false },
                    { value: 'MTN MOMO', label: 'MTN MoMo', disabled: false },
                    { value: 'PAYSTACK(USSD)', label: 'Paystack (USSD)', disabled: false },
                    { value: 'PAYSTACK(API)', label: 'Paystack (API) - Coming Soon', disabled: true }
                ]);
            }
        };

        // Fetch payment modes (async, non-blocking)
        fetchPaymentModes();
        
        // Fetch orders immediately (priority)
        fetchOrders();
    }, [logout, fetchOrders]);

    // Note: Date changes are now handled with debouncing in handleDateChange

    // Handle window resize for mobile/desktop view
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            
            // Always show stats on desktop
            if (!mobile) {
                setShowStats(true);
            }
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Add page visibility and focus listeners to refresh orders when returning from edit page
    useEffect(() => {
        const handleVisibilityChange = () => {
            // Refresh orders when page becomes visible (e.g., returning from edit page)
            if (!document.hidden) {
                console.log('🔄 Page became visible, refreshing orders...');
                fetchOrders(false); // Don't show loading spinner
            }
        };
        
        const handleWindowFocus = () => {
            // Refresh orders when window gains focus
            console.log('🔄 Window gained focus, refreshing orders...');
            fetchOrders(false); // Don't show loading spinner
        };
        
        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleWindowFocus);
        
        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleWindowFocus);
        };
    }, [fetchOrders]);
    
    // Calculate stats from all orders (already filtered by backend)
    const orderStatsMemo = useMemo(() => {
        const stats = {
            total: allOrders.length,
            pending: allOrders.filter(order => order.status === 'Pending' || order.status === 'Accepted').length,
            accepted: allOrders.filter(order => order.status === 'Accepted').length,
            fulfilled: allOrders.filter(order => order.status === 'Fulfilled').length,
            outForDelivery: allOrders.filter(order => order.status === 'Out for Delivery').length
        };
        return stats;
    }, [allOrders]);
    
    // Update state when orders or stats change
    useEffect(() => {
        setFilteredOrders(allOrders); // Backend already filtered
        setOrderStats(orderStatsMemo);
        setCurrentPage(1); // Reset to first page when orders change
    }, [allOrders, orderStatsMemo]);
    
    // Update paginated orders when allOrders or currentPage changes
    useEffect(() => {
        const startIndex = (currentPage - 1) * ordersPerPage;
        const endIndex = startIndex + ordersPerPage;
        const paginatedData = allOrders.slice(startIndex, endIndex);
        setPaginatedOrders(paginatedData);
    }, [allOrders, currentPage, ordersPerPage]);

    // Handle URL parameter for auto-opening order details
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const orderIdToOpen = urlParams.get('openOrder');
        
        if (orderIdToOpen && !loading && !isHandlingModalRef.current) {
            console.log('🎯 Attempting to open order:', orderIdToOpen);
            isHandlingModalRef.current = true;
            
            // Clear the URL parameter immediately to prevent re-triggering
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('openOrder');
            window.history.replaceState({}, '', newUrl);
            
            // First try to find the order in current loaded orders
            let orderToOpen = allOrders.find(order => 
                order.id.toString() === orderIdToOpen || 
                order.order_number?.toString() === orderIdToOpen
            );
            
            if (orderToOpen) {
                console.log('✅ Order found in current orders:', orderToOpen);
                
                // Clear any existing modal state first
                setShowOrderDetailsModal(false);
                setSelectedOrder(null);
                
                // Small delay to ensure state is clear before setting new values
                setTimeout(() => {
                    setSelectedOrder(orderToOpen);
                    setShowOrderDetailsModal(true);
                    isHandlingModalRef.current = false; // Reset the ref
                }, 50);
            } else if (allOrders.length > 0) {
                // If order not found in current orders, try to fetch it directly from API
                console.log('⚠️ Order not found in current orders, fetching from API...');
                fetchSpecificOrder(orderIdToOpen);
            } else {
                // No orders loaded yet, reset the ref
                isHandlingModalRef.current = false;
            }
        }
    }, [allOrders, location.search, loading, fetchSpecificOrder]);

    // Cleanup effect to reset ref on unmount
    useEffect(() => {
        return () => {
            isHandlingModalRef.current = false;
        };
    }, []);

    const handleDateChange = useCallback((e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        
        // Debounce API calls for rapid date changes
        if (dateChangeTimeoutRef.current) {
            clearTimeout(dateChangeTimeoutRef.current);
        }
        dateChangeTimeoutRef.current = setTimeout(() => {
            fetchOrders(false);
        }, 300); // 300ms debounce
    }, []);
    
    const dateChangeTimeoutRef = useRef(null);

    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const isToday = selectedDate === getTodayDate();

    const handleUpdateStatus = async () => {
        if (!selectedOrder || !newStatus) {
            contextToast.formValidation('Status');
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
    // Prevent multiple status updates
    if (isUpdatingStatus) {
      optimizedToast.warning('Update in progress');
      return;
    }

    setIsUpdatingStatus(true);

    try {
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
          optimizedToast.error('Payment required for fulfillment');
          return;
        }
      } else {
        // For pickup orders: payment required for Accepted and Fulfilled statuses
        const restrictedStatuses = ['Accepted', 'Fulfilled'];
        const isRestrictedStatus = restrictedStatuses.includes(newStatus);
        
        if (isRestrictedStatus) {
          if (hasNoPayment) {
            optimizedToast.error('Payment required');
            return;
          }
          if (hasPendingPayment) {
            optimizedToast.error('Payment pending');
            return;
          }
          if (isPartiallyPaid && newStatus === 'Fulfilled') {
            optimizedToast.error('Full payment required');
            return;
          }
          if (isPartiallyPaid) {
            optimizedToast.warning('Partially paid order');
            // Allow but warn for partially paid orders (except Fulfilled)
          }
        }
      }
      
      // Note: Refund processing for cancelled orders is handled in the payment modal

      // Use the direct API endpoint with proper authentication
      const token = localStorage.getItem('token');
      const orderNumber = selectedOrder.order_number || selectedOrder.id;
      const response = await fetch(`${API_BASE_URL}/orders/${orderNumber}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          modified_by: userData?.id || userData?.user_id,
          modified_by_username: userData?.username,
          modified_by_role: userData?.role || userData?.user_role
        }),
      });

      if (response.ok) {
        // Update the order in all orders, filtered orders, and orders state
        // Update allOrders first - this will trigger the useEffect to update filteredOrders
        const updatedAllOrders = allOrders.map(order => 
          order.id === selectedOrder.id 
            ? { ...order, status: newStatus }
            : order
        );
        setAllOrders(updatedAllOrders);
        
        // Also update filteredOrders directly for immediate UI update
        const updatedFilteredOrders = filteredOrders.map(order => 
          order.id === selectedOrder.id 
            ? { ...order, status: newStatus }
            : order
        );
        setFilteredOrders(updatedFilteredOrders);
        
        
        contextToast.orderUpdated(newStatus);
        
        setShowStatusModal(false);
        setSelectedOrder(null);
        setNewStatus('');
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        
        // Handle different error response formats
        let errorMessage = 'Failed to update order status';
        
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.non_field_errors) {
          // Handle non-field errors array
          errorMessage = Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors.join(', ') 
            : errorData.non_field_errors;
        } else if (typeof errorData === 'object' && errorData !== null) {
          // Handle field-specific validation errors
          const fieldErrors = [];
          for (const [field, errors] of Object.entries(errorData)) {
            if (Array.isArray(errors)) {
              fieldErrors.push(...errors);
            } else if (typeof errors === 'string') {
              fieldErrors.push(errors);
            }
          }
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join(', ');
          }
        }
        
        optimizedToast.error(errorMessage);
      }
    } catch (error) {
      optimizedToast.networkError();
    } finally {
      // Always re-enable status updates
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!selectedOrder || !newPaymentMode || !paymentAmount) {
      contextToast.formValidation('Payment details');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      contextToast.formValidation('Valid amount');
      return;
    }

    setShowPaymentConfirmation(true);
  };

    const confirmPayment = async () => {
        // Prevent duplicate payment processing
        if (isProcessingPayment) {
            contextToast.operationPending();
            return;
        }
        
        setIsProcessingPayment(true);
        
        try {
            const amount = parseFloat(paymentAmount);
            
            // Prepare payment data for backend payment API
            // Send payment method directly without mapping since backend now supports specific methods
            const paymentData = {
                order_number: selectedOrder.order_number || selectedOrder.id,
                amount: amount,
                payment_method: newPaymentMode, // Send the method directly
                payment_type: isRefundMode ? 'refund' : 'payment', // Set correct type based on mode
                // User tracking information
                processed_by: userData?.id || userData?.user_id,
                processed_by_username: userData?.username,
                processed_by_role: userData?.role || userData?.user_role
            };
            
            
            // Add mobile number only for PAYSTACK(API) - the only true mobile money payment
            if (newPaymentMode === 'PAYSTACK(API)') {
                if (!mobileNumber || mobileNumber.trim() === '') {
                    contextToast.formValidation('Mobile number');
                    return;
                }
                
                // Validate mobile number using utility function
                const validation = validateGhanaianMobileNumber(mobileNumber);
                if (!validation.isValid) {
                    optimizedToast.error(validation.message);
                    return;
                }
                
                paymentData.mobile_number = mobileNumber.trim().replace(/\s+/g, '');
            }
            
            // Use the payment service to initiate payment
            const paymentResponse = await initiatePayment(paymentData);
                
                // Handle different payment methods responses
                if (newPaymentMode === 'PAYSTACK(API)') {
                    // For Paystack API payments, handle authorization URL
                    if (paymentResponse.authorization_url) {
                        optimizedToast.success('Payment initiated');
                        optimizedToast.info('Redirecting to Paystack');
                        
                        // Open Paystack payment window using utility function
                        openPaymentWindow(
                            paymentResponse.authorization_url,
                            async (paymentData) => {
                                // Payment success callback
                                optimizedToast.success('Payment completed');
                                await refreshOrderData();
                            },
                            async () => {
                                // Payment window closed callback
                                optimizedToast.info('Refreshing status');
                                await refreshOrderData();
                            }
                        );
                    } else {
                        optimizedToast.warning('Payment initiated - check provider');
                    }
            } else {
                // For cash, Telecel Cash, MTN MoMo, PAYSTACK(USSD) - payment is processed immediately
                if (isRefundMode) {
                    contextToast.refundProcessed(amount.toFixed(2));
                    
                    // Show transaction details
                    if (paymentResponse.custom_transaction_id) {
                        optimizedToast.info(`ID: ${paymentResponse.formatted_transaction_id || paymentResponse.custom_transaction_id}`);
                    }
                } else {
                    contextToast.paymentReceived(amount.toFixed(2), getPaymentModeDisplay(newPaymentMode));
                    
                    // Show transaction details
                    if (paymentResponse.custom_transaction_id) {
                        optimizedToast.info(`ID: ${paymentResponse.formatted_transaction_id || paymentResponse.custom_transaction_id}`);
                    }
                    
                    // Check if this is a delivery order - it should auto-change to "Fulfilled" when payment confirmed
                    if (selectedOrder.delivery_type === 'Delivery') {
                        optimizedToast.info('🚚 Order fulfilled');
                    }
                }
                
                // Payment/refund was successful, refresh order data from backend to get updated status
                await refreshOrderData();
                
            }
                
                setShowPaymentModal(false);
                
                setShowPaymentConfirmation(false);
                
                setShowOrderDetailsModal(true);
                setNewPaymentMode('');
                setPaymentAmount('');
                setMobileNumber('');
        } catch (error) {
            const errorMessage = formatPaymentError(error);
            optimizedToast.error(errorMessage);
        } finally {
            // Always re-enable payment processing
            setIsProcessingPayment(false);
        }
    };


    const openPaymentModal = (order) => {
        setSelectedOrder(order);
        setNewPaymentMode('');
        setPaymentAmount('');
        setMobileNumber('');
        setShowPaymentConfirmation(false);
        
        // Check if order is overpaid OR cancelled with payments and switch to refund mode
        const isOverpaid = order.payment_status === 'OVERPAID' || 
                          (order.amount_overpaid && parseFloat(order.amount_overpaid) > 0);
        const isCancelledWithPayments = order.status === 'Cancelled' && 
                                       order.amount_paid && parseFloat(order.amount_paid) > 0;
        
        if (isOverpaid) {
            setIsRefundMode(true);
            setNewPaymentMode('CASH'); // Default to cash for refunds
            setPaymentAmount(order.amount_overpaid || '0.00'); // Set refund amount to overpaid amount
        } else if (isCancelledWithPayments) {
            setIsRefundMode(true);
            setNewPaymentMode('CASH'); // Default to cash for refunds
            setPaymentAmount(order.amount_paid || '0.00'); // Set refund amount to amount paid
        } else {
            setIsRefundMode(false);
        }
        
        setShowPaymentModal(true);
        setShowOrderDetailsModal(false); // Close order details modal
    };

    const closePaymentModal = () => {
        setShowPaymentModal(false);
        // Don't set selectedOrder to null, keep it for order details modal
        setNewPaymentMode('');
        setPaymentAmount('');
        setMobileNumber('');
        setShowPaymentConfirmation(false);
        // Return to order details modal if order is selected
        if (selectedOrder) {
            setShowOrderDetailsModal(true);
        }
    };

    const openStatusModal = (order) => {
        setSelectedOrder(order);
        setNewStatus(order.status);
        setShowOrderDetailsModal(false); // Close order details modal
        setShowStatusModal(true);
    };

    const closeStatusModal = () => {
        setShowStatusModal(false);
        // Don't set selectedOrder to null, keep it for order details modal
        setNewStatus('');
        // Return to order details modal if order is selected
        if (selectedOrder) {
            setShowOrderDetailsModal(true);
        }
    };

    const openOrderDetailsModal = (order) => {
        // Clear any previous selection
        setSelectedOrder(null);
        // Set order and show modal
        setSelectedOrder(order);
        setShowOrderDetailsModal(true);
    };

    const closeOrderDetailsModal = () => {
        setShowOrderDetailsModal(false);
        setSelectedOrder(null);
        // Reset the handling ref when modal is closed
        isHandlingModalRef.current = false;
    };
    
    const refreshOrderData = useCallback(async () => {
        try {
            // Store the current selected order ID before refresh
            const selectedOrderId = selectedOrder?.id;
            
            // Refresh without showing loading spinner
            await fetchOrders(false);
            
            // If we have a selected order, update it with fresh data after fetch completes
            if (selectedOrderId) {
                // Wait a bit for the fetchOrders to complete and state to update
                setTimeout(() => {
                    setAllOrders(currentOrders => {
                        const updatedOrder = currentOrders.find(order => order.id === selectedOrderId);
                        if (updatedOrder) {
                            console.log('🔄 Updating selectedOrder with fresh data:', updatedOrder);
                            setSelectedOrder(updatedOrder);
                        } else {
                            console.log('⚠️ Could not find updated order in refreshed data');
                        }
                        return currentOrders; // Return current state unchanged
                    });
                }, 200); // Slightly longer delay to ensure fetchOrders completes
            }
        } catch (error) {
            console.error('Error in refreshOrderData:', error);
            // Silent error - don't show user notification for refresh failures
        }
    }, [fetchOrders, selectedOrder?.id]);
    

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


    const getStatusBadgeVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-warning text-dark';
            case 'accepted': return 'bg-info';
            case 'preparing': return 'bg-primary';
            case 'ready': return 'bg-success';
            case 'out for delivery': return 'bg-secondary';
            case 'fulfilled': return 'bg-success';
            case 'cancelled': return 'bg-danger';
            default: return 'bg-secondary';
        }
    };

    const getPaymentStatusBadgeVariant = (paymentStatus) => {
        switch (paymentStatus?.toLowerCase()) {
            case 'paid': return 'bg-success';
            case 'unpaid': return 'bg-danger';
            case 'partially paid': return 'bg-warning text-dark';
            case 'overpaid': return 'bg-info';
            case 'pending payment': return 'bg-secondary';
            case 'refunded': return 'bg-dark text-white';
            default: return 'bg-secondary';
        }
    };

    const getPaymentModeIcon = (paymentMode) => {
        switch (paymentMode?.toUpperCase()) {
            case 'CASH': return 'bi-cash-coin';
            case 'TELECEL CASH': return 'bi-phone-vibrate';
            case 'MTN MOMO': return 'bi-phone';
            case 'PAYSTACK(USSD)': return 'bi-telephone';
            case 'PAYSTACK(API)': return 'bi-credit-card';
            default: return 'bi-question-circle';
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

    // Helper function to get status badge color
    const getStatusBadgeColor = (status) => {
        switch (status?.toLowerCase()) {
          case 'pending':
            return '#ffc107'; // Bootstrap warning
          case 'accepted':
          case 'confirmed':
            return '#0dcaf0'; // Bootstrap info
          case 'preparing':
          case 'processing':
            return '#0d6efd'; // Bootstrap primary
          case 'ready':
            return '#198754'; // Bootstrap success
          case 'out for delivery':
          case 'in transit':
            return '#6c757d'; // Bootstrap secondary
          case 'delivered':
          case 'fulfilled':
          case 'completed':
            return '#198754'; // Bootstrap success
          case 'cancelled':
            return '#dc3545'; // Bootstrap danger
          default:
            return '#6c757d'; // Bootstrap secondary
        }
    };

    // Function to get status text color
    const getStatusTextColor = (status) => {
        switch (status?.toLowerCase()) {
          case 'pending':
            return '#000'; // Dark text for warning background
          case 'accepted':
          case 'confirmed':
            return '#000'; // Dark text for info background
          case 'preparing':
          case 'processing':
            return '#fff'; // White text for primary background
          case 'ready':
            return '#fff'; // White text for success background
          case 'out for delivery':
          case 'in transit':
            return '#fff'; // White text for secondary background
          case 'delivered':
          case 'fulfilled':
          case 'completed':
            return '#fff'; // White text for success background
          case 'cancelled':
            return '#fff'; // White text for danger background
          default:
            return '#fff'; // White text for secondary background
        }
    };

    // Function to get payment status badge background color
    const getPaymentStatusBadgeColor = (paymentStatus) => {
        switch (paymentStatus?.toLowerCase()) {
          case 'paid':
            return '#198754'; // Bootstrap success
          case 'partially paid':
          case 'partial':
            return '#ffc107'; // Bootstrap warning
          case 'unpaid':
          case 'not paid':
            return '#dc3545'; // Bootstrap danger
          case 'overpaid':
            return '#0dcaf0'; // Bootstrap info
          case 'pending payment':
            return '#6c757d'; // Bootstrap secondary
          case 'refunded':
            return '#343a40'; // Bootstrap dark
          default:
            return '#6c757d'; // Bootstrap secondary
        }
    };

    // Function to get payment status text color
    const getPaymentStatusTextColor = (paymentStatus) => {
        switch (paymentStatus?.toLowerCase()) {
          case 'paid':
            return '#fff'; // White text for success background
          case 'partially paid':
          case 'partial':
            return '#000'; // Dark text for warning background
          case 'unpaid':
          case 'not paid':
            return '#fff'; // White text for danger background
          case 'overpaid':
            return '#000'; // Dark text for info background
          case 'pending payment':
            return '#fff'; // White text for secondary background
          case 'refunded':
            return '#fff'; // White text for dark background
          default:
            return '#fff'; // White text for secondary background
        }
    };

    // Function to get short payment status
    const getShortPaymentStatus = (paymentStatus) => {
        switch (paymentStatus) {
          case 'Paid':
            return 'Paid';
          case 'Partially Paid':
            return 'Part-Paid';
          case 'Not Paid':
            return 'Unpaid';
          default:
            return paymentStatus;
        }
    };

    if (loading) {
        return (
            <Container className="mt-4">
                <div className="mb-3">
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate('/dashboard')}
                        className="d-flex align-items-center ada-shadow-sm"
                        style={{ minHeight: '44px' }}
                    >
                        <i className="bi bi-arrow-left me-2"></i>
                        <span>Return to Dashboard</span>
                    </Button>
                </div>
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading orders...</p>
                </div>
            </Container>
        );
    }


  return (
      <Container className="my-3 my-md-4 px-3 px-md-4">
        {/* Return to Dashboard Button */}
        <div className="mb-3 d-flex gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="d-flex align-items-center ada-shadow-sm"
            style={{ minHeight: '44px' }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            <span>Return to Dashboard</span>
          </Button>
          {isMobile && (
            <Button
            variant="primary"
            size="sm"
            onClick={() => setShowStatsModal(true)}
            className="d-flex align-items-center ada-shadow-sm ms-auto"
            style={{ minHeight: '44px', color: 'white', fontWeight: '500' }}
            >
              <i className="bi bi-bar-chart-line me-2"></i>
              <span>View Stats</span>
            </Button>
          )}
        </div>
      
      {/* Order Stats Cards - only shown on desktop */}
      {!isMobile && showStats && (
        <Row className="mb-4 g-3">
          <Col xs={6} md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <i className="bi bi-list-ul text-primary" style={{ fontSize: '2rem' }}></i>
                <h4 className="mt-2">{orderStats.total}</h4>
                <p className="mb-0 text-muted">Total Orders</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <i className="bi bi-clock text-warning" style={{ fontSize: '2rem' }}></i>
                <h4 className="mt-2">{orderStats.pending}</h4>
                <p className="mb-0 text-muted">Pending & Accepted</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <i className="bi bi-truck text-info" style={{ fontSize: '2rem' }}></i>
                <h4 className="mt-2">{orderStats.outForDelivery}</h4>
                <p className="mb-0 text-muted">Out for Delivery</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <i className="bi bi-check-circle text-success" style={{ fontSize: '2rem' }}></i>
                <h4 className="mt-2">{orderStats.fulfilled}</h4>
                <p className="mb-0 text-muted">Fulfilled</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      
      <Card className="border-0">
        <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div className="d-flex align-items-center">
                <h5 className="mb-0 me-2">
                  <i className="bi bi-list-ul me-2"></i>
                  Orders List ({filteredOrders.length})
                </h5>
            </div>
            <div className="d-flex align-items-center mt-2 mt-sm-0">
              {isMobile ? (
                <>
                  {/* Mobile: Show only calendar icon that opens date picker */}
                  <div className="position-relative">
                    <Form.Control
                      type="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      className="position-absolute"
                      style={{ 
                        opacity: 0, 
                        top: 0, 
                        left: 0, 
                        width: '40px', 
                        height: '34px',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                      size="sm"
                    />
                    <Button
                      variant="outline-light"
                      size="sm"
                      className="d-flex align-items-center justify-content-center"
                      style={{ 
                        minWidth: '40px', 
                        height: '34px',
                        border: '1px solid rgba(255,255,255,0.5)',
                        color: 'white'
                      }}
                    >
                      <i className="bi bi-calendar3"></i>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Desktop: Show full date picker with reset button */}
                  <Form.Control
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="ada-shadow-sm"
                    style={{ minHeight: '34px', width: 'auto', maxWidth: '140px' }}
                    size="sm"
                  />
                  {!isToday && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setSelectedDate(getTodayDate())}
                      className="ms-2"
                    >
                      <i className="bi bi-calendar-check"></i>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Card.Header>
        <Card.Body className={isMobile ? 'px-2 px-sm-3' : 'px-3'}>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <h5 className="mt-3 text-muted">
                {isToday ? 'No orders for today' : `No orders found for ${new Date(selectedDate).toLocaleDateString()}`}
              </h5>
              <p className="text-muted">
                {isToday ? 'Start by creating your first order!' : 'Try selecting a different date or create a new order.'}
              </p>
              {isToday && (
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/create-order')}
                  className="mt-2"
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Create Order
                </Button>
              )}
            </div>
          ) : !isMobile ? (
            <div className="table-responsive">
              <Table striped hover className="mb-0">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Delivery Type</th>
                    <th>Total</th>
                    <th>Payment Status</th>
                    <th>Payment Mode</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr 
                      key={order.id}
                      onClick={() => openOrderDetailsModal(order)}
                      style={{ cursor: 'pointer' }}
                      className="table-row-hover"
                    >
                      <td>
                        <strong className="ada-text-primary">
                          #{order.order_number || order.id}
                        </strong>
                      </td>
                      <td>
                        <span 
                          className="badge"
                          style={{ 
                            fontSize: '0.85rem', 
                            padding: '0.5rem 0.75rem',
                            backgroundColor: order.delivery_type === 'Delivery' ? '#ffc107' : '#198754',
                            color: order.delivery_type === 'Delivery' ? '#000' : '#fff'
                          }}
                        >
                          <i className={`bi ${order.delivery_type === 'Delivery' ? 'bi-truck' : 'bi-shop'} me-2`}></i>
                          {order.delivery_type === 'Delivery' && (order.delivery_location || order.custom_delivery_location)
                            ? `Delivery to ${order.effective_delivery_location_name || order.delivery_location || order.custom_delivery_location}`
                            : order.delivery_type || 'Pickup'
                          }
                        </span>
                      </td>
                      <td>
                        <strong>₵{parseFloat(order.total_price || 0).toFixed(2)}</strong>
                      </td>
                      <td>
                        <span 
                          className="badge"
                          style={{ 
                            fontSize: '0.85rem', 
                            padding: '0.5rem 0.75rem', 
                            background: getPaymentStatusBadgeColor(order.payment_status),
                            color: getPaymentStatusTextColor(order.payment_status)
                          }}
                        >
                          {order.payment_status || 'Not Paid'}
                        </span>
                      </td>
                      <td>
                        {order.payment_mode ? (
                          <span className="d-flex align-items-center">
                            <i className={`bi ${getPaymentModeIcon(order.payment_mode)} me-2`}></i>
                            <span style={{ fontSize: '0.9rem' }}>{getPaymentModeDisplay(order.payment_mode)}</span>
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.9rem' }}>None</span>
                        )}
                      </td>
                      <td>
                        <span 
                          className="badge"
                          style={{ 
                            fontSize: '0.85rem', 
                            padding: '0.5rem 0.75rem',
                            background: getStatusBadgeColor(order.status),
                            color: getStatusTextColor(order.status)
                          }}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              
              {filteredOrders.length > ordersPerPage && (
                <div className="d-flex justify-content-between align-items-center mt-3 px-2">
                  <small className="text-muted">
                    Showing {((currentPage - 1) * ordersPerPage) + 1} to {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                  </small>
                  <div className="d-flex gap-1">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{ minWidth: '35px' }}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </Button>
                    
                    {(() => {
                      const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
                      const pages = [];
                      const showPages = 5; // Show max 5 page numbers
                      
                      let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                      let endPage = Math.min(totalPages, startPage + showPages - 1);
                      
                      // Adjust start page if we're near the end
                      if (endPage - startPage + 1 < showPages) {
                        startPage = Math.max(1, endPage - showPages + 1);
                      }
                      
                      // Add first page and ellipsis if needed
                      if (startPage > 1) {
                        pages.push(
                          <Button key={1} variant={1 === currentPage ? "primary" : "outline-primary"} size="sm" onClick={() => setCurrentPage(1)} style={{ minWidth: '35px' }}>
                            1
                          </Button>
                        );
                        if (startPage > 2) {
                          pages.push(<span key="ellipsis1" className="px-2">...</span>);
                        }
                      }
                      
                      // Add page numbers
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={i === currentPage ? "primary" : "outline-primary"}
                            size="sm"
                            onClick={() => setCurrentPage(i)}
                            style={{ minWidth: '35px' }}
                          >
                            {i}
                          </Button>
                        );
                      }
                      
                      // Add last page and ellipsis if needed
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(<span key="ellipsis2" className="px-2">...</span>);
                        }
                        pages.push(
                          <Button key={totalPages} variant={totalPages === currentPage ? "primary" : "outline-primary"} size="sm" onClick={() => setCurrentPage(totalPages)} style={{ minWidth: '35px' }}>
                            {totalPages}
                          </Button>
                        );
                      }
                      
                      return pages;
                    })()} 
                    
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === Math.ceil(filteredOrders.length / ordersPerPage)}
                      style={{ minWidth: '35px' }}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Minimalist card view for mobile devices */}
              <Row className="g-2 px-1">
              {paginatedOrders.map((order) => (
                <Col xs={12} key={order.id}>
                  <Card 
                    className="mobile-friendly-card border-0" 
                    onClick={() => openOrderDetailsModal(order)}
                    style={{ 
                      cursor: 'pointer',
                      margin: '0 2px 8px',
                      borderRadius: '8px',
                      background: '#f9f9fb'
                    }}
                  >
                    <Card.Body className="p-2">
                      <div className="d-flex align-items-center">
                        {/* Left: Order info */}
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                              <span className="ada-text-primary fw-bold me-2" style={{ fontSize: '0.95rem' }}>
                                #{order.order_number || order.id}
                              </span>
                            <span 
                              className="badge rounded-pill"
                              style={{ 
                                fontSize: '0.7rem', 
                                padding: '0.15rem 0.5rem',
                                background: order.delivery_type === 'Delivery' ? '#d1e9ff' : '#c8f7c5',
                                color: '#333',
                                border: 'none'
                              }}
                            >
                              <i className={`bi ${order.delivery_type === 'Delivery' ? 'bi-truck' : 'bi-shop'} me-1`}></i>
                              {order.delivery_type === 'Delivery' && (order.delivery_location || order.custom_delivery_location)
                                ? `To ${order.effective_delivery_location_name || order.delivery_location || order.custom_delivery_location}`
                                : order.delivery_type === 'Delivery' ? 'Delivery' : 'Pickup'
                              }
                            </span>
                          </div>
                          
                          {/* Customer Phone Number - Only show for delivery orders */}
                          {order.delivery_type === 'Delivery' && order.customer_phone && (
                            <div className="d-flex align-items-center mb-1">
                              <span className="text-dark fw-semibold" style={{ fontSize: '0.85rem', color: '#333' }}>
                                <i className="bi bi-phone me-1" style={{ color: '#007bff' }}></i>
                                {order.customer_phone}
                              </span>
                            </div>
                          )}
                          
                          <div className="d-flex align-items-center">
                            <span 
                              className="badge me-2"
                              style={{ 
                                fontSize: '0.7rem', 
                                padding: '0.15rem 0.4rem',
                                background: getStatusBadgeColor(order.status),
                                color: getStatusTextColor(order.status),
                                border: 'none'
                              }}
                            >
                              {order.status}
                            </span>
                            <span 
                              className="badge"
                              style={{ 
                                fontSize: '0.7rem', 
                                padding: '0.15rem 0.4rem',
                                background: getPaymentStatusBadgeColor(order.payment_status),
                                color: getPaymentStatusTextColor(order.payment_status),
                                border: 'none'
                              }}
                            >
                              {getShortPaymentStatus(order.payment_status)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Right: Price and icon */}
                        <div className="d-flex flex-column align-items-end">
                          <span className="text-dark fw-bold" style={{ fontSize: '0.95rem' }}>₵{parseFloat(order.total_price || 0).toFixed(2)}</span>
                          <button 
                            className="btn btn-sm p-0 mt-1" 
                            style={{ color: '#4285F4', background: 'transparent' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openOrderDetailsModal(order);
                            }}
                          >
                            <i className="bi bi-chevron-right"></i>
                          </button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
            
            {/* Pagination Controls for Mobile */}
            {filteredOrders.length > ordersPerPage && (
              <div className="d-flex justify-content-between align-items-center mt-3 px-2">
                <small className="text-muted">
                  {((currentPage - 1) * ordersPerPage) + 1}-{Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length}
                </small>
                <div className="d-flex gap-1">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{ minWidth: '32px', fontSize: '0.8rem' }}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </Button>
                  
                  <span className="px-2 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                    {currentPage} / {Math.ceil(filteredOrders.length / ordersPerPage)}
                  </span>
                  
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === Math.ceil(filteredOrders.length / ordersPerPage)}
                    style={{ minWidth: '32px', fontSize: '0.8rem' }}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </Card.Body>
      </Card>


      {/* Update Status Modal */}
      <Modal 
        show={showStatusModal} 
        onHide={closeStatusModal} 
        centered
        size={isMobile ? undefined : "lg"}
        fullscreen={isMobile ? "sm-down" : false}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil-square me-2"></i>
            Update Order Status
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <div className="mb-3">
                <p className="mb-3">
                  <strong>Current Status:</strong> 
                  <span 
                    className={`badge ${getStatusBadgeVariant(selectedOrder.status)} ms-2`}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    {selectedOrder.status}
                  </span>
                </p>
              </div>
              
              <Form.Group controlId="statusSelect">
                <Form.Label className="fw-semibold">New Status <span className="text-danger">*</span></Form.Label>
                
                {/* Show payment warning if payment is not confirmed */}
                {(() => {
                  const paymentStatus = selectedOrder.payment_status?.toUpperCase();
                  return paymentStatus !== 'PAID' && paymentStatus !== 'OVERPAID';
                })() && (
                  <div className="alert alert-warning py-2 mb-2">
                    <small>
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      <strong>Payment Status: {selectedOrder.payment_status || 'Unpaid'}</strong><br/>
                      {selectedOrder.payment_status === 'PARTIALLY PAID' 
                        ? 'Order is only partially paid. Some status updates may be restricted.' 
                        : selectedOrder.payment_status === 'PENDING PAYMENT'
                        ? 'Payment is pending. Please wait for payment confirmation before updating status.'
                        : 'Payment required for most status updates. Only \'Pending\' and \'Cancelled\' are available.'}
                    </small>
                  </div>
                )}
                
                <Form.Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="ada-shadow-sm"
                  required
                >
                  <option value="">Select new status...</option>
                  {getStatusOptions(selectedOrder).map((status) => {
                    // Enhanced payment status checking with case-insensitive comparison
                    const paymentStatus = selectedOrder.payment_status?.toUpperCase();
                    const isPaymentConfirmed = paymentStatus === 'PAID' || paymentStatus === 'OVERPAID';
                    const isPartiallyPaid = paymentStatus === 'PARTIALLY PAID';
                    const isDeliveryOrder = selectedOrder.delivery_type === 'Delivery';
                    
                    // Special validation for "Out for Delivery" status
                    if (status === 'Out for Delivery') {
                        // Only show for delivery orders (no payment required)
                        if (!isDeliveryOrder) {
                            return null; // Don't render this option
                        }
                    }
                    
                    // Payment validation based on order type
                    let isAllowed = true;
                    
                    if (isDeliveryOrder) {
                        // For delivery orders: payment only required for "Fulfilled" status
                        if (status === 'Fulfilled' && !isPaymentConfirmed) {
                            isAllowed = false;
                        }
                        // Other statuses (including "Out for Delivery") are allowed without payment
                    } else {
                        // For pickup orders: payment required for Accepted and Fulfilled statuses (simplified workflow)
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
                        style={{ color: isAllowed ? 'inherit' : '#6c757d' }}
                      >
                        {status} {!isAllowed ? '(Payment required)' : ''}
                      </option>
                    );
                  })}
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className={isMobile ? "p-2" : "p-3"}>
          <div className="d-flex flex-column flex-sm-row w-100 gap-2">
            <Button 
              variant="danger" 
              onClick={closeStatusModal}
              className="flex-fill"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '44px' }}
            >
              <i className="bi bi-x-circle me-1"></i>
              {isMobile ? 'Cancel' : 'Cancel'}
            </Button>
            <Button 
              variant="primary" 
              onClick={handleUpdateStatus}
              disabled={!newStatus || newStatus === selectedOrder?.status || isUpdatingStatus}
              className="flex-fill"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '44px' }}
            >
              {isUpdatingStatus ? (
                <>
                  <div className="spinner-border spinner-border-sm me-1" role="status">
                    <span className="visually-hidden">Updating...</span>
                  </div>
                  {isMobile ? 'Updating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-1"></i>
                  {isMobile ? 'Update' : 'Update Status'}
                </>
              )}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Update Payment Modal */}
      <Modal 
        show={showPaymentModal} 
        onHide={closePaymentModal} 
        centered
        size={isMobile ? undefined : "lg"}
        fullscreen={isMobile ? "sm-down" : false}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {isRefundMode ? (
              <>
                <i className="bi bi-arrow-return-left me-2"></i>
                Process Refund
              </>
            ) : (
              <>
                <i className="bi bi-credit-card me-2"></i>
                Update Payment Details
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className={isMobile ? "p-3" : "p-4"}>
          {selectedOrder && (
            <>
              {/* Order Total - Prominent Display */}
              <div className={`alert alert-info ${isMobile ? 'mb-3' : 'mb-4'}`} style={{ border: '2px solid #0dcaf0', backgroundColor: '#e7f3ff' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className={`mb-0 ${isMobile ? 'fs-6' : 'fs-5'}`} style={{ color: '#0c63e4' }}>
                      <i className="bi bi-receipt me-2"></i>
                      Order Total
                    </h6>
                  </div>
                  <div className="text-end">
                    <h5 className={`mb-0 fw-bold ${isMobile ? 'fs-5' : 'fs-4'}`} style={{ color: '#0c63e4' }}>
                      ₵{parseFloat(selectedOrder.total_price || 0).toFixed(2)}
                    </h5>
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="mb-1">
                  <strong>Current Payment Status:</strong> 
                  <span 
                    className={`badge ${getPaymentStatusBadgeVariant(selectedOrder.payment_status)} ms-2`}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    {selectedOrder.payment_status || 'Not Paid'}
                  </span>
                </p>
                <p className="mb-3">
                  <strong>Current Payment Mode:</strong> 
                  {selectedOrder.payment_mode ? (
                    <span className="d-inline-flex align-items-center ms-2">
                      <i className={`bi ${getPaymentModeIcon(selectedOrder.payment_mode)} me-2`}></i>
                      <span style={{ fontSize: '0.9rem' }}>{getPaymentModeDisplay(selectedOrder.payment_mode)}</span>
                    </span>
                  ) : (
                    <span className="text-muted ms-2" style={{ fontSize: '0.9rem' }}>None</span>
                  )}
                </p>
                {/* Amount Summary - show if there are payments */}
                {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                  <p className="mb-3">
                    <strong>Amount Received:</strong> 
                    <span className="ms-2 text-success fw-bold">
                      ₵{selectedOrder.amount_paid || '0.00'}
                    </span>
                    {selectedOrder.balance_due > 0 && (
                      <span className="ms-3">
                        <strong className="text-warning">Balance Due:</strong> 
                        <span className="ms-1 text-warning fw-bold">₵{selectedOrder.balance_due}</span>
                      </span>
                    )}
                    {selectedOrder.amount_overpaid > 0 && (
                      <span className="ms-3">
                        <strong className="text-info">Change Due:</strong> 
                        <span className="ms-1 text-info fw-bold">₵{selectedOrder.amount_overpaid}</span>
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              {!showPaymentConfirmation ? (
                <>
                  <Row className={isMobile ? 'g-2' : 'g-3'}>
                    <Col md={6}>
                      <Form.Group controlId="paymentModeSelect" className={isMobile ? "mb-2" : "mb-3"}>
                        <Form.Label className={`fw-semibold ${isMobile ? 'small' : ''}`}>Payment Mode <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                          value={newPaymentMode}
                          onChange={(e) => {
                            const selectedMode = e.target.value;
                            
                            // Check if the selected mode is disabled
                            if (!isRefundMode) {
                              const mode = paymentModes.find(m => m.value === selectedMode);
                              if (mode && mode.disabled) {
                                optimizedToast.warning(`${mode.label} is currently not available. Please select a different payment method.`);
                                return; // Don't set the disabled mode
                              }
                            }
                            
                            setNewPaymentMode(selectedMode);
                            // Reset mobile number when payment mode changes
                            if (selectedMode !== 'PAYSTACK(API)') {
                              setMobileNumber('');
                            }
                          }}
                          className="ada-shadow-sm"
                          size={isMobile ? "sm" : undefined}
                          required
                          disabled={isRefundMode} // Disabled in refund mode (cash only)
                        >
                          <option value="">{isRefundMode ? 'Cash Only (Refunds)' : 'Select payment mode...'}</option>
                          {/* Show only cash for refunds, all modes for payments */}
                          {(isRefundMode ? [{value: 'CASH', label: 'Cash', disabled: false}] : paymentModes).map((mode) => {
                            const modeValue = typeof mode === 'string' ? mode : mode.value;
                            const modeLabel = typeof mode === 'string' ? getPaymentModeDisplay(mode) : mode.label;
                            const isDisabled = typeof mode === 'object' && mode.disabled;
                            
                            return (
                              <option 
                                key={modeValue} 
                                value={modeValue}
                                disabled={isDisabled}
                                style={isDisabled ? { color: '#6c757d', fontStyle: 'italic' } : {}}
                              >
                                {modeLabel}
                              </option>
                            );
                          })}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="paymentAmount" className={isMobile ? "mb-2" : "mb-3"}>
                        <Form.Label className={`fw-semibold ${isMobile ? 'small' : ''}`}>
                          {isRefundMode ? 'Refund Amount' : 'Amount Received'} <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00"
                          className="ada-shadow-sm"
                          size={isMobile ? "sm" : undefined}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  {/* Mobile Number Input for PAYSTACK(API) */}
                  {newPaymentMode === 'PAYSTACK(API)' && (
                    <Row className={isMobile ? "mb-2" : "mb-3"}>
                      <Col>
                        <Form.Group controlId="mobileNumber">
                          <Form.Label className={`fw-semibold ${isMobile ? 'small' : ''}`}>
                            Mobile Number <span className="text-danger">*</span>
                            {!isMobile && <small className="text-muted ms-2">(Required for Paystack API payments)</small>}
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            inputMode="tel"
                            value={mobileNumber}
                            onChange={(e) => {
                              const sanitized = sanitizeMobileNumberInput(e.target.value);
                              setMobileNumber(sanitized);
                            }}
                            placeholder="e.g., 0241234567 or 233241234567"
                            className="ada-shadow-sm"
                            size={isMobile ? "sm" : undefined}
                            required
                            maxLength="15"
                          />
                          {!isMobile && (
                            <Form.Text className="text-muted">
                              Enter Ghanaian mobile number (MTN, Vodafone, AirtelTigo)
                            </Form.Text>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>
                  )}
                  
                  <div className={`bg-light rounded ${isMobile ? 'p-2' : 'p-3'}`}>
                    <small className={`text-muted ${isMobile ? 'smaller' : ''}`}>
                      <i className="bi bi-info-circle me-1"></i>
                      {isMobile ? 'Payment status auto-determined by amount vs order total.' : 'Payment status will be automatically determined based on the amount received compared to the order total.'}
                    </small>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className={`alert ${isRefundMode ? 'alert-info' : 'alert-warning'}`}>
                    <h5>
                      <i className={`bi ${isRefundMode ? 'bi-arrow-return-left' : 'bi-exclamation-triangle'} me-2`}></i>
                      {isRefundMode ? 'Confirm Refund' : 'Confirm Payment'}
                    </h5>
                    {isRefundMode && (
                      <div className="alert alert-warning mb-2">
                        <small>
                          <i className="bi bi-info-circle me-1"></i>
                          <strong>Refund Notice:</strong> This will issue a cash refund to the customer. Please ensure you have the amount ready.
                        </small>
                      </div>
                    )}
                    <p className="mb-1"><strong>{isRefundMode ? 'Refund Mode' : 'Payment Mode'}:</strong> {getPaymentModeDisplay(newPaymentMode)}</p>
                    <p className="mb-1"><strong>{isRefundMode ? 'Refund Amount' : 'Amount Received'}:</strong> ₵{parseFloat(paymentAmount).toFixed(2)}</p>
                    <p className="mb-1"><strong>Order Total:</strong> ₵{parseFloat(selectedOrder.total_price || 0).toFixed(2)}</p>
                    <hr />
                    {(() => {
                      const amount = parseFloat(paymentAmount);
                      const total = parseFloat(selectedOrder.total_price || 0);
                      if (amount === total) {
                        return <p className="text-success mb-0"><strong>Status:</strong> Payment Complete</p>;
                      } else if (amount < total) {
                        return (
                          <>
                            <p className="text-warning mb-1"><strong>Status:</strong> Partial Payment</p>
                            <p className="mb-0"><strong>Balance Due:</strong> ₵{(total - amount).toFixed(2)}</p>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <p className="text-info mb-1"><strong>Status:</strong> Overpayment</p>
                            <p className="mb-0"><strong>Change Due:</strong> ₵{(amount - total).toFixed(2)}</p>
                          </>
                        );
                      }
                    })()}
                  </div>
                  <p className="text-muted">Please confirm the payment details above.</p>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className={isMobile ? "p-2" : "p-3"}>
          <div className="d-flex flex-column flex-sm-row w-100 gap-2">
            <Button 
              variant="danger" 
              onClick={closePaymentModal}
              disabled={isProcessingPayment}
              className="flex-fill"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '44px' }}
            >
              <i className="bi bi-x-circle me-1"></i>
              Cancel
            </Button>
            {!showPaymentConfirmation ? (
              <Button 
                variant="warning" 
                onClick={handleUpdatePayment}
                disabled={!newPaymentMode || !paymentAmount || isProcessingPayment}
                className="flex-fill"
                size={isMobile ? "sm" : undefined}
                style={{ minHeight: isMobile ? '36px' : '44px' }}
              >
                <i className="bi bi-arrow-right me-1"></i>
                {isMobile ? 'Review' : 'Review Payment'}
              </Button>
            ) : (
              <Button 
                variant={isRefundMode ? "info" : "success"} 
                onClick={confirmPayment}
                disabled={isProcessingPayment}
                className="flex-fill"
                size={isMobile ? "sm" : undefined}
                style={{ minHeight: isMobile ? '36px' : '44px' }}
              >
                {isProcessingPayment ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-1" role="status">
                      <span className="visually-hidden">Processing...</span>
                    </div>
                    {isMobile ? (isRefundMode ? 'Refunding...' : 'Processing...') : (isRefundMode ? 'Processing Refund...' : 'Processing Payment...')}
                  </>
                ) : (
                  <>
                    <i className={`bi ${isRefundMode ? 'bi-arrow-return-left' : 'bi-check-circle'} me-1`}></i>
                    {isMobile ? (isRefundMode ? 'Refund' : 'Confirm') : (isRefundMode ? 'Process Refund' : 'Confirm Payment')}
                  </>
                )}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Modal>
      
      {/* Payment History Modal */}
      <Modal 
        show={showPaymentHistoryModal} 
        onHide={() => {
          setShowPaymentHistoryModal(false);
          // Always return to order details modal when payment history is closed
          if (selectedOrder) {
            setShowOrderDetailsModal(true);
          }
        }} 
        centered 
        size="lg"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-clock-history me-2"></i>
            Payment History
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && selectedOrder.payments ? (
            <>
              {/* Order Summary */}
              <div className="mb-4 p-3 bg-light rounded">
                <Row>
                  <Col md={6}>
                    <h6 className="mb-2">
                      <i className="bi bi-receipt me-2"></i>
                      Order Summary
                    </h6>
                    <p className="mb-1"><strong>Order Total:</strong> ₵{parseFloat(selectedOrder.total_price || 0).toFixed(2)}</p>
                    <p className="mb-1">
                      <strong>Payment Status:</strong> 
                      <span className={`badge ${getPaymentStatusBadgeVariant(selectedOrder.payment_status)} ms-2`}>
                        {selectedOrder.payment_status || 'Not Paid'}
                      </span>
                    </p>
                  </Col>
                  <Col md={6}>
                    <h6 className="mb-2">
                      <i className="bi bi-calculator me-2"></i>
                      Payment Summary
                    </h6>
                    <p className="mb-1">
                      <strong className="text-success">Amount Received:</strong> 
                      <span className="ms-2 text-success fw-bold">₵{selectedOrder.amount_paid || '0.00'}</span>
                    </p>
                    {selectedOrder.balance_due > 0 && (
                      <p className="mb-1">
                        <strong className="text-warning">Balance Due:</strong> 
                        <span className="ms-2 text-warning fw-bold">₵{selectedOrder.balance_due}</span>
                      </p>
                    )}
                    {selectedOrder.amount_overpaid > 0 && (
                      <p className="mb-1">
                        <strong className="text-info">Change Due:</strong> 
                        <span className="ms-2 text-info fw-bold">₵{selectedOrder.amount_overpaid}</span>
                      </p>
                    )}
                  </Col>
                </Row>
              </div>
              
              {/* Payment History List */}
              <div>
                <h6 className="mb-3">
                  <i className="bi bi-list-ul me-2"></i>
                  Payment Transactions ({selectedOrder.payments.length})
                </h6>
                
                {selectedOrder.payments.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-inbox display-4"></i>
                    <p className="mt-2">No payment transactions found</p>
                  </div>
                ) : (
                  <div className="payment-history-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {selectedOrder.payments.map((payment, index) => (
                      <Card key={payment.id} className="mb-3 border mobile-friendly-card">
                        <Card.Body className="p-3">
                          <Row className="align-items-center g-2">
                            <Col xs={2} md={1}>
                              <div className="text-center">
                                <span className="badge rounded-pill" style={{
                                    backgroundColor: '#0d6efd',
                                    color: 'white'
                                  }}>
                                  #{index + 1}
                                </span>
                              </div>
                            </Col>
                            <Col xs={10} md={3}>
                              <div className="d-flex align-items-center">
                                <i className={`bi ${getPaymentModeIcon(payment.payment_method)} me-2 text-primary`} style={{fontSize: '1.2rem'}}></i>
                                <div>
                                  <div className="fw-bold">{getPaymentModeDisplay(payment.payment_method)}</div>
                                  <small className="text-muted">
                                    {payment.payment_type === 'refund' ? 'Refund' : 'Payment'}
                                  </small>
                                </div>
                              </div>
                            </Col>
                            <Col xs={6} md={2}>
                              <div className="text-center">
                                <div className="fw-bold" style={{fontSize: '1.1rem'}}>
                                  {payment.payment_type === 'refund' ? '-' : ''}₵{payment.amount}
                                </div>
                                <small className="text-muted">Amount</small>
                              </div>
                            </Col>
                            <Col xs={6} md={2}>
                              <div className="text-center">
                                <span className="badge" style={{
                                    backgroundColor: getPaymentStatusBadgeColor(payment.status),
                                    color: getPaymentStatusTextColor(payment.status)
                                  }}>
                                  {payment.status}
                                </span>
                                <div>
                                  <small className="text-muted">Status</small>
                                </div>
                              </div>
                            </Col>
                            <Col xs={12} md={4} className="mt-2 mt-md-0">
                              <div>
                                <small className="text-muted d-block">
                                  <i className="bi bi-calendar-event me-1"></i>
                                  {new Date(payment.created_at).toLocaleString()}
                                </small>
                                {payment.mobile_number && (
                                  <small className="text-muted d-block">
                                    <i className="bi bi-phone me-1"></i>
                                    {payment.mobile_number}
                                  </small>
                                )}
                                {payment.reference && (
                                  <small className="text-muted d-block">
                                    <i className="bi bi-hash me-1"></i>
                                    {payment.reference.slice(0, 8)}...{payment.reference.slice(-4)}
                                  </small>
                                )}
                                {payment.processed_by_username && (
                                  <small className="text-muted d-block">
                                    <i className="bi bi-person me-1"></i>
                                    Processed by: {payment.processed_by_username}
                                  </small>
                                )}
                                {/* Add minimal activity tracking for this payment */}
                                <div className="mt-1">
                                  <SimpleUserTracking 
                                    orderId={selectedOrder.id}
                                    orderNumber={selectedOrder.order_number}
                                    className=""
                                    showTitle={false}
                                    size="minimal"
                                  />
                                </div>
                              </div>
                            </Col>
                          </Row>
                          
                          {payment.notes && (
                            <Row className="mt-2">
                              <Col>
                                <div className="bg-light p-2 rounded">
                                  <small>
                                    <i className="bi bi-sticky me-1"></i>
                                    <strong>Notes:</strong> {payment.notes}
                                  </small>
                                </div>
                              </Col>
                            </Row>
                          )}
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-exclamation-circle display-4"></i>
              <p className="mt-2">No order selected or payment data unavailable</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-grid w-100">
            <Button variant="danger" onClick={() => setShowPaymentHistoryModal(false)}>
              <i className="bi bi-x-circle me-2"></i>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      
      {/* Order Details Modal */}
      <Modal 
        show={showOrderDetailsModal} 
        onHide={closeOrderDetailsModal} 
        centered 
        size="lg"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title className="d-flex justify-content-between align-items-center w-100">
            <div>
              {selectedOrder && (
                <span>#{selectedOrder.order_number || selectedOrder.id}</span>
              )}
            </div>
            {selectedOrder && (
              <div className="d-flex gap-2">
                <span className="badge" style={{ 
                    fontSize: '0.75rem',
                    backgroundColor: getStatusBadgeColor(selectedOrder.status),
                    color: getStatusTextColor(selectedOrder.status)
                  }}>
                  {selectedOrder.status}
                </span>
                <span className="badge" style={{ 
                    fontSize: '0.75rem',
                    backgroundColor: getPaymentStatusBadgeColor(selectedOrder.payment_status),
                    color: getPaymentStatusTextColor(selectedOrder.payment_status)
                  }}>
                  {selectedOrder.payment_status || 'Not Paid'}
                </span>
              </div>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="order-details-container">
          {selectedOrder && (
            <>
              {/* Order Items Section - Now First */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="mb-3">
                  <Card className="h-100">
                    <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
                      <h6 className="mb-0 text-white d-flex align-items-center">
                        <i className="bi bi-bag me-2"></i>
                        Order Items ({selectedOrder.items.length})
                      </h6>
                    </Card.Header>
                    <Card.Body className="p-3">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="d-flex justify-content-between align-items-center mb-2 p-2" style={{ backgroundColor: 'var(--ada-off-white)', borderRadius: '4px' }}>
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{item.product_name || item.name || item.menu_item_name || item.title || `Item ${index + 1}`}</div>
                            <small className="text-muted">₵{parseFloat(item.unit_price || item.price || 0).toFixed(2)} × {item.quantity}</small>
                          </div>
                          <div className="fw-bold text-success">₵{parseFloat(item.total_price || (item.quantity * (item.unit_price || item.price || 0))).toFixed(2)}</div>
                        </div>
                      ))}
                      <hr className="my-2" />
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">Items Subtotal:</span>
                        <span className="fw-bold text-success fs-6">₵{selectedOrder.items ? selectedOrder.items.reduce((sum, item) => sum + parseFloat(item.total_price || (item.quantity * (item.unit_price || item.price || 0))), 0).toFixed(2) : '0.00'}</span>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              )}

              {/* Customer & Delivery and Payment Information - Side by Side in Cards */}
              <Row className="mb-3">
                <Col md={6}>
                  <Card className="h-100 mb-3 mb-md-0">
                    <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
                      <h6 className="mb-0 text-white d-flex align-items-center">
                        <i className="bi bi-person-circle me-2"></i>
                        Customer & Delivery
                      </h6>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Customer Phone:</span>
                        <span>{selectedOrder.customer_phone || 'N/A'}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Type:</span>
                        <span className="badge" style={{
                            backgroundColor: selectedOrder.delivery_type === 'Delivery' ? '#ffc107' : '#198754',
                            color: selectedOrder.delivery_type === 'Delivery' ? '#000' : '#fff'
                          }}>
                          <i className={`bi ${selectedOrder.delivery_type === 'Delivery' ? 'bi-truck' : 'bi-shop'} me-1`}></i>
                          {selectedOrder.delivery_type || 'Pickup'}
                        </span>
                      </div>
                      {selectedOrder.delivery_type === 'Delivery' && (selectedOrder.delivery_location || selectedOrder.custom_delivery_location) && (
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Location:</span>
                          <span className="text-muted small">{selectedOrder.effective_delivery_location_name || selectedOrder.delivery_location || selectedOrder.custom_delivery_location}</span>
                        </div>
                      )}
                      {selectedOrder.delivery_type === 'Delivery' && selectedOrder.delivery_fee && (
                        <div className="d-flex justify-content-between align-items-center">
                          <span>Delivery Fee:</span>
                          <span className="fw-bold text-info">₵{parseFloat(selectedOrder.delivery_fee || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100 mb-3 mb-md-0">
                    <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
                      <h6 className="mb-0 text-white d-flex align-items-center">
                        <i className="bi bi-credit-card me-2"></i>
                        Payment Information
                      </h6>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Method:</span>
                        <span>{selectedOrder.payment_mode ? getPaymentModeDisplay(selectedOrder.payment_mode) : 'None'}</span>
                      </div>
                      {selectedOrder.amount_paid && (
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Amount Paid:</span>
                          <span className="text-success fw-bold">₵{selectedOrder.amount_paid}</span>
                        </div>
                      )}
                      {selectedOrder.balance_due > 0 && (
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Balance Due:</span>
                          <span className="text-danger fw-bold">₵{selectedOrder.balance_due}</span>
                        </div>
                      )}
                      {selectedOrder.amount_overpaid > 0 && (
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Change Due:</span>
                          <span className="text-info fw-bold">₵{selectedOrder.amount_overpaid}</span>
                        </div>
                      )}
                      {/* Payment History Button */}
                      {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                        <div className="mt-3">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              // Close order details modal first to prevent stacking
                              setShowOrderDetailsModal(false);
                              // Then open payment history modal with a small delay
                              setTimeout(() => setShowPaymentHistoryModal(true), 200);
                            }}
                            className="d-flex align-items-center ada-shadow-sm w-100"
                          >
                            <i className="bi bi-clock-history me-2"></i>
                            View Payment History ({selectedOrder.payments.length})
                          </Button>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Simplified User Tracking Information */}
              <div className="mb-2">
                <div className="bg-light p-2 rounded">
                  <small className="text-muted d-block mb-1">
                    <i className="bi bi-clock-history me-1"></i>
                    Activity Log
                  </small>
                  <SimpleUserTracking 
                    orderId={selectedOrder.id}
                    orderNumber={selectedOrder.order_number}
                    className=""
                    showTitle={false}
                    size="minimal"
                  />
                </div>
              </div>

              {/* Order Notes Section */}
              {selectedOrder.notes && (
                <div className="mb-3">
                  <Card className="h-100">
                    <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
                      <h6 className="mb-0 text-white d-flex align-items-center">
                        <i className="bi bi-sticky me-2"></i>
                        Order Notes
                      </h6>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <p className="mb-0">{selectedOrder.notes}</p>
                    </Card.Body>
                  </Card>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className={isMobile ? "p-2" : "p-3"}>
          <div className={`d-flex flex-column flex-sm-row w-100 ${isMobile ? 'gap-2' : 'gap-3'}`}>
            <Button 
              variant="danger" 
              onClick={closeOrderDetailsModal}
              className="order-4 order-sm-1 flex-fill"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '44px' }}
            >
              <i className="bi bi-x-circle me-1"></i>
              Close
            </Button>
            
            {selectedOrder && (
              <>
            <Button 
              variant="info" 
              onClick={() => navigate(`/edit-order/${selectedOrder.order_number || selectedOrder.id}`)}
              className="flex-fill order-1 order-sm-2"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '44px' }}
            >
              <i className="bi bi-pencil me-1"></i>
              {isMobile ? 'Edit' : 'Edit Order'}
            </Button>
            <Button 
              variant="warning" 
              onClick={() => openStatusModal(selectedOrder)}
              className="flex-fill order-2 order-sm-3"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '44px' }}
            >
              <i className="bi bi-pencil-square me-1"></i>
              {isMobile ? 'Status' : 'Update Status'}
            </Button>
            <Button 
              variant="success" 
              onClick={() => openPaymentModal(selectedOrder)}
              className="flex-fill order-3 order-sm-4"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '44px' }}
            >
              <i className="bi bi-credit-card me-1"></i>
              {isMobile ? 'Payment' : 'Update Payment'}
            </Button>
              </>
            )}
          </div>
        </Modal.Footer>
      </Modal>
      
      {/* Stats Modal for Mobile */}
      <Modal 
        show={showStatsModal} 
        onHide={() => setShowStatsModal(false)} 
        centered
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-bar-chart-line me-2"></i>
            Order Statistics
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col xs={6}>
              <Card className="text-center h-100">
                <Card.Body>
                  <i className="bi bi-list-ul text-primary" style={{ fontSize: '2rem' }}></i>
                  <h4 className="mt-2">{orderStats.total}</h4>
                  <p className="mb-0 text-muted">Total Orders</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6}>
              <Card className="text-center h-100">
                <Card.Body>
                  <i className="bi bi-clock text-warning" style={{ fontSize: '2rem' }}></i>
                  <h4 className="mt-2">{orderStats.pending}</h4>
                  <p className="mb-0 text-muted">Pending & Accepted</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6}>
              <Card className="text-center h-100">
                <Card.Body>
                  <i className="bi bi-truck text-info" style={{ fontSize: '2rem' }}></i>
                  <h4 className="mt-2">{orderStats.outForDelivery}</h4>
                  <p className="mb-0 text-muted">Out for Delivery</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6}>
              <Card className="text-center h-100">
                <Card.Body>
                  <i className="bi bi-check-circle text-success" style={{ fontSize: '2rem' }}></i>
                  <h4 className="mt-2">{orderStats.fulfilled}</h4>
                  <p className="mb-0 text-muted">Fulfilled</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <div className="mt-4 text-center text-muted">
            <small>
              <i className="bi bi-info-circle me-1"></i>
              Statistics for {new Date(selectedDate).toLocaleDateString()}
            </small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="d-grid w-100">
            <Button variant="secondary" onClick={() => setShowStatsModal(false)}>
              <i className="bi bi-x-circle me-2"></i>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      
      {/* Order Cancellation Confirmation Modal */}
      <Modal 
        show={showCancellationModal} 
        onHide={() => {
          setShowCancellationModal(false);
          setCancellationReason('');
        }} 
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
            Confirm Order Cancellation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <div className="alert alert-warning mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Warning:</strong> You are about to cancel this order. This action cannot be undone.
              </div>
              
              <div className="mb-3">
                <h6>Order Details:</h6>
                <p className="mb-1"><strong>Order #:</strong> {selectedOrder.order_number || selectedOrder.id}</p>
                <p className="mb-1"><strong>Customer Phone:</strong> {selectedOrder.customer_phone || 'N/A'}</p>
                <p className="mb-1"><strong>Total:</strong> ₵{parseFloat(selectedOrder.total_price || 0).toFixed(2)}</p>
                <p className="mb-3">
                  <strong>Payment Status:</strong> 
                  <span 
                    className={`badge ${getPaymentStatusBadgeVariant(selectedOrder.payment_status)} ms-2`}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    {selectedOrder.payment_status || 'Not Paid'}
                  </span>
                </p>
              </div>
              
              {/* Payment warning if there are payments */}
              {selectedOrder.amount_paid && parseFloat(selectedOrder.amount_paid) > 0 && (
                <div className="alert alert-info mb-3">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Payment Notice:</strong> This order has received payment of ₵{selectedOrder.amount_paid}. 
                  You may need to process a refund after cancellation.
                </div>
              )}
              
              <Form.Group controlId="cancellationReason">
                <Form.Label className="fw-semibold">Reason for Cancellation <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please provide a reason for cancelling this order..."
                  className="ada-shadow-sm"
                  required
                />
                <Form.Text className="text-muted">
                  This reason will be recorded for reference.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ gap: '0.75rem' }}>
          <div className="d-flex flex-column flex-sm-row w-100">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowCancellationModal(false);
                setCancellationReason('');
              }}
              disabled={isCancellingOrder}
              className="mb-2 mb-sm-0 me-sm-2 flex-fill"
            >
              <i className="bi bi-x-circle me-2"></i>
              Keep Order
            </Button>
            <Button 
              variant="danger" 
              onClick={async () => {
                if (!cancellationReason.trim()) {
                  optimizedToast.error('Please provide a reason for cancellation');
                  return;
                }
                
                // Prevent multiple cancellation attempts
                if (isCancellingOrder) {
                  optimizedToast.warning('Order cancellation is in progress, please wait...');
                  return;
                }
                
                setIsCancellingOrder(true);
                
                try {
                  // Close the cancellation modal first
                  setShowCancellationModal(false);
                  
                  // Proceed with the actual cancellation
                  await performStatusUpdate();
                  
                  // Reset the reason
                  setCancellationReason('');
                } finally {
                  setIsCancellingOrder(false);
                }
              }}
              disabled={!cancellationReason.trim() || isCancellingOrder}
              className="flex-fill"
            >
              {isCancellingOrder ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Cancelling...</span>
                  </div>
                  Cancelling Order...
                </>
              ) : (
                <>
                  <i className="bi bi-trash me-2"></i>
                  Cancel Order
                </>
              )}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      </Container>
  );
});

// Set display name for debugging
ViewOrdersPage.displayName = 'ViewOrdersPage';

// Export optimized component
export default ViewOrdersPage;
