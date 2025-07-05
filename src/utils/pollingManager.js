/**
 * Robust Polling Manager with automatic recovery and consistency
 * Prevents polling from stopping and ensures reliable real-time updates
 */

class PollingManager {
  constructor() {
    this.activePollers = new Map();
    this.globalIntervalId = null;
    this.isGlobalPollingActive = false;
    this.lastActivity = Date.now();
    this.healthCheckInterval = null;
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 5;
    
    // Start the global health monitor
    this.startHealthMonitor();
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('[PollingManager] Tab hidden - maintaining background polling');
        // Keep polling in background but reduce frequency
        this.adjustPollingFrequency(0.5); // Reduce to 50% frequency
      } else {
        console.log('[PollingManager] Tab visible - resuming normal polling');
        this.adjustPollingFrequency(1); // Resume normal frequency
        this.forceUpdate(); // Immediate update when tab becomes visible
      }
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Register a new poller
   */
  register(id, config) {
    const {
      fetchFunction,
      interval = 2000, // Default to 2 seconds for better performance
      onUpdate,
      onError,
      maxRetries = 3,
      backoffMultiplier = 1.5 // More reasonable backoff
    } = config;

    console.log(`[PollingManager] Registering poller: ${id} with interval ${interval}ms`);

    const poller = {
      id,
      fetchFunction,
      interval,
      originalInterval: interval,
      onUpdate,
      onError,
      maxRetries,
      backoffMultiplier,
      retryCount: 0,
      lastUpdate: 0,
      isActive: true,
      consecutiveErrors: 0,
      lastError: null,
      data: null
    };

    this.activePollers.set(id, poller);
    this.startGlobalPolling();
    
    // Immediate first fetch
    this.executePoll(poller);
    
    return poller;
  }

  /**
   * Unregister a poller
   */
  unregister(id) {
    console.log(`[PollingManager] Unregistering poller: ${id}`);
    this.activePollers.delete(id);
    
    if (this.activePollers.size === 0) {
      this.stopGlobalPolling();
    }
  }

  /**
   * Start global polling mechanism
   */
  startGlobalPolling() {
    if (this.isGlobalPollingActive) return;

    console.log('[PollingManager] Starting global polling');
    this.isGlobalPollingActive = true;
    
    // Use a single interval for all pollers to prevent conflicts
    this.globalIntervalId = setInterval(() => {
      this.executePollingCycle();
    }, 500); // Check every 500ms for reasonable responsiveness
  }

  /**
   * Stop global polling
   */
  stopGlobalPolling() {
    if (!this.isGlobalPollingActive) return;

    console.log('[PollingManager] Stopping global polling');
    this.isGlobalPollingActive = false;
    
    if (this.globalIntervalId) {
      clearInterval(this.globalIntervalId);
      this.globalIntervalId = null;
    }
  }

  /**
   * Execute polling cycle - check which pollers need to run
   */
  executePollingCycle() {
    const now = Date.now();
    this.lastActivity = now;

    this.activePollers.forEach(poller => {
      if (!poller.isActive) return;

      const timeSinceLastUpdate = now - poller.lastUpdate;
      if (timeSinceLastUpdate >= poller.interval) {
        this.executePoll(poller);
      }
    });
  }

