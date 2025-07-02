import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const MobileNavbar = ({ userData, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const handleLogout = () => {
    setShowProfileModal(false);
    onLogout();
    navigate('/login');
  };
  
  const handleProfileClick = () => {
    setShowProfileModal(false);
    navigate('/profile');
  };

  const isActive = (path) => location.pathname === path;
  
  return (
    <>
      {/* Bottom Navigation */}
      <div className="pwa-bottom-nav">
        <Link 
          to="/create-order" 
          className={`pwa-nav-item ${isActive('/create-order') ? 'active' : ''}`}
        >
          <div className="pwa-nav-icon">
            <i className="bi bi-plus-circle-fill"></i>
          </div>
          <div className="pwa-nav-label">Create</div>
        </Link>

        <Link 
          to="/view-orders" 
          className={`pwa-nav-item ${isActive('/view-orders') ? 'active' : ''}`}
        >
          <div className="pwa-nav-icon">
            <i className="bi bi-list-ul"></i>
          </div>
          <div className="pwa-nav-label">Orders</div>
        </Link>

        <Link 
          to="/dashboard" 
          className={`pwa-nav-item pwa-nav-home ${isActive('/dashboard') ? 'active' : ''}`}
        >
          <div className="pwa-nav-icon pwa-nav-home-icon">
            <i className="bi bi-house-fill"></i>
          </div>
          <div className="pwa-nav-label">Home</div>
        </Link>

        <Link 
          to="/view-menu" 
          className={`pwa-nav-item ${isActive('/view-menu') ? 'active' : ''}`}
        >
          <div className="pwa-nav-icon">
            <i className="bi bi-book-fill"></i>
          </div>
          <div className="pwa-nav-label">Menu</div>
        </Link>

        <Link 
          to="/view-transactions" 
          className={`pwa-nav-item ${isActive('/view-transactions') ? 'active' : ''}`}
        >
          <div className="pwa-nav-icon">
            <i className="bi bi-credit-card-fill"></i>
          </div>
          <div className="pwa-nav-label">Transactions</div>
        </Link>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="pwa-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <div className="pwa-modal-title">Account</div>
            </div>
            
            <div className="pwa-list">
              <div className="pwa-list-item">
                <div className="pwa-list-icon">
                  <i className="bi bi-person-circle"></i>
                </div>
                <div className="pwa-list-content">
                  <div className="pwa-list-title">{userData?.username}</div>
                  <div className="pwa-list-subtitle">{userData?.role || 'Staff'}</div>
                </div>
              </div>
              
              <button 
                className="pwa-list-item"
                onClick={handleProfileClick}
                style={{
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div className="pwa-list-icon">
                  <i className="bi bi-person"></i>
                </div>
                <div className="pwa-list-content">
                  <div className="pwa-list-title">Profile</div>
                  <div className="pwa-list-subtitle">Manage your account</div>
                </div>
                <div className="pwa-list-action">
                  <i className="bi bi-chevron-right"></i>
                </div>
              </button>
              
              <button 
                className="pwa-list-item"
                onClick={() => {
                  setShowProfileModal(false);
                  // Navigate to settings when implemented
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div className="pwa-list-icon">
                  <i className="bi bi-gear"></i>
                </div>
                <div className="pwa-list-content">
                  <div className="pwa-list-title">Settings</div>
                  <div className="pwa-list-subtitle">App preferences</div>
                </div>
                <div className="pwa-list-action">
                  <i className="bi bi-chevron-right"></i>
                </div>
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <button 
                  className="pwa-list-item"
                  onClick={() => {
                    setShowProfileModal(false);
                    navigate('/debug-stats');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div className="pwa-list-icon">
                    <i className="bi bi-bug"></i>
                  </div>
                  <div className="pwa-list-content">
                    <div className="pwa-list-title">Debug Stats</div>
                    <div className="pwa-list-subtitle">Diagnostic tools</div>
                  </div>
                  <div className="pwa-list-action">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </button>
              )}
            </div>
            
            <div className="pwa-modal-actions">
              <button 
                className="pwa-btn pwa-btn-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right"></i>
                Logout
              </button>
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowProfileModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavbar;
