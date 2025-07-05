import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNavBar.css';

/**
 * BottomNavBar - Mobile and PWA navigation component for dashboard pages
 * 
 * Displays a fixed bottom navigation with 5 main dashboard actions:
 * - Dashboard (home)
 * - Create Order
 * - View Orders
 * - View Menu
 * - View Transactions (Payments)
 * 
 * Visible on:
 * - Mobile devices (< 768px width)
 * - PWA mode (all screen sizes when running as installed app)
 * 
 * Uses AdaKings theme colors and responsive design
 */
const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'bi bi-house-fill',
      route: '/dashboard',
      activeRoutes: ['/dashboard']
    },
    {
      id: 'create-order',
      label: 'Create',
      icon: 'bi bi-plus-circle-fill',
      route: '/create-order',
      activeRoutes: ['/create-order']
    },
    {
      id: 'view-orders',
      label: 'Orders',
      icon: 'bi bi-list-ul',
      route: '/view-orders',
      activeRoutes: ['/view-orders', '/edit-order']
    },
    {
      id: 'view-menu',
      label: 'Menu',
      icon: 'bi bi-book-fill',
      route: '/view-menu',
      activeRoutes: ['/view-menu']
    },
    {
      id: 'view-transactions',
      label: 'Payments',
      icon: 'bi bi-credit-card-fill',
      route: '/view-transactions',
      activeRoutes: ['/view-transactions']
    }
  ];

  const handleNavigation = (route) => {
    navigate(route);
  };

  const isActive = (item) => {
    return item.activeRoutes.some(route => {
      if (route === '/edit-order') {
        return location.pathname.startsWith('/edit-order');
      }
      return location.pathname === route;
    });
  };

  return (
    <nav className="bottom-nav-bar">
      <div className="bottom-nav-container">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-item ${isActive(item) ? 'active' : ''}`}
            onClick={() => handleNavigation(item.route)}
            aria-label={item.label}
          >
            <div className="bottom-nav-icon">
              <i className={item.icon}></i>
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavBar;
