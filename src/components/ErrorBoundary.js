import React from 'react';
import { toast } from 'react-toastify';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Handle authentication errors
    if (error.message && (
      error.message.includes('AUTHENTICATION_EXPIRED') || 
      error.message.includes('AUTHENTICATION_REQUIRED') ||
      error.message.includes('Session expired')
    )) {
      // Clear tokens and let parent handle logout
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      
      if (this.props.onAuthError) {
        this.props.onAuthError();
      }
      
      toast.warning('Your session has expired. Please log in again.');
      return;
    }
    
    // Handle other errors
    toast.error('An unexpected error occurred. Please try again.');
  }

  render() {
    if (this.state.hasError) {
      // Check if it's an auth error
      if (this.state.error?.message && (
        this.state.error.message.includes('AUTHENTICATION_EXPIRED') || 
        this.state.error.message.includes('AUTHENTICATION_REQUIRED')
      )) {
        // Don't render error UI for auth errors, let the app redirect
        return this.props.children;
      }
      
      // Render fallback UI for other errors
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px', color: '#f44336' }}>
            <i className="bi bi-exclamation-triangle"></i>
          </div>
          <h3>Something went wrong</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
