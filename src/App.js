import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './utils/api';
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
import AuthTest from './components/AuthTest';
import InstantReloadTest from './components/InstantReloadTest';
// Initialize polling manager
import './utils/pollingManager';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/theme.css';
import './App.css';
import './utils/cleanupPWA'; // Clean up any remaining PWA data

function App() {
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
  
  const navigate = useNavigate();

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
      await fetch(`${API_BASE_URL}/users/logout/`, {
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
    <div className="App">
      {/* Standard web navigation */}
      {userData && <Navbar userData={userData} onLogout={handleLogout} />}
      
      <Routes>
        <Route 
          path="/login" 
          element={!userData ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" />} 
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
        <Route 
          path="/instant-reload-test" 
          element={<InstantReloadTest />} 
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

export default App;
