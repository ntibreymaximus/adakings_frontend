import { getBackendServerInfo } from '../utils/envConfig';

// Database connection status service
class DatabaseStatusService {
  constructor() {
    this.status = {
      isConnected: false,
      isChecking: false,
      lastChecked: null,
      error: null,
      responseTime: null,
      dbType: null,
      version: null
    };
    this.listeners = new Set();
  }

  // Add listener for status changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of status change
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  // Get current status
  getStatus() {
    return { ...this.status };
  }

  // Check database connection
  async checkConnection() {
    if (this.status.isChecking) {
      return this.status;
    }

    this.status.isChecking = true;
    this.status.error = null;
    this.notifyListeners();

    const startTime = Date.now();
    const serverInfo = getBackendServerInfo();
    
    try {
      // Try to hit the backend health check endpoint
      const healthUrl = `${serverInfo.backendUrl}/api/health/`;
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        
        this.status = {
          isConnected: true,
          isChecking: false,
          lastChecked: new Date(),
          error: null,
          responseTime,
          dbType: data.database?.type || 'Unknown',
          version: data.database?.version || 'Unknown',
          serverStatus: data.status || 'OK'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.status = {
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        error: error.message || 'Connection failed',
        responseTime: Date.now() - startTime,
        dbType: null,
        version: null,
        serverStatus: 'ERROR'
      };
    }

    this.notifyListeners();
    return this.status;
  }

  // Start periodic health checks
  startPeriodicCheck(interval = 30000) { // 30 seconds default
    this.checkConnection(); // Initial check
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.checkConnection();
    }, interval);

    return () => {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    };
  }

  // Stop periodic checks
  stopPeriodicCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Format status for display
  getStatusDisplay() {
    const status = this.getStatus();
    
    if (status.isChecking) {
      return {
        text: 'Checking...',
        color: '#ffc107',
        icon: '⏳'
      };
    }

    if (status.isConnected) {
      return {
        text: `Connected (${status.responseTime}ms)`,
        color: '#28a745',
        icon: '✅',
        details: {
          dbType: status.dbType,
          version: status.version,
          lastChecked: status.lastChecked
        }
      };
    }

    return {
      text: 'Disconnected',
      color: '#dc3545',
      icon: '❌',
      error: status.error,
      details: {
        lastChecked: status.lastChecked,
        responseTime: status.responseTime
      }
    };
  }
}

// Create singleton instance
const dbStatusService = new DatabaseStatusService();

export default dbStatusService;
