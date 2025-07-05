# PWA Detection System

This document explains how to use the PWA detection system implemented in the AdaKings frontend application.

## Overview

The PWA detection system provides:
1. Utility functions to detect if the app is running as a PWA
2. A React context to manage PWA state globally
3. Conditional loading of PWA-specific routes and components
4. CSS classes and styles for different display modes

## Components

### 1. PWA Detection Utility (`src/utils/pwaDetection.js`)

Provides core detection functions:

```javascript
import { isPWAMode, getDisplayMode, shouldShowMobileUI } from '../utils/pwaDetection';

// Check if running as PWA
if (isPWAMode()) {
  console.log('Running as PWA!');
}

// Get current display mode
const mode = getDisplayMode(); // 'standalone', 'fullscreen', 'minimal-ui', or 'browser'

// Check if should show mobile UI
if (shouldShowMobileUI()) {
  // Show mobile-optimized interface
}
```

### 2. PWA Context (`src/contexts/PWAContext.js`)

Provides global PWA state management:

```javascript
import { usePWA } from '../contexts/PWAContext';

function MyComponent() {
  const { 
    isPWA, 
    isInstalled, 
    displayMode, 
    shouldShowBottomNav,
    installPWA 
  } = usePWA();

  return (
    <div className={isPWA ? 'pwa-mode' : 'web-mode'}>
      {shouldShowBottomNav() && <BottomNavigation />}
    </div>
  );
}
```

### 3. PWA Features Hook (`src/hooks/usePWAFeatures.js`)

Simplified hook for common PWA operations:

```javascript
import { usePWAFeatures } from '../hooks/usePWAFeatures';

function MyComponent() {
  const { 
    shouldRenderPWAUI,
    getPWAComponentClasses,
    getPWASafeSpacing,
    logPWAEvent 
  } = usePWAFeatures();

  useEffect(() => {
    logPWAEvent('Component mounted');
  }, []);

  return (
    <div 
      className={getPWAComponentClasses('my-component')}
      style={getPWASafeSpacing()}
    >
      {shouldRenderPWAUI() ? <PWAView /> : <WebView />}
    </div>
  );
}
```

## Usage Examples

### Conditional Component Rendering

```javascript
function Dashboard() {
  const { isPWA, shouldShowBottomNav } = usePWA();

  return (
    <div>
      {/* Standard navigation for web */}
      {!isPWA && <StandardNavbar />}
      
      {/* Main content */}
      <main className={isPWA ? 'pwa-main' : 'web-main'}>
        <DashboardContent />
      </main>
      
      {/* PWA bottom navigation */}
      {shouldShowBottomNav() && <BottomNavBar />}
    </div>
  );
}
```

### PWA-Specific Routes

```javascript
function App() {
  const { isPWA, getPWARoutes } = usePWA();

  return (
    <Routes>
      {/* Standard routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      
      {/* PWA-specific routes */}
      {isPWA && getPWARoutes().map(route => (
        <Route key={route.path} {...route} />
      ))}
    </Routes>
  );
}
```

### CSS Classes

The system automatically applies CSS classes based on PWA state:

```css
/* Applied to App component */
.App.pwa-mode { /* PWA-specific styles */ }
.App.mobile-device { /* Mobile device styles */ }
.App.display-mode-standalone { /* Standalone mode styles */ }

/* Utility classes for conditional display */
.pwa-hide-on-web { display: none; }
.App.pwa-mode .pwa-hide-on-web { display: block; }

.pwa-show-on-web { display: block; }
.App.pwa-mode .pwa-show-on-web { display: none; }
```

### Installation Handling

```javascript
function InstallPrompt() {
  const { isInstallable, installPWA, deferredPrompt } = usePWA();

  if (!isInstallable || !deferredPrompt) return null;

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      console.log('PWA installed successfully!');
    }
  };

  return (
    <button onClick={handleInstall}>
      Install App
    </button>
  );
}
```

## Available PWA Context Values

| Property | Type | Description |
|----------|------|-------------|
| `isPWA` | boolean | True if running as PWA |
| `isInstalled` | boolean | True if PWA is installed |
| `isInstallable` | boolean | True if PWA can be installed |
| `displayMode` | string | Current display mode |
| `isMobile` | boolean | True if mobile device |
| `showMobileUI` | boolean | True if should show mobile UI |
| `deferredPrompt` | object | Install prompt event |
| `installPWA()` | function | Trigger PWA installation |
| `shouldShowBottomNav()` | function | Check if bottom nav should show |
| `shouldHideStandardNav()` | function | Check if standard nav should hide |
| `getPWAClasses()` | function | Get PWA-specific CSS classes |

## Best Practices

### 1. Use Context for Global State
Always use the PWA context for app-level decisions:

```javascript
// ✅ Good
const { isPWA } = usePWA();

// ❌ Avoid direct utility calls in components
const isPWA = isPWAMode();
```

### 2. Responsive Design
Use PWA detection to enhance, not replace, responsive design:

```javascript
function MyComponent() {
  const { shouldRenderMobileUI } = usePWAFeatures();
  
  return (
    <div className={`component ${shouldRenderMobileUI() ? 'mobile' : 'desktop'}`}>
      {/* Content adapts to both responsive breakpoints AND PWA mode */}
    </div>
  );
}
```

### 3. Safe Area Handling
Use the provided spacing utilities for safe areas:

```javascript
function FullScreenComponent() {
  const { getPWASafeSpacing } = usePWAFeatures();
  
  return (
    <div style={getPWASafeSpacing()}>
      {/* Content respects device safe areas */}
    </div>
  );
}
```

### 4. Progressive Enhancement
Design for web first, enhance for PWA:

```javascript
function Navigation() {
  const { isPWA, shouldShowBottomNav } = usePWA();
  
  return (
    <>
      {/* Base navigation always present */}
      <StandardNav />
      
      {/* Enhanced PWA navigation */}
      {shouldShowBottomNav() && <BottomNav />}
    </>
  );
}
```

## Debugging

Enable PWA detection logging in development:

```javascript
import { logPWAInfo } from '../utils/pwaDetection';

// Log current PWA state
logPWAInfo();

// Use the hook's logging helper
const { logPWAEvent } = usePWAFeatures();
logPWAEvent('User action', { action: 'button_click' });
```

## Testing PWA Mode

### Chrome DevTools
1. Open DevTools → Application tab
2. Select "Service Workers" → "Update on reload"
3. Use "Application" → "Manifest" to test PWA features

### Simulate Different Display Modes
Add URL parameters for testing:
- `?display=standalone` - Test standalone mode
- `?display=fullscreen` - Test fullscreen mode

### Mobile Testing
Use Chrome DevTools device emulation or test on actual mobile devices.

## Integration Checklist

- [ ] Import PWAProvider in App.js
- [ ] Add PWA CSS classes to components
- [ ] Implement conditional navigation
- [ ] Test PWA installation flow
- [ ] Verify safe area handling
- [ ] Test display mode transitions
- [ ] Validate mobile responsiveness
