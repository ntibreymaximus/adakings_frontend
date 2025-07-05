# PWA Testing Guide - Adakings Restaurant Management System

## Overview
This guide provides comprehensive testing procedures for the Adakings Restaurant PWA to ensure optimal performance across all devices and network conditions.

## Test Environment Setup
- **Local Development**: http://localhost:3000
- **Production**: https://adakings.netlify.app (if deployed)
- **Chrome DevTools**: Use for offline simulation and debugging

## 1. Chrome DevTools Offline Testing & Caching Verification

### 1.1 Service Worker Registration Test
```javascript
// Open Chrome DevTools Console and run:
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker registered:', reg);
  console.log('Service Worker scope:', reg.scope);
});
```

### 1.2 Cache Storage Inspection
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. In the left sidebar, expand **Storage**
4. Click on **Cache Storage**
5. Verify these caches exist:
   - `adakings-restaurant-v2.1.0`
   - `adakings-api-v2.1.0`
   - `adakings-static-v2.1.0`
   - `adakings-dynamic-v2.1.0`
   - `adakings-offline-v2.1.0`

### 1.3 Offline Mode Simulation
1. In Chrome DevTools, go to **Network** tab
2. Click **Offline** checkbox or set throttling to "Offline"
3. Refresh the page
4. Verify the application loads from cache
5. Test navigation between pages:
   - Dashboard
   - View Orders
   - View Menu
   - View Transactions
   - User Profile
   - Create Order

### 1.4 Network Strategy Testing
Test different network conditions:
- **Slow 3G**: Verify progressive loading
- **Fast 3G**: Check performance optimization
- **Offline**: Confirm cached content availability

### 1.5 Cache Invalidation Test
1. Clear specific caches in DevTools
2. Reload the page
3. Verify new caches are created
4. Check that outdated content is properly updated

## 2. PWA Installation Flow Testing

### 2.1 Install Prompt Testing
#### Desktop (Chrome/Edge)
1. Visit the application
2. Look for install prompt in address bar
3. Click "Install" button
4. Verify app installs as standalone application
5. Test app launching from:
   - Start menu (Windows)
   - Applications folder (Mac)
   - Desktop shortcut

#### Mobile Testing
**Android (Chrome)**
1. Visit the application
2. Tap browser menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. Verify app appears on home screen
5. Test launching from home screen

**iOS (Safari)**
1. Visit the application
2. Tap share button
3. Select "Add to Home Screen"
4. Verify app appears on home screen
5. Test launching from home screen

### 2.2 Manifest Validation
Open Chrome DevTools → Application → Manifest
Verify these properties:
- **Name**: "Adakings Restaurant Management"
- **Short Name**: "Adakings"
- **Display**: "standalone"
- **Theme Color**: "#1e40af"
- **Background Color**: "#fafafa"
- **Start URL**: "/"
- **Icons**: Multiple sizes (72x72 to 512x512)

### 2.3 Icons and Splash Screen Testing
1. **Icon Display**: Verify app icon appears correctly on:
   - Home screen
   - App drawer
   - Task switcher
   - Taskbar/dock

2. **Splash Screen**: Check loading screen shows:
   - App icon
   - App name
   - Theme color background

## 3. Mobile-Responsive Design Verification

### 3.1 Device Testing Matrix
Test on various devices/screen sizes:

#### Mobile Devices (Portrait)
- **iPhone 12/13 Pro**: 390x844px
- **iPhone 8**: 375x667px
- **Samsung Galaxy S21**: 360x800px
- **Pixel 5**: 393x851px

#### Mobile Devices (Landscape)
- Test rotation behavior
- Verify content reflows properly
- Check navigation accessibility

#### Tablet Devices
- **iPad**: 768x1024px
- **iPad Pro**: 1024x1366px
- **Surface Pro**: 912x1368px

### 3.2 Responsive Design Checklist
✅ **Navigation**
- Bottom navigation bar works on mobile
- Menu items are finger-friendly (44px minimum)
- Navigation adapts to different screen sizes

✅ **Typography**
- Text is readable without zooming
- Font sizes scale appropriately
- Line height maintains readability

✅ **Layout**
- Content fits within viewport
- No horizontal scrolling (unless intended)
- Cards and components stack properly

✅ **Forms**
- Input fields are appropriately sized
- Labels are visible
- Submit buttons are accessible

✅ **Images and Media**
- Images scale correctly
- Icons maintain clarity
- Media queries work properly

### 3.3 Touch Interaction Testing
- **Tap targets**: Minimum 44px touch targets
- **Swipe gestures**: Verify where implemented
- **Pinch-to-zoom**: Check if disabled where appropriate
- **Scroll behavior**: Smooth scrolling on mobile

## 4. Performance Testing

