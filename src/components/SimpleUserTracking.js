import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { API_BASE_URL } from '../utils/api';

/**
 * Simplified User Tracking Component
 * Shows only the first log (creation) and latest log (most recent activity)
 * with user name and timestamp
 */
const SimpleUserTracking = ({ 
  orderId, 
  orderNumber,
  className = "",
  showTitle = true,
  size = "default" // "minimal", "compact", or "default"
}) => {
  const [activitySummary, setActivitySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId || orderNumber) {
      fetchActivitySummary();
    }
  }, [orderId, orderNumber]);

  const fetchActivitySummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const searchId = orderId || orderNumber;
      const response = await fetch(`${API_BASE_URL}/audit/orders/${searchId}/summary/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Order activity not found');
        } else {
          setError('Failed to load activity summary');
        }
        return;
      }

      const data = await response.json();
      setActivitySummary(data);
    } catch (err) {
      console.error('Error fetching activity summary:', err);
      setError('Failed to load activity summary');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`text-center py-2 ${className}`}>
        <Spinner animation="border" size="sm" className="me-2" />
        <small className="text-muted">Loading activity...</small>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`text-muted py-2 ${className}`}>
        <small>
          <i className="bi bi-exclamation-circle me-1"></i>
          {error}
        </small>
      </div>
    );
  }

  // No activity data
  if (!activitySummary) {
    return (
      <div className={`text-muted py-2 ${className}`}>
        <small>
          <i className="bi bi-info-circle me-1"></i>
          No activity found
        </small>
      </div>
    );
  }

  const { first_log, latest_log, total_activities } = activitySummary;

  // Minimal version - single line
  if (size === "minimal") {
    return (
      <div className={`text-muted ${className}`} style={{ fontSize: '0.7rem' }}>
        {first_log ? (
          <span>
            {first_log.user_name} • {first_log.time_ago}
            {latest_log && first_log?.timestamp !== latest_log?.timestamp && (
              <span> → {latest_log.user_name} • {latest_log.time_ago}</span>
            )}
          </span>
        ) : (
          <span>No activity</span>
        )}
      </div>
    );
  }

  // Compact version for small spaces
  if (size === "compact") {
    return (
      <Card className={`${className}`} style={{ fontSize: '0.75rem' }}>
        {showTitle && (
          <Card.Header className="py-1 px-2" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <small className="mb-0 text-muted d-flex align-items-center">
              <i className="bi bi-clock-history me-1" style={{ fontSize: '0.7rem' }}></i>
              Activity
            </small>
          </Card.Header>
        )}
        <Card.Body className="p-2">
          {first_log ? (
            <div className="text-muted">
              Created by {first_log.user_name} • {first_log.time_ago}
              {latest_log && first_log?.timestamp !== latest_log?.timestamp && (
                <div className="mt-1">Last: {latest_log.user_name} • {latest_log.time_ago}</div>
              )}
            </div>
          ) : (
            <small className="text-muted">No activity</small>
          )}
        </Card.Body>
      </Card>
    );
  }

  // Default card version - much more compact
  return (
    <Card className={`${className}`}>
      {showTitle && (
        <Card.Header className="py-2" style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
          <div className="d-flex align-items-center justify-content-between">
            <small className="mb-0 text-white d-flex align-items-center">
              <i className="bi bi-clock-history me-1" style={{ fontSize: '0.8rem' }}></i>
              Activity
            </small>
            {total_activities > 0 && (
              <small className="badge bg-light text-dark" style={{ fontSize: '0.6rem' }}>
                {total_activities}
              </small>
            )}
          </div>
        </Card.Header>
      )}
      <Card.Body className="p-2" style={{ fontSize: '0.8rem' }}>
        {first_log ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted">Created:</span>
              <span>{first_log.user_name}</span>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted">When:</span>
              <span className="text-muted">{first_log.time_ago}</span>
            </div>
            
            {latest_log && first_log.timestamp !== latest_log.timestamp && (
              <>
                <hr className="my-1" style={{ margin: '0.25rem 0' }} />
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted">Last:</span>
                  <span>{latest_log.user_name}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">When:</span>
                  <span className="text-muted">{latest_log.time_ago}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-2 text-muted">
            <small>No activity recorded</small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SimpleUserTracking;