  /**
   * Execute a single poll for a specific poller
   */
  async executePoll(poller) {
    if (!poller.isActive) return;

    const startTime = Date.now();
    poller.lastUpdate = startTime;

    try {
      console.log(`[PollingManager] Executing poll for ${poller.id}`);
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 2000);
      });

      const fetchPromise = poller.fetchFunction();
      const result = await Promise.race([fetchPromise, timeoutPromise]);

      // Success - reset error counters
      poller.retryCount = 0;
      poller.consecutiveErrors = 0;
      poller.lastError = null;
      poller.data = result;
      
      // Reset interval to original on success
      poller.interval = poller.originalInterval;

      if (poller.onUpdate) {
        poller.onUpdate(result);
      }

      const duration = Date.now() - startTime;
      console.log(`[PollingManager] Poll completed for ${poller.id} in ${duration}ms`);

    } catch (error) {
      console.error(`[PollingManager] Poll failed for ${poller.id}:`, error);
      
      poller.consecutiveErrors++;
      poller.lastError = error;
      
      // Implement minimal backoff for failed requests
      if (poller.consecutiveErrors <= poller.maxRetries) {
        poller.interval = Math.min(
          poller.originalInterval * Math.pow(poller.backoffMultiplier, poller.consecutiveErrors),
          5000 // Max 5 seconds for faster recovery
        );
        console.log(`[PollingManager] Backing off ${poller.id} to ${poller.interval}ms`);
      } else {
        // Too many consecutive errors - temporarily disable
        poller.isActive = false;
        console.error(`[PollingManager] Disabling ${poller.id} due to too many errors`);
        
        // Schedule reactivation in 5 seconds for faster recovery
        setTimeout(() => {
          console.log(`[PollingManager] Reactivating ${poller.id} after cooldown`);
          poller.isActive = true;
          poller.consecutiveErrors = 0;
          poller.interval = poller.originalInterval;
        }, 5000);
      }

      if (poller.onError) {
        poller.onError(error);
      }
    }
  }

  /**
   * Health monitor to detect stuck polling
   */
  startHealthMonitor() {
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - this.lastActivity;

      // If no activity for 30 seconds, force recovery
      if (timeSinceActivity > 30000 && this.activePollers.size > 0) {
        console.warn('[PollingManager] No activity detected, forcing recovery');
        this.forceRecovery();
      }

      // Log status every 60 seconds
      if (now % 60000 < 5000) {
        this.logStatus();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Force recovery of polling system
   */
  forceRecovery() {
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      console.error('[PollingManager] Max recovery attempts reached');
      return;
    }

    this.recoveryAttempts++;
    console.log(`[PollingManager] Force recovery attempt ${this.recoveryAttempts}`);

    // Restart global polling
    this.stopGlobalPolling();
    
    setTimeout(() => {
      // Reactivate all pollers
      this.activePollers.forEach(poller => {
        poller.isActive = true;
        poller.consecutiveErrors = 0;
        poller.interval = poller.originalInterval;
        poller.lastUpdate = 0; // Force immediate execution
      });
      
      this.startGlobalPolling();
      this.lastActivity = Date.now();
      
      // Reset recovery counter on successful restart
      setTimeout(() => {
        this.recoveryAttempts = 0;
      }, 60000);
    }, 1000);
  }

  /**
   * Force immediate update for all pollers
   */
  forceUpdate() {
    console.log('[PollingManager] Forcing immediate update for all pollers');
    this.activePollers.forEach(poller => {
      if (poller.isActive) {
        poller.lastUpdate = 0; // Force immediate execution
        this.executePoll(poller);
      }
    });
  }

  /**
   * Adjust polling frequency for all pollers
   */
  adjustPollingFrequency(multiplier) {
    this.activePollers.forEach(poller => {
      poller.interval = Math.round(poller.originalInterval / multiplier);
    });
  }

  /**
   * Get status of all pollers
   */
  getStatus() {
    const status = {
      isActive: this.isGlobalPollingActive,
      totalPollers: this.activePollers.size,
      activePollers: 0,
      inactivePollers: 0,
      lastActivity: this.lastActivity,
      recoveryAttempts: this.recoveryAttempts,
      pollers: []
    };

    this.activePollers.forEach(poller => {
      if (poller.isActive) {
        status.activePollers++;
      } else {
        status.inactivePollers++;
      }

      status.pollers.push({
        id: poller.id,
        isActive: poller.isActive,
        interval: poller.interval,
        consecutiveErrors: poller.consecutiveErrors,
        lastUpdate: poller.lastUpdate,
        lastError: poller.lastError?.message
      });
    });

    return status;
  }

  /**
   * Log current status
   */
  logStatus() {
    const status = this.getStatus();
    console.log('[PollingManager] Status:', {
      active: status.isActive,
      pollers: `${status.activePollers}/${status.totalPollers}`,
      lastActivity: new Date(status.lastActivity).toLocaleTimeString()
    });
  }

  /**
   * Cleanup all polling
   */
  cleanup() {
    console.log('[PollingManager] Cleaning up');
    this.stopGlobalPolling();
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.activePollers.clear();
  }

  /**
   * Pause all polling
   */
  pause() {
    console.log('[PollingManager] Pausing all polling');
    this.activePollers.forEach(poller => {
      poller.isActive = false;
    });
  }

  /**
   * Resume all polling
   */
  resume() {
    console.log('[PollingManager] Resuming all polling');
    this.activePollers.forEach(poller => {
      poller.isActive = true;
      poller.lastUpdate = 0; // Force immediate execution
    });
    this.forceUpdate();
  }
}

// Create singleton instance
const pollingManager = new PollingManager();

// Export for global access
window.pollingManager = pollingManager;

export default pollingManager;
