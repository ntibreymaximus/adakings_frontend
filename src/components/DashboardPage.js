import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import RecentActivityCard from './RecentActivityCard';

const DashboardPage = ({ userData }) => {
  const navigate = useNavigate();

  const handleDashboardAction = (actionTitle, route) => {
    console.log(`${actionTitle} clicked, navigating to ${route}`);
    navigate(route);
  };

  // Custom styles for mobile optimization
  const mobileCardStyle = {
    cursor: 'pointer',
    minHeight: '160px', // Ensure consistent height
    transition: 'all 0.3s ease'
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
      title: 'View Menu', 
      route: '/view-menu', 
      description: 'Browse the list of available menu items',
      icon: 'bi bi-book-fill'
    },
    { 
      title: 'View Transactions', 
      route: '/view-transactions', 
      description: 'See a history of all financial transactions',
      icon: 'bi bi-credit-card-fill'
    },
  ];

  return (
    <Container className="my-3 my-md-4 px-3 px-md-4">
      <Row className="g-3 g-md-4">
        {dashboardItems.map((item) => (
          <Col xs={12} sm={6} lg={3} key={item.title}>
            <Card 
              className="h-100 mobile-friendly-card" 
              style={mobileCardStyle}
              onClick={() => handleDashboardAction(item.title, item.route)}
            >
              <Card.Body className="py-4 px-3 d-flex flex-column align-items-center text-center">
                <div className="ada-text-primary mb-3" style={{ fontSize: 'clamp(2.5rem, 5vw, 3rem)' }}>
                  <i className={item.icon}></i>
                </div>
                <h5 className="ada-text-primary mb-2">{item.title}</h5>
                <p className="text-muted small mb-0 px-2">{item.description}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Recent Activity Card */}
      <Row className="mt-4">
        <Col xs={12}>
          <RecentActivityCard 
            maxItems={5}
            showFullHistory={true}
            refreshInterval={30000}
            className="ada-fade-in"
          />
        </Col>
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
