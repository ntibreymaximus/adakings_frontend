// PWA Automated Testing Script
// Run this in the browser console to validate PWA features

class PWAValidator {
  constructor() {
    this.results = {
      serviceWorker: false,
      manifest: false,
      offline: false,
      installable: false,
      responsive: false,
      icons: false,
      caching: false,
      performance: false
    };
    this.errors = [];
  }

  async runAllTests() {
    console.log('🚀 Starting PWA Validation Tests...\n');
    
    await this.testServiceWorker();
    await this.testManifest();
    await this.testIcons();
    await this.testCaching();
    await this.testResponsive();
    await this.testInstallability();
    await this.testOfflineFunctionality();
    await this.testPerformance();
    
    this.displayResults();
    return this.results;
  }

  async testServiceWorker() {
    console.log('📋 Testing Service Worker...');
    
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('✅ Service Worker registered:', registration.scope);
          this.results.serviceWorker = true;
        } else {
          this.errors.push('Service Worker not registered');
        }
      } else {
        this.errors.push('Service Worker not supported');
      }
    } catch (error) {
      this.errors.push(`Service Worker error: ${error.message}`);
    }
  }

  async testManifest() {
    console.log('📋 Testing Web App Manifest...');
    
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        const response = await fetch(manifestLink.href);
        const manifest = await response.json();
        
        console.log('📱 Manifest found:', manifest.name);
        
        // Validate required manifest properties
        const requiredProperties = ['name', 'start_url', 'display', 'icons'];
        const missingProperties = requiredProperties.filter(prop => !manifest[prop]);
        
        if (missingProperties.length === 0) {
          this.results.manifest = true;
          console.log('✅ Manifest validation passed');
        } else {
          this.errors.push(`Missing manifest properties: ${missingProperties.join(', ')}`);
        }
      } else {
        this.errors.push('Manifest link not found in HTML');
      }
    } catch (error) {
      this.errors.push(`Manifest error: ${error.message}`);
    }
  }

  async testIcons() {
    console.log('📋 Testing PWA Icons...');
    
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        const response = await fetch(manifestLink.href);
        const manifest = await response.json();
        
        if (manifest.icons && manifest.icons.length > 0) {
          console.log(`🎨 Found ${manifest.icons.length} icons`);
          
          // Check for required icon sizes
          const requiredSizes = ['192x192', '512x512'];
          const availableSizes = manifest.icons.map(icon => icon.sizes).join(',');
          
          const hasRequiredSizes = requiredSizes.every(size => 
            availableSizes.includes(size)
          );
          
          if (hasRequiredSizes) {
            this.results.icons = true;
            console.log('✅ Required icon sizes available');
          } else {
            this.errors.push('Missing required icon sizes (192x192, 512x512)');
          }
        } else {
          this.errors.push('No icons found in manifest');
        }
      }
    } catch (error) {
      this.errors.push(`Icons test error: ${error.message}`);
    }
  }

  async testCaching() {
    console.log('📋 Testing Cache Storage...');
    
    try {
      const cacheNames = await caches.keys();
      console.log('💾 Available caches:', cacheNames);
      
      if (cacheNames.length > 0) {
        // Check for Adakings-specific caches
        const adakingsCaches = cacheNames.filter(name => 
          name.includes('adakings')
        );
        
        if (adakingsCaches.length > 0) {
          this.results.caching = true;
          console.log('✅ Adakings caches found:', adakingsCaches);
        } else {
          this.errors.push('No Adakings-specific caches found');
        }
      } else {
        this.errors.push('No caches found');
      }
    } catch (error) {
      this.errors.push(`Caching test error: ${error.message}`);
    }
  }

  testResponsive() {
    console.log('📋 Testing Responsive Design...');
    
    try {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        console.log('📱 Viewport meta tag found:', viewport.content);
        
        // Test different viewport sizes
        const testSizes = [
          { width: 320, height: 568, name: 'iPhone SE' },
          { width: 375, height: 667, name: 'iPhone 8' },
          { width: 768, height: 1024, name: 'iPad' },
          { width: 1920, height: 1080, name: 'Desktop' }
        ];
        
        console.log('📐 Current viewport:', window.innerWidth, 'x', window.innerHeight);
        
        // Check if content fits within current viewport
        const bodyWidth = document.body.scrollWidth;
        const viewportWidth = window.innerWidth;
        
        if (bodyWidth <= viewportWidth) {
          this.results.responsive = true;
          console.log('✅ No horizontal scrolling detected');
        } else {
          this.errors.push('Horizontal scrolling detected');
        }
      } else {
        this.errors.push('Viewport meta tag not found');
      }
    } catch (error) {
      this.errors.push(`Responsive test error: ${error.message}`);
    }
  }

  testInstallability() {
    console.log('📋 Testing Installability...');
    
    try {
      // Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isHomeScreen = window.navigator.standalone === true;
      
      if (isStandalone || isHomeScreen) {
        console.log('✅ App is running in standalone mode');
        this.results.installable = true;
      } else {
        // Check for install prompt capability
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          console.log('📱 App appears installable');
          this.results.installable = true;
        } else {
          this.errors.push('App may not be installable');
        }
      }
      
      // Check HTTPS requirement
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      if (isSecure) {
        console.log('🔒 Secure context confirmed');
      } else {
        this.errors.push('App must be served over HTTPS');
      }
    } catch (error) {
      this.errors.push(`Installability test error: ${error.message}`);
    }
  }

  async testOfflineFunctionality() {
    console.log('📋 Testing Offline Functionality...');
    
    try {
      // Test if offline indicator exists
      const offlineIndicator = document.querySelector('.offline-banner, .offline-indicator');
      if (offlineIndicator) {
        console.log('📡 Offline indicator component found');
      }
      
      // Test network status detection
      console.log('🌐 Network status:', navigator.onLine ? 'Online' : 'Offline');
      
      // Test cached resources
      const cacheNames = await caches.keys();
      if (cacheNames.length > 0) {
        const cache = await caches.open(cacheNames[0]);
        const cachedRequests = await cache.keys();
        
        if (cachedRequests.length > 0) {
          this.results.offline = true;
          console.log('✅ Cached resources available for offline use');
        } else {
          this.errors.push('No cached resources found');
        }
      }
    } catch (error) {
      this.errors.push(`Offline test error: ${error.message}`);
    }
  }

  async testPerformance() {
    console.log('📋 Testing Performance...');
    
    try {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0];
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        
        console.log(`⚡ Page load time: ${loadTime.toFixed(0)}ms`);
        console.log(`⚡ DOM content loaded: ${domContentLoaded.toFixed(0)}ms`);
        
        // Check if load time is acceptable (< 3 seconds)
        if (loadTime < 3000) {
          this.results.performance = true;
          console.log('✅ Performance is acceptable');
        } else {
          this.errors.push(`Slow load time: ${loadTime.toFixed(0)}ms`);
        }
      } else {
        this.errors.push('Performance API not available');
      }
    } catch (error) {
      this.errors.push(`Performance test error: ${error.message}`);
    }
  }

  displayResults() {
    console.log('\n🏁 PWA Validation Results:');
    console.log('========================');
    
    const passed = Object.values(this.results).filter(Boolean).length;
    const total = Object.keys(this.results).length;
    const score = Math.round((passed / total) * 100);
    
    console.log(`📊 Overall Score: ${score}% (${passed}/${total} tests passed)\n`);
    
    // Display individual test results
    Object.entries(this.results).forEach(([test, passed]) => {
      const icon = passed ? '✅' : '❌';
      console.log(`${icon} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors found:');
      this.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (score >= 90) {
      console.log('   🎉 Excellent! Your PWA meets all requirements.');
    } else if (score >= 70) {
      console.log('   👍 Good PWA implementation. Address the failing tests for better compliance.');
    } else {
      console.log('   ⚠️  Your PWA needs improvement. Focus on the failing tests.');
    }
    
    return { score, passed, total, errors: this.errors };
  }

  // Mobile responsive test helper
  testMobileFeatures() {
    const features = {
      touchEvents: 'ontouchstart' in window,
      orientation: 'orientation' in window,
      deviceMotion: 'DeviceMotionEvent' in window,
      deviceOrientation: 'DeviceOrientationEvent' in window,
      vibration: 'vibrate' in navigator
    };
    
    console.log('📱 Mobile Features Available:');
    Object.entries(features).forEach(([feature, available]) => {
      console.log(`   ${available ? '✅' : '❌'} ${feature}`);
    });
    
    return features;
  }

  // Network testing helper
  async testNetworkStrategies() {
    console.log('🌐 Testing Network Strategies...');
    
    const testUrls = [
      '/',
      '/api/profile',
      '/api/orders',
      '/api/menu',
      '/static/css/main.css',
      '/static/js/bundle.js'
    ];
    
    for (const url of testUrls) {
      try {
        const cacheNames = await caches.keys();
        let found = false;
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const response = await cache.match(url);
          if (response) {
            console.log(`📦 ${url} - Cached in ${cacheName}`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          console.log(`🌐 ${url} - Not cached (network-only)`);
        }
      } catch (error) {
        console.log(`❌ ${url} - Error: ${error.message}`);
      }
    }
  }
}

// Usage instructions
console.log(`
🧪 PWA Testing Script Loaded!

Available commands:
==================
const validator = new PWAValidator();
validator.runAllTests();                    // Run all PWA tests
validator.testMobileFeatures();             // Check mobile-specific features
validator.testNetworkStrategies();          // Test caching strategies

Quick test:
-----------
(async () => {
  const validator = new PWAValidator();
  const results = await validator.runAllTests();
  return results;
})();
`);

// Auto-run tests if requested
if (window.location.search.includes('autotest=true')) {
  (async () => {
    const validator = new PWAValidator();
    await validator.runAllTests();
  })();
}
