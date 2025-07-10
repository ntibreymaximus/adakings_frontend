// Audit service for backend audit log integration
// Provides unified interface for fetching and managing audit logs from the backend

import { tokenFetch } from '../utils/tokenFetch';
import { API_BASE_URL } from '../utils/api';

/**
 * Audit API endpoints
 */
export const AUDIT_ENDPOINTS = {
  LOGS: `${API_BASE_URL}/audit/logs/`,
  DASHBOARD: `${API_BASE_URL}/audit/dashboard/`,
  USER_ACTIVITY: `${API_BASE_URL}/audit/users/`,
  SUMMARIES: `${API_BASE_URL}/audit/summaries/`,
};

/**
 * Action type mappings for consistent display
 */
export const AUDIT_ACTION_TYPES = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  status_change: 'Status Change',
  payment: 'Payment',
  refund: 'Refund',
  toggle: 'Toggle',
  login: 'Login',
  logout: 'Logout'
};

/**
 * Icon mappings for audit actions
 */
export const AUDIT_ACTION_ICONS = {
  create: 'bi bi-plus-circle',
  update: 'bi bi-pencil-square',
  delete: 'bi bi-trash',
  status_change: 'bi bi-arrow-repeat',
  payment: 'bi bi-credit-card',
  refund: 'bi bi-arrow-left-circle',
  toggle: 'bi bi-toggle-on',
  login: 'bi bi-box-arrow-in-right',
  logout: 'bi bi-box-arrow-right'
};

/**
 * Color mappings for audit actions
 */
export const AUDIT_ACTION_COLORS = {
  create: '#4caf50',
  update: '#2196f3',
  delete: '#f44336',
  status_change: '#ff9800',
  payment: '#4caf50',
  refund: '#ff9800',
  toggle: '#9c27b0',
  login: '#2196f3',
  logout: '#6c757d'
};

/**
 * Fetch audit logs with filtering options
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} - Paginated audit logs response
 */
