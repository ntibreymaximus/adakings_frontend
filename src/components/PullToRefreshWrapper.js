/**
 * Simple wrapper component (pull-to-refresh functionality removed)
 */
import React, { useRef } from 'react';

const PullToRefreshWrapper = ({ 
  children, 
  className = '',
  onRefresh,
  enabled,
  ...props 
}) => {
  const containerRef = useRef(null);
  
  // Extract DOM-incompatible props
  const { onRefresh: _, enabled: __, ...domProps } = props;
  
  return (
    <div 
      ref={containerRef}
      className={`pull-to-refresh-container ${className}`}
      style={{
        height: '100%',
        minHeight: '100vh',
        position: 'relative'
      }}
      {...domProps}
    >
      {/* Main content */}
      <div style={{ minHeight: 'inherit' }}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefreshWrapper;
