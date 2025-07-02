import React, { useState } from 'react';
import { toast } from 'react-toastify';
import '../styles/mobile-native.css';

const PWALogin = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    setIsLoading(true);
    const loginURL = 'http://localhost:8000/api/users/login/';

    try {
      const response = await fetch(loginURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (onLoginSuccess) {
          onLoginSuccess(data);
        }
      } else {
        const errorMsg = data.detail || 'Login failed. Please try again.';
        setLoginError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'An error occurred during login. Please check your connection and try again.';
      setLoginError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pwa-content" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center',
      paddingTop: '40px',
      paddingBottom: '40px'
    }}>
      {/* App Branding */}
      <div className="pwa-app-header" style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
          <i className="bi bi-shop" style={{ color: 'var(--ada-primary)' }}></i>
        </div>
        <h1 className="pwa-app-title">Adakings</h1>
        <p className="pwa-app-subtitle">Restaurant Management</p>
      </div>

      {/* Login Form */}
      <div className="pwa-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 className="pwa-welcome-title">
            Welcome Back
          </h2>
          <p className="pwa-welcome-subtitle">
            Sign in to continue
          </p>
        </div>

        {loginError && (
          <div className="pwa-error-alert">
            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="pwa-form-group">
            <label className="pwa-form-label">Username or Email</label>
            <input
              type="text"
              className="pwa-form-input"
              placeholder="Enter your username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="pwa-form-group">
            <label className="pwa-form-label">Password</label>
            <input
              type="password"
              className="pwa-form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="pwa-btn pwa-btn-primary"
            disabled={isLoading}
            style={{ marginTop: '8px' }}
          >
            {isLoading ? (
              <>
                <div className="pwa-spinner" style={{ 
                  width: '18px', 
                  height: '18px', 
                  marginRight: '8px',
                  marginBottom: '0'
                }}></div>
                Signing In...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right"></i>
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p className="pwa-help-text">
            Need help? Contact your administrator
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '32px',
        padding: '0 16px'
      }}>
        <p className="pwa-footer-text">
          © 2024 Adakings Restaurant. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default PWALogin;
