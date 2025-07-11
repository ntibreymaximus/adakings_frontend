import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import 'react-toastify/dist/ReactToastify.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');

    try {
      await login(username, password);
    } catch (error) {
      setLoginError(error.message);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center py-4 py-sm-0" style={{ backgroundColor: 'var(--ada-off-white)' }}>
      <Container className="px-4">
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={5}>
            {/* Brand Header */}
            <div className="text-center mb-3 mb-md-4">
              <h1 className="ada-text-primary mb-1 mb-md-2" style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }}>
                <i className="bi bi-shop me-2"></i>
                ADARESMANSYS
              </h1>
              <p className="text-muted">Adakings Restaurant Management System</p>
            </div>
            
            <Card className="mobile-friendly-card">
              <Card.Header>
                <h5 className="mb-0 text-center">
                  <i className="bi bi-person-circle me-2"></i>
                  Sign In
                </h5>
              </Card.Header>
              <Card.Body className="p-3 p-md-4">
                {loginError && (
                  <Alert variant="danger" className="mb-3 py-2">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <div>{loginError}</div>
                    </div>
                  </Alert>
                )}
                <Form onSubmit={handleLogin} className="login-form">
                  <Form.Group className="mb-3" controlId="username">
                    <Form.Label className="fw-medium" style={{ color: 'var(--ada-dark-gray)' }}>Username or Email</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter your username or email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      style={{ minHeight: '44px' }}
                      className="mb-1"
                      autoComplete="username"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="password">
                    <Form.Label className="fw-medium" style={{ color: 'var(--ada-dark-gray)' }}>Password</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ minHeight: '44px', paddingRight: '40px' }}
                        className="mb-1"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute end-0 top-0 h-100 d-flex align-items-center px-3"
                        style={{ 
                          border: 'none', 
                          background: 'none', 
                          color: 'var(--ada-dark-gray)',
                          zIndex: 10
                        }}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100" 
                    style={{ minHeight: '48px' }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing In...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Sign In
                      </>
                    )}
                  </Button>
                </Form>
                
                <div className="text-center mt-3 mt-md-4">
                  <small className="text-muted d-block">
                    Need help? Contact your administrator
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginPage;
