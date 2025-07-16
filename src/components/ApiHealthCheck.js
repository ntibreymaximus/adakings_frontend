import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { tokenFetch } from '../utils/tokenFetch';
import { API_BASE_URL, API_ENDPOINTS } from '../utils/api';

const ApiHealthCheck = () => {
  const [healthStatus, setHealthStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const endpoints = [
    { name: 'API Base', url: API_BASE_URL, method: 'GET' },
    { name: 'Health Check', url: API_ENDPOINTS.HEALTH, method: 'GET' },
    { name: 'Audit Logs', url: API_ENDPOINTS.AUDIT_LOGS, method: 'GET' },
    { name: 'Audit Dashboard', url: API_ENDPOINTS.AUDIT_DASHBOARD, method: 'GET' },
  ];

  const checkEndpoint = async (endpoint) => {
    try {
      console.log(`Checking ${endpoint.name}: ${endpoint.url}`);
      const response = await tokenFetch(endpoint.url, { method: endpoint.method });
      
      // Get response details
      const contentType = response.headers.get('content-type');
      let responseData = null;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType,
        dataPreview: JSON.stringify(responseData).substring(0, 100) + '...'
      };
    } catch (error) {
      console.error(`Error checking ${endpoint.name}:`, error);
      return {
        status: 'ERROR',
        statusText: error.message,
        ok: false,
        error: error.toString()
      };
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);
    const results = {};

    for (const endpoint of endpoints) {
      results[endpoint.name] = await checkEndpoint(endpoint);
    }

    setHealthStatus(results);
    setLoading(false);
  };

  useEffect(() => {
    // Show current configuration
    console.log('Current API Configuration:');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('Frontend URL:', window.location.hostname);
    console.log('Protocol:', window.location.protocol);
  }, []);

  const getStatusBadge = (result) => {
    if (!result) return null;
    
    if (result.ok) {
      return <Badge bg="success">OK</Badge>;
    } else if (result.status === 'ERROR') {
      return <Badge bg="danger">ERROR</Badge>;
    } else if (result.status >= 500) {
      return <Badge bg="danger">Server Error</Badge>;
    } else if (result.status >= 400) {
      return <Badge bg="warning">Client Error</Badge>;
    } else {
      return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  return (
    <Container className="my-4">
      <Card>
        <Card.Header>
          <h4>API Health Check</h4>
          <small className="text-muted">Debug tool for checking API connectivity</small>
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <p><strong>Current Configuration:</strong></p>
            <ul>
              <li>API Base URL: <code>{API_BASE_URL}</code></li>
              <li>Frontend URL: <code>{window.location.hostname}</code></li>
              <li>Protocol: <code>{window.location.protocol}</code></li>
            </ul>
          </div>

          <Button 
            variant="primary" 
            onClick={runHealthCheck} 
            disabled={loading}
            className="mb-3"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Running Health Check...
              </>
            ) : (
              'Run Health Check'
            )}
          </Button>

          {error && (
            <Alert variant="danger">
              <Alert.Heading>Error</Alert.Heading>
              <p>{error}</p>
            </Alert>
          )}

          {Object.keys(healthStatus).length > 0 && (
            <div>
              <h5>Endpoint Status:</h5>
              {endpoints.map((endpoint) => {
                const result = healthStatus[endpoint.name];
                return (
                  <Card key={endpoint.name} className="mb-2">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6>{endpoint.name} {getStatusBadge(result)}</h6>
                          <p className="mb-1"><small className="text-muted">{endpoint.url}</small></p>
                          {result && (
                            <>
                              <p className="mb-1">
                                Status: {result.status} {result.statusText}
                              </p>
                              {result.contentType && (
                                <p className="mb-1">Content-Type: {result.contentType}</p>
                              )}
                              {result.error && (
                                <Alert variant="danger" className="mt-2 mb-0">
                                  <small>{result.error}</small>
                                </Alert>
                              )}
                              {result.dataPreview && result.ok && (
                                <details className="mt-2">
                                  <summary>Response Preview</summary>
                                  <pre className="mt-2 p-2 bg-light rounded">
                                    <code>{result.dataPreview}</code>
                                  </pre>
                                </details>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}

          <Alert variant="info" className="mt-3">
            <Alert.Heading>Troubleshooting Tips:</Alert.Heading>
            <ul className="mb-0">
              <li>If you see "Server Error" (500), the backend server is having issues</li>
              <li>If you see "Client Error" (401), check your authentication token</li>
              <li>If you see "ERROR", there might be a network/CORS issue</li>
              <li>Check the browser console for more detailed error messages</li>
            </ul>
          </Alert>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ApiHealthCheck;
