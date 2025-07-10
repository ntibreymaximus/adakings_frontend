// Custom hook for managing audit logs and dashboard state
// Provides unified interface for fetching, filtering, and managing audit data

import { useState, useEffect, useCallback, useMemo } from 'react';
import auditService, { 
  fetchAuditLogs, 
  fetchAuditDashboard, 
  fetchUserActivity,
  convertAuditLogsToActivities 
} from '../services/auditService';

/**
 * Custom hook for audit logs management
 * @param {Object} options - Configuration options
 * @returns {Object} - Audit state and functions
 */
export const useAuditLogs = (options = {}) => {
  const {
    autoFetch = true,
    initialFilters = {},
    refreshInterval = null // Auto-refresh interval in ms
  } = options;

  // State management
  const [state, setState] = useState({
    logs: [],
    loading: false,
    error: null,
    pagination: {
      count: 0,
      next: null,
      previous: null,
      current_page: 1,
      total_pages: 1
    },
    filters: initialFilters,
    lastFetch: null
  });

  // Fetch audit logs
  const fetchLogs = useCallback(async (filters = {}, resetLogs = false) => {
    setState(prev => { 
      const mergedFilters = { ...prev.filters, ...filters };
      return {
        ...prev, 
        loading: true, 
        error: null,
        filters: mergedFilters
      };
    });

    try {
      // Use the filters from the callback parameter, not state
      const currentFilters = { ...state.filters, ...filters };
      const response = await fetchAuditLogs(currentFilters);
      
      setState(prev => ({
        ...prev,
        logs: resetLogs ? response.results : [...prev.logs, ...response.results],
        pagination: {
          count: response.count,
          next: response.next,
          previous: response.previous,
          current_page: currentFilters.page || 1,
          total_pages: Math.ceil(response.count / (currentFilters.page_size || 50))
        },
        loading: false,
        lastFetch: new Date(),
        error: null
      }));

      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch audit logs'
      }));
      throw error;
    }
  }, []);

  // Load more logs (pagination)
  const loadMore = useCallback(async () => {
    if (state.pagination.next && !state.loading) {
      const nextPage = state.pagination.current_page + 1;
      await fetchLogs({ page: nextPage }, false);
    }
  }, [state.pagination.next, state.pagination.current_page, state.loading, fetchLogs]);

  // Refresh logs (reload current page)
  const refresh = useCallback(async () => {
    await fetchLogs({}, true);
  }, [fetchLogs]);

  // Update filters
  const updateFilters = useCallback(async (newFilters, resetToFirstPage = true) => {
    const filters = resetToFirstPage ? 
      { ...newFilters, page: 1 } : 
      { ...newFilters };
    
    await fetchLogs(filters, true);
  }, [fetchLogs]);

  // Clear filters
  const clearFilters = useCallback(async () => {
    await fetchLogs({}, true);
  }, [fetchLogs]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchLogs(initialFilters, true);
    }
  }, [autoFetch]);

  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refresh]);

  // Convert to activity format
  const activitiesFormat = useMemo(() => {
    return convertAuditLogsToActivities(state.logs);
  }, [state.logs]);

  return {
    // State
    logs: state.logs,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    filters: state.filters,
    lastFetch: state.lastFetch,
    
    // Activities format
    activitiesFormat,
    
    // Actions
    fetchLogs,
    loadMore,
    refresh,
    updateFilters,
    clearFilters,
    
    // Computed values
    hasMore: !!state.pagination.next,
    isEmpty: state.logs.length === 0 && !state.loading,
    totalLogs: state.pagination.count
  };
};

/**
 * Custom hook for audit dashboard
 * @param {Object} options - Configuration options
 * @returns {Object} - Dashboard state and functions
 */
export const useAuditDashboard = (options = {}) => {
  const {
    autoFetch = true,
    refreshInterval = 30000 // 30 seconds default
  } = options;

  const [state, setState] = useState({
    dashboard: null,
    loading: false,
    error: null,
    lastFetch: null
  });

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchAuditDashboard();
      setState(prev => ({
        ...prev,
        dashboard: data,
        loading: false,
        lastFetch: new Date(),
        error: null
      }));
      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch dashboard data'
      }));
      throw error;
    }
  }, []);

  // Refresh dashboard
  const refresh = useCallback(async () => {
    await fetchDashboard();
  }, [fetchDashboard]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchDashboard();
    }
  }, [autoFetch, fetchDashboard]);

  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refresh]);

  return {
    // State
    dashboard: state.dashboard,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    
    // Actions
    fetchDashboard,
    refresh,
    
    // Computed values
    summary: state.dashboard?.summary || {},
    actionBreakdown: state.dashboard?.action_breakdown || [],
    topUsers: state.dashboard?.top_users || [],
    modelActivity: state.dashboard?.model_activity || [],
    recentCritical: state.dashboard?.recent_critical || []
  };
};

/**
 * Custom hook for user activity tracking
 * @param {number} userId - User ID to track
 * @param {Object} options - Configuration options
 * @returns {Object} - User activity state and functions
 */
export const useUserActivity = (userId, options = {}) => {
  const {
    autoFetch = true,
    days = 30,
    refreshInterval = null
  } = options;

  const [state, setState] = useState({
    activity: null,
    loading: false,
    error: null,
    lastFetch: null
  });

  // Fetch user activity
  const fetchActivity = useCallback(async (customDays = days) => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchUserActivity(userId, { days: customDays });
      setState(prev => ({
        ...prev,
        activity: data,
        loading: false,
        lastFetch: new Date(),
        error: null
      }));
      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch user activity'
      }));
      throw error;
    }
  }, [userId, days]);

  // Refresh activity
  const refresh = useCallback(async () => {
    await fetchActivity();
  }, [fetchActivity]);

  // Update days filter
  const updateDays = useCallback(async (newDays) => {
    await fetchActivity(newDays);
  }, [fetchActivity]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && userId) {
      fetchActivity();
    }
  }, [autoFetch, userId, fetchActivity]);

  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refresh]);

  return {
    // State
    activity: state.activity,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    
    // Actions
    fetchActivity,
    refresh,
    updateDays,
    
    // Computed values
    totalActions: state.activity?.total_actions || 0,
    summary: state.activity?.summary || [],
    recentLogs: state.activity?.recent_logs || [],
    periodDays: state.activity?.period_days || days
  };
};

/**
 * Hook for audit statistics and analytics
 * @param {Array} auditLogs - Array of audit logs
 * @returns {Object} - Statistics and analytics
 */
export const useAuditStats = (auditLogs = []) => {
  const stats = useMemo(() => {
    return auditService.getAuditStats(auditLogs);
  }, [auditLogs]);

  // Additional analytics
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const todayLogs = auditLogs.filter(log => 
      new Date(log.timestamp).toISOString().split('T')[0] === today
    );
    
    const yesterdayLogs = auditLogs.filter(log => 
      new Date(log.timestamp).toISOString().split('T')[0] === yesterday
    );

    // Calculate trends
    const todayCount = todayLogs.length;
    const yesterdayCount = yesterdayLogs.length;
    const trend = yesterdayCount > 0 ? 
      ((todayCount - yesterdayCount) / yesterdayCount * 100).toFixed(1) : 0;

    return {
      todayCount,
      yesterdayCount,
      trend: parseFloat(trend),
      trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
      mostActiveUser: Object.entries(stats.byUser)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
      mostCommonAction: Object.entries(stats.byAction)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
    };
  }, [auditLogs, stats]);

  return {
    ...stats,
    analytics
  };
};

// All hooks are already exported as named exports above
