import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../../contexts/PWAContext';
import ViewMenuPage from '../ViewMenuPage';

const PWAViewMenuPage = () => {
  const navigate = useNavigate();
  const { isPWA, showMobileUI, getPWAClasses } = usePWA();

  const handleBackNavigation = () => {
    navigate('/dashboard');
  };

  return (
    <div className={`pwa-view-menu ${getPWAClasses()}`}>
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
                      Menu
                    </h1>
                    <p className="text-muted mb-0 small">
                      Browse available menu items
                    </p>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      )}

      {/* Menu content with PWA styling */}
      <div className={`${isPWA ? 'pwa-content-container' : ''}`}>
        <ViewMenuPage />
      </div>

      {/* PWA-specific spacing for bottom navigation */}
      {isPWA && <div style={{ height: '80px' }}></div>}

      <style jsx>{`
        .pwa-view-menu {
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

        /* Override the original ViewMenuPage container styles for PWA */
        .pwa-content-container :global(.container) {
          padding-left: ${isPWA ? '16px' : 'inherit'};
          padding-right: ${isPWA ? '16px' : 'inherit'};
          margin-top: ${isPWA ? '20px' : 'inherit'};
        }

        /* PWA-specific card optimizations for menu items */
        .pwa-content-container :global(.card) {
          border-radius: ${isPWA ? '12px' : 'inherit'};
          border: ${isPWA ? 'none' : 'inherit'};
          box-shadow: ${isPWA ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'inherit'};
          margin-bottom: ${isPWA ? '16px' : 'inherit'};
          transition: ${isPWA ? 'all 0.3s ease' : 'inherit'};
        }

        .pwa-content-container :global(.card:hover) {
          transform: ${isPWA ? 'translateY(-2px)' : 'inherit'};
          box-shadow: ${isPWA ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'inherit'};
        }

        /* PWA-specific table optimizations */
        .pwa-content-container :global(.table) {
          font-size: ${isPWA ? '0.9rem' : 'inherit'};
          border-radius: ${isPWA ? '8px' : 'inherit'};
          overflow: hidden;
        }

        .pwa-content-container :global(.table thead th) {
          background-color: ${isPWA ? 'var(--ada-success)' : 'inherit'};
          color: ${isPWA ? 'white' : 'inherit'};
          border: none;
          padding: ${isPWA ? '12px 8px' : 'inherit'};
          font-size: ${isPWA ? '0.85rem' : 'inherit'};
          font-weight: 600;
        }

        .pwa-content-container :global(.table tbody td) {
          padding: ${isPWA ? '12px 8px' : 'inherit'};
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

        /* PWA-specific badge optimizations */
        .pwa-content-container :global(.badge) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '6px 12px' : 'inherit'};
          font-size: ${isPWA ? '0.8rem' : 'inherit'};
          font-weight: 500;
        }

        /* Menu item specific styling */
        .pwa-content-container :global(.menu-item-card) {
          cursor: ${isPWA ? 'pointer' : 'inherit'};
          transition: ${isPWA ? 'all 0.2s ease' : 'inherit'};
        }

        .pwa-content-container :global(.menu-item-card:active) {
          transform: ${isPWA ? 'scale(0.98)' : 'inherit'};
        }

        /* Price highlighting */
        .pwa-content-container :global(.price-highlight) {
          color: ${isPWA ? 'var(--ada-success)' : 'inherit'};
          font-weight: ${isPWA ? '600' : 'inherit'};
          font-size: ${isPWA ? '1.1rem' : 'inherit'};
        }

        /* Category headers */
        .pwa-content-container :global(.category-header) {
          background: ${isPWA ? 'var(--ada-primary-subtle)' : 'inherit'};
          color: ${isPWA ? 'var(--ada-primary-dark)' : 'inherit'};
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '12px 16px' : 'inherit'};
          margin: ${isPWA ? '20px 0 12px 0' : 'inherit'};
          font-weight: 600;
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
          
          .pwa-content-container :global(.card) {
            margin-bottom: 12px;
          }
        }

        /* Touch device optimizations */
        @media (hover: none) {
          .pwa-content-container :global(.card:hover) {
            transform: none;
            box-shadow: ${isPWA ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'inherit'};
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
          .pwa-view-menu {
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
          
          .pwa-content-container :global(.category-header) {
            background-color: ${isPWA ? '#3a3a3a' : 'inherit'};
            color: #ffffff;
          }
        }

        /* Loading states specific to PWA */
        .pwa-content-container :global(.loading-overlay) {
          border-radius: ${isPWA ? '12px' : 'inherit'};
          background: ${isPWA ? 'rgba(255, 255, 255, 0.9)' : 'inherit'};
        }

        /* Search and filter styling */
        .pwa-content-container :global(.search-container) {
          background: ${isPWA ? 'var(--ada-white)' : 'inherit'};
          border-radius: ${isPWA ? '12px' : 'inherit'};
          padding: ${isPWA ? '16px' : 'inherit'};
          margin-bottom: ${isPWA ? '16px' : 'inherit'};
          box-shadow: ${isPWA ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'inherit'};
        }

        .pwa-content-container :global(.form-control) {
          border-radius: ${isPWA ? '8px' : 'inherit'};
          padding: ${isPWA ? '12px 16px' : 'inherit'};
          font-size: ${isPWA ? '16px' : 'inherit'}; /* Prevents zoom on iOS */
          border: ${isPWA ? '2px solid var(--ada-border-medium)' : 'inherit'};
        }

        .pwa-content-container :global(.form-control:focus) {
          border-color: ${isPWA ? 'var(--ada-success)' : 'inherit'};
          box-shadow: ${isPWA ? '0 0 0 0.25rem rgba(40, 167, 69, 0.25)' : 'inherit'};
        }
      `}</style>
    </div>
  );
};

export default PWAViewMenuPage;
