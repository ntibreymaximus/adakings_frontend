# PWA Quick Test Reference Card

## 🚀 Quick Validation Commands

### Browser Console Tests
```javascript
// 1. Check Service Worker Status
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Status:', reg ? 'Active' : 'Not Found');
  if (reg) console.log('Scope:', reg.scope);
});

// 2. Validate PWA Manifest
fetch('/manifest.json').then(r => r.json()).then(m => {
  console.log('App Name:', m.name);
  console.log('Icons:', m.icons.length, 'found');
  console.log('Display Mode:', m.display);
});

// 3. Check Cache Storage
caches.keys().then(keys => {
  console.log('Caches:', keys.length);
  keys.forEach(key => console.log('  -', key));
});

// 4. Test Offline Status
console.log('Online Status:', navigator.onLine);
console.log('Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser');

// 5. Validate Responsive Design
console.log('Viewport:', window.innerWidth + 'x' + window.innerHeight);
console.log('Device Pixel Ratio:', window.devicePixelRatio);
```

## 📱 DevTools Quick Tests

### Application Tab Checklist
- [ ] **Manifest**: Valid JSON, all properties present
- [ ] **Service Workers**: Active and running
- [ ] **Storage → Cache Storage**: 5 Adakings caches present
- [ ] **Storage → Local Storage**: User data persisted

### Network Tab Tests
1. **Offline Test**: Check "Offline" → Refresh → App loads
2. **Slow 3G**: Test performance under poor conditions
3. **Cache Validation**: Look for cached resources (gray status)

### Device Toolbar Tests
- [ ] iPhone SE (375x667)
- [ ] iPad (768x1024)
- [ ] Responsive mode toggle
- [ ] Touch simulation

## 🎯 Lighthouse Quick Audit
1. Open DevTools → Lighthouse
2. Select: Performance, Accessibility, Best Practices, PWA, SEO
3. Run audit
4. Target scores: All 90+

## 📲 Installation Test Checklist

### Desktop (Chrome/Edge)
- [ ] Install prompt appears
- [ ] App installs as standalone
- [ ] Desktop shortcut created
- [ ] Starts from Start Menu

### Android Chrome
- [ ] "Add to Home Screen" banner
- [ ] Icon appears on home screen
- [ ] Launches fullscreen
- [ ] Splash screen shows

### iOS Safari
- [ ] Share → "Add to Home Screen"
- [ ] Custom icon displays
- [ ] Status bar styling applied
- [ ] Runs in standalone mode

## 🔧 Performance Benchmarks

| Metric | Target | Command |
|--------|--------|---------|
| Load Time | <3s | `performance.timing.loadEventEnd - performance.timing.navigationStart` |
| First Paint | <1.5s | `performance.getEntriesByType('paint')[0].startTime` |
| Service Worker | <1s | Check in Application tab |
| Cache Hit | Instant | Monitor Network tab |

## 🚨 Common Issues Checklist

### Service Worker Issues
- [ ] HTTPS or localhost required
- [ ] File path correct (`/sw.js`)
- [ ] No JavaScript errors in console
- [ ] Scope covers all app routes

### Installation Issues
- [ ] Manifest link in HTML head
- [ ] Required manifest properties present
- [ ] Icons accessible (no 404s)
- [ ] Service worker registered

### Mobile Issues
- [ ] Viewport meta tag present
- [ ] Touch targets ≥44px
- [ ] No horizontal scroll
- [ ] Content fits viewport

### Offline Issues
- [ ] Critical routes cached
- [ ] API fallbacks configured
- [ ] Offline indicator works
- [ ] Data persistence enabled

## 🏆 Testing Shortcuts

### Auto-run PWA Validator
```javascript
// Copy/paste in console for instant validation
(async () => {
  const script = document.createElement('script');
  script.src = './pwa-test.js';
  document.head.appendChild(script);
  await new Promise(resolve => script.onload = resolve);
  const validator = new PWAValidator();
  return await validator.runAllTests();
})();
```

### Mobile Test Suite
```javascript
// Auto-run mobile tests
(async () => {
  const script = document.createElement('script');
  script.src = './mobile-test.js';
  document.head.appendChild(script);
  await new Promise(resolve => script.onload = resolve);
  const tester = new MobileDeviceTester();
  return await tester.runMobileTestSuite();
})();
```

## 📊 Quick Score Calculator
```javascript
// PWA Score Calculator
function calculatePWAScore() {
  const checks = {
    serviceWorker: 'serviceWorker' in navigator,
    manifest: !!document.querySelector('link[rel="manifest"]'),
    https: location.protocol === 'https:' || location.hostname === 'localhost',
    responsive: !!document.querySelector('meta[name="viewport"]'),
    offline: navigator.onLine !== undefined
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const percentage = Math.round((score / total) * 100);
  
  console.log(`PWA Score: ${percentage}% (${score}/${total})`);
  console.table(checks);
  
  return { score: percentage, details: checks };
}

calculatePWAScore();
```

## 🎮 Testing Hotkeys

| Action | Chrome | Firefox | Safari |
|--------|--------|---------|--------|
| DevTools | F12 | F12 | Cmd+Opt+I |
| Device Mode | Ctrl+Shift+M | Ctrl+Shift+M | N/A |
| Console | Ctrl+Shift+J | Ctrl+Shift+K | Cmd+Opt+C |
| Network | Ctrl+Shift+E | Ctrl+Shift+E | Cmd+Opt+N |
| Application | Ctrl+Shift+I | Ctrl+Shift+I | N/A |

## ✅ Daily Testing Routine

### Morning Check (2 minutes)
1. Open localhost:3000
2. Check console for errors
3. Verify service worker active
4. Test one mobile device

### Weekly Full Test (15 minutes)
1. Run automated PWA validator
2. Test installation on one platform
3. Verify offline functionality
4. Check Lighthouse scores

### Release Testing (30 minutes)
1. Full device matrix testing
2. Cross-browser validation
3. Performance benchmarking
4. Accessibility audit

## 🔗 Useful URLs
- Local App: http://localhost:3000
- Manifest: http://localhost:3000/manifest.json
- Service Worker: http://localhost:3000/sw.js
- Auto PWA Test: http://localhost:3000?autotest=true
- Auto Mobile Test: http://localhost:3000?mobiletest=true

## 📋 Emergency Checklist
If PWA stops working:
1. [ ] Clear all caches in DevTools
2. [ ] Unregister service worker
3. [ ] Hard refresh (Ctrl+Shift+R)
4. [ ] Check console for errors
5. [ ] Verify manifest accessibility
6. [ ] Re-run validation tests
