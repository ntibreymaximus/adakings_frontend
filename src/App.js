import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PWAProvider, usePWA } from './contexts/PWAContext';
import { EnvironmentProvider } from './contexts/EnvironmentContext';
import { setAuthContext, setupAutoLogoutTimer, setupVisibilityCheck } from './utils/authInterceptor';
import useInactivityTimeout from './hooks/useInactivityTimeout';
import { initializeOfflineServices } from './utils/serviceWorkerRegistration';
import LoginPage from './components/LoginPage';
import UserProfilePage from './components/UserProfilePage';
import DashboardPage from './components/DashboardPage';
import CreateOrderPage from './pages/CreateOrderForm';
import ViewOrdersPage from './components/ViewOrdersPage';
import ViewMenuPage from './components/ViewMenuPage';
import ViewTransactionsPage from './components/ViewTransactionsPage';
import AuditLogViewer from './components/AuditLogViewer';
import ApiHealthCheck from './components/ApiHealthCheck';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import PWAStatusIndicator from './components/PWAStatusIndicator';
import PWAInstallPrompt from './components/PWAInstallPrompt';
// import MobilePWABanner from './components/MobilePWABanner';
import PWAUpdateNotification from './components/PWAUpdateNotification';
import PWAManager from './components/PWAManager';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import EnvironmentTag from './components/EnvironmentTag';
import Footer from './components/Footer';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/theme.css';
import './styles/pwa.css';
import './styles/pwa-mobile.css';
import './styles/footer.css';
import './App.css';
// import './utils/cleanupPWA'; // Disabled - was interfering with PWA functionality

// Inner App component that uses authentication context
function AppContent() {
  const { userData, logout, checkTokenValidity } = useAuth();
  const { 
    shouldHideStandardNav, 
    getPWAClasses
  } = usePWA();
  
  const [showPWAManager, setShowPWAManager] = useState(false);

  // Setup inactivity timeout (30 minutes)
  const { showWarning, timeRemaining, extendSession } = useInactivityTimeout();

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

  // Add view type classes for better CSS targeting
  const { isMobileWeb, isDesktopWeb } = usePWA();
  const viewTypeClasses = `${isMobileWeb ? 'mobile-web' : ''} ${isDesktopWeb ? 'desktop-web' : ''}`;
  
  return (
    <div className={`App ${getPWAClasses()} ${viewTypeClasses}`}>
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
          element={userData ? <CreateOrderPage isEditMode={true} /> : <Navigate to="/login" />} 
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
        <Route path="/audit-logs" 
          element={userData && (userData.role === 'admin' || userData.role === 'superadmin') ? 
            <AuditLogViewer /> : 
            <Navigate to="/dashboard" />} 
        />
        <Route path="/health-check" element={<ApiHealthCheck />} />
        <Route path="*" element={<Navigate to={userData ? "/dashboard" : "/login"} />} /> 
      </Routes>
      
      {/* PWA status indicator */}
      <PWAStatusIndicator />
      
      {/* PWA Install Prompt - Mobile only */}
      <PWAInstallPrompt />
      
      {/* Mobile PWA Banner - Disabled to avoid conflicts */}
      {/* <MobilePWABanner /> */}
      
      {/* PWA Update Notification */}
      <PWAUpdateNotification />
      
      {/* PWA Manager Modal */}
      <PWAManager 
        isVisible={showPWAManager} 
        onClose={() => setShowPWAManager(false)} 
      />
      
      {/* Session Timeout Warning Modal */}
      <SessionTimeoutWarning 
        show={showWarning}
        onExtend={extendSession}
        timeRemaining={timeRemaining}
      />
      
      {/* Environment Tag */}
      <EnvironmentTag />
      
      {/* Footer with version */}
      <Footer />
      
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

// Main App component wrapped with AuthProvider, PWAProvider, and EnvironmentProvider
function App() {
  return (
    <EnvironmentProvider>
      <AuthProvider>
        <PWAProvider>
          <AppContent />
        </PWAProvider>
      </AuthProvider>
    </EnvironmentProvider>
  );
}

export default App;
