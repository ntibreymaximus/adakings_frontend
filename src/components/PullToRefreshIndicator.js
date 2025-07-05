/**
 * Visual indicator for pull-to-refresh functionality
 * Shows animated spinner and text feedback during pull gesture
 */
import React from 'react';

const PullToRefreshIndicator = ({ 
  pullDistance, 
  isRefreshing, 
  canPull, 
  refreshThreshold,
  className = '',
  customText = null
}) => {
  // Calculate rotation based on pull distance
  const rotation = Math.min((pullDistance / refreshThreshold) * 180, 180);
  
  // Determine the current state
  const isReady = pullDistance >= refreshThreshold;
  const opacity = Math.min(pullDistance / 50, 1); // Fade in as user pulls
  
  // Dynamic text based on state
  const getText = () => {
    if (customText) return customText;
    if (isRefreshing) return 'Refreshing...';
    if (isReady) return 'Release to refresh';
    if (canPull && pullDistance > 10) return 'Pull to refresh';
    return '';
  };

  // Show only when there's meaningful pull distance or refreshing
  const shouldShow = pullDistance > 5 || isRefreshing;

  if (!shouldShow) return null;

  return (
    <div 
      className={`pull-to-refresh-indicator ${className}`}
      style={{
        transform: `translateY(${Math.max(pullDistance - 20, 0)}px)`,
        opacity: isRefreshing ? 1 : opacity,
        transition: isRefreshing ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      <div className="d-flex flex-column align-items-center">
        {/* Spinner/Arrow Icon */}
        <div 
          className="refresh-icon-container"
          style={{
            transform: isRefreshing ? '' : `rotate(${rotation}deg)`,
            transition: isRefreshing ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {isRefreshing ? (
            <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : (
            <i 
              className={`bi ${isReady ? 'bi-arrow-up-circle-fill' : 'bi-arrow-down-circle'} text-primary`}
              style={{ fontSize: '1.5rem' }}
            />
          )}
        </div>
        
        {/* Text Feedback */}
        <small 
          className="text-muted mt-1 fw-medium"
          style={{
            fontSize: '0.75rem',
            opacity: isRefreshing ? 1 : Math.min(pullDistance / 40, 1)
          }}
        >
          {getText()}
        </small>
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
