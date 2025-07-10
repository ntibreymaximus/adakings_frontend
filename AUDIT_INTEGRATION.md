# Audit System Integration Guide

This document provides comprehensive guidance for integrating the backend audit system with the frontend application.

## Overview

The audit system tracks all user actions across the application, providing comprehensive logging and analysis capabilities. The backend provides detailed audit logs that can be consumed by the frontend for display and analysis.

## Backend API Endpoints

### Base URL
```
/api/audit/
```

### Available Endpoints

#### 1. Audit Logs List
**GET** `/api/audit/logs/`

Retrieve paginated audit logs with filtering options.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `page_size` (int): Number of logs per page (default: 50, max: 200)
- `action` (str): Filter by action type (create, update, delete, payment, etc.)
- `user` (int): Filter by user ID
- `app` (str): Filter by app label (orders, menu, payments, etc.)
- `model` (str): Filter by model name
- `start_date` (datetime): Filter logs after this date (ISO format)
- `end_date` (datetime): Filter logs before this date (ISO format)
- `days` (int): Filter logs from last X days
- `search` (str): Search in object representation, username, email, or IP
- `ordering` (str): Order by field (default: -timestamp)

**Example Response:**
```json
{
  "count": 150,
  "next": "/api/audit/logs/?page=2",
  "previous": null,
  "results": [
    {
      "id": 123,
      "user": {
        "id": 1,
        "username": "admin",
        "first_name": "John",
        "last_name": "Doe",
        "email": "admin@example.com"
      },
      "action": "create",
      "action_display": "Create",
      "timestamp": "2025-07-10T12:30:45.123456Z",
      "time_ago": "2 minutes ago",
      "object_type": "Orders Order",
      "object_id": 45,
      "object_repr": "Order #100725-001",
      "changes": {
        "created": true,
        "total_price": "25.50",
        "customer_phone": "+233123456789"
      },
      "formatted_changes": [
        {
          "field": "Total Price",
          "value": "25.50",
          "field_key": "total_price"
        }
      ],
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "app_label": "orders",
      "model_name": "order"
    }
  ]
}
```

#### 2. Audit Dashboard Statistics
**GET** `/api/audit/dashboard/`

Get comprehensive audit statistics for dashboard display.

**Example Response:**
```json
{
  "summary": {
    "total_logs": 1500,
    "today_logs": 45,
    "week_logs": 320,
    "month_logs": 1200
  },
  "action_breakdown": [
    {
      "action": "create",
      "action_display": "Create",
      "count": 450
    },
    {
      "action": "update",
      "action_display": "Update",
      "count": 380
    }
  ],
  "top_users": [
    {
      "username": "admin",
      "name": "John Doe",
      "action_count": 125
    }
  ],
  "model_activity": [
    {
      "app": "orders",
      "model": "order",
      "display_name": "Orders Order",
      "count": 234
    }
  ],
  "recent_critical": [
    // Array of recent critical actions (delete, payment, refund)
  ]
}
```

#### 3. User Activity
**GET** `/api/audit/users/{user_id}/activity/`

Get activity logs for a specific user.

**Query Parameters:**
- `days` (int): Number of days to look back (default: 30)

**Example Response:**
```json
{
  "user_id": 1,
  "period_days": 30,
  "total_actions": 45,
  "summary": [
    {
      "action": "create",
      "action_display": "Create",
      "count": 15
    }
  ],
  "recent_logs": [
    // Array of recent audit logs for this user
  ]
}
```

## Frontend Integration

### 1. Audit Service

The audit service (`src/services/auditService.js`) provides functions to interact with the audit API:

```javascript
import auditService, { 
  fetchAuditLogs, 
  fetchAuditDashboard, 
  fetchUserActivity 
} from '../services/auditService';

// Fetch audit logs with filters
const logs = await fetchAuditLogs({
  page: 1,
  page_size: 50,
  action: 'payment',
  days: 7
});

// Fetch dashboard statistics
const dashboard = await fetchAuditDashboard();

// Fetch user activity
const userActivity = await fetchUserActivity(userId, { days: 30 });
```

### 2. React Hooks

Custom hooks are provided for easy state management:

#### useAuditLogs Hook
```javascript
import { useAuditLogs } from '../hooks/useAudit';

const MyComponent = () => {
  const {
    logs,
    loading,
    error,
    pagination,
    activitiesFormat,
    loadMore,
    refresh,
    updateFilters,
    hasMore
  } = useAuditLogs({
    autoFetch: true,
    initialFilters: { days: 7 },
    refreshInterval: 30000 // Auto-refresh every 30 seconds
  });

  // Use the data in your component
  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {activitiesFormat.map(activity => (
        <div key={activity.id}>
          <h3>{activity.title}</h3>
          <p>{activity.description}</p>
          <small>{activity.time_ago}</small>
        </div>
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
};
```

#### useAuditDashboard Hook
```javascript
import { useAuditDashboard } from '../hooks/useAudit';

const DashboardComponent = () => {
  const {
    dashboard,
    loading,
    error,
    summary,
    actionBreakdown,
    topUsers,
    refresh
  } = useAuditDashboard({
    autoFetch: true,
    refreshInterval: 30000
  });

  return (
    <div>
      <h2>Audit Dashboard</h2>
      <div>Total Logs: {summary.total_logs}</div>
      <div>Today: {summary.today_logs}</div>
      
      <h3>Action Breakdown</h3>
      {actionBreakdown.map(item => (
        <div key={item.action}>
          {item.action_display}: {item.count}
        </div>
      ))}
      
      <button onClick={refresh}>Refresh</button>
    </div>
  );
};
```

