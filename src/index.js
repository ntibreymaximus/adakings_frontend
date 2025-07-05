import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { register as registerSW } from './utils/serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker with enhanced PWA lifecycle
registerSW({
  onSuccess: (registration) => {
    console.log('PWA is ready to work offline');
  },
  onUpdate: (registration) => {
    console.log('New content is available; please refresh.');
    // The PWAUpdateNotification component will handle this
  }
});

reportWebVitals();
