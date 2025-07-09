import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PWAProvider, usePWA } from './contexts/PWAContext';
import { setAuthContext, setupAutoLogoutTimer, setupVisibilityCheck } from './utils/authInterceptor';
import { initializeOfflineServices } from './utils/serviceWorkerRegistration';
import websocketService from './services/websocketService';
import LoginPage from './components/LoginPage';
import UserProfilePage from './components/UserProfilePage';
import DashboardPage from './components/DashboardPage';
import CreateOrderPage from './pages/CreateOrderForm';
import EditOrderPage from './pages/EditOrderPage';
import ViewOrdersPage from './components/ViewOrdersPage';
import ViewMenuPage from './components/ViewMenuPage';
import ViewTransactionsPage from './components/ViewTransactionsPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import PWAStatusIndicator from './components/PWAStatusIndicator';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAUpdateNotification from './components/PWAUpdateNotification';
import PWAManager from './components/PWAManager';
import EnvironmentInfo from './components/EnvironmentInfo';
import WebSocketStatus from './components/WebSocketStatus';
import { logEnvironmentInfo } from './utils/envConfig';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/theme.css';
import './styles/pwa.css';
import './App.css';
import './utils/cleanupPWA'; // Clean up any remaining PWA data
import './utils/railwayStartup'; // Railway-specific startup configuration
import './utils/railwayEnvCheck'; // Railway environment validation

// Inner App component that uses authentication context
function AppContent() {
  const { userData, logout, checkTokenValidity } = useAuth();
  const { 
    shouldHideStandardNav, 
    getPWAClasses
  } = usePWA();
  
  const [showPWAManager, setShowPWAManager] = useState(false);

  // Setup global authentication interceptor
  useEffect(() => {
    const authContext = { logout, checkTokenValidity };
    setAuthContext(authContext);
    
    // API services now use direct token authentication
    
    // Setup auto-logout timer based on token expiry
    if (userData) {
      setupAutoLogoutTimer(logout);
      setupVisibilityCheck(checkTokenValidity);
    }
    
    return () => {
      // Cleanup would be handled by the interceptor
    };
  }, [userData, logout, checkTokenValidity]);

  // Initialize offline services
  useEffect(() => {
    initializeOfflineServices();
  }, []);

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (userData) {
      // Connect to WebSocket
      websocketService.connect();
      
      // Authenticate WebSocket connection
      const token = localStorage.getItem('token');
      if (token) {
        websocketService.addEventListener('connected', () => {
          websocketService.send({
            type: 'authenticate',
            token: token
          });
        });
      }
    } else {
      // Disconnect WebSocket when user logs out
      websocketService.disconnect();
    }
    
    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [userData]);

  // Log environment information on app start
  useEffect(() => {
    logEnvironmentInfo();
  }, []);

  // Setup keyboard shortcut for PWA manager (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setShowPWAManager(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`App ${getPWAClasses()}`}>
      {/* Conditional navigation based on PWA mode */}
      {userData && !shouldHideStandardNav() && <Navbar userData={userData} onLogout={() => logout('manual')} />}
      
      <Routes>
        <Route 
          path="/login" 
          element={!userData ? <LoginPage /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={userData ? <DashboardPage userData={userData} /> : <Navigate to="/login" />}
        />
        <Route 
          path="/profile" 
          element={userData ? <UserProfilePage userData={userData} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/create-order" 
          element={userData ? <CreateOrderPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/edit-order/:orderNumber" 
          element={userData ? <EditOrderPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/view-orders" 
          element={userData ? <ViewOrdersPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/view-menu" 
          element={userData ? <ViewMenuPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/view-transactions" 
          element={userData ? <ViewTransactionsPage /> : <Navigate to="/login" />} 
        />
        <Route path="*" element={<Navigate to={userData ? "/dashboard" : "/login"} />} /> 
      </Routes>
      
      
      {/* PWA status indicator */}
      <PWAStatusIndicator />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* PWA Update Notification */}
      <PWAUpdateNotification />
      
      {/* PWA Manager Modal */}
      <PWAManager 
        isVisible={showPWAManager} 
        onClose={() => setShowPWAManager(false)} 
      />
      
      {/* Environment Information Tag */}
      <EnvironmentInfo 
        position="top-left"
        showBackendInfo={true}
        expandable={true}
      />
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover={false}
        limit={3}
        toastClassName="toast-optimized"
        bodyClassName="toast-body-optimized"
        style={{ zIndex: 9999 }}
      />
    </div>
  );
}

// Main App component wrapped with AuthProvider and PWAProvider
function App() {
  return (
    <AuthProvider>
      <PWAProvider>
        <AppContent />
      </PWAProvider>
    </AuthProvider>
  );
}

export default App;