export const fetchAuditLogs = async (filters = {}) => {
  try {
    const {
      page = 1,
      page_size = 50,
      action,
      user,
      app,
      model,
      start_date,
      end_date,
      days,
      search,
      ordering = '-timestamp'
    } = filters;

    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
      ordering
    });

    // Add optional filters
    if (action) params.append('action', action);
    if (user) params.append('user', user.toString());
    if (app) params.append('app', app);
    if (model) params.append('model', model);
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    if (days) params.append('days', days.toString());
    if (search) params.append('search', search);

    const response = await tokenFetch(`${AUDIT_ENDPOINTS.LOGS}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.status}`);
    }

    const data = await response.json();
    
    // Process and normalize the data
    const processedResults = data.results?.map(log => ({
      ...log,
      action_display: AUDIT_ACTION_TYPES[log.action] || log.action_display,
      icon: AUDIT_ACTION_ICONS[log.action] || 'bi bi-info-circle',
      color: AUDIT_ACTION_COLORS[log.action] || '#6c757d',
      formatted_timestamp: formatTimestamp(log.timestamp),
      relative_time: getRelativeTime(log.timestamp)
    })) || [];

    return {
      ...data,
      results: processedResults
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

/**
 * Fetch audit dashboard statistics
 * @returns {Promise<Object>} - Dashboard statistics
 */
export const fetchAuditDashboard = async () => {
  try {
    const response = await tokenFetch(AUDIT_ENDPOINTS.DASHBOARD);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audit dashboard: ${response.status}`);
    }

    const data = await response.json();
    
    // Process action breakdown for better display
    const processedActionBreakdown = data.action_breakdown?.map(item => ({
      ...item,
      icon: AUDIT_ACTION_ICONS[item.action] || 'bi bi-info-circle',
      color: AUDIT_ACTION_COLORS[item.action] || '#6c757d'
    })) || [];

    return {
      ...data,
      action_breakdown: processedActionBreakdown
    };
  } catch (error) {
    console.error('Error fetching audit dashboard:', error);
    throw error;
  }
};

/**
 * Fetch user activity logs
 * @param {number} userId - User ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - User activity data
 */
export const fetchUserActivity = async (userId, options = {}) => {
  try {
    const { days = 30 } = options;
    
    const params = new URLSearchParams({
      days: days.toString()
    });

    const response = await tokenFetch(
      `${AUDIT_ENDPOINTS.USER_ACTIVITY}${userId}/activity/?${params}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user activity: ${response.status}`);
    }

    const data = await response.json();
    
    // Process recent logs for better display
    const processedLogs = data.recent_logs?.map(log => ({
      ...log,
      action_display: AUDIT_ACTION_TYPES[log.action] || log.action_display,
      icon: AUDIT_ACTION_ICONS[log.action] || 'bi bi-info-circle',
      color: AUDIT_ACTION_COLORS[log.action] || '#6c757d',
      formatted_timestamp: formatTimestamp(log.timestamp),
      relative_time: getRelativeTime(log.timestamp)
    })) || [];

    // Process summary for better display
    const processedSummary = data.summary?.map(item => ({
      ...item,
      icon: AUDIT_ACTION_ICONS[item.action] || 'bi bi-info-circle',
      color: AUDIT_ACTION_COLORS[item.action] || '#6c757d'
    })) || [];

    return {
      ...data,
      recent_logs: processedLogs,
      summary: processedSummary
    };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw error;
  }
};

/**
 * Fetch activity summaries
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} - Array of activity summaries
 */
export const fetchActivitySummaries = async (filters = {}) => {
  try {
    const {
      user,
      start_date,
      end_date,
      ordering = '-date'
    } = filters;

    const params = new URLSearchParams({
      ordering
    });

    if (user) params.append('user', user.toString());
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);

    const response = await tokenFetch(`${AUDIT_ENDPOINTS.SUMMARIES}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch activity summaries: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching activity summaries:', error);
    throw error;
  }
};

/**
 * Convert backend audit logs to frontend activity format
 * @param {Array} auditLogs - Array of audit logs from backend
 * @returns {Array} - Array in frontend activity format
 */
export const convertAuditLogsToActivities = (auditLogs) => {
  return auditLogs.map(log => {
    // Determine the activity type based on audit action and object type
    let activityType = log.action;
    let title = `${log.action_display} ${log.object_type}`;
    let description = log.object_repr || `${log.action_display} action performed`;
    
    // Enhanced description with changes if available
    if (log.formatted_changes && log.formatted_changes.length > 0) {
      const changesList = log.formatted_changes
        .map(change => `${change.field}: ${change.old_value || change.value} → ${change.new_value || ''}`)
        .join(', ');
      description += ` (${changesList})`;
    }

    // Determine amount if it's a payment-related action
    let amount = null;
    if (log.action === 'payment' || log.action === 'refund') {
      // Try to extract amount from changes
      const amountChange = log.changes?.amount || log.formatted_changes?.find(c => c.field_key === 'amount');
      if (amountChange) {
        amount = parseFloat(amountChange.value || amountChange.new_value || 0);
      }
    }

    return {
      id: `audit_${log.id}`,
      type: activityType,
      eventType: 'audit',
      timestamp: log.timestamp,
      title: title,
      description: description,
      amount: amount,
      iconType: log.icon,
      colorTag: log.color,
      status: log.action_display,
      metadata: {
        audit_id: log.id,
        user: log.user,
        object_type: log.object_type,
        object_id: log.object_id,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        app_label: log.app_label,
        model_name: log.model_name,
        changes: log.changes,
        formatted_changes: log.formatted_changes,
        time_ago: log.time_ago
      }
    };
  });
};

/**
 * Get audit statistics for display
 * @param {Array} auditLogs - Array of audit logs
 * @returns {Object} - Statistics object
 */
export const getAuditStats = (auditLogs) => {
  const stats = {
    total: auditLogs.length,
    byAction: {},
    byUser: {},
    byApp: {},
    byDate: {},
    recentActions: auditLogs.slice(0, 10)
  };

  auditLogs.forEach(log => {
    // Count by action
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    
    // Count by user
    const username = log.user?.username || 'System';
    stats.byUser[username] = (stats.byUser[username] || 0) + 1;
    
    // Count by app
    if (log.app_label) {
      stats.byApp[log.app_label] = (stats.byApp[log.app_label] || 0) + 1;
    }
    
    // Count by date
    const logDate = new Date(log.timestamp).toISOString().split('T')[0];
    stats.byDate[logDate] = (stats.byDate[logDate] || 0) + 1;
  });

  return stats;
};

/**
 * Helper function to format timestamp
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted timestamp
 */
const formatTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Helper function to get relative time
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Relative time string
 */
const getRelativeTime = (timestamp) => {
  try {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - logTime) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  } catch {
    return 'Unknown time';
  }
};

const auditService = {
  fetchAuditLogs,
  fetchAuditDashboard,
  fetchUserActivity,
  fetchActivitySummaries,
  convertAuditLogsToActivities,
  getAuditStats,
  AUDIT_ACTION_TYPES,
  AUDIT_ACTION_ICONS,
  AUDIT_ACTION_COLORS
};

export default auditService;
