// Cleanup utility to remove any remaining PWA-related data
// This can be run once to clean up existing user data

export const cleanupPWAData = () => {
  try {
    // Remove PWA-related localStorage items
    const keysToRemove = [
      'offline-orders',
      'offline-transactions', 
      'offline-requests',
      'cachedDashboard',
      'cachedOrders',
      'cachedTransactions',
      'cachedMenu',
      'pwa-install-prompt',
      'pwa-mode',
      'offline-data-timestamp'
    ];

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`Removed PWA data: ${key}`);
      }
    });

    // Clear any service worker caches if available
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('adakings') || cacheName.includes('pwa')) {
            caches.delete(cacheName);
            console.log(`Removed cache: ${cacheName}`);
          }
        });
      });
    }

    // Unregister any existing service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
          console.log('Unregistered service worker:', registration.scope);
        });
      });
    }

    console.log('PWA cleanup completed');
    
  } catch (error) {
    console.error('Error during PWA cleanup:', error);
  }
};

// Run cleanup immediately
cleanupPWAData();
