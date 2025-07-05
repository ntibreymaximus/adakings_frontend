import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { setAuthContext, setupAutoLogoutTimer, setupVisibilityCheck } from './utils/authInterceptor';
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
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/theme.css';
import './App.css';
import './utils/cleanupPWA'; // Clean up any remaining PWA data

// Inner App component that uses authentication context
function AppContent() {
  const { userData, logout, checkTokenValidity } = useAuth();

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

  return (
    <div className="App">
      {/* Standard web navigation */}
      {userData && <Navbar userData={userData} onLogout={() => logout('manual')} />}
      
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

// Main App component wrapped with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
