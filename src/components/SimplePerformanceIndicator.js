import React, { useState, useEffect } from 'react';

const SimplePerformanceIndicator = () => {
  const [status, setStatus] = useState('LOADING');
  const [apiCalls, setApiCalls] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Monitor polling manager status if available
    const checkStatus = () => {
      if (window.pollingManager) {
        const pmStatus = window.pollingManager.getStatus();
        setStatus(pmStatus.isActive ? 'ACTIVE' : 'INACTIVE');
        setLastUpdate(new Date());
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    checkStatus(); // Initial check

    // Monitor fetch calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      setApiCalls(prev => prev + 1);
      return originalFetch(...args);
    };

    return () => {
      clearInterval(interval);
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: status === 'ACTIVE' ? '#28a745' : '#dc3545',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      zIndex: 9999,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      🔄 {status} | API: {apiCalls} | {lastUpdate.toLocaleTimeString()}
    </div>
  );
};

export default SimplePerformanceIndicator;
