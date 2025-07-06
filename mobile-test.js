// Mobile Device Simulation and Testing Script
// This script helps test PWA behavior across different mobile devices

class MobileDeviceTester {
  constructor() {
    this.devices = {
      'iPhone SE': { width: 375, height: 667, userAgent: 'iPhone SE' },
      'iPhone 12': { width: 390, height: 844, userAgent: 'iPhone 12' },
      'iPhone 12 Pro Max': { width: 428, height: 926, userAgent: 'iPhone 12 Pro Max' },
      'Samsung Galaxy S21': { width: 360, height: 800, userAgent: 'Samsung Galaxy S21' },
      'Samsung Galaxy S21 Ultra': { width: 384, height: 854, userAgent: 'Samsung Galaxy S21 Ultra' },
      'Google Pixel 5': { width: 393, height: 851, userAgent: 'Google Pixel 5' },
      'iPad': { width: 768, height: 1024, userAgent: 'iPad' },
      'iPad Pro': { width: 1024, height: 1366, userAgent: 'iPad Pro' },
      'Samsung Galaxy Tab': { width: 800, height: 1280, userAgent: 'Samsung Galaxy Tab' }
    };
    
    this.originalViewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    this.testResults = {};
  }

  // Simulate device viewport
  simulateDevice(deviceName) {
    const device = this.devices[deviceName];
    if (!device) {
      console.error(`Device ${deviceName} not found`);
      return false;
    }

    console.log(`📱 Simulating ${deviceName} (${device.width}x${device.height})`);
    
    // Try to resize the window (may not work in all browsers for security reasons)
    try {
      window.resizeTo(device.width, device.height);
    } catch (error) {
      console.warn('Cannot resize window programmatically. Please manually resize or use browser dev tools.');
    }

    // Set viewport meta tag if not present
    this.setViewportMeta();
    
    // Trigger resize event to ensure app responds
    window.dispatchEvent(new Event('resize'));
    
    return true;
  }

