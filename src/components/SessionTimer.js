import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './SessionTimer.css';

/**
 * Component to display remaining session time
 * Shows in navbar or user profile area
 */
const SessionTimer = ({ timeout = 30 * 60 * 1000 }) => {
  const { isAuthenticated } = useAuth();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [timeRemaining, setTimeRemaining] = useState(timeout);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Track user activity
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, true);
    });

    // Update timer every second
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const remaining = Math.max(0, timeout - elapsed);
      setTimeRemaining(remaining);
    }, 1000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity, true);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated, timeout, lastActivity]);

  if (!isAuthenticated) return null;

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    const percentage = (timeRemaining / timeout) * 100;
    if (percentage > 50) return 'text-success';
    if (percentage > 16.67) return 'text-warning'; // Less than 5 minutes
    return 'text-danger';
  };

  const percentage = (timeRemaining / timeout) * 100;
  const isLowTime = percentage <= 16.67; // Less than 5 minutes

  return (
    <div className={`session-timer ${isLowTime ? 'session-timer-warning' : ''}`}>
      <i className="bi bi-clock-history me-1"></i>
      <span className={`session-time ${getStatusColor()}`}>
        {formatTime(timeRemaining)}
      </span>
      {isLowTime && (
        <span className="session-warning-text ms-2 text-danger">
          Session expiring soon!
        </span>
      )}
    </div>
  );
};

export default SessionTimer;
