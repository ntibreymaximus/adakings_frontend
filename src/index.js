import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Register PWA Service Worker - STABLE VERSION
if ('serviceWorker' in navigator) {
  // Use a more stable approach with reduced frequency checks
  let registrationAttempts = 0;
  const maxRetries = 3;
  
  const registerServiceWorker = () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully');
        
        // Only check for updates every 30 seconds to prevent aggressive reloading
        setInterval(() => {
          if (registration && registration.update) {
            registration.update();
          }
        }, 30000);
        
        // Handle updates more gracefully
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('[SW] New version installing...');
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New version available - will activate on next visit');
                // Don't force reload - let user naturally refresh
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
        registrationAttempts++;
        if (registrationAttempts < maxRetries) {
          console.log(`[SW] Retrying registration (${registrationAttempts}/${maxRetries})...`);
          setTimeout(registerServiceWorker, 5000);
        }
      });
  };
  
  // Register after a short delay to prevent blocking
  window.addEventListener('load', () => {
    setTimeout(registerServiceWorker, 1000);
  });
  
  // Handle messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('Message from SW:', event.data);
    
    // Handle storage requests from service worker
    if (event.data.type === 'GET_STORAGE') {
      const value = localStorage.getItem(event.data.key);
      const parsedValue = value ? JSON.parse(value) : null;
      
      // Send response back to service worker
      event.source.postMessage({
        type: 'STORAGE_RESPONSE',
        key: event.data.key,
        data: parsedValue
      });
    }
    
    // Handle storage item removal
    if (event.data.type === 'REMOVE_STORAGE_ITEM') {
      const key = event.data.key;
      const id = event.data.id;
      
      try {
        const existingData = JSON.parse(localStorage.getItem(key) || '[]');
        const filteredData = existingData.filter(item => item.id !== id);
        localStorage.setItem(key, JSON.stringify(filteredData));
        console.log(`Removed ${key} item with id:`, id);
      } catch (error) {
        console.error(`Failed to remove ${key} item:`, error);
      }
    }
    
    // Handle successful order sync notifications
    if (event.data.type === 'ORDER_SYNCED') {
      const { offlineId, serverOrder } = event.data.data;
      console.log('Order synced successfully:', offlineId, '->', serverOrder.order_number);
      
      // Show notification to user
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Order Synced', {
          body: `Offline order synced as #${serverOrder.order_number}`,
          icon: '/logo192.png'
        });
      }
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
