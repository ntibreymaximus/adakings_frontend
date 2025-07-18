import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
// import optimizedToast, { contextToast } from '../utils/toastUtils';
import RecentActivityCard from './RecentActivityCard';
import AuditActivityCard from './AuditActivityCard';

const DashboardPage = ({ userData }) => {
  const navigate = useNavigate();
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

  // Refresh function for pull-to-refresh - removed unused function

  // Custom styles for mobile optimization
  const mobileCardStyle = {
    cursor: 'pointer',
    minHeight: isMobile ? '140px' : '160px', // Original height
    transition: 'all 0.3s ease',
    borderRadius: '12px' // Add rounded corners
  };

  const dashboardItems = [
    { 
      title: 'Create New Order', 
      route: '/create-order', 
      description: 'Start a new customer order',
      icon: 'bi bi-plus-circle-fill'
    },
    { 
      title: 'View Existing Orders', 
      route: '/view-orders', 
      description: 'Review and manage all current and past orders',
      icon: 'bi bi-list-ul'
    },
    { 
      title: 'View Transactions', 
      route: '/view-transactions', 
      description: 'See a history of all financial transactions',
      icon: 'bi bi-credit-card-fill'
    },
  ];

  // Add admin-specific items
  const adminItems = [];
  
  // Add stats dashboard for admin and superadmin users
  if (userData && (userData.role === 'admin' || userData.role === 'superadmin')) {
    adminItems.push({
      title: 'Stats Dashboard',
      route: '/stats',
      description: 'View detailed statistics and analytics',
      icon: 'bi bi-bar-chart-line-fill'
    });
  }
  
  // Add audit logs item for superadmin users only
  if (userData && userData.role === 'superadmin') {
    adminItems.push({
      title: 'Audit Logs',
      route: '/audit-logs',
      description: 'View system activity logs and user actions',
      icon: 'bi bi-shield-check'
    });
  }

  const allDashboardItems = [...dashboardItems, ...adminItems];

  return (
      <Container className={isMobile ? "my-2 px-2" : "my-3 my-md-4 px-3 px-md-4"}>
        <Row className={isMobile ? "g-2" : "g-3 g-md-4"}>
        {allDashboardItems.map((item) => (
          <Col xs={6} sm={6} lg={3} key={item.title}>
            <Card 
              className="h-100 mobile-friendly-card" 
              style={mobileCardStyle}
              onClick={() => handleDashboardAction(item.title, item.route)}
            >
              <Card.Body className={isMobile ? "py-3 px-2 d-flex flex-column align-items-center justify-content-center text-center" : "py-4 px-3 d-flex flex-column align-items-center text-center"}>
                <div className="ada-text-primary mb-2" style={{ fontSize: isMobile ? 'clamp(2rem, 5vw, 2.5rem)' : 'clamp(2.5rem, 5vw, 3rem)' }}>
                  <i className={item.icon}></i>
                </div>
                <h6 className={`ada-text-primary mb-1 text-center ${isMobile ? '' : 'h5'}`} style={{ fontSize: isMobile ? '0.95rem' : undefined, fontWeight: '600' }}>{item.title}</h6>
                {isMobile && (
                  <p className="text-muted small mb-0 px-1 text-center" style={{ fontSize: '0.75rem', lineHeight: '1.3' }}>{item.description}</p>
                )}
                {!isMobile && (
                  <p className="text-muted small mb-0 px-2">{item.description}</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>


      {/* Quick Stats Card removed as requested */}

      {/* Recent Activity Card */}
      <Row className={isMobile ? "mt-3" : "mt-4"}>
        <Col xs={12} lg={userData && userData.role === 'superadmin' ? 8 : 12}>
          <RecentActivityCard 
            maxItems={isMobile ? 4 : 5}
            showFullHistory={true}
            refreshInterval={60000}
            className="ada-fade-in"
          />
        </Col>
        
        {/* Audit Activity Card - Only show for superadmin */}
        {userData && userData.role === 'superadmin' && (
          <Col xs={12} lg={4}>
            <AuditActivityCard 
              maxItems={5}
              className="ada-fade-in"
            />
          </Col>
        )}
      </Row>
      </Container>
  );
};

export default DashboardPage;

// CSS to add to theme.css
// 
// /* Mobile-friendly dashboard card enhancements */
// @media (max-width: 576px) {
//   .mobile-friendly-card {
//     margin-bottom: 0.75rem;
//     box-shadow: var(--ada-shadow-sm) !important;
//   }
//   
//   .mobile-friendly-card:active {
//     transform: scale(0.98);
//     box-shadow: var(--ada-shadow-sm) !important;
//   }
//   
//   .mobile-friendly-card .card-body {
//     padding: 1.25rem 1rem;
//   }
// }
// 
// /* Touch device optimizations */
// @media (hover: none) {
//   .mobile-friendly-card:hover {
//     transform: none;
//     box-shadow: var(--ada-shadow-sm);
//   }
//   
//   .mobile-friendly-card:active {
//     background-color: rgba(0, 0, 0, 0.05);
//   }
// }
