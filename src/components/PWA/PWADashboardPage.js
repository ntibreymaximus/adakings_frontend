import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../../contexts/PWAContext';
import optimizedToast, { contextToast } from '../../utils/toastUtils';
import RecentActivityCard from '../RecentActivityCard';

const PWADashboardPage = ({ userData }) => {
  const navigate = useNavigate();
  const { isPWA, showMobileUI, getPWAClasses } = usePWA();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDashboardAction = (actionTitle, route) => {
    navigate(route);
  };

  // Refresh function for pull-to-refresh
  const handleRefresh = async () => {
    contextToast.dataRefreshed();
    // Force refresh of RecentActivityCard by adding a small delay
    await new Promise(resolve => setTimeout(resolve, 500));
    // The RecentActivityCard component will handle its own refresh
    window.dispatchEvent(new CustomEvent('dashboardRefresh'));
  };

  // PWA-optimized card styles
  const pwaCardStyle = {
    cursor: 'pointer',
    minHeight: '160px',
    transition: 'all 0.3s ease',
    borderRadius: '12px',
    boxShadow: isPWA ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
    border: 'none',
    marginBottom: '16px'
  };

  const dashboardItems = [
    { 
      title: 'Create New Order', 
      route: '/create-order', 
      description: 'Start a new customer order',
      icon: 'bi bi-plus-circle-fill',
      color: 'var(--ada-primary)'
    },
    { 
      title: 'View Existing Orders', 
      route: '/view-orders', 
      description: 'Review and manage all current and past orders',
      icon: 'bi bi-list-ul',
      color: 'var(--ada-secondary)'
    },
    { 
      title: 'View Menu', 
      route: '/view-menu', 
      description: 'Browse the list of available menu items',
      icon: 'bi bi-book-fill',
      color: 'var(--ada-success)'
    },
    { 
      title: 'View Transactions', 
      route: '/view-transactions', 
      description: 'See a history of all financial transactions',
      icon: 'bi bi-credit-card-fill',
      color: 'var(--ada-info)'
    },
  ];

  return (
    <div className={`pwa-dashboard ${getPWAClasses()}`}>
        <Container
          className={`${isPWA ? 'pwa-container' : ''} my-3 my-md-4 px-3 px-md-4`}
          fluid={isPWA}
        >
          {/* PWA-specific header */}
          {isPWA && (
            <Row className="mb-4">
              <Col>
                <div className="pwa-header text-center">
                  <h1 className="ada-text-primary mb-2" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
                    Welcome to AdaKings
                  </h1>
                  <p className="text-muted mb-0">
                    Your restaurant management dashboard
                  </p>
                </div>
              </Col>
            </Row>
          )}

          {/* Dashboard cards */}
          <Row className="g-3 g-md-4">
            {dashboardItems.map((item, index) => (
              <Col xs={12} sm={6} lg={isPWA ? 6 : 3} key={item.title}>
                <Card 
                  className={`h-100 ${isPWA ? 'pwa-dashboard-card' : 'mobile-friendly-card'}`}
                  style={pwaCardStyle}
                  onClick={() => handleDashboardAction(item.title, item.route)}
                >
                  <Card.Body className="py-4 px-3 d-flex flex-column align-items-center text-center">
                    <div 
                      className="mb-3" 
                      style={{ 
                        fontSize: 'clamp(2.5rem, 5vw, 3rem)',
                        color: item.color || 'var(--ada-primary)'
                      }}
                    >
                      <i className={item.icon}></i>
                    </div>
                    <h5 className="ada-text-primary mb-2" style={{ fontSize: isPWA ? '1.1rem' : '1.25rem' }}>
                      {item.title}
                    </h5>
                    <p className="text-muted small mb-0 px-2">
                      {item.description}
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Recent Activity Card */}
          <Row className="mt-4">
            <Col xs={12}>
              <RecentActivityCard 
                maxItems={isPWA ? 4 : 5}
                showFullHistory={true}
                refreshInterval={60000}
                className={`ada-fade-in ${isPWA ? 'pwa-activity-card' : ''}`}
              />
            </Col>
          </Row>

          {/* PWA-specific footer */}
          {isPWA && (
            <Row className="mt-4 mb-2">
              <Col className="text-center">
                <small className="text-muted">
                  AdaKings PWA • Always at your fingertips
                </small>
              </Col>
            </Row>
          )}
        </Container>

      <style jsx>{`
        .pwa-dashboard {
          min-height: 100vh;
          background: ${isPWA ? 'var(--bs-body-bg)' : 'inherit'};
        }

        .pwa-container {
          padding-left: ${isPWA ? '16px' : 'inherit'};
          padding-right: ${isPWA ? '16px' : 'inherit'};
        }

        .pwa-header {
          padding: ${isPWA ? '20px 0' : '0'};
          border-bottom: ${isPWA ? '1px solid var(--ada-border-light)' : 'none'};
          margin-bottom: ${isPWA ? '20px' : '0'};
        }

        .pwa-dashboard-card {
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .pwa-dashboard-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .pwa-dashboard-card:active {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .pwa-activity-card {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        /* Touch device optimizations */
        @media (hover: none) {
          .pwa-dashboard-card:hover {
            transform: none;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .pwa-dashboard-card:active {
            background-color: rgba(0, 0, 0, 0.05);
            transform: scale(0.98);
          }
        }

        /* Mobile specific styles */
        @media (max-width: 767.98px) {
          .pwa-dashboard .container,
          .pwa-dashboard .container-fluid {
            padding-left: 16px;
            padding-right: 16px;
          }
          
          .pwa-dashboard-card {
            margin-bottom: 12px;
          }
          
          .pwa-dashboard-card .card-body {
            padding: 1.25rem 1rem;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .pwa-dashboard {
            background: ${isPWA ? '#1a1a1a' : 'inherit'};
            color: #ffffff;
          }
          
          .pwa-dashboard-card {
            background-color: #2a2a2a;
            border-color: #3a3a3a;
          }
          
          .pwa-header {
            border-bottom-color: #3a3a3a;
          }
        }
      `}</style>
    </div>
  );
};

export default PWADashboardPage;
