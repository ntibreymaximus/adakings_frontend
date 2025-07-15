import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spinner, Badge } from 'react-bootstrap';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Payment Logs Component
 * Shows detailed logs for a specific payment transaction
 */
const PaymentLogs = ({ 
  transactionId,
  orderNumber,
  transactionData = null,
  className = "",
  showTitle = true,
  maxHeight = "300px"
}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userData } = useAuth();

  const fetchPaymentLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Try to fetch payment logs - adjust endpoint as needed
      const searchParam = transactionId || orderNumber;
      const response = await fetch(`${API_BASE_URL}/payments/${searchParam}/logs/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // If no logs endpoint exists, create data based on transaction info
          console.log('Transaction Data:', transactionData); // Debug log
          
          // Try multiple possible username fields
          let processedBy = transactionData?.processed_by_username || 
                          transactionData?.processed_by || 
                          transactionData?.user_name || 
                          transactionData?.user?.username || 
                          transactionData?.user?.name || 
                          transactionData?.created_by || 
                          transactionData?.cashier || 
                          transactionData?.cashier_name || 
                          transactionData?.operator || 
                          transactionData?.staff_name;
          
          // If still no username and we have an order number, try to fetch order details
          if ((!processedBy || processedBy === 'System') && orderNumber) {
            try {
              const orderResponse = await fetch(`${API_BASE_URL}/orders/${orderNumber}/`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (orderResponse.ok) {
                const orderData = await orderResponse.json();
                console.log('Order data for user info:', orderData);
                processedBy = orderData?.created_by_username || 
                             orderData?.created_by || 
                             orderData?.user?.username || 
                             orderData?.cashier || 
                             processedBy;
              }
            } catch (error) {
              console.error('Error fetching order for user info:', error);
            }
          }
          
          // If no username found and transaction is recent (within last hour), use current user
          if (!processedBy || processedBy === 'System') {
            const transactionTime = new Date(transactionData?.created_at || transactionData?.date);
            const currentTime = new Date();
            const hoursDiff = (currentTime - transactionTime) / (1000 * 60 * 60);
            
            if (hoursDiff < 1 && userData?.username) {
              processedBy = userData.username;
              console.log('Using current user for recent transaction:', processedBy);
            } else {
              processedBy = processedBy || 'System';
            }
          }
          
          const processedAt = transactionData?.created_at || transactionData?.date || new Date().toISOString();
          const paymentStatus = transactionData?.status || 'completed';
          const paymentAmount = transactionData?.amount || 0;
          const paymentMethod = transactionData?.payment_method || 'N/A';
          
          const logs = [];
          
          // Initial transaction log
          logs.push({
            timestamp: processedAt,
            action: 'Transaction Initiated',
            details: `Payment of ₵${parseFloat(paymentAmount).toFixed(2)} via ${paymentMethod} for order ${orderNumber || 'N/A'}`,
            status: 'info',
            user: processedBy
          });
          
          // Status update log
          if (paymentStatus) {
            logs.push({
              timestamp: processedAt,
              action: 'Status Updated',
              details: `Transaction status: ${paymentStatus}`,
              status: paymentStatus === 'success' || paymentStatus === 'completed' ? 'success' : 
                      paymentStatus === 'failed' ? 'error' : 'pending',
              user: processedBy
            });
          }
          
          // Verification log if verified
          if (transactionData?.is_verified) {
            logs.push({
              timestamp: processedAt,
              action: 'Transaction Verified',
              details: 'Payment verification completed successfully',
              status: 'success',
              user: processedBy
            });
          }
          
          setLogs(logs);
          return;
        } else {
          setError('Failed to load payment logs');
        }
        return;
      }

      const data = await response.json();
      setLogs(Array.isArray(data) ? data : data.logs || []);
    } catch (err) {
      console.error('Error fetching payment logs:', err);
      // Fallback to basic log info from transaction data
      console.log('Transaction Data (catch):', transactionData); // Debug log
      
      let processedBy = transactionData?.processed_by_username || 
                      transactionData?.processed_by || 
                      transactionData?.user_name || 
                      transactionData?.user?.username || 
                      transactionData?.user?.name || 
                      transactionData?.created_by || 
                      transactionData?.cashier || 
                      transactionData?.cashier_name || 
                      transactionData?.operator || 
                      transactionData?.staff_name;
      
      // If no username found and transaction is recent (within last hour), use current user
      if (!processedBy || processedBy === 'System') {
        const transactionTime = new Date(transactionData?.created_at || transactionData?.date);
        const currentTime = new Date();
        const hoursDiff = (currentTime - transactionTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 1 && userData?.username) {
          processedBy = userData.username;
        } else {
          processedBy = processedBy || 'System';
        }
      }
                        
      const processedAt = transactionData?.created_at || transactionData?.date || new Date().toISOString();
      const paymentAmount = transactionData?.amount || 0;
      const paymentMethod = transactionData?.payment_method || 'N/A';
      
      setLogs([
        {
          timestamp: processedAt,
          action: 'Transaction Record',
          details: `Payment of ₵${parseFloat(paymentAmount).toFixed(2)} processed via ${paymentMethod}`,
          status: transactionData?.status === 'failed' ? 'error' : 'success',
          user: processedBy
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [transactionId, orderNumber, transactionData, userData]);

  useEffect(() => {
    if (transactionId || orderNumber) {
      fetchPaymentLogs();
    }
  }, [transactionId, orderNumber, transactionData, fetchPaymentLogs]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'success': { bg: 'success', icon: 'bi-check-circle' },
      'error': { bg: 'danger', icon: 'bi-x-circle' },
      'warning': { bg: 'warning', icon: 'bi-exclamation-triangle' },
      'info': { bg: 'info', icon: 'bi-info-circle' },
      'pending': { bg: 'secondary', icon: 'bi-clock' }
    };
    
    const config = statusMap[status?.toLowerCase()] || statusMap.info;
    
    return (
      <Badge bg={config.bg} className="d-flex align-items-center gap-1">
        <i className={`bi ${config.icon}`} style={{ fontSize: '0.7rem' }}></i>
        {status || 'Info'}
      </Badge>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className={`text-center py-3 ${className}`}>
        <Spinner animation="border" size="sm" className="me-2" />
        <small className="text-muted">Loading payment logs...</small>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`text-muted py-3 ${className}`}>
        <small>
          <i className="bi bi-exclamation-circle me-1"></i>
          {error}
        </small>
      </div>
    );
  }

  // No logs
  if (!logs || logs.length === 0) {
    return (
      <div className={`text-muted py-3 ${className}`}>
        <small>
          <i className="bi bi-info-circle me-1"></i>
          No payment logs available
        </small>
      </div>
    );
  }

  return (
    <Card className={`${className}`}>
      {showTitle && (
        <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
          <h6 className="mb-0 text-white d-flex align-items-center justify-content-between">
            <span>
              <i className="bi bi-list-ul me-2"></i>
              Payment Activity Log
            </span>
            <Badge bg="light" text="dark" pill>{logs.length}</Badge>
          </h6>
        </Card.Header>
      )}
      <Card.Body className="p-3" style={{ maxHeight, overflowY: 'auto' }}>
        <div className="payment-logs">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`log-entry ${index < logs.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}`}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center gap-2">
                  {getStatusBadge(log.status)}
                  <strong className="text-dark" style={{ fontSize: '0.9rem' }}>
                    {log.action || 'Action'}
                  </strong>
                </div>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {formatTimestamp(log.timestamp)}
                </small>
              </div>
              
              {log.details && (
                <p className="mb-1 text-muted" style={{ fontSize: '0.85rem', marginLeft: '1rem' }}>
                  {log.details}
                </p>
              )}
              
              {log.user && (
                <div className="d-flex align-items-center gap-1" style={{ marginLeft: '1rem' }}>
                  <i className="bi bi-person-circle text-muted" style={{ fontSize: '0.75rem' }}></i>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {log.user}
                  </small>
                </div>
              )}
              
              {log.metadata && (
                <div className="mt-2 p-2 bg-light rounded" style={{ marginLeft: '1rem', fontSize: '0.75rem' }}>
                  <code className="text-muted">
                    {JSON.stringify(log.metadata, null, 2)}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
};

export default PaymentLogs;