  // Set appropriate viewport meta tag
  setViewportMeta() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  }

  // Test responsive breakpoints
  testResponsiveBreakpoints() {
    console.log('📐 Testing Responsive Breakpoints...');
    
    const breakpoints = [
      { name: 'Mobile', width: 320 },
      { name: 'Mobile Large', width: 480 },
      { name: 'Tablet', width: 768 },
      { name: 'Desktop Small', width: 1024 },
      { name: 'Desktop Large', width: 1200 }
    ];

    const results = {};
    
    breakpoints.forEach(breakpoint => {
      // Simulate breakpoint
      this.simulateViewportWidth(breakpoint.width);
      
      // Test layout
      const layoutTest = this.testLayout();
      results[breakpoint.name] = {
        width: breakpoint.width,
        ...layoutTest
      };
      
      console.log(`${breakpoint.name} (${breakpoint.width}px): ${layoutTest.passed ? '✅' : '❌'}`);
    });

    return results;
  }

  // Simulate specific viewport width
  simulateViewportWidth(width) {
    // This is a simulation for testing purposes
    // In real testing, you would use browser dev tools or resize manually
    const body = document.body;
    const testContainer = document.getElementById('root') || body;
    
    if (testContainer) {
      testContainer.style.width = width + 'px';
      testContainer.style.maxWidth = width + 'px';
    }
    
    // Dispatch resize event
    window.dispatchEvent(new Event('resize'));
  }

  // Test layout integrity
  testLayout() {
    const issues = [];
    
    // Check for horizontal overflow
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = window.innerWidth;
    
    if (bodyWidth > viewportWidth + 5) { // 5px tolerance
      issues.push(`Horizontal overflow: body width ${bodyWidth}px > viewport ${viewportWidth}px`);
    }

    // Check navigation accessibility
    const navbar = document.querySelector('nav, .navbar');
    if (navbar) {
      const navRect = navbar.getBoundingClientRect();
      if (navRect.width > viewportWidth) {
        issues.push('Navigation bar overflows viewport');
      }
    }

    // Check button touch targets (minimum 44px)
    const buttons = document.querySelectorAll('button, .btn, a[role="button"]');
    buttons.forEach((button, index) => {
      const rect = button.getBoundingClientRect();
      if (rect.height < 44 && rect.width < 44) {
        issues.push(`Button ${index + 1} too small for touch (${rect.width}x${rect.height}px)`);
      }
    });

    // Check text readability
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    textElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const fontSize = parseInt(styles.fontSize);
      if (fontSize < 14) {
        issues.push(`Text element ${index + 1} may be too small (${fontSize}px)`);
      }
    });

    return {
      passed: issues.length === 0,
      issues: issues,
      totalChecks: 4
    };
  }

  // Test touch interactions
  testTouchInteractions() {
    console.log('👆 Testing Touch Interactions...');
    
    const results = {
      touchSupport: 'ontouchstart' in window,
      pointerSupport: 'onpointerdown' in window,
      gestureSupport: 'ongesturestart' in window
    };

    // Test touch targets
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex]');
    const touchTargetIssues = [];

    interactiveElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const minSize = 44; // WCAG recommended minimum touch target size
      
      if (rect.width < minSize || rect.height < minSize) {
        touchTargetIssues.push({
          element: element.tagName,
          index: index,
          size: `${rect.width}x${rect.height}`,
          recommended: `${minSize}x${minSize}`
        });
      }
    });

    results.touchTargets = {
      total: interactiveElements.length,
      issues: touchTargetIssues,
      passed: touchTargetIssues.length === 0
    };

    console.log(`Touch Support: ${results.touchSupport ? '✅' : '❌'}`);
    console.log(`Touch Targets: ${results.touchTargets.passed ? '✅' : '❌'} (${touchTargetIssues.length} issues)`);

    return results;
  }

  // Test PWA install behavior on mobile
  testMobileInstallBehavior() {
    console.log('📲 Testing Mobile Install Behavior...');
    
    const results = {
      manifestPresent: false,
      serviceWorkerPresent: false,
      installPromptAvailable: false,
      standaloneMode: false,
      iosCompatible: false,
      androidCompatible: false
    };

    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    results.manifestPresent = !!manifestLink;

    // Check service worker
    results.serviceWorkerPresent = 'serviceWorker' in navigator;

    // Check standalone mode
    results.standaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true;

    // Check iOS compatibility
    const appleWebAppCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    const appleWebAppTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    
    results.iosCompatible = !!(appleWebAppCapable && appleWebAppTitle && appleTouchIcon);

    // Check Android compatibility
    const themeColor = document.querySelector('meta[name="theme-color"]');
    results.androidCompatible = !!(manifestLink && themeColor);

    // Log results
    Object.entries(results).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}`);
    });

    return results;
  }

  // Test offline functionality on mobile
  async testOfflineFunctionality() {
    console.log('📡 Testing Offline Functionality...');
    
    const results = {
      offlineIndicator: false,
      cachedContent: false,
      networkDetection: false,
      backgroundSync: false
    };

    // Check for offline indicator
    const offlineIndicator = document.querySelector('.offline-banner, .offline-indicator, [class*="offline"]');
    results.offlineIndicator = !!offlineIndicator;

    // Check cached content
    try {
      const cacheNames = await caches.keys();
      results.cachedContent = cacheNames.length > 0;
    } catch (error) {
      console.warn('Cache API not available');
    }

    // Check network detection
    results.networkDetection = 'onLine' in navigator;

    // Test background sync capability
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        results.backgroundSync = 'sync' in registration;
      } catch (error) {
        console.warn('Background sync not available');
      }
    }

    // Log results
    Object.entries(results).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}`);
    });

    return results;
  }

  // Test performance on mobile
  testMobilePerformance() {
    console.log('⚡ Testing Mobile Performance...');
    
    if (!('performance' in window)) {
      console.warn('Performance API not available');
      return null;
    }

    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    const metrics = {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
    };

    // Performance thresholds for mobile
    const thresholds = {
      loadTime: 3000, // 3 seconds
      domContentLoaded: 2000, // 2 seconds
      firstPaint: 1000, // 1 second
      firstContentfulPaint: 1500 // 1.5 seconds
    };

    const results = {};
    Object.entries(metrics).forEach(([key, value]) => {
      const threshold = thresholds[key];
      const passed = value <= threshold;
      results[key] = {
        value: Math.round(value),
        threshold: threshold,
        passed: passed
      };
      console.log(`${passed ? '✅' : '❌'} ${key}: ${Math.round(value)}ms (threshold: ${threshold}ms)`);
    });

    return results;
  }

  // Run comprehensive mobile test suite
  async runMobileTestSuite() {
    console.log('🚀 Running Comprehensive Mobile Test Suite...\n');
    
    const results = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    // Run all tests
    results.responsiveBreakpoints = this.testResponsiveBreakpoints();
    results.touchInteractions = this.testTouchInteractions();
    results.installBehavior = this.testMobileInstallBehavior();
    results.offlineFunctionality = await this.testOfflineFunctionality();
    results.performance = this.testMobilePerformance();

    // Calculate overall score
    const tests = [
      results.touchInteractions.touchTargets.passed,
      results.installBehavior.manifestPresent,
      results.installBehavior.serviceWorkerPresent,
      results.offlineFunctionality.cachedContent,
      results.performance?.loadTime?.passed || false
    ];

    const passed = tests.filter(Boolean).length;
    const total = tests.length;
    const score = Math.round((passed / total) * 100);

    results.summary = {
      score: score,
      passed: passed,
      total: total,
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D'
    };

    console.log('\n📊 Mobile Test Results Summary:');
    console.log('================================');
    console.log(`Overall Score: ${score}% (${passed}/${total} tests passed)`);
    console.log(`Grade: ${results.summary.grade}`);

    this.testResults = results;
    return results;
  }

  // Export test results
  exportResults() {
    const resultsJson = JSON.stringify(this.testResults, null, 2);
    console.log('📄 Test Results (JSON):');
    console.log(resultsJson);
    
    // Create downloadable file
    const blob = new Blob([resultsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-test-results-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Results exported as JSON file');
  }

  // Restore original viewport
  restoreViewport() {
    try {
      window.resizeTo(this.originalViewport.width, this.originalViewport.height);
      const testContainer = document.getElementById('root') || document.body;
      if (testContainer) {
        testContainer.style.width = '';
        testContainer.style.maxWidth = '';
      }
      console.log('✅ Viewport restored to original size');
    } catch (error) {
      console.warn('Could not restore viewport programmatically');
    }
  }
}

// Usage instructions
console.log(`
📱 Mobile Device Testing Script Loaded!

Available commands:
==================
const mobileTester = new MobileDeviceTester();

// Run comprehensive test suite
mobileTester.runMobileTestSuite();

// Test specific aspects
mobileTester.testResponsiveBreakpoints();
mobileTester.testTouchInteractions();
mobileTester.testMobileInstallBehavior();
mobileTester.testOfflineFunctionality();
mobileTester.testMobilePerformance();

// Simulate specific devices
mobileTester.simulateDevice('iPhone 12');
mobileTester.simulateDevice('Samsung Galaxy S21');
mobileTester.simulateDevice('iPad');

// Export results
mobileTester.exportResults();

// Restore original viewport
mobileTester.restoreViewport();

Quick test:
-----------
(async () => {
  const mobileTester = new MobileDeviceTester();
  const results = await mobileTester.runMobileTestSuite();
  return results;
})();
`);

// Auto-run mobile tests if requested
if (window.location.search.includes('mobiletest=true')) {
  (async () => {
    const mobileTester = new MobileDeviceTester();
    await mobileTester.runMobileTestSuite();
  })();
}