#### useUserActivity Hook
```javascript
import { useUserActivity } from '../hooks/useAudit';

const UserProfileComponent = ({ userId }) => {
  const {
    activity,
    loading,
    totalActions,
    summary,
    recentLogs,
    updateDays
  } = useUserActivity(userId, {
    autoFetch: true,
    days: 30
  });

  return (
    <div>
      <h3>User Activity</h3>
      <p>Total Actions: {totalActions}</p>
      
      <select onChange={(e) => updateDays(e.target.value)}>
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
      </select>
      
      {summary.map(item => (
        <div key={item.action}>
          {item.action_display}: {item.count}
        </div>
      ))}
    </div>
  );
};
```

### 3. Integration with Existing Activity System

To integrate audit logs with the existing activity system, you can merge audit data with order and transaction activities:

```javascript
import activityService from '../services/activityService';
import { fetchAuditLogs, convertAuditLogsToActivities } from '../services/auditService';

const getMergedActivities = async (orders, transactions) => {
  // Get existing activities
  const orderActivities = activityService.generateOrderActivities(orders);
  const transactionActivities = activityService.generateTransactionActivities(transactions);
  
  // Get audit activities
  const auditLogs = await fetchAuditLogs({ days: 7 });
  const auditActivities = convertAuditLogsToActivities(auditLogs.results);
  
  // Merge all activities
  const allActivities = [
    ...orderActivities,
    ...transactionActivities,
    ...auditActivities
  ];
  
  // Sort by timestamp
  return allActivities.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
};
```

### 4. Component Examples

#### Basic Audit Log List
```javascript
import React from 'react';
import { useAuditLogs } from '../hooks/useAudit';

const AuditLogsList = () => {
  const { logs, loading, error, loadMore, hasMore } = useAuditLogs();

  if (loading) return <div>Loading audit logs...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="audit-logs">
      <h2>Audit Logs</h2>
      {logs.map(log => (
        <div key={log.id} className="audit-log-item">
          <div className="log-header">
            <span className="action-badge">{log.action_display}</span>
            <span className="timestamp">{log.time_ago}</span>
          </div>
          <div className="log-content">
            <strong>{log.object_repr}</strong>
            <p>by {log.user?.username}</p>
            {log.formatted_changes?.map(change => (
              <div key={change.field_key} className="change-item">
                {change.field}: {change.old_value} → {change.new_value}
              </div>
            ))}
          </div>
        </div>
      ))}
      {hasMore && (
        <button onClick={loadMore} className="load-more-btn">
          Load More
        </button>
      )}
    </div>
  );
};
```

#### Audit Dashboard Widget
```javascript
import React from 'react';
import { useAuditDashboard } from '../hooks/useAudit';

const AuditDashboardWidget = () => {
  const { summary, actionBreakdown, loading } = useAuditDashboard();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="audit-dashboard-widget">
      <h3>System Activity</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{summary.today_logs}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.week_logs}</div>
          <div className="stat-label">This Week</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.total_logs}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>
      
      <div className="action-breakdown">
        <h4>Recent Actions</h4>
        {actionBreakdown.slice(0, 5).map(item => (
          <div key={item.action} className="action-item">
            <span className="action-name">{item.action_display}</span>
            <span className="action-count">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Styling

Add these CSS classes to your stylesheets:

```css
.audit-logs {
  max-width: 800px;
  margin: 0 auto;
}

.audit-log-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: white;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.action-badge {
  background: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
}

.timestamp {
  color: #6c757d;
  font-size: 14px;
}

.change-item {
  background: #f8f9fa;
  padding: 4px 8px;
  margin: 4px 0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
}

.audit-dashboard-widget {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
}

.action-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
```

## Permission Requirements

The audit endpoints require authentication and specific permissions:

- **Admin** and **Superuser** roles can access all audit endpoints
- Regular users cannot access audit logs
- The frontend should check user permissions before displaying audit components

```javascript
import { useAuth } from '../contexts/AuthContext';

const AuditComponent = () => {
  const { user } = useAuth();
  
  // Check if user has admin permissions
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div>Access denied: Admin privileges required</div>;
  }
  
  // Render audit component
  return <AuditLogsList />;
};
```

## Error Handling

The audit service includes comprehensive error handling:

```javascript
import { fetchAuditLogs } from '../services/auditService';

const handleAuditFetch = async () => {
  try {
    const logs = await fetchAuditLogs();
    // Handle success
  } catch (error) {
    if (error.message === 'AUTHENTICATION_REQUIRED') {
      // Redirect to login
    } else if (error.message.includes('403')) {
      // Show permission denied message
    } else {
      // Show generic error message
    }
  }
};
```

## Testing

Test the audit integration by:

1. Performing various actions in the application (create orders, process payments, etc.)
2. Checking that audit logs are generated in the backend
3. Verifying that the frontend displays the audit logs correctly
4. Testing filters and pagination
5. Ensuring real-time updates work properly

## Performance Considerations

- Use pagination to avoid loading too many logs at once
- Implement virtual scrolling for large datasets
- Use debounced search inputs to reduce API calls
- Consider caching frequently accessed data
- Use the `refreshInterval` option judiciously to balance real-time updates with performance

## Next Steps

1. **Integration**: Add audit components to your existing dashboard and admin pages
2. **Customization**: Modify the components to match your application's design system
3. **Features**: Add advanced filtering, export functionality, and detailed drill-down views
4. **Analytics**: Build analytics dashboards using the audit data
5. **Alerts**: Implement real-time alerts for critical actions

This integration provides a solid foundation for comprehensive audit logging and analysis in your application.
