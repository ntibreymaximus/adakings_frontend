import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Badge, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuditLogs } from '../hooks/useAudit';
import { getRelativeTime } from '../services/activityService';

/**
 * Audit Activity Card Component
 * Displays recent audit activities for admin/superadmin users
 */
const AuditActivityCard = ({ 
  maxItems = 5, 
  className = "",
  style = {}
}) => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const {
    logs,
    loading,
    error,
    refresh
  } = useAuditLogs({ 
    autoFetch: true,
    initialFilters: { days: 1 }, // Show today's activities
    refreshInterval: 30000
  });

  // Permission check - only show for superadmin
  if (!userData || userData.role !== 'superadmin') {
    return null;
  }

  const getActionBadgeVariant = (action) => {
    switch (action) {
      case 'create': return 'success';
      case 'update': return 'primary';
      case 'delete': return 'danger';
      case 'payment': return 'success';
      case 'refund': return 'warning';
      case 'login': return 'info';
      case 'logout': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleViewAllAudit = () => {
    navigate('/audit-logs');
  };

  const handleActivityClick = (log) => {
    // Navigate to the relevant page based on the log type
    if (log.app_label === 'orders') {
      navigate('/view-orders');
    } else if (log.app_label === 'payments') {
      navigate('/view-transactions');
    } else if (log.app_label === 'menu') {
      navigate('/view-menu');
    } else {
      navigate('/audit-logs');
    }
  };

  // Render loading state
  if (loading && logs.length === 0) {
    return (
      <Card className={`ada-quick-action-card ${className}`} style={style}>
        <Card.Header>
          <i className="bi bi-shield-check me-2"></i>
          System Activity
        </Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" className="me-2" />
          <span>Loading system activity...</span>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={`ada-quick-action-card ${className}`} style={style}>
        <Card.Header>
          <i className="bi bi-shield-check me-2"></i>
          System Activity
        </Card.Header>
        <Card.Body>
          <Alert variant="warning" className="mb-0">
            <small>Unable to load system activity</small>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // Get recent logs (limit to maxItems)
  const recentLogs = logs.slice(0, maxItems);

  return (
    <Card className={`ada-quick-action-card ${className}`} style={style}>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <i className="bi bi-shield-check me-2"></i>
          System Activity
        </div>
        <div>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 text-muted"
            onClick={refresh}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body className="p-0">
        {recentLogs.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-info-circle text-muted mb-2" style={{ fontSize: '2rem' }}></i>
            <p className="text-muted mb-0 small">No recent system activity</p>
          </div>
        ) : (
          <>
            {recentLogs.map((log) => (
              <div 
                key={log.id} 
                className="border-bottom p-3 activity-item"
                style={{ cursor: 'pointer' }}
                onClick={() => handleActivityClick(log)}
              >
                <Row className="align-items-center">
                  <Col xs={8}>
                    <div className="d-flex align-items-center mb-1">
                      <Badge 
                        bg={getActionBadgeVariant(log.action)} 
                        className="me-2"
                        style={{ fontSize: '0.7rem' }}
                      >
                        {log.action_display}
                      </Badge>
                      <small className="text-muted">
                        by {log.user?.username || 'System'}
                      </small>
                    </div>
                    <div className="mb-1">
                      <strong className="small">{log.object_repr}</strong>
                    </div>
                    <small className="text-muted">
                      {log.app_label?.charAt(0).toUpperCase() + log.app_label?.slice(1)} 
                      {log.model_name && ` • ${log.model_name}`}
                    </small>
                  </Col>
                  <Col xs={4} className="text-end">
                    <small className="text-muted">
                      {log.time_ago}
                    </small>
                    {log.ip_address && (
                      <div>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                          <i className="bi bi-geo-alt"></i> {log.ip_address}
                        </small>
                      </div>
                    )}
                  </Col>
                </Row>
              </div>
            ))}
          </>
        )}
      </Card.Body>
      
      {recentLogs.length > 0 && (
        <Card.Footer className="text-center py-2">
          <Button 
            variant="link" 
            size="sm" 
            className="text-decoration-none"
            onClick={handleViewAllAudit}
          >
            View All System Activity <i className="bi bi-arrow-right"></i>
          </Button>
        </Card.Footer>
      )}
    </Card>
  );
};

export default AuditActivityCard;
