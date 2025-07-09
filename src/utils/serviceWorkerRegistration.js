// Enhanced Service Worker registration utility with lifecycle management
// This file helps register the service worker in production environments

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  // [::1] is the IPv6 localhost address.
  window.location.hostname === '[::1]' ||
  // 127.0.0.0/8 are considered localhost for IPv4.
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export function register(config) {
  // Temporarily disabled due to header mutation issue
  console.log('🚫 Service Worker registration temporarily disabled');
  return;
  
  if ('serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      // from what our page is served on. This might happen if a CDN is used to
      // serve assets; see https://github.com/facebook/create-react-app/issues/2374
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        // This is running on localhost. Let's check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);

        // Add some additional logging to localhost, pointing developers to the
        // service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'This web app is being served cache-first by a service ' +
              'worker. To learn more, visit https://cra.link/PWA'
          );
        });
      } else {
        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config);
      }
    });

    // Setup PWA lifecycle handlers
    setupPWALifecycleHandlers();
  }
}

// Function to setup PWA lifecycle event listeners
function setupPWALifecycleHandlers() {
  // Listen for beforeinstallprompt event to show custom install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // Store the event for later use
    window.deferredPrompt = e;
  });

  // Listen for updates on service worker state
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (window.refreshing) return;
    window.location.reload();
    window.refreshing = true;
  });

  // Setup an update ready listener to notify user about an available update
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New update available, notify the user
            console.log('New update available');
            // Implement notification UI logic here
          }
        });
      }
    });
  });
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration);
      
      // Set up periodic sync for background updates
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        console.log('Background sync is supported');
        // Register sync events
        registration.sync.register('sync-orders');
        registration.sync.register('sync-profile');
      }
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log(
                'New content is available and will be used when all ' +
                  'tabs for this page are closed. See https://cra.link/PWA.'
              );

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log('Content is cached for offline use.');

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        });
      });
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        'No internet connection found. App is running in offline mode.'
      );
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Utility function to check if the app is running offline
export function isAppOffline() {
  return !navigator.onLine;
}

// Utility function to handle offline/online events
export function setupOfflineHandlers() {
  // Handle online/offline events
  window.addEventListener('online', () => {
    console.log('App is back online');
    // Trigger sync when back online
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register('sync-orders');
        registration.sync.register('sync-profile');
        registration.sync.register('sync-all');
      });
    }
    
    // Initialize enhanced offline services
    initializeOfflineServices();
  });

  window.addEventListener('offline', () => {
    console.log('App is offline');
  });
}

// Initialize enhanced offline services
export function initializeOfflineServices() {
  if (typeof window !== 'undefined') {
    // Dynamically import services to avoid circular dependencies
    import('../services/apiCacheService').then(({ apiCacheService }) => {
      apiCacheService.preloadEssentialData();
    }).catch(err => console.warn('Failed to initialize API cache service:', err));
    
    import('../services/offlineRoutingService').then(({ offlineRoutingService }) => {
      console.log('✅ Offline routing service initialized');
    }).catch(err => console.warn('Failed to initialize offline routing service:', err));
    
    import('../services/backgroundSyncService').then(({ backgroundSyncService }) => {
      console.log('✅ Background sync service initialized');
    }).catch(err => console.warn('Failed to initialize background sync service:', err));
  }
}

// Function to manually cache API data
export function cacheApiData(url, data) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({
          type: 'CACHE_API_DATA',
          url: url,
          data: data
        });
      }
    });
  }
}

// Function to check if content is served from cache
export function isFromCache(response) {
  return response.headers.get('X-Served-From') === 'cache';
}

// Function to display offline notification
export function showOfflineNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('App is offline', {
      body: 'You are currently offline. Some features may be limited.',
      icon: '/favicon.ico'
    });
  }
}

// Function to request notification permission
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      console.log('Notification permission:', permission);
    });
  }
}