### 4.1 Lighthouse Audit
1. Open Chrome DevTools
2. Go to **Lighthouse** tab
3. Run audit for:
   - **Performance** (Target: 90+)
   - **Accessibility** (Target: 90+)
   - **Best Practices** (Target: 90+)
   - **SEO** (Target: 90+)
   - **PWA** (Target: 90+)

### 4.2 Core Web Vitals
Monitor these metrics:
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### 4.3 PWA-Specific Tests
- **Time to Interactive**: < 3.5s
- **First Meaningful Paint**: < 2.0s
- **Service Worker Performance**: Registration < 1s

## 5. Feature-Specific Testing

### 5.1 Offline Functionality
Test each major feature offline:
- **Dashboard**: Cached data displays
- **Orders**: Previously loaded orders available
- **Menu**: Menu items cached and viewable
- **Transactions**: Recent transactions cached
- **User Profile**: Profile data available offline

### 5.2 Background Sync
1. Go offline
2. Attempt to create/update data
3. Go back online
4. Verify data syncs automatically

### 5.3 Push Notifications (if implemented)
- Test notification permissions
- Verify notifications display correctly
- Test notification click handling

## 6. Browser Compatibility Testing

### 6.1 Desktop Browsers
- **Chrome**: Latest and previous version
- **Firefox**: Latest and previous version
- **Safari**: Latest version (Mac)
- **Edge**: Latest version

### 6.2 Mobile Browsers
- **Chrome Mobile**: Android
- **Safari Mobile**: iOS
- **Samsung Internet**: Android
- **Firefox Mobile**: Android/iOS

## 7. Testing Commands and Scripts

### 7.1 Service Worker Testing
```javascript
// Check service worker status
navigator.serviceWorker.ready.then(registration => {
  console.log('SW ready:', registration);
});

// Check cache contents
caches.keys().then(cacheNames => {
  console.log('Available caches:', cacheNames);
});
```

### 7.2 Network Status Testing
```javascript
// Check online status
console.log('Navigator online:', navigator.onLine);

// Listen for network changes
window.addEventListener('online', () => console.log('Online'));
window.addEventListener('offline', () => console.log('Offline'));
```

### 7.3 Install Prompt Testing
```javascript
// Check if app is installed
window.matchMedia('(display-mode: standalone)').matches;
```

## 8. Automated Testing Scripts

### 8.1 PWA Validation Script
```javascript
// Run in browser console
function validatePWA() {
  const results = {
    serviceWorker: !!navigator.serviceWorker,
    manifest: !!document.querySelector('link[rel="manifest"]'),
    httpsOrLocalhost: location.protocol === 'https:' || location.hostname === 'localhost',
    responsive: window.innerWidth < 768 ? 'mobile' : 'desktop'
  };
  
  console.table(results);
  return results;
}

validatePWA();
```

## 9. Testing Checklist

### Pre-Testing Setup
- [ ] Application is running on localhost:3000
- [ ] Chrome DevTools is open
- [ ] Mobile device/emulator is ready
- [ ] Network conditions are configured

### Core PWA Features
- [ ] Service worker registers successfully
- [ ] App works offline
- [ ] App can be installed
- [ ] App runs in standalone mode
- [ ] Manifest is valid
- [ ] Icons display correctly
- [ ] Splash screen works

### Mobile Responsiveness
- [ ] Navigation works on mobile
- [ ] Content fits all screen sizes
- [ ] Touch interactions work
- [ ] Performance is acceptable
- [ ] Keyboard navigation works

### Cross-Platform Testing
- [ ] Works on Android Chrome
- [ ] Works on iOS Safari
- [ ] Works on desktop browsers
- [ ] Install flow works on all platforms

## 10. Common Issues and Solutions

### Issue: Service Worker Not Registering
**Solution**: Check console for errors, verify HTTPS/localhost, check SW file path

### Issue: App Not Installing
**Solution**: Verify manifest.json, check PWA criteria, ensure HTTPS

### Issue: Icons Not Displaying
**Solution**: Check icon paths, verify icon sizes, validate manifest

### Issue: Offline Mode Not Working
**Solution**: Check service worker cache strategies, verify network interceptors

### Issue: Poor Mobile Performance
**Solution**: Optimize images, reduce JavaScript bundle size, implement code splitting

## 11. Test Results Documentation

Create a test results document with:
- Test environment details
- Browser/device combinations tested
- Performance metrics
- Issues found and resolution status
- Screenshots of key functionality
- Final PWA compliance score

## Success Criteria
- [ ] PWA installs successfully on all major platforms
- [ ] Application works offline with cached content
- [ ] Mobile-responsive design matches desktop experience
- [ ] Performance scores meet target thresholds
- [ ] All core features work across different devices
- [ ] Service worker caching strategies work correctly
