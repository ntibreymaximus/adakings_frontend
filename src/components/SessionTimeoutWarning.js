import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import './SessionTimeoutWarning.css';

/**
 * Component to display session timeout warning modal
 * Shows when user is about to be logged out due to inactivity
 */
const SessionTimeoutWarning = ({ show, onExtend, timeRemaining }) => {
  const { isAuthenticated } = useAuth();
  const [secondsRemaining, setSecondsRemaining] = useState(timeRemaining / 1000);

  useEffect(() => {
    if (!show || !isAuthenticated) return;

    setSecondsRemaining(Math.floor(timeRemaining / 1000));

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, timeRemaining, isAuthenticated]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal 
      show={show && isAuthenticated} 
      onHide={onExtend}
      centered
      backdrop="static"
      keyboard={false}
      className="session-timeout-modal"
    >
      <Modal.Header>
        <Modal.Title>
          <i className="bi bi-clock-history me-2"></i>
          Session Timeout Warning
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <div className="timeout-icon mb-3">
          <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '3rem' }}></i>
        </div>
        <h5>Your session will expire soon due to inactivity</h5>
        <p className="mb-4">
          You will be automatically logged out in:
        </p>
        <div className="countdown-timer">
          <span className="time-display">{formatTime(secondsRemaining)}</span>
        </div>
        <p className="mt-3 text-muted">
          Click "Continue Session" to remain logged in
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onExtend} className="w-100">
          <i className="bi bi-arrow-clockwise me-2"></i>
          Continue Session
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SessionTimeoutWarning;
