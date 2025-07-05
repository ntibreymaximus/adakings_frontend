import React, { useEffect, useState, useRef } from 'react';

const PerformanceMonitor = ({ enabled = true }) => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    apiCallCount: 0,
    lastApiCallTime: 0,
    averageApiTime: 0,
    memoryUsage: 0
  });
  
  const renderStartTime = useRef(Date.now());
  const apiCallTimes = useRef([]);
  const renderTimes = useRef([]);

  useEffect(() => {
    if (!enabled) return;

    const startTime = Date.now();
    
    // Monitor performance
    const updateMetrics = () => {
      const renderTime = Date.now() - renderStartTime.current;
      renderTimes.current.push(renderTime);
      
      // Keep only last 10 measurements
      if (renderTimes.current.length > 10) {
        renderTimes.current.shift();
      }
      
      const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
      
      setMetrics(prev => ({
        ...prev,
        renderCount: prev.renderCount + 1,
        lastRenderTime: renderTime,
        averageRenderTime: avgRenderTime,
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0
      }));
    };

    updateMetrics();
    renderStartTime.current = Date.now();

    // Monitor API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const apiStart = Date.now();
      const response = await originalFetch(...args);
      const apiTime = Date.now() - apiStart;
      
      apiCallTimes.current.push(apiTime);
      if (apiCallTimes.current.length > 10) {
        apiCallTimes.current.shift();
      }
      
      const avgApiTime = apiCallTimes.current.reduce((a, b) => a + b, 0) / apiCallTimes.current.length;
      
      setMetrics(prev => ({
        ...prev,
        apiCallCount: prev.apiCallCount + 1,
        lastApiCallTime: apiTime,
        averageApiTime: avgApiTime
      }));
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      minWidth: '200px'
    }}>
      <div><strong>Performance Monitor</strong></div>
      <div>Renders: {metrics.renderCount}</div>
      <div>Last Render: {metrics.lastRenderTime}ms</div>
      <div>Avg Render: {Math.round(metrics.averageRenderTime)}ms</div>
      <div>API Calls: {metrics.apiCallCount}</div>
      <div>Last API: {metrics.lastApiCallTime}ms</div>
      <div>Avg API: {Math.round(metrics.averageApiTime)}ms</div>
      <div>Memory: {Math.round(metrics.memoryUsage)}MB</div>
      <div style={{ 
        color: metrics.averageRenderTime > 100 ? 'red' : 
               metrics.averageRenderTime > 50 ? 'yellow' : 'green' 
      }}>
        Status: {metrics.averageRenderTime > 100 ? 'SLOW' : 
                 metrics.averageRenderTime > 50 ? 'OK' : 'FAST'}
      </div>
    </div>
  );
};

export default PerformanceMonitor;
