import React from 'react';
import '../styles/mobile-native.css';

const PWAWrapper = ({ children, title, showBackButton = false, onBack }) => {
  return (
    <div className="pwa-content">
      {title && (
        <div className="pwa-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {showBackButton && (
              <button 
                className="pwa-btn pwa-btn-primary"
                onClick={onBack}
                style={{ 
                  width: 'auto',
                  minWidth: '44px',
                  height: '44px',
                  padding: '8px 12px',
                  borderRadius: '12px'
                }}
              >
                <i className="bi bi-arrow-left"></i>
              </button>
            )}
            <div className="pwa-card-title">{title}</div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export default PWAWrapper;
