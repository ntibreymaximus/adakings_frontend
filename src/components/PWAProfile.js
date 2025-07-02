import React from 'react';
import '../styles/mobile-native.css';

const PWAProfile = ({ userData }) => {
  const formatKey = (key) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const profileFields = [
    { key: 'username', icon: 'bi bi-person', label: 'Username' },
    { key: 'email', icon: 'bi bi-envelope', label: 'Email' },
    { key: 'first_name', icon: 'bi bi-person-badge', label: 'First Name' },
    { key: 'last_name', icon: 'bi bi-person-badge-fill', label: 'Last Name' },
    { key: 'role', icon: 'bi bi-shield-check', label: 'Role' },
    { key: 'is_active', icon: 'bi bi-check-circle', label: 'Active Status' },
    { key: 'date_joined', icon: 'bi bi-calendar-plus', label: 'Date Joined' },
    { key: 'last_login', icon: 'bi bi-clock-history', label: 'Last Login' }
  ];

  const formatValue = (key, value) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (key.includes('date') || key.includes('time')) {
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return value;
      }
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value || 'Not set');
  };

  return (
    <div className="pwa-content">
      {/* Profile Header */}
      <div className="pwa-card">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: '600',
            margin: '0 auto 16px auto'
          }}>
            {getUserInitials(userData?.first_name || userData?.username)}
          </div>
          <h2 style={{ 
            fontSize: '1.3rem', 
            fontWeight: '600', 
            color: '#1a1a1a', 
            margin: '0 0 4px 0' 
          }}>
            {userData?.first_name && userData?.last_name 
              ? `${userData.first_name} ${userData.last_name}`
              : userData?.username
            }
          </h2>
          <p style={{ 
            fontSize: '0.9rem', 
            color: '#666', 
            margin: '0' 
          }}>
            {userData?.role || 'Staff Member'}
          </p>
          {userData?.is_active && (
            <div className="pwa-status pwa-status-success" style={{ 
              marginTop: '12px',
              display: 'inline-flex'
            }}>
              Active
            </div>
          )}
        </div>
      </div>

      {/* Profile Information */}
      <div className="pwa-card">
        <div className="pwa-card-title" style={{ marginBottom: '20px' }}>
          Profile Information
        </div>
        
        <div className="pwa-list">
          {profileFields.map(field => {
            const value = userData?.[field.key];
            if (!value && value !== false) return null;
            
            return (
              <div key={field.key} className="pwa-list-item">
                <div className="pwa-list-icon" style={{ background: '#f1f3f4', color: 'var(--ada-primary)' }}>
                  <i className={field.icon}></i>
                </div>
                <div className="pwa-list-content">
                  <div className="pwa-list-title">{field.label}</div>
                  <div className="pwa-list-subtitle">{formatValue(field.key, value)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Actions */}
      <div className="pwa-card">
        <div className="pwa-card-title" style={{ marginBottom: '20px' }}>
          Account Actions
        </div>
        
        <div className="pwa-list">
          <button 
            className="pwa-list-item"
            style={{
              background: 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer'
            }}
            onClick={() => {
              // Add edit profile functionality
              alert('Edit profile functionality coming soon!');
            }}
          >
            <div className="pwa-list-icon" style={{ background: '#e3f2fd', color: '#1565c0' }}>
              <i className="bi bi-pencil-square"></i>
            </div>
            <div className="pwa-list-content">
              <div className="pwa-list-title">Edit Profile</div>
              <div className="pwa-list-subtitle">Update your personal information</div>
            </div>
            <div className="pwa-list-action">
              <i className="bi bi-chevron-right"></i>
            </div>
          </button>
          
          <button 
            className="pwa-list-item"
            style={{
              background: 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer'
            }}
            onClick={() => {
              // Add change password functionality
              alert('Change password functionality coming soon!');
            }}
          >
            <div className="pwa-list-icon" style={{ background: '#fff8e1', color: '#ef6c00' }}>
              <i className="bi bi-key"></i>
            </div>
            <div className="pwa-list-content">
              <div className="pwa-list-title">Change Password</div>
              <div className="pwa-list-subtitle">Update your account password</div>
            </div>
            <div className="pwa-list-action">
              <i className="bi bi-chevron-right"></i>
            </div>
          </button>
          
          <button 
            className="pwa-list-item"
            style={{
              background: 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer'
            }}
            onClick={() => {
              // Add notification settings
              alert('Notification settings coming soon!');
            }}
          >
            <div className="pwa-list-icon" style={{ background: '#f3e5f5', color: '#7b1fa2' }}>
              <i className="bi bi-bell"></i>
            </div>
            <div className="pwa-list-content">
              <div className="pwa-list-title">Notifications</div>
              <div className="pwa-list-subtitle">Manage your notification preferences</div>
            </div>
            <div className="pwa-list-action">
              <i className="bi bi-chevron-right"></i>
            </div>
          </button>
        </div>
      </div>

      {/* Account Details */}
      {userData && (
        <div className="pwa-card">
          <div className="pwa-card-title" style={{ marginBottom: '20px' }}>
            Additional Details
          </div>
          
          <div style={{ 
            background: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '0.85rem',
            color: '#666',
            lineHeight: '1.5'
          }}>
            {Object.entries(userData)
              .filter(([key]) => !profileFields.some(field => field.key === key))
              .map(([key, value]) => (
                <div key={key} style={{ marginBottom: '8px' }}>
                  <strong>{formatKey(key)}:</strong> {formatValue(key, value)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAProfile;
