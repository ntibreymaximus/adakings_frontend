import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const InstantReloadTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    console.log('[InstantReloadTest] Setting up test listeners');
    
    const eventHandlers = {
      orderCreated: (event) => {
        addTestResult('orderCreated', event.detail, 'SUCCESS');
      },
      'pwa-order-created': (event) => {
        addTestResult('pwa-order-created', event.detail, 'SUCCESS');
      },
      storage: (event) => {
        if (event.key === 'orderCreatedFlag') {
          addTestResult('localStorage change', event.newValue, 'SUCCESS');
        }
      }
    };

    // BroadcastChannel test
    let broadcastChannel = null;
    if (window.BroadcastChannel) {
      try {
        broadcastChannel = new BroadcastChannel('adakings-orders');
        broadcastChannel.onmessage = (event) => {
          if (event.data.type === 'ORDER_CREATED') {
            addTestResult('BroadcastChannel', event.data, 'SUCCESS');
          }
        };
      } catch (e) {
        addTestResult('BroadcastChannel', e.message, 'ERROR');
      }
    }

    // Register event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler);
    });

    setIsListening(true);

    return () => {
      console.log('[InstantReloadTest] Cleaning up test listeners');
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler);
      });
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      setIsListening(false);
    };
  }, []);

  const addTestResult = (method, data, status) => {
    const result = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      method,
      data: typeof data === 'object' ? JSON.stringify(data, null, 2) : data,
      status
    };
    
    setTestResults(prev => [result, ...prev].slice(0, 10)); // Keep last 10 results
    
    toast.success(`✅ ${method} event detected!`, {
      position: 'top-center',
      autoClose: 2000
    });
  };

  const simulateOrderCreation = () => {
    const mockOrder = {
      id: Date.now(),
      order_number: `TEST-${Date.now()}`,
      customer_phone: '+233241234567',
      delivery_type: 'Pickup',
      total_price: 25.50,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    console.log('[InstantReloadTest] Simulating order creation:', mockOrder);

    // Trigger all the events that PWACreateOrder would trigger
    
    // 1. Custom events
    window.dispatchEvent(new CustomEvent('orderCreated', {
      detail: mockOrder,
      bubbles: true
    }));
    
    window.dispatchEvent(new CustomEvent('pwa-order-created', {
      detail: mockOrder,
      bubbles: true
    }));

    // 2. localStorage
    localStorage.setItem('lastCreatedOrder', JSON.stringify({
      ...mockOrder,
      _created_at: Date.now()
    }));
    localStorage.setItem('orderCreatedFlag', Date.now().toString());

    // 3. BroadcastChannel
    if (window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel('adakings-orders');
        channel.postMessage({
          type: 'ORDER_CREATED',
          data: mockOrder,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {
        console.error('[InstantReloadTest] BroadcastChannel failed:', e);
      }
    }

    toast.info('🧪 Order creation simulation triggered!', {
      position: 'top-center',
      autoClose: 2000
    });
  };

  const clearTestResults = () => {
    setTestResults([]);
    localStorage.removeItem('orderCreatedFlag');
    localStorage.removeItem('lastCreatedOrder');
    toast.info('Test results cleared', {
      position: 'top-center',
      autoClose: 1000
    });
  };

  const checkCurrentFlags = () => {
    const flags = {
      orderCreatedFlag: localStorage.getItem('orderCreatedFlag'),
      lastCreatedOrder: localStorage.getItem('lastCreatedOrder')
    };
    
    console.log('[InstantReloadTest] Current localStorage flags:', flags);
    
    addTestResult('localStorage check', flags, 'INFO');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Instant Reload Test Dashboard</h2>
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #e9ecef'
      }}>
        <h4>Test Status</h4>
        <p>
          Listening for events: {isListening ? '✅ Active' : '❌ Inactive'}
        </p>
        <p>
          Events captured: {testResults.length}
        </p>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={simulateOrderCreation}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          🚀 Simulate Order Creation
        </button>
        
        <button
          onClick={checkCurrentFlags}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          🔍 Check localStorage Flags
        </button>
        
        <button
          onClick={clearTestResults}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          🗑️ Clear Results
        </button>
      </div>

      <div>
        <h4>Test Results ({testResults.length})</h4>
        {testResults.length === 0 ? (
          <div style={{
            background: '#fff3cd',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #ffeaa7',
            textAlign: 'center'
          }}>
            No events captured yet. Try simulating an order creation or creating a real order.
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {testResults.map((result) => (
              <div 
                key={result.id}
                style={{
                  background: result.status === 'SUCCESS' ? '#d4edda' : 
                           result.status === 'ERROR' ? '#f8d7da' : '#d1ecf1',
                  border: `1px solid ${result.status === 'SUCCESS' ? '#c3e6cb' : 
                                     result.status === 'ERROR' ? '#f5c6cb' : '#bee5eb'}`,
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{result.method}</strong>
                  <span style={{ fontSize: '0.9rem', color: '#666' }}>{result.timestamp}</span>
                </div>
                <div style={{ 
                  fontSize: '0.85rem', 
                  background: 'rgba(0,0,0,0.1)', 
                  padding: '8px', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {result.data}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: '#e7f3ff', 
        borderRadius: '8px',
        border: '1px solid #0dcaf0'
      }}>
        <h5>How to Test:</h5>
        <ol>
          <li>Click "Simulate Order Creation" to test event system</li>
          <li>Go to Create Order page and create a real order</li>
          <li>Navigate to Orders page and check if it updates instantly</li>
          <li>Watch this dashboard for captured events</li>
        </ol>
        
        <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#666' }}>
          If events are captured here but orders page doesn't update, there may be an issue with the PWAOrders event listeners.
        </p>
      </div>
    </div>
  );
};

export default InstantReloadTest;
