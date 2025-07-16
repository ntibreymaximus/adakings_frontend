import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import optimizedToast from '../utils/toastUtils';

/**
 * Custom hook to handle user inactivity timeout
 * Logs out the user after a specified period of inactivity
 * 
 * @param {number} timeout - Timeout in milliseconds (default: 30 minutes)
 */
export const useInactivityTimeout = (timeout = 30 * 60 * 1000) => {
  const { logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    if (!isAuthenticated) return;

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Show warning 5 minutes before logout
    const warningTime = timeout - (5 * 60 * 1000); // 5 minutes before timeout
    if (warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
        setTimeRemaining(5 * 60 * 1000); // 5 minutes in milliseconds
      }, warningTime);
    }

    // Set the logout timer
    timeoutRef.current = setTimeout(async () => {
      console.log('🚨 Inactivity timeout reached, logging out...');
      optimizedToast.error('You have been logged out due to inactivity');
      await logout('inactivity', false); // Don't show duplicate logout message
    }, timeout);
  }, [timeout, logout, isAuthenticated]);

  // Track user activity
  const trackActivity = useCallback(() => {
    // Only reset timer if enough time has passed since last activity (throttle)
    const now = Date.now();
    if (now - lastActivityRef.current > 1000) { // Throttle to once per second
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timers if user is not authenticated
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      return;
    }

    // Events to track for user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
      'click',
      'focus'
    ];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, trackActivity, true);
    });

    // Initial timer setup
    resetTimer();

    // Cleanup function
    return () => {
      // Remove event listeners
      events.forEach(event => {
        window.removeEventListener(event, trackActivity, true);
      });

      // Clear timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [isAuthenticated, trackActivity, resetTimer]);

  // Function to extend session when user clicks continue
  const extendSession = useCallback(() => {
    setShowWarning(false);
    setTimeRemaining(0);
    resetTimer();
  }, [resetTimer]);

  // Return warning state and control functions
  return { 
    resetTimer, 
    showWarning, 
    timeRemaining, 
    extendSession 
  };
};

export default useInactivityTimeout;
