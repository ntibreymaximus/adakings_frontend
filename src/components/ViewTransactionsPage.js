import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Alert, Spinner, Button, Badge, Row, Col, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import optimizedToast, { contextToast } from '../utils/toastUtils';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../utils/api';
import { 
  formatTransactionId, 
  getShortTransactionId
} from '../utils/transactionUtils';
import { PAYMENT_METHODS } from '../utils/paymentUtils';
import PaymentLogs from './PaymentLogs';
const ViewTransactionsPage = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [allTransactions, setAllTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [selectedDate, setSelectedDate] = useState(() => {
        return new Date().toISOString().split('T')[0]; // Default to today
    });
    const [showTransactionStatsModal, setShowTransactionStatsModal] = useState(false);

    // Format currency
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '₵0.00';
        return `₵${parseFloat(amount).toFixed(2)}`;
    };

    // Format phone number
    const formatPhoneNumber = (phone) => {
        if (!phone) return 'N/A';
        // Format Ghana phone numbers nicely
        if (phone.startsWith('233') && phone.length === 12) {
            return `+${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
        } else if (phone.startsWith('0') && phone.length === 10) {
            return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
        }
        return phone;
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status badge variant
    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'success':
            case 'completed':
                return <Badge bg="success">{status}</Badge>;
            case 'failed':
                return <Badge bg="danger">{status}</Badge>;
            case 'pending':
                return <Badge bg="warning">{status}</Badge>;
            case 'processing':
                return <Badge bg="info">{status}</Badge>;
            default:
                return <Badge bg="secondary">{status || 'Unknown'}</Badge>;
        }
    };

    // Add state for API summary data
    const [apiSummary, setApiSummary] = useState({
        total_transactions: 0,
        total_amount: 0,
        successful_transactions: 0,
        failed_transactions: 0,
        payment_amount: 0,
        refund_amount: 0,
        net_amount: 0
    });

    // Add state for order stats data (for proper refund calculation)
    const [orderStats, setOrderStats] = useState({
        total_orders: 0,
        total_revenue: 0,
        total_refunds_due: 0,
        payment_status_breakdown: {},
        status_breakdown: {},
        delivery_type_breakdown: {}
    });

    // Fetch order stats with refund details
    const fetchOrderStats = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/orders/stats/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch order stats');
            }

            const data = await response.json();

            // Store order stats data
            setOrderStats(data);

        } catch (err) {
            console.error('Error fetching order stats:', err);
        }
    };

    // Function to fetch transactions (can be reused for refresh)
    const fetchTransactions = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            logout();
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/payments/transaction-table/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                }
                throw new Error('Failed to fetch transactions');
            }

            const data = await response.json();
            // Handle different API response formats
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
                transactionsArray = [];
            }
            
            // Store API summary data
            if (data.summary) {
                setApiSummary({
                    total_transactions: data.summary.total_transactions || 0,
                    total_amount: data.summary.total_amount || 0,
                    successful_transactions: data.summary.successful_transactions || 0,
                    failed_transactions: data.summary.failed_transactions || 0,
                    payment_amount: data.summary.payment_amount || 0,
                    refund_amount: data.summary.refund_amount || 0,
                    net_amount: data.summary.net_amount || 0
                });
            }
            
            setAllTransactions(transactionsArray);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        fetchTransactions();
        fetchOrderStats();
        
        return () => window.removeEventListener('resize', handleResize);
    }, [logout]);

    // Filter transactions by selected date
    useEffect(() => {
        if (allTransactions.length > 0) {
            const filtered = allTransactions.filter(transaction => {
                const transactionDate = new Date(transaction.created_at || transaction.date).toISOString().split('T')[0];
                return transactionDate === selectedDate;
            });
            setFilteredTransactions(filtered);
        } else {
            setFilteredTransactions([]);
        }
    }, [allTransactions, selectedDate]);


    // Calculate stats for filtered transactions
    const calculateFilteredStats = () => {
        if (filteredTransactions.length === 0) {
            return {
                total_transactions: 0,
                total_amount: 0,
                successful_transactions: 0,
                failed_transactions: 0,
                payment_method_totals: [],
                refund_total: orderStats.total_refunds_due || 0
            };
        }

        const stats = {
            total_transactions: filteredTransactions.length,
            total_amount: 0,
            successful_transactions: 0,
            failed_transactions: 0,
            payment_method_totals: [],
            refund_total: orderStats.total_refunds_due || 0
        };

        // Initialize payment method totals - only track methods that have transactions
        const paymentMethodTotals = {};

        filteredTransactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount) || 0;
            const status = transaction.status?.toLowerCase();
            const orderTotal = parseFloat(transaction.order_total) || 0;
            
            // Check if this is an explicit refund transaction
            const isExplicitRefund = transaction.payment_type === 'Refund' || 
                                   transaction.payment_type === 'refund' || 
                                   (transaction.payment_type && transaction.payment_type.toLowerCase() === 'refund') ||
                                   amount < 0;
            
            // Calculate refund based on payment status and order conditions
            if (isExplicitRefund) {
                // Explicit refund transactions - add to refund total
                stats.refund_total += Math.abs(amount);
            } else if (status === 'overpaid' && orderTotal > 0) {
                // Overpaid orders - calculate refund as difference between amount paid and order total
                const overpaidAmount = amount - orderTotal;
                if (overpaidAmount > 0) {
                    stats.refund_total += overpaidAmount;
                }
                // Add full amount to total (including overpaid portion)
                stats.total_amount += amount;
                
                // Track payment method totals
                const paymentMethod = transaction.payment_method || 'Unknown';
                if (!paymentMethodTotals[paymentMethod]) {
                    paymentMethodTotals[paymentMethod] = 0;
                }
                paymentMethodTotals[paymentMethod] += amount;
            } else if (status === 'fulfilled' && orderTotal > 0) {
                // Fulfilled orders - check if this was previously overpaid and subtract refund
                // This logic assumes that if an order was fulfilled after being overpaid,
                // the refund should be deducted (simulating refund being processed)
                const previouslyOverpaid = amount > orderTotal;
                if (previouslyOverpaid) {
                    const refundAmount = amount - orderTotal;
                    stats.refund_total = Math.max(0, stats.refund_total - refundAmount);
                }
                
                // Add to total amount
                stats.total_amount += amount;
                
                // Track payment method totals
                const paymentMethod = transaction.payment_method || 'Unknown';
                if (!paymentMethodTotals[paymentMethod]) {
                    paymentMethodTotals[paymentMethod] = 0;
                }
                paymentMethodTotals[paymentMethod] += amount;
            } else {
                // Regular transactions - add to total amount
                stats.total_amount += amount;

                // Track payment method totals
                const paymentMethod = transaction.payment_method || 'Unknown';
                if (!paymentMethodTotals[paymentMethod]) {
                    paymentMethodTotals[paymentMethod] = 0;
                }
                paymentMethodTotals[paymentMethod] += amount;
            }

            // Count successful transactions
            if (status === 'success' || status === 'completed' || status === 'paid' || status === 'fulfilled') {
                stats.successful_transactions++;
            } else if (status === 'failed' || status === 'error') {
                stats.failed_transactions++;
            }
        });

        // Convert payment method totals to array and sort by amount (descending)
        // Only include methods that have transactions (total > 0)
        stats.payment_method_totals = Object.entries(paymentMethodTotals)
            .filter(([method, total]) => total > 0)
            .map(([method, total]) => ({ method, total }))
            .sort((a, b) => b.total - a.total);

        return stats;
    };

    const filteredStats = calculateFilteredStats();

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const isToday = selectedDate === getTodayDate();

    const openTransactionModal = (transaction) => {
        setSelectedTransaction(transaction);
        setShowTransactionModal(true);
    };

    const closeTransactionModal = () => {
        setShowTransactionModal(false);
        setSelectedTransaction(null);
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
                    <p className="mt-2">Loading transactions...</p>
                </div>
            </Container>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

  return (
      <Container className="mt-4">
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
            onClick={() => setShowTransactionStatsModal(true)}
            className="d-flex align-items-center ada-shadow-sm ms-auto"
            style={{ minHeight: '44px', color: 'white', fontWeight: '500' }}
            >
              <i className="bi bi-bar-chart-line me-2"></i>
              <span>View Stats</span>
            </Button>
          )}
        </div>
      
      {/* Summary Cards - Hidden on mobile */}
      {!isMobile && allTransactions.length > 0 && (
        <>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title>{filteredStats.total_transactions}</Card.Title>
                  <Card.Text>Total Transactions</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-success">{formatCurrency(filteredStats.total_amount)}</Card.Title>
                  <Card.Text>Total Amount</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-success">{filteredStats.successful_transactions}</Card.Title>
                  <Card.Text>Successful</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-danger">{filteredStats.failed_transactions}</Card.Title>
                  <Card.Text>Failed</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Payment Method Total Cards */}
          <Row className="mb-4">
            {filteredStats.payment_method_totals.map((methodTotal, index) => (
              <Col md={3} key={methodTotal.method}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title className="text-primary">{formatCurrency(methodTotal.total)}</Card.Title>
                    <Card.Text>{methodTotal.method}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
            {/* Refund Total Card - Always show */}
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-warning">{formatCurrency(orderStats.total_refunds_due)}</Card.Title>
                  <Card.Text>Refunds</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Card className="border-0">
        <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div className="d-flex align-items-center">
              <h5 className="mb-0 me-2">
                <i className="bi bi-credit-card me-2"></i>
                Transactions List ({filteredTransactions.length})
              </h5>
            </div>
            <div className="d-flex align-items-center mt-2 mt-sm-0">
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
            </div>
          </div>
        </Card.Header>
        <Card.Body className={isMobile ? 'px-2 px-sm-3' : 'px-3'}>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <h5 className="mt-3 text-muted">No Transactions Found</h5>
              <p className="text-muted">
                No transactions found for {isToday ? 'today' : new Date(selectedDate).toLocaleDateString()}.
              </p>
              {allTransactions.length > 0 && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => {
                    // Show transactions from the first available date
                    const firstTransactionDate = new Date(allTransactions[0].created_at || allTransactions[0].date).toISOString().split('T')[0];
                    setSelectedDate(firstTransactionDate);
                  }}
                  className="mt-2"
                >
                  Show Available Transactions ({allTransactions.length})
                </Button>
              )}
            </div>
          ) : !isMobile ? (
            <div className="table-responsive">
              <Table striped hover className="mb-0">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Order #</th>
                    <th>Phone</th>
                    <th>Payment Method</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Verified</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction, index) => {
                    // Enhanced transaction ID detection - check all possible fields
                    const possibleTxnIds = [
                      transaction.custom_transaction_id,
                      transaction.transaction_id,
                      transaction.txn_id,
                      transaction.id
                    ].filter(Boolean);
                    
                    const possibleRefs = [
                      transaction.transaction_reference,
                      transaction.reference,
                      transaction.client_reference,
                      transaction.payment_reference
                    ].filter(Boolean);
                    
                    // Find the best transaction ID (prefer TXN- format)
                    let primaryId = null;
                    let secondaryRef = null;
                    
                    // First, look for TXN- format in transaction IDs
                    const customTxnId = possibleTxnIds.find(id => id && id.startsWith('TXN-'));
                    if (customTxnId) {
                      primaryId = customTxnId;
                      // Use the best reference as secondary
                      secondaryRef = possibleRefs.find(ref => ref && !ref.startsWith('TXN-')) || possibleRefs[0];
                    } else {
                      // Look for TXN- format in references
                      const customRefId = possibleRefs.find(ref => ref && ref.startsWith('TXN-'));
                      if (customRefId) {
                        primaryId = customRefId;
                        secondaryRef = possibleTxnIds[0]; // Use first available transaction ID as secondary
                      } else {
                        // Fallback: use any available ID
                        primaryId = possibleTxnIds[0] || possibleRefs[0];
                        secondaryRef = null;
                      }
                    }
                    
                    const isCustomFormat = primaryId && primaryId.startsWith('TXN-');
                    
                    // Generate a fallback custom transaction ID if none exists
                    if (!primaryId || !primaryId.startsWith('TXN-')) {
                      // Create a display-only custom transaction ID based on available data
                      const timestamp = transaction.created_at || transaction.date || new Date().toISOString();
                      const date = new Date(timestamp);
                      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                      const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
                      const suffix = String(transaction.id || index).padStart(3, '0').slice(-3);
                      const fallbackTxnId = `TXN-${dateStr}-${timeStr}-${suffix}`;
                      
                      // Use fallback as primary if we don't have a custom ID
                      if (!primaryId || !primaryId.startsWith('TXN-')) {
                        secondaryRef = primaryId; // Move original ID to secondary
                        primaryId = fallbackTxnId;
                      }
                    }
                    
                    return (
                      <tr key={primaryId || transaction.id || index}>
                        <td>
                          {primaryId ? (
                            <div>
                              <code className="d-block" style={{ fontSize: '0.8rem' }}>
                                {isCustomFormat ? formatTransactionId(primaryId) : primaryId}
                              </code>
                              {secondaryRef && secondaryRef !== primaryId && (
                                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                  Ref: {getShortTransactionId(secondaryRef)}
                                </small>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td>
                          <strong>{transaction.order_number || 'N/A'}</strong>
                        </td>
                        <td>{formatPhoneNumber(transaction.customer_phone)}</td>
                        <td>
                          <Badge bg="primary">
                            {transaction.payment_method || 'N/A'}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={transaction.payment_type === 'Refund' ? 'warning' : 'info'}>
                            {transaction.payment_type || 'Payment'}
                          </Badge>
                        </td>
                        <td>
                          <strong className={transaction.payment_type === 'Refund' ? 'text-warning' : 'text-success'}>
                            {formatCurrency(transaction.amount)}
                          </strong>
                        </td>
                        <td>{getStatusBadge(transaction.status)}</td>
                        <td>
                          {transaction.is_verified ? (
                            <Badge bg="success"><i className="bi bi-check-circle"></i> Verified</Badge>
                          ) : (
                            <Badge bg="secondary"><i className="bi bi-clock"></i> Unverified</Badge>
                          )}
                        </td>
                        <td>{formatDate(transaction.date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            // Mobile card view
            <Row className="g-2 px-1">
              {filteredTransactions.map((transaction, index) => {
                // Enhanced transaction ID detection for mobile
                const possibleTxnIds = [
                  transaction.custom_transaction_id,
                  transaction.transaction_id,
                  transaction.txn_id,
                  transaction.id
                ].filter(Boolean);
                
                let primaryId = possibleTxnIds.find(id => id && id.startsWith('TXN-')) || possibleTxnIds[0];
                
                if (!primaryId || !primaryId.startsWith('TXN-')) {
                  const timestamp = transaction.created_at || transaction.date || new Date().toISOString();
                  const date = new Date(timestamp);
                  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
                  const suffix = String(transaction.id || index).padStart(3, '0').slice(-3);
                  primaryId = `TXN-${dateStr}-${timeStr}-${suffix}`;
                }
                
                return (
                  <Col xs={12} key={primaryId || transaction.id || index}>
                    <Card 
                      className="mobile-friendly-card border-0" 
                      onClick={() => openTransactionModal(transaction)}
                      style={{ 
                        cursor: 'pointer',
                        margin: '0 2px 8px',
                        borderRadius: '8px',
                        background: '#f9f9fb'
                      }}
                    >
                      <Card.Body className="p-2">
                        <div className="d-flex align-items-center">
                          {/* Left: Transaction ID and badges */}
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-1">
                              <span className="ada-text-primary fw-medium me-2" style={{ fontSize: '0.9rem' }}>
                                #{getShortTransactionId(primaryId)}
                              </span>
                              <span 
                                className="badge rounded-pill"
                                style={{ 
                                  fontSize: '0.7rem', 
                                  padding: '0.15rem 0.5rem',
                                  background: transaction.payment_type === 'Refund' ? '#fff3cd' : '#d1ecf1',
                                  color: transaction.payment_type === 'Refund' ? '#856404' : '#0c5460',
                                  border: 'none'
                                }}
                              >
                                {transaction.payment_type || 'Payment'}
                              </span>
                            </div>
                            
                            <div className="d-flex align-items-center">
                              <span 
                                className="badge me-2"
                                style={{ 
                                  fontSize: '0.7rem', 
                                  padding: '0.15rem 0.4rem',
                                  background: transaction.status === 'success' || transaction.status === 'completed' ? '#d4edda' : 
                                            transaction.status === 'failed' ? '#f8d7da' : 
                                            transaction.status === 'pending' ? '#fff3cd' : '#e2e3e5',
                                  color: transaction.status === 'success' || transaction.status === 'completed' ? '#155724' : 
                                        transaction.status === 'failed' ? '#721c24' : 
                                        transaction.status === 'pending' ? '#856404' : '#6c757d',
                                  border: 'none'
                                }}
                              >
                                {transaction.status || 'Unknown'}
                              </span>
                              {transaction.is_verified && (
                                <span 
                                  className="badge"
                                  style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '0.15rem 0.4rem',
                                    background: '#d4edda',
                                    color: '#155724',
                                    border: 'none'
                                  }}
                                >
                                  <i className="bi bi-check-circle me-1"></i>Verified
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Right: Amount and icon */}
                          <div className="d-flex flex-column align-items-end">
                            <span className={`fw-medium ${transaction.payment_type === 'Refund' ? 'text-warning' : 'text-success'}`} style={{ fontSize: '0.95rem' }}>
                              {formatCurrency(transaction.amount)}
                            </span>
                            <button 
                              className="btn btn-sm p-0 mt-1" 
                              style={{ color: '#4285F4', background: 'transparent' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openTransactionModal(transaction);
                              }}
                            >
                              <i className="bi bi-chevron-right"></i>
                            </button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* Transaction Details Modal */}
      <Modal 
        show={showTransactionModal} 
        onHide={closeTransactionModal} 
        centered 
        size="lg"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-receipt me-2"></i>
            Transaction Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedTransaction && (
            <>
              {/* Transaction Overview */}
              <div className="mb-4">
                <Card className="h-100">
                  <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
                    <h6 className="mb-0 text-white d-flex align-items-center">
                      <i className="bi bi-info-circle me-2"></i>
                      Transaction Overview
                    </h6>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <Row>
                      <Col md={6}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Transaction ID:</span>
                          <code style={{ fontSize: '0.9rem' }}>
                            {(() => {
                              const possibleIds = [
                                selectedTransaction.custom_transaction_id,
                                selectedTransaction.transaction_id,
                                selectedTransaction.txn_id,
                                selectedTransaction.id
                              ].filter(Boolean);
                              
                              let primaryId = possibleIds.find(id => id && id.startsWith('TXN-')) || possibleIds[0];
                              
                              if (!primaryId || !primaryId.startsWith('TXN-')) {
                                const timestamp = selectedTransaction.created_at || selectedTransaction.date || new Date().toISOString();
                                const date = new Date(timestamp);
                                const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                                const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
                                const suffix = String(selectedTransaction.id).padStart(3, '0').slice(-3);
                                primaryId = `TXN-${dateStr}-${timeStr}-${suffix}`;
                              }
                              
                              return primaryId.startsWith('TXN-') ? formatTransactionId(primaryId) : primaryId;
                            })()} 
                          </code>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Order Number:</span>
                          <strong>{selectedTransaction.order_number || 'N/A'}</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Amount:</span>
                          <strong className={selectedTransaction.payment_type === 'Refund' ? 'text-warning' : 'text-success'}>
                            {formatCurrency(selectedTransaction.amount)}
                          </strong>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Payment Method:</span>
                          <Badge bg="primary">{selectedTransaction.payment_method || 'N/A'}</Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Type:</span>
                          <Badge bg={selectedTransaction.payment_type === 'Refund' ? 'warning' : 'info'}>
                            {selectedTransaction.payment_type || 'Payment'}
                          </Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Status:</span>
                          {getStatusBadge(selectedTransaction.status)}
                        </div>
                      </Col>
                    </Row>
                    
                    <hr className="my-3" />
                    
                    <Row>
                      <Col md={6}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Customer Phone:</span>
                          <span>{formatPhoneNumber(selectedTransaction.customer_phone)}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Verified:</span>
                          {selectedTransaction.is_verified ? (
                            <Badge bg="success"><i className="bi bi-check-circle"></i> Verified</Badge>
                          ) : (
                            <Badge bg="secondary"><i className="bi bi-clock"></i> Unverified</Badge>
                          )}
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Date:</span>
                          <span className="text-muted">{formatDate(selectedTransaction.date)}</span>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </div>
              
              {/* Payment Logs */}
              <div className="mb-4">
                <PaymentLogs 
                  transactionId={(() => {
                    const possibleIds = [
                      selectedTransaction.custom_transaction_id,
                      selectedTransaction.transaction_id,
                      selectedTransaction.txn_id,
                      selectedTransaction.id
                    ].filter(Boolean);
                    
                    let primaryId = possibleIds.find(id => id && id.startsWith('TXN-')) || possibleIds[0];
                    
                    if (!primaryId || !primaryId.startsWith('TXN-')) {
                      const timestamp = selectedTransaction.created_at || selectedTransaction.date || new Date().toISOString();
                      const date = new Date(timestamp);
                      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                      const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
                      const suffix = String(selectedTransaction.id).padStart(3, '0').slice(-3);
                      primaryId = `TXN-${dateStr}-${timeStr}-${suffix}`;
                    }
                    
                    return primaryId;
                  })()}
                  orderNumber={selectedTransaction.order_number}
                  transactionData={selectedTransaction}
                  showTitle={true}
                  maxHeight="250px"
                />
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="p-3">
          <div className="d-grid w-100">
            <Button variant="danger" onClick={closeTransactionModal}>
              <i className="bi bi-x-circle me-2"></i>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      
      {/* Stats Modal for Mobile */}
      <Modal 
        show={showTransactionStatsModal} 
        onHide={() => setShowTransactionStatsModal(false)} 
        centered
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-bar-chart-line me-2"></i>
            Transaction Statistics
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Row className="g-3">
            <Col xs={6}>
              <Card className="text-center h-100">
                <Card.Body>
                  <i className="bi bi-credit-card text-primary" style={{ fontSize: '2rem' }}></i>
                  <h4 className="mt-2">{filteredStats.total_transactions}</h4>
                  <p className="mb-0 text-muted">Total Transactions</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6}>
              <Card className="text-center h-100">
                <Card.Body>
                  <i className="bi bi-cash-stack text-success" style={{ fontSize: '2rem' }}></i>
                  <h4 className="mt-2 text-success">{formatCurrency(filteredStats.total_amount)}</h4>
                  <p className="mb-0 text-muted">Total Amount</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6}>
              <Card className="text-center h-100">
                <Card.Body>
                  <i className="bi bi-check-circle text-success" style={{ fontSize: '2rem' }}></i>
                  <h4 className="mt-2">{filteredStats.successful_transactions}</h4>
                  <p className="mb-0 text-muted">Successful</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6}>
              <Card className="text-center h-100">
                <Card.Body>
                  <i className="bi bi-x-circle text-danger" style={{ fontSize: '2rem' }}></i>
                  <h4 className="mt-2">{filteredStats.failed_transactions}</h4>
                  <p className="mb-0 text-muted">Failed</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Payment Method Totals */}
          <Row className="g-3 mt-2">
            {filteredStats.payment_method_totals.map((methodTotal, index) => (
              <Col xs={6} key={methodTotal.method}>
                <Card className="text-center h-100">
                  <Card.Body>
                    <i className="bi bi-credit-card-2-back text-primary" style={{ fontSize: '2rem' }}></i>
                    <h4 className="mt-2 text-primary">{formatCurrency(methodTotal.total)}</h4>
                    <p className="mb-0 text-muted">{methodTotal.method}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          
          {/* Additional Stats Row */}
          <Row className="g-3 mt-2">
            {filteredStats.refund_total > 0 && (
              <Col xs={6}>
                <Card className="text-center h-100">
                  <Card.Body>
                    <i className="bi bi-arrow-return-left text-warning" style={{ fontSize: '2rem' }}></i>
                    <h4 className="mt-2 text-warning">{formatCurrency(filteredStats.refund_total)}</h4>
                    <p className="mb-0 text-muted">Refunds</p>
                  </Card.Body>
                </Card>
              </Col>
            )}
            <Col xs={6}>
              <Card className="text-center h-100">
                <Card.Body>
                  <i className="bi bi-wallet2 text-info" style={{ fontSize: '2rem' }}></i>
                  <h4 className="mt-2 text-info">{formatCurrency(apiSummary.net_amount)}</h4>
                  <p className="mb-0 text-muted">Net Amount</p>
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
            <Button variant="secondary" onClick={() => setShowTransactionStatsModal(false)}>
              <i className="bi bi-x-circle me-2"></i>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      </Container>
  );
};

export default ViewTransactionsPage;

