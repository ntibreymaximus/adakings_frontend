import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import UserProfilePage from './components/UserProfilePage';
import DashboardPage from './components/DashboardPage';
import CreateOrderPage from './pages/CreateOrderForm';
import ViewOrdersPage from './components/ViewOrdersPage';
import ViewMenuPage from './components/ViewMenuPage';
import ViewTransactionsPage from './components/ViewTransactionsPage';
import TransactionDebugger from './components/TransactionDebugger';
import StatsDebugger from './components/StatsDebugger';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import MobileNavbar from './components/MobileNavbar';
import PWADashboard from './components/PWADashboard';
import PWALogin from './components/PWALogin';
import PWAProfile from './components/PWAProfile';
import PWAOrders from './components/PWAOrders';
import PWAOrderDetails from './components/PWAOrderDetails';
import PWAMenu from './components/PWAMenu';
import PWATransactions from './components/PWATransactions';
import PWACreateOrder from './components/PWACreateOrder';
import PWAEditOrder from './components/PWAEditOrder';
import AuthTest from './components/AuthTest';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/theme.css';
import './App.css';
import { usePWA } from './hooks/usePWA';

// Create a separate component for the main app logic
function AppContent() {
  const [userData, setUserData] = useState(() => {
    try {
      const storedUserData = localStorage.getItem('userData');
      const token = localStorage.getItem('token');
      if (storedUserData && token) {
        return JSON.parse(storedUserData);
      }
    } catch (error) {
      console.error("Failed to parse user data from localStorage", error);
      return null;
    }
    return null;
  });
  const { isPWA, isInstallable, installPWA } = usePWA();
  const navigate = useNavigate();

  // Dynamic CSS import for PWA mode
  React.useEffect(() => {
    if (isPWA) {
      import('./styles/mobile-native.css');
    }
  }, [isPWA]);

  const handleLoginSuccess = (data) => {
    setUserData(data.user);
    localStorage.setItem('userData', JSON.stringify(data.user));
    localStorage.setItem('token', data.access);
    localStorage.setItem('refreshToken', data.refresh);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint
      await fetch('http://localhost:8000/api/users/logout/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local state and storage regardless of API call result
      setUserData(null);
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      navigate('/login');
    }
  };

  return (
    <div className={isPWA ? "pwa-app" : "App"}>
      {isPWA ? (
        // PWA Mode - Native Mobile Layout
        <>
          {userData && <MobileNavbar userData={userData} onLogout={handleLogout} />}
          {isInstallable && (
            <div className="pwa-content">
              <div className="pwa-card">
                <button className="pwa-btn pwa-btn-primary" onClick={installPWA}>
                  <i className="bi bi-download"></i>
                  Install App
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        // Web Mode - Original Bootstrap Layout
        userData && <Navbar userData={userData} onLogout={handleLogout} />
      )}
      
      <Routes>
        <Route 
          path="/login" 
          element={!userData ? (
            isPWA ? <PWALogin onLoginSuccess={handleLoginSuccess} /> : <LoginPage onLoginSuccess={handleLoginSuccess} />
          ) : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={userData ? (
            isPWA ? <PWADashboard userData={userData} onLogout={handleLogout} /> : <DashboardPage userData={userData} />
          ) : <Navigate to="/login" />}
        />
        <Route 
          path="/profile" 
          element={userData ? (
            isPWA ? <PWAProfile userData={userData} /> : <UserProfilePage userData={userData} />
          ) : <Navigate to="/login" />} 
        />
        <Route 
          path="/create-order" 
          element={userData ? (
            isPWA ? <PWACreateOrder /> : <CreateOrderPage />
          ) : <Navigate to="/login" />} 
        />
        <Route 
          path="/view-orders" 
          element={userData ? (
            isPWA ? <PWAOrders /> : <ViewOrdersPage />
          ) : <Navigate to="/login" />} 
        />
        <Route 
          path="/order-details/:orderNumber" 
          element={userData ? (
            isPWA ? <PWAOrderDetails /> : <Navigate to="/view-orders" />
          ) : <Navigate to="/login" />} 
        />
        <Route 
          path="/edit-order/:orderNumber" 
          element={userData ? (
            isPWA ? <PWAEditOrder /> : <Navigate to="/view-orders" />
          ) : <Navigate to="/login" />} 
        />
        <Route 
          path="/view-menu" 
          element={userData ? (
            isPWA ? <PWAMenu /> : <ViewMenuPage />
          ) : <Navigate to="/login" />} 
        />
        <Route 
          path="/view-transactions" 
          element={userData ? (
            isPWA ? <PWATransactions /> : <ViewTransactionsPage />
          ) : <Navigate to="/login" />} 
        />
        <Route 
          path="/debug-transactions" 
          element={userData ? <TransactionDebugger /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/debug-stats" 
          element={userData ? <StatsDebugger /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/auth-test" 
          element={<AuthTest />} 
        />
        <Route path="*" element={<Navigate to={userData ? "/dashboard" : "/login"} />} /> 
      </Routes>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        toastClassName="toast-custom"
        bodyClassName="toast-body-custom"
        style={{ zIndex: 9999 }}
      />
    </div>
  );
}

// Main App component that wraps everything
function App() {
  return <AppContent />;
}

export default App;
