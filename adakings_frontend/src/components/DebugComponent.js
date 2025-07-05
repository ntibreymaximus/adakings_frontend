import React from 'react';

const DebugComponent = () => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: '#007bff',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      ✅ App Loading Successfully
    </div>
  );
};

export default DebugComponent;
