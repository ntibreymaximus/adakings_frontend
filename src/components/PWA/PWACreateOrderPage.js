import React from 'react';
import { Container, Button, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { usePWA } from '../../contexts/PWAContext';
import CreateOrderForm from '../../pages/CreateOrderForm';

const PWACreateOrderPage = () => {
  const navigate = useNavigate();
  const { isPWA, showMobileUI, getPWAClasses } = usePWA();

  const handleBackNavigation = () => {
    navigate('/dashboard');
  };

  return (
    <div className={`pwa-create-order ${getPWAClasses()}`}>
      <Container 
        className={`${isPWA ? 'pwa-container' : ''} mt-4`}
        fluid={isPWA}
      >
        {/* PWA-specific header */}
        {isPWA && (
          <Row className="mb-4">
            <Col>
              <div className="pwa-page-header d-flex align-items-center">
                <Button
                  variant="link"
                  className="p-0 me-3 text-decoration-none"
                  onClick={handleBackNavigation}
                  style={{ fontSize: '1.5rem', color: 'var(--ada-primary)' }}
                >
                  <i className="bi bi-arrow-left"></i>
                </Button>
                <div>
                  <h1 className="ada-text-primary mb-1" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                    Create New Order
                  </h1>
                  <p className="text-muted mb-0 small">
                    Add items and customer details
                  </p>
                </div>
              </div>
            </Col>
          </Row>
        )}

        {/* Order Form */}
        <Row>
          <Col>
            <div className={`${isPWA ? 'pwa-form-container' : ''}`}>
              <CreateOrderForm />
            </div>
          </Col>
        </Row>

        {/* Navigation buttons */}
        <Row className="mt-4">
          <Col className={`${isPWA ? '' : 'd-flex justify-content-center'}`}>
            {isPWA ? (
              // PWA layout - full width button
              <div className="d-grid">
                <Button
                  onClick={handleBackNavigation}
                  variant="secondary"
                  size="lg"
                  className="pwa-nav-button"
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Return to Dashboard
                </Button>
              </div>
            ) : (
              // Standard layout - centered button
              <Button
                as={Link}
                to="/dashboard"
                variant="secondary"
                className="d-flex align-items-center ada-shadow-sm"
              >
                <i className="bi bi-arrow-left me-2"></i>
                Return to Dashboard
              </Button>
            )}
          </Col>
        </Row>

        {/* PWA-specific spacing for bottom navigation */}
        {isPWA && <div style={{ height: '80px' }}></div>}
      </Container>

      <style jsx>{`
        .pwa-create-order {
          min-height: 100vh;
          background: ${isPWA ? 'var(--bs-body-bg)' : 'inherit'};
        }

        .pwa-container {
          padding-left: ${isPWA ? '16px' : 'inherit'};
          padding-right: ${isPWA ? '16px' : 'inherit'};
        }

        .pwa-page-header {
          padding: ${isPWA ? '16px 0' : '0'};
          border-bottom: ${isPWA ? '1px solid var(--ada-border-light)' : 'none'};
          margin-bottom: ${isPWA ? '20px' : '0'};
          background: ${isPWA ? 'var(--ada-white)' : 'transparent'};
          border-radius: ${isPWA ? '8px' : '0'};
          margin: ${isPWA ? '0 -16px 20px -16px' : '0'};
          padding: ${isPWA ? '16px' : '0'};
        }

        .pwa-form-container {
          background: ${isPWA ? 'var(--ada-white)' : 'transparent'};
          border-radius: ${isPWA ? '12px' : '0'};
          padding: ${isPWA ? '20px' : '0'};
          box-shadow: ${isPWA ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none'};
        }

        .pwa-nav-button {
          background-color: var(--ada-secondary);
          border-color: var(--ada-secondary);
          border-radius: 12px;
          padding: 16px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .pwa-nav-button:hover {
          background-color: var(--ada-secondary-dark);
          border-color: var(--ada-secondary-dark);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .pwa-nav-button:active {
          transform: translateY(1px);
        }

        /* Mobile specific styles */
        @media (max-width: 767.98px) {
          .pwa-create-order .container,
          .pwa-create-order .container-fluid {
            padding-left: 16px;
            padding-right: 16px;
          }
          
          .pwa-form-container {
            padding: ${isPWA ? '16px' : '0'};
            margin: ${isPWA ? '0 -16px' : '0'};
          }
          
          .pwa-page-header {
            margin: ${isPWA ? '0 -16px 16px -16px' : '0'};
            padding: ${isPWA ? '12px 16px' : '0'};
          }
        }

        /* Touch device optimizations */
        @media (hover: none) {
          .pwa-nav-button:hover {
            background-color: var(--ada-secondary);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          
          .pwa-nav-button:active {
            background-color: var(--ada-secondary-dark);
            transform: scale(0.98);
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .pwa-create-order {
            background: ${isPWA ? '#1a1a1a' : 'inherit'};
            color: #ffffff;
          }
          
          .pwa-form-container,
          .pwa-page-header {
            background-color: ${isPWA ? '#2a2a2a' : 'transparent'};
            border-color: #3a3a3a;
          }
        }

        /* Form optimizations for PWA */
        .pwa-form-container :global(.form-control) {
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 16px; /* Prevents zoom on iOS */
          border: 2px solid var(--ada-border-medium);
        }

        .pwa-form-container :global(.form-control:focus) {
          border-color: var(--ada-primary);
          box-shadow: 0 0 0 0.25rem rgba(30, 64, 175, 0.25);
        }

        .pwa-form-container :global(.btn) {
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 500;
        }

        .pwa-form-container :global(.card) {
          border-radius: 12px;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default PWACreateOrderPage;
