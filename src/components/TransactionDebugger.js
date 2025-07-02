import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Alert } from 'react-bootstrap';
import { useTransactionData } from '../hooks/useTransactionData';
import { usePWA } from '../hooks/usePWA';

/**
 * Debug component to help identify differences between PWA and webview data
 */
const TransactionDebugger = () => {
  const { isPWA } = usePWA();
  const { 
    transactions, 
    loading, 
    error, 
    source,
    lastUpdated,
    forceRefresh 
  } = useTransactionData({ refreshInterval: 5000 }); // Fast refresh for debugging

  const [directApiData, setDirectApiData] = useState(null);
  const [directApiLoading, setDirectApiLoading] = useState(false);
  const [directApiError, setDirectApiError] = useState(null);

  // Fetch data directly from API for comparison
  const fetchDirectApiData = async () => {
    setDirectApiLoading(true);
    setDirectApiError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token');
      }

      // Add cache-busting to ensure fresh data
      const response = await fetch(`http://localhost:8000/api/payments/transaction-table/?_direct=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setDirectApiData(data);
    } catch (err) {
      setDirectApiError(err.message);
    } finally {
      setDirectApiLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectApiData();
  }, []);

  const getDirectTransactions = () => {
    if (!directApiData) return [];
    
    if (Array.isArray(directApiData)) {
      return directApiData;
    } else if (directApiData.transactions) {
      return directApiData.transactions;
    } else if (directApiData.data) {
      return directApiData.data;
    } else if (directApiData.results) {
      return directApiData.results;
    }
    
    return [];
  };

  const directTransactions = getDirectTransactions();

  // Calculate differences
  const serviceTxnCount = transactions?.length || 0;
  const directTxnCount = directTransactions.length;
  const countDifference = Math.abs(serviceTxnCount - directTxnCount);

  // Get today's transactions for comparison
  const today = new Date().toISOString().split('T')[0];
  const serviceTodayTxns = transactions.filter(t => {
    const date = new Date(t.created_at || t.date).toISOString().split('T')[0];
    return date === today;
  });
  
  const directTodayTxns = directTransactions.filter(t => {
    const date = new Date(t.created_at || t.date).toISOString().split('T')[0];
    return date === today;
  });

  return (
    <div style={{ margin: '20px', maxWidth: '1200px' }}>
      <Card>
        <Card.Header style={{ backgroundColor: '#e74c3c', color: 'white' }}>
          <h5 className="mb-0">
            🔍 Transaction Data Debugger {isPWA && <Badge bg="warning">PWA Mode</Badge>}
          </h5>
        </Card.Header>
        <Card.Body>
          {/* Quick Actions */}
          <div className="mb-3">
            <Button 
              variant="primary" 
              size="sm" 
              onClick={forceRefresh}
              className="me-2"
            >
              🔄 Force Refresh Service
            </Button>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={fetchDirectApiData}
              disabled={directApiLoading}
            >
              📡 Refresh Direct API
            </Button>
          </div>

          {/* Status Overview */}
          <div className="row mb-4">
            <div className="col-md-6">
              <Card className="h-100">
                <Card.Header>
                  <strong>Service Data (via Hook)</strong>
                  <Badge bg={source === 'api' ? 'success' : 'warning'} className="ms-2">
                    {source}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  {loading ? (
                    <div>Loading...</div>
                  ) : error ? (
                    <Alert variant="danger" className="mb-2 p-2">
                      Error: {error}
                    </Alert>
                  ) : (
                    <div>
                      <div><strong>Total Transactions:</strong> {serviceTxnCount}</div>
                      <div><strong>Today's Transactions:</strong> {serviceTodayTxns.length}</div>
                      <div><strong>Last Updated:</strong> {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Unknown'}</div>
                      <div><strong>Data Source:</strong> {source}</div>
                      {serviceTxnCount > 0 && (
                        <div><strong>Latest Transaction:</strong> {new Date(transactions[0]?.created_at || transactions[0]?.date).toLocaleString()}</div>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
            
            <div className="col-md-6">
              <Card className="h-100">
                <Card.Header>
                  <strong>Direct API Data</strong>
                  <Badge bg="info" className="ms-2">fresh</Badge>
                </Card.Header>
                <Card.Body>
                  {directApiLoading ? (
                    <div>Loading...</div>
                  ) : directApiError ? (
                    <Alert variant="danger" className="mb-2 p-2">
                      Error: {directApiError}
                    </Alert>
                  ) : (
                    <div>
                      <div><strong>Total Transactions:</strong> {directTxnCount}</div>
                      <div><strong>Today's Transactions:</strong> {directTodayTxns.length}</div>
                      <div><strong>Response Format:</strong> {Array.isArray(directApiData) ? 'Array' : 'Object'}</div>
                      <div><strong>Available Keys:</strong> {directApiData ? Object.keys(directApiData).join(', ') : 'N/A'}</div>
                      {directTxnCount > 0 && (
                        <div><strong>Latest Transaction:</strong> {new Date(directTransactions[0]?.created_at || directTransactions[0]?.date).toLocaleString()}</div>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>

          {/* Comparison */}
          {!loading && !directApiLoading && (
            <Card className="mb-3">
              <Card.Header>
                <strong>Data Comparison</strong>
              </Card.Header>
              <Card.Body>
                <div className="row">
                  <div className="col-md-4">
                    <div className={`p-2 rounded ${countDifference === 0 ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                      <strong>Count Difference:</strong> {countDifference}
                      {countDifference === 0 ? ' ✅' : ' ⚠️'}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className={`p-2 rounded ${serviceTodayTxns.length === directTodayTxns.length ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                      <strong>Today's Count Difference:</strong> {Math.abs(serviceTodayTxns.length - directTodayTxns.length)}
                      {serviceTodayTxns.length === directTodayTxns.length ? ' ✅' : ' ⚠️'}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className={`p-2 rounded ${source === 'api' ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                      <strong>Data Freshness:</strong> {source === 'api' ? 'Fresh' : 'Cached'}
                      {source === 'api' ? ' ✅' : ' ⚠️'}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Raw Data Preview */}
          <div className="row">
            <div className="col-md-6">
              <Card>
                <Card.Header>Service Data Sample (First 3)</Card.Header>
                <Card.Body>
                  <pre style={{ fontSize: '0.7rem', maxHeight: '300px', overflow: 'auto' }}>
                    {JSON.stringify(transactions.slice(0, 3), null, 2)}
                  </pre>
                </Card.Body>
              </Card>
            </div>
            <div className="col-md-6">
              <Card>
                <Card.Header>Direct API Sample (First 3)</Card.Header>
                <Card.Body>
                  <pre style={{ fontSize: '0.7rem', maxHeight: '300px', overflow: 'auto' }}>
                    {JSON.stringify(directTransactions.slice(0, 3), null, 2)}
                  </pre>
                </Card.Body>
              </Card>
            </div>
          </div>

          {/* Cache Status */}
          <Card className="mt-3">
            <Card.Header>Cache & Storage Info</Card.Header>
            <Card.Body>
              <div className="row">
                <div className="col-md-4">
                  <strong>Service Worker:</strong> {navigator.serviceWorker ? 'Available' : 'Not Available'}
                </div>
                <div className="col-md-4">
                  <strong>PWA Mode:</strong> {isPWA ? 'Yes' : 'No'}
                </div>
                <div className="col-md-4">
                  <strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-md-4">
                  <strong>LocalStorage Cache:</strong> {localStorage.getItem('cachedTransactions') ? 'Present' : 'None'}
                </div>
                <div className="col-md-8">
                  <strong>Cache Timestamp:</strong> {localStorage.getItem('cachedTransactionsTimestamp') || 'None'}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Recommendations */}
          {countDifference > 0 && (
            <Alert variant="warning" className="mt-3">
              <Alert.Heading>Data Mismatch Detected!</Alert.Heading>
              <p>
                The service data has {serviceTxnCount} transactions while direct API has {directTxnCount}. 
                This suggests a caching issue.
              </p>
              <ul>
                <li>Try the "Force Refresh Service" button to clear cache</li>
                <li>Check if you're offline (service worker might be serving stale data)</li>
                <li>Compare the raw data samples below to see what's different</li>
                {isPWA && <li>PWA mode detected - service worker caching might be aggressive</li>}
              </ul>
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default TransactionDebugger;
