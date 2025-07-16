import React, { useState } from 'react';
import { Navbar, Nav, Container, Modal, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import SessionTimer from './SessionTimer';

const NavbarComponent = ({ userData, onLogout }) => {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Handle window resize for mobile detection
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    setShowProfileModal(false);
    onLogout();
    navigate('/login');
  };
  
  const handleProfileClick = () => {
    setShowProfileModal(false);
    navigate('/profile');
  };
  
  return (
    <>
      <Navbar bg="light" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/dashboard">
            ADARESMANSYS
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {/* Add navigation links here if needed */}
            </Nav>
            
            {userData && (
              <div className="d-flex align-items-center gap-3">
                <SessionTimer />
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="d-flex align-items-center"
                  onClick={() => setShowProfileModal(true)}
                >
                  <i className="bi bi-person-circle me-1"></i>
                  <span>{userData.username}</span>
                </Button>
              </div>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Profile Modal */}
      <Modal 
        show={showProfileModal} 
        onHide={() => setShowProfileModal(false)} 
        centered
        size={isMobile ? undefined : "sm"}
        fullscreen={isMobile ? "sm-down" : false}
      >
        <Modal.Header closeButton>
          <Modal.Title>User Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 position-relative">
          <div className="list-group list-group-flush">
            {/* User Info */}
            <div className="list-group-item bg-light text-center py-3">
              <i className="bi bi-person-circle text-primary mb-2" style={{ fontSize: '2rem' }}></i>
              <div className="fw-bold">{userData?.username}</div>
              <small className="text-muted">{userData?.role || 'Staff'}</small>
            </div>
            
            {/* Profile Option */}
            <button 
              className="list-group-item list-group-item-action d-flex align-items-center justify-content-start py-3"
              style={{ textAlign: 'left' }}
              onClick={handleProfileClick}
            >
              <i className="bi bi-person me-3 text-primary" style={{ fontSize: '1.2rem' }}></i>
              <div style={{ textAlign: 'left' }}>
                <div className="fw-semibold">Profile</div>
                <small className="text-muted">Manage your account</small>
              </div>
            </button>
            
            {/* Settings Option */}
            <button 
              className="list-group-item list-group-item-action d-flex align-items-center justify-content-start py-3"
              style={{ textAlign: 'left' }}
              onClick={() => {
                setShowProfileModal(false);
                // Navigate to settings when implemented
              }}
            >
              <i className="bi bi-gear me-3 text-secondary" style={{ fontSize: '1.2rem' }}></i>
              <div style={{ textAlign: 'left' }}>
                <div className="fw-semibold">Settings</div>
                <small className="text-muted">App preferences</small>
              </div>
            </button>
            
            <hr className="my-0" />
            
            {/* Logout Option */}
            <button 
              className="list-group-item list-group-item-action d-flex align-items-center justify-content-start py-3 text-danger"
              style={{ textAlign: 'left' }}
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-3" style={{ fontSize: '1.2rem' }}></i>
              <div style={{ textAlign: 'left' }}>
                <div className="fw-semibold">Logout</div>
                <small className="text-muted">Sign out of your account</small>
              </div>
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default NavbarComponent;
