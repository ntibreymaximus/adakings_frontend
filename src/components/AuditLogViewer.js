import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, Spinner, Alert, Modal, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuditLogs, useAuditDashboard, useAuditStats } from '../hooks/useAudit';
import { useAuth } from '../contexts/AuthContext';

const AuditLogViewer = () => {
  const { userData } = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate(); // Add useNavigate hook

  const handleDashboardNavigation = () => {
    navigate('/dashboard');
  };

  const {
    logs,
    loading,
    error,
    loadMore,
    hasMore,
    refresh,
    updateFilters,
    pagination,
    filters
  } = useAuditLogs({ 
    autoFetch: true,
    initialFilters: { days: 7 },
    refreshInterval: 30000
  });

  const { summary, actionBreakdown, topUsers, loading: dashboardLoading } = useAuditDashboard();
  const { total, analytics } = useAuditStats(logs);

  // Permission check
  if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
    return (
      <Container className="my-4">
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You need administrator privileges to view audit logs.</p>
        </Alert>
      </Container>
    );
  }

  const handleFilterChange = (newFilters) => {
    updateFilters(newFilters);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleSearchSubmit = () => {
    updateFilters({ search: searchTerm || undefined });
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    updateFilters({ search: undefined });
  };

  // Initialize search term from filters
  useEffect(() => {
    if (filters.search && searchTerm !== filters.search) {
      setSearchTerm(filters.search);
    }
  }, [filters.search, searchTerm]);

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

  const formatChanges = (changes) => {
    if (!changes || Object.keys(changes).length === 0) return 'No changes recorded';
    
    return Object.entries(changes).map(([key, value]) => {
      if (typeof value === 'object' && value.old !== undefined && value.new !== undefined) {
        return `${key}: ${value.old} → ${value.new}`;
      }
      return `${key}: ${value}`;
    }).join(', ');
  };

  return (
    <Container className="my-3 my-md-4 px-3 px-md-4" style={{ minHeight: 'calc(100vh - 100px)' }}>
      <div className="mb-3">
        <Button 
          variant="outline-primary" 
          size="sm"
          onClick={handleDashboardNavigation}
          className="d-flex align-items-center ada-shadow-sm"
          style={{ minHeight: '44px' }}
        >
          <i className="bi bi-arrow-left me-2"></i>
          <span>Return to Dashboard</span>
        </Button>
      </div>
      
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="ada-text-primary mb-0">Audit Logs</h2>
              <small className="text-muted">System activity tracking and monitoring</small>
            </div>
            <div>
              <Button 
                variant="outline-info" 
                size="sm" 
                className="me-2"
                onClick={() => setShowDashboard(true)}
              >
                <i className="bi bi-bar-chart"></i> Audit Stats
              </Button>
              <Button 
                variant="outline-success" 
                size="sm" 
                onClick={refresh}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise"></i> Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-primary">{total}</h5>
              <small className="text-muted">Total Logs</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-success">{analytics.todayCount}</h5>
              <small className="text-muted">Today</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-info">{analytics.mostActiveUser}</h5>
              <small className="text-muted">Most Active User</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-warning">{analytics.mostCommonAction}</h5>
              <small className="text-muted">Top Action</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Time Period</Form.Label>
                    <Form.Select 
                      value={filters.days || ''} 
                      onChange={(e) => handleFilterChange({ days: e.target.value || undefined })}
                    >
                      <option value="">All time</option>
                      <option value="1">Today</option>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Action Type</Form.Label>
                    <Form.Select 
                      value={filters.action || ''} 
                      onChange={(e) => handleFilterChange({ action: e.target.value || undefined })}
                    >
                      <option value="">All actions</option>
                      <option value="create">Create</option>
                      <option value="update">Update</option>
                      <option value="delete">Delete</option>
                      <option value="payment">Payment</option>
                      <option value="refund">Refund</option>
                      <option value="login">Login</option>
                      <option value="logout">Logout</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>App</Form.Label>
                    <Form.Select 
                      value={filters.app || ''} 
                      onChange={(e) => handleFilterChange({ app: e.target.value || undefined })}
                    >
                      <option value="">All apps</option>
                      <option value="orders">Orders</option>
                      <option value="menu">Menu</option>
                      <option value="payments">Payments</option>
                      <option value="users">Users</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Search</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                      />
                      <Button
                        variant="outline-primary"
                        onClick={handleSearchSubmit}
                        disabled={!searchTerm.trim()}
                      >
                        <i className="bi bi-search"></i>
                      </Button>
                      {searchTerm && (
                        <Button
                          variant="outline-secondary"
                          onClick={handleClearSearch}
                          title="Clear search"
                        >
                          <i className="bi bi-x"></i>
                        </Button>
                      )}
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Error handling */}
      {error && (
        <Alert variant="danger" className="mb-4">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && logs.length === 0 && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Loading audit logs...</p>
        </div>
      )}

      {/* Audit logs list */}
      {logs.length > 0 && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Audit Trail</h5>
                  <small className="text-muted">
                    Showing {logs.length} of {pagination.count} logs
                  </small>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="border-bottom p-3 audit-log-item"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-2">
                          <Badge 
                            bg={getActionBadgeVariant(log.action)} 
                            className="me-2"
                          >
                            {log.action_display}
                          </Badge>
                          <strong className="me-2">{log.object_repr}</strong>
                          <small className="text-muted">
                            by {log.user?.username || 'System'}
                          </small>
                        </div>
                        
                        {log.formatted_changes && log.formatted_changes.length > 0 && (
                          <div className="mb-2">
                            <small className="text-muted d-block mb-1">Changes:</small>
                            {log.formatted_changes.slice(0, 3).map((change, idx) => (
                              <div key={idx} className="small">
                                <code className="bg-light px-1 rounded">
                                  {change.field}: {change.old_value} → {change.new_value}
                                </code>
                              </div>
                            ))}
                            {log.formatted_changes.length > 3 && (
                              <small className="text-muted">...and {log.formatted_changes.length - 3} more</small>
                            )}
                          </div>
                        )}
                        
                        {log.ip_address && (
                          <small className="text-muted d-block">
                            <i className="bi bi-geo-alt"></i> {log.ip_address}
                          </small>
                        )}
                      </div>
                      
                      <div className="text-end">
                        <small className="text-muted d-block">{log.time_ago}</small>
                        <small className="text-muted">
                          {new Date(log.timestamp).toLocaleString()}
                        </small>
                      </div>
                    </div>
                  </div>
                ))}
              </Card.Body>
              
              {hasMore && (
                <Card.Footer className="text-center">
                  <Button 
                    variant="outline-primary" 
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </Card.Footer>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* No logs message */}
      {!loading && logs.length === 0 && (
        <div className="text-center py-5">
          <i className="bi bi-search display-1 text-muted"></i>
          <h5 className="text-muted mt-3">No audit logs found</h5>
          <p className="text-muted">Try adjusting your filters or check back later.</p>
        </div>
      )}

      {/* Dashboard Modal */}
      <Modal show={showDashboard} onHide={() => setShowDashboard(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Audit Dashboard</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {dashboardLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <Row className="mb-4">
                <Col md={3}>
                  <div className="text-center">
                    <h4 className="text-primary">{summary.total_logs}</h4>
                    <small className="text-muted">Total Logs</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h4 className="text-success">{summary.today_logs}</h4>
                    <small className="text-muted">Today</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h4 className="text-info">{summary.week_logs}</h4>
                    <small className="text-muted">This Week</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h4 className="text-warning">{summary.month_logs}</h4>
                    <small className="text-muted">This Month</small>
                  </div>
                </Col>
              </Row>
              
              {/* Action breakdown */}
              <Row>
                <Col md={6}>
                  <h6>Action Breakdown (Last 30 Days)</h6>
                  {actionBreakdown.slice(0, 6).map(item => (
                    <div key={item.action} className="d-flex justify-content-between border-bottom py-2">
                      <span>
                        <Badge bg={getActionBadgeVariant(item.action)} className="me-2">
                          {item.action_display}
                        </Badge>
                      </span>
                      <span className="fw-bold">{item.count}</span>
                    </div>
                  ))}
                </Col>
                <Col md={6}>
                  <h6>Top Users (Last 7 Days)</h6>
                  {topUsers.slice(0, 5).map((user, idx) => (
                    <div key={idx} className="d-flex justify-content-between border-bottom py-2">
                      <span>{user.name}</span>
                      <span className="fw-bold">{user.action_count}</span>
                    </div>
                  ))}
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Log detail modal */}
      <Modal show={!!selectedLog} onHide={() => setSelectedLog(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Audit Log Details</Modal.Title>
        </Modal.Header>
        {selectedLog && (
          <Modal.Body>
            <Row>
              <Col md={6}>
                <strong>Action:</strong>
                <div className="mb-3">
                  <Badge bg={getActionBadgeVariant(selectedLog.action)}>
                    {selectedLog.action_display}
                  </Badge>
                </div>
                
                <strong>Object:</strong>
                <p>{selectedLog.object_repr}</p>
                
                <strong>User:</strong>
                <p>{selectedLog.user?.username} ({selectedLog.user?.email})</p>
                
                <strong>Timestamp:</strong>
                <p>{new Date(selectedLog.timestamp).toLocaleString()}</p>
              </Col>
              <Col md={6}>
                <strong>IP Address:</strong>
                <p>{selectedLog.ip_address || 'Not recorded'}</p>
                
                <strong>User Agent:</strong>
                <p className="small">{selectedLog.user_agent || 'Not recorded'}</p>
                
                <strong>App/Model:</strong>
                <p>{selectedLog.app_label} / {selectedLog.model_name}</p>
              </Col>
            </Row>
            
            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
              <>
                <hr />
                <strong>Changes:</strong>
                <pre className="bg-light p-3 rounded small">
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </>
            )}
          </Modal.Body>
        )}
      </Modal>
    </Container>
  );
};

export default AuditLogViewer;
