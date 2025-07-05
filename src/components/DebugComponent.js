import React, { useState, useEffect } from 'react';

const DebugComponent = () => {
  const [pollingStatus, setPollingStatus] = useState('STARTING');
  const [pollerCount, setPollerCount] = useState(0);
  const [updates, setUpdates] = useState([]);
  useEffect(() => {
    const checkPollingStatus = () => {
      if (window.pollingManager) {
        const status = window.pollingManager.getStatus();
        console.log('[DebugComponent] Polling Manager Status:', status);
        
        setPollingStatus(status.isActive ? 'ACTIVE' : 'INACTIVE');
        setPollerCount(status.activePollers);
        
        // If no pollers but we expected some, try to force a restart
        if (status.totalPollers === 0 && status.isActive === false) {
          console.log('[DebugComponent] No pollers detected, polling manager may need restart');
        }
      } else {
        console.log('[DebugComponent] No polling manager found on window object');
        setPollingStatus('NO_MANAGER');
      }
    };

    // Check immediately
    checkPollingStatus();
    
    // Check every 2 seconds for more responsive debugging
    const interval = setInterval(checkPollingStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (pollingStatus) {
      case 'ACTIVE': return '#28a745'; // Green
      case 'INACTIVE': return '#dc3545'; // Red
      case 'NO_MANAGER': return '#ffc107'; // Yellow
      default: return '#007bff'; // Blue
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: getStatusColor(),
      color: 'white',
      padding: '8px 12px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      🔄 Polling: {pollingStatus} ({pollerCount})
    </div>
  );
};

export default DebugComponent;
