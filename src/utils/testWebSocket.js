// WebSocket connection test utility
// Use this in browser console to test WebSocket connectivity

export const testWebSocketConnection = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No auth token found. Please login first.');
    return;
  }

  const wsUrl = `ws://localhost:8000/ws/orders/?token=${token}`;
  console.log('Testing WebSocket connection to:', wsUrl);

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('✅ WebSocket connected successfully!');
    
    // Send a ping to test communication
    ws.send(JSON.stringify({
      type: 'ping',
      timestamp: Date.now()
    }));
  };

  ws.onmessage = (event) => {
    console.log('📨 WebSocket message received:', JSON.parse(event.data));
  };

  ws.onclose = (event) => {
    console.log('❌ WebSocket closed:', event.code, event.reason);
  };

  ws.onerror = (error) => {
    console.error('🚨 WebSocket error:', error);
  };

  // Keep reference for manual testing
  window.testWS = ws;
  
  // Auto-close after 30 seconds
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
      console.log('🔒 Test WebSocket closed after 30 seconds');
    }
  }, 30000);

  return ws;
};

// Make available globally for console testing
if (typeof window !== 'undefined') {
  window.testWebSocketConnection = testWebSocketConnection;
  console.log('WebSocket test utility loaded. Run testWebSocketConnection() in console to test.');
}
