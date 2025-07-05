import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../../contexts/PWAContext';
import ViewOrdersPage from '../ViewOrdersPage';

const PWAViewOrdersPage = () => {
  const navigate = useNavigate();
  const { isPWA, showMobileUI, getPWAClasses } = usePWA();

  const handleBackNavigation = () => {
    navigate('/dashboard');
  };

  return (
    <div className={`pwa-view-orders ${getPWAClasses()}`}>
      {/* PWA-specific header */}
      {isPWA && (
        <div className="pwa-page-header">
          <Container fluid>
            <Row>
              <Col>
                <div className="d-flex align-items-center">
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
                      Orders
                    </h1>
                    <p className="text-muted mb-0 small">
                      Manage and track all orders
                    </p>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      )}

      {/* Orders content with PWA styling */}
      <div className={`${isPWA ? 'pwa-content-container' : ''}`}>
        <ViewOrdersPage />
      </div>

      {/* PWA-specific spacing for bottom navigation */}
      {isPWA && <div style={{ height: '80px' }}></div>}

      <style jsx>{`
        .pwa-view-orders {
          min-height: 100vh;
          background: ${isPWA ? 'var(--bs-body-bg)' : 'inherit'};
        }

        .pwa-page-header {
          background: ${isPWA ? 'var(--ada-white)' : 'transparent'};
          padding: ${isPWA ? '16px 0' : '0'};
          border-bottom: ${isPWA ? '1px solid var(--ada-border-light)' : 'none'};
          position: ${isPWA ? 'sticky' : 'static'};
          top: 0;
          z-index: 10;
          box-shadow: ${isPWA ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'};
        }

        .pwa-content-container {
          background: ${isPWA ? 'transparent' : 'inherit'};
          min-height: ${isPWA ? 'calc(100vh - 140px)' : 'auto'};
        }

        /* Override the original ViewOrdersPage container styles for PWA */
        .pwa-content-container :global(.container) {
          padding-left: ${isPWA ? '16px' : 'inherit'};
          padding-right: ${isPWA ? '16px' : 'inherit'};
          margin-top: ${isPWA ? '20px' : 'inherit'};
        }

        /* PWA-specific card optimizations */
        .pwa-content-container :global(.card) {
          border-radius: ${isPWA ? '12px' : 'inherit'};
          border: ${isPWA ? 'none' : 'inherit'};
          box-shadow: ${isPWA ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'inherit'};
          margin-bottom: ${isPWA ? '16px' : 'inherit'};
        }

        /* PWA-specific table optimizations */
        .pwa-content-container :global(.table) {
          font-size: ${isPWA ? '0.9rem' : 'inherit'};
          border-radius: ${isPWA ? '8px' : 'inherit'};
        }

        .pwa-content-container :global(.table thead th) {
          background-color: ${isPWA ? 'var(--ada-primary)' : 'inherit'};
          color: ${isPWA ? 'white' : 'inherit'};
          border: none;
          padding: ${isPWA ? '12px 8px' : 'inherit'};
          font-size: ${isPWA ? '0.85rem' : 'inherit'};
        }

        .pwa-content-container :global(.table tbody td) {
          padding: ${isPWA ? '10px 8px' : 'inherit'};
          border-top: ${isPWA ? '1px solid var(--ada-border-light)' : 'inherit'};
        }

        /* PWA-specific button optimizations */
        .pwa-content-container :global(.btn) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '8px 16px' : 'inherit'};
          font-size: ${isPWA ? '0.9rem' : 'inherit'};
        }

        .pwa-content-container :global(.btn-sm) {
          padding: ${isPWA ? '6px 12px' : 'inherit'};
          font-size: ${isPWA ? '0.8rem' : 'inherit'};
        }

        /* PWA-specific modal optimizations */
        .pwa-content-container :global(.modal-content) {
          border-radius: ${isPWA ? '16px' : 'inherit'};
          border: none;
          box-shadow: ${isPWA ? '0 8px 25px rgba(0, 0, 0, 0.15)' : 'inherit'};
        }

        .pwa-content-container :global(.modal-header) {
          background-color: ${isPWA ? 'var(--ada-primary)' : 'inherit'};
          color: ${isPWA ? 'white' : 'inherit'};
          border-bottom: none;
          border-radius: ${isPWA ? '16px 16px 0 0' : 'inherit'};
        }

        .pwa-content-container :global(.modal-title) {
          color: ${isPWA ? 'white' : 'inherit'};
          font-weight: 600;
        }

        .pwa-content-container :global(.modal-body) {
          padding: ${isPWA ? '20px' : 'inherit'};
        }

        /* Form optimizations for PWA */
        .pwa-content-container :global(.form-control) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '12px 16px' : 'inherit'};
          font-size: ${isPWA ? '16px' : 'inherit'}; /* Prevents zoom on iOS */
          border: ${isPWA ? '2px solid var(--ada-border-medium)' : 'inherit'};
        }

        .pwa-content-container :global(.form-control:focus) {
          border-color: ${isPWA ? 'var(--ada-primary)' : 'inherit'};
          box-shadow: ${isPWA ? '0 0 0 0.25rem rgba(30, 64, 175, 0.25)' : 'inherit'};
        }

        .pwa-content-container :global(.form-select) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '12px 16px' : 'inherit'};
          font-size: ${isPWA ? '16px' : 'inherit'};
          border: ${isPWA ? '2px solid var(--ada-border-medium)' : 'inherit'};
        }

        /* Mobile specific styles */
        @media (max-width: 767.98px) {
          .pwa-page-header {
            padding: ${isPWA ? '12px 0' : '0'};
          }
          
          .pwa-content-container :global(.container) {
            padding-left: 8px;
            padding-right: 8px;
          }
          
          .pwa-content-container :global(.table) {
            font-size: 0.8rem;
          }
          
          .pwa-content-container :global(.table thead th) {
            padding: 8px 4px;
            font-size: 0.75rem;
          }
          
          .pwa-content-container :global(.table tbody td) {
            padding: 8px 4px;
            font-size: 0.8rem;
          }
          
          .pwa-content-container :global(.btn) {
            font-size: 0.8rem;
            padding: 6px 12px;
          }
        }

        /* Touch device optimizations */
        @media (hover: none) {
          .pwa-content-container :global(.btn:hover) {
            transform: none;
          }
          
          .pwa-content-container :global(.btn:active) {
            transform: scale(0.98);
          }
          
          .pwa-content-container :global(.card:hover) {
            transform: none;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .pwa-view-orders {
            background: ${isPWA ? '#1a1a1a' : 'inherit'};
            color: #ffffff;
          }
          
          .pwa-page-header {
            background-color: ${isPWA ? '#2a2a2a' : 'transparent'};
            border-bottom-color: #3a3a3a;
          }
          
          .pwa-content-container :global(.card) {
            background-color: ${isPWA ? '#2a2a2a' : 'inherit'};
          }
          
          .pwa-content-container :global(.table) {
            background-color: ${isPWA ? '#2a2a2a' : 'inherit'};
            color: #ffffff;
          }
          
          .pwa-content-container :global(.modal-content) {
            background-color: ${isPWA ? '#2a2a2a' : 'inherit'};
            color: #ffffff;
          }
        }

        /* Loading states specific to PWA */
        .pwa-content-container :global(.loading-overlay) {
          border-radius: ${isPWA ? '12px' : 'inherit'};
          background: ${isPWA ? 'rgba(255, 255, 255, 0.9)' : 'inherit'};
        }

        /* Pagination styling for PWA */
        .pwa-content-container :global(.pagination) {
          margin-bottom: ${isPWA ? '20px' : 'inherit'};
        }

        .pwa-content-container :global(.page-link) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          margin: ${isPWA ? '0 2px' : 'inherit'};
          border: ${isPWA ? '2px solid var(--ada-border-light)' : 'inherit'};
        }

        .pwa-content-container :global(.page-item.active .page-link) {
          background-color: ${isPWA ? 'var(--ada-primary)' : 'inherit'};
          border-color: ${isPWA ? 'var(--ada-primary)' : 'inherit'};
        }
      `}</style>
    </div>
  );
};

export default PWAViewOrdersPage;
