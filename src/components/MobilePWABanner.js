import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

const MobilePWABanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone === true;
    
    if (isStandalone) return;

    // Check if banner was dismissed recently
    const dismissedTime = localStorage.getItem('pwa-banner-dismissed');
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) return; // Don't show for 24 hours after dismissal
    }

    // Enhanced mobile detection
    const isMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      return /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent) ||
             window.innerWidth <= 768;
    };

    if (!isMobile()) return;

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after 5 seconds
      setTimeout(() => setShowBanner(true), 5000);
    };

    // Check if prompt is already available
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setTimeout(() => setShowBanner(true), 5000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      console.log('PWA installed from banner');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // iOS instructions
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        alert('To install:\n1. Tap the Share button below\n2. Tap "Add to Home Screen"\n3. Tap "Add"');
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`Install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-blue-600 text-white p-3 shadow-lg md:hidden animate-slide-down">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <Download size={20} className="flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Install ADARESMANSYS</p>
            <p className="text-xs opacity-90">ADARESMANSYS</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleInstall}
            className="bg-white text-blue-600 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-50 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobilePWABanner;
