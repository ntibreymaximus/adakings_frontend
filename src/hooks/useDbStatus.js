import { useState, useEffect } from 'react';
import dbStatusService from '../services/dbStatusService';
import { isProduction } from '../utils/envConfig';

// Custom hook for database status
export const useDbStatus = (options = {}) => {
  const {
    enablePeriodicCheck = true,
    checkInterval = 30000, // 30 seconds
    checkOnMount = true
  } = options;

  const [status, setStatus] = useState(dbStatusService.getStatus());
  const [display, setDisplay] = useState(dbStatusService.getStatusDisplay());

  useEffect(() => {
    // Don't run database checks in production
    if (isProduction()) {
      return;
    }

    // Subscribe to status changes
    const unsubscribe = dbStatusService.subscribe((newStatus) => {
      setStatus(newStatus);
      setDisplay(dbStatusService.getStatusDisplay());
    });

    // Initial check if requested
    if (checkOnMount) {
      dbStatusService.checkConnection();
    }

    // Start periodic checks if enabled
    let stopPeriodicCheck;
    if (enablePeriodicCheck) {
      stopPeriodicCheck = dbStatusService.startPeriodicCheck(checkInterval);
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
      if (stopPeriodicCheck) {
        stopPeriodicCheck();
      }
    };
  }, [enablePeriodicCheck, checkInterval, checkOnMount]);

  // Manual check function
  const checkConnection = () => {
    return dbStatusService.checkConnection();
  };

  // Helper functions
  const isConnected = status.isConnected;
  const isChecking = status.isChecking;
  const hasError = !!status.error;
  const responseTime = status.responseTime;
  const lastChecked = status.lastChecked;

  return {
    status,
    display,
    isConnected,
    isChecking,
    hasError,
    responseTime,
    lastChecked,
    checkConnection,
    // Formatted display helpers
    getStatusText: () => display.text,
    getStatusColor: () => display.color,
    getStatusIcon: () => display.icon,
    getStatusDetails: () => display.details
  };
};
