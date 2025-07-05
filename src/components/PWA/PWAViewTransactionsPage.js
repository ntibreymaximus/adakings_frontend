import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../../contexts/PWAContext';
import ViewTransactionsPage from '../ViewTransactionsPage';

const PWAViewTransactionsPage = () => {
  const navigate = useNavigate();
  const { isPWA, showMobileUI, getPWAClasses } = usePWA();

  const handleBackNavigation = () => {
    navigate('/dashboard');
  };

  return (
    <div className={`pwa-view-transactions ${getPWAClasses()}`}>
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
                      Transactions
                    </h1>
                    <p className="text-muted mb-0 small">
                      View financial transaction history
                    </p>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      )}

      {/* Transactions content with PWA styling */}
      <div className={`${isPWA ? 'pwa-content-container' : ''}`}>
        <ViewTransactionsPage />
      </div>

      {/* PWA-specific spacing for bottom navigation */}
      {isPWA && <div style={{ height: '80px' }}></div>}

      <style jsx>{`
        .pwa-view-transactions {
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

        /* Override the original ViewTransactionsPage container styles for PWA */
        .pwa-content-container :global(.container) {
          padding-left: ${isPWA ? '16px' : 'inherit'};
          padding-right: ${isPWA ? '16px' : 'inherit'};
          margin-top: ${isPWA ? '20px' : 'inherit'};
        }

        /* PWA-specific card optimizations for transactions */
        .pwa-content-container :global(.card) {
          border-radius: ${isPWA ? '12px' : 'inherit'};
          border: ${isPWA ? 'none' : 'inherit'};
          box-shadow: ${isPWA ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'inherit'};
          margin-bottom: ${isPWA ? '16px' : 'inherit'};
          transition: ${isPWA ? 'all 0.3s ease' : 'inherit'};
        }

        /* PWA-specific table optimizations */
        .pwa-content-container :global(.table) {
          font-size: ${isPWA ? '0.9rem' : 'inherit'};
          border-radius: ${isPWA ? '8px' : 'inherit'};
          overflow: hidden;
        }

        .pwa-content-container :global(.table thead th) {
          background-color: ${isPWA ? 'var(--ada-info)' : 'inherit'};
          color: ${isPWA ? 'white' : 'inherit'};
          border: none;
          padding: ${isPWA ? '12px 8px' : 'inherit'};
          font-size: ${isPWA ? '0.85rem' : 'inherit'};
          font-weight: 600;
        }

        .pwa-content-container :global(.table tbody td) {
          padding: ${isPWA ? '10px 8px' : 'inherit'};
          border-top: ${isPWA ? '1px solid var(--ada-border-light)' : 'inherit'};
          vertical-align: middle;
        }

        /* PWA-specific button optimizations */
        .pwa-content-container :global(.btn) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '8px 16px' : 'inherit'};
          font-size: ${isPWA ? '0.9rem' : 'inherit'};
          font-weight: 500;
        }

        .pwa-content-container :global(.btn-sm) {
          padding: ${isPWA ? '6px 12px' : 'inherit'};
          font-size: ${isPWA ? '0.8rem' : 'inherit'};
        }

        /* PWA-specific badge optimizations for transaction status */
        .pwa-content-container :global(.badge) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '6px 12px' : 'inherit'};
          font-size: ${isPWA ? '0.8rem' : 'inherit'};
          font-weight: 500;
        }

        /* Transaction amount highlighting */
        .pwa-content-container :global(.amount-positive) {
          color: ${isPWA ? 'var(--ada-success)' : 'inherit'};
          font-weight: ${isPWA ? '600' : 'inherit'};
        }

        .pwa-content-container :global(.amount-negative) {
          color: ${isPWA ? 'var(--ada-danger)' : 'inherit'};
          font-weight: ${isPWA ? '600' : 'inherit'};
        }

        .pwa-content-container :global(.amount-neutral) {
          color: ${isPWA ? 'var(--ada-info)' : 'inherit'};
          font-weight: ${isPWA ? '600' : 'inherit'};
        }

        /* Date range picker styling */
        .pwa-content-container :global(.date-picker-container) {
          background: ${isPWA ? 'var(--ada-white)' : 'inherit'};
          border-radius: ${isPWA ? '12px' : 'inherit'};
          padding: ${isPWA ? '16px' : 'inherit'};
          margin-bottom: ${isPWA ? '16px' : 'inherit'};
          box-shadow: ${isPWA ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'inherit'};
        }

        /* Summary cards for PWA */
        .pwa-content-container :global(.summary-card) {
          background: ${isPWA ? 'linear-gradient(135deg, var(--ada-primary), var(--ada-primary-dark))' : 'inherit'};
          color: ${isPWA ? 'white' : 'inherit'};
          border-radius: ${isPWA ? '12px' : 'inherit'};
          border: none;
          box-shadow: ${isPWA ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'inherit'};
          margin-bottom: ${isPWA ? '16px' : 'inherit'};
        }

        .pwa-content-container :global(.summary-card .card-body) {
          text-align: center;
          padding: ${isPWA ? '20px' : 'inherit'};
        }

        .pwa-content-container :global(.summary-value) {
          font-size: ${isPWA ? '1.5rem' : 'inherit'};
          font-weight: 700;
          margin-bottom: ${isPWA ? '8px' : 'inherit'};
        }

        .pwa-content-container :global(.summary-label) {
          font-size: ${isPWA ? '0.9rem' : 'inherit'};
          opacity: 0.9;
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
          
          .pwa-content-container :global(.summary-value) {
            font-size: 1.25rem;
          }
          
          .pwa-content-container :global(.summary-label) {
            font-size: 0.8rem;
          }
        }

        /* Touch device optimizations */
        @media (hover: none) {
          .pwa-content-container :global(.card:hover) {
            transform: none;
          }
          
          .pwa-content-container :global(.btn:hover) {
            transform: none;
          }
          
          .pwa-content-container :global(.btn:active) {
            transform: scale(0.98);
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .pwa-view-transactions {
            background: ${isPWA ? '#1a1a1a' : 'inherit'};
            color: #ffffff;
          }
          
          .pwa-page-header {
            background-color: ${isPWA ? '#2a2a2a' : 'transparent'};
            border-bottom-color: #3a3a3a;
          }
          
          .pwa-content-container :global(.card) {
            background-color: ${isPWA ? '#2a2a2a' : 'inherit'};
            color: #ffffff;
          }
          
          .pwa-content-container :global(.table) {
            background-color: ${isPWA ? '#2a2a2a' : 'inherit'};
            color: #ffffff;
          }
          
          .pwa-content-container :global(.date-picker-container) {
            background-color: ${isPWA ? '#2a2a2a' : 'inherit'};
            color: #ffffff;
          }
          
          .pwa-content-container :global(.summary-card) {
            background: ${isPWA ? 'linear-gradient(135deg, #2a2a2a, #3a3a3a)' : 'inherit'};
          }
        }

        /* Loading states specific to PWA */
        .pwa-content-container :global(.loading-overlay) {
          border-radius: ${isPWA ? '12px' : 'inherit'};
          background: ${isPWA ? 'rgba(255, 255, 255, 0.9)' : 'inherit'};
        }

        /* Form optimizations for PWA */
        .pwa-content-container :global(.form-control) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '12px 16px' : 'inherit'};
          font-size: ${isPWA ? '16px' : 'inherit'}; /* Prevents zoom on iOS */
          border: ${isPWA ? '2px solid var(--ada-border-medium)' : 'inherit'};
        }

        .pwa-content-container :global(.form-control:focus) {
          border-color: ${isPWA ? 'var(--ada-info)' : 'inherit'};
          box-shadow: ${isPWA ? '0 0 0 0.25rem rgba(23, 162, 184, 0.25)' : 'inherit'};
        }

        .pwa-content-container :global(.form-select) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '12px 16px' : 'inherit'};
          font-size: ${isPWA ? '16px' : 'inherit'};
          border: ${isPWA ? '2px solid var(--ada-border-medium)' : 'inherit'};
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
          background-color: ${isPWA ? 'var(--ada-info)' : 'inherit'};
          border-color: ${isPWA ? 'var(--ada-info)' : 'inherit'};
        }

        /* Transaction status styling */
        .pwa-content-container :global(.status-completed) {
          background-color: ${isPWA ? 'var(--ada-success)' : 'inherit'};
          color: white;
        }

        .pwa-content-container :global(.status-pending) {
          background-color: ${isPWA ? 'var(--ada-warning)' : 'inherit'};
          color: var(--ada-charcoal);
        }

        .pwa-content-container :global(.status-failed) {
          background-color: ${isPWA ? 'var(--ada-danger)' : 'inherit'};
          color: white;
        }

        .pwa-content-container :global(.status-cancelled) {
          background-color: ${isPWA ? 'var(--ada-gray)' : 'inherit'};
          color: white;
        }
      `}</style>
    </div>
  );
};

export default PWAViewTransactionsPage;
