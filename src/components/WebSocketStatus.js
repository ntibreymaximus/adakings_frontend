import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const WebSocketStatus = () => {
  const { isConnected, isConnecting, error } = useWebSocket(false); // Don't auto-connect

  if (!isConnected && !isConnecting && !error) {
    return null; // Don't show anything if not attempting to connect
  }

  const getStatusColor = () => {
    if (isConnected) return 'success';
    if (isConnecting) return 'warning';
    if (error) return 'danger';
    return 'secondary';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    if (error) return 'Connection Error';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isConnected) return '🟢';
    if (isConnecting) return '🟡';
    if (error) return '🔴';
    return '⚪';
  };

  return (
    <div className={`alert alert-${getStatusColor()} d-flex align-items-center`} 
         style={{ 
           position: 'fixed', 
           top: '10px', 
           right: '10px', 
           zIndex: 9999, 
           padding: '8px 12px',
           fontSize: '0.875rem',
           minWidth: '150px'
         }}>
      <span className="me-2">{getStatusIcon()}</span>
      <span>WebSocket: {getStatusText()}</span>
    </div>
  );
};

export default WebSocketStatus;
