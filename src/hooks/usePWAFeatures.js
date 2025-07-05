/**
 * Custom hook for PWA features
 * Provides simplified access to PWA functionality for components
 */
import { usePWA } from '../contexts/PWAContext';
import { useAuth } from '../contexts/AuthContext';

export const usePWAFeatures = () => {
  const { userData } = useAuth();
  const pwaContext = usePWA();

  // Determine if component should render PWA-specific UI
  const shouldRenderPWAUI = () => {
    return pwaContext.isPWA || pwaContext.showMobileUI;
  };

  // Determine if component should render mobile-specific UI
  const shouldRenderMobileUI = () => {
    return pwaContext.isMobile || pwaContext.showMobileUI;
  };

  // Check if bottom navigation should be visible
  const isBottomNavVisible = () => {
    return userData && pwaContext.shouldShowBottomNav();
  };

  // Check if standard navbar should be hidden
  const isStandardNavHidden = () => {
    return pwaContext.shouldHideStandardNav();
  };

  // Get PWA-specific CSS classes for a component
  const getPWAComponentClasses = (baseClasses = '') => {
    const pwaClasses = [];
    
    if (pwaContext.isPWA) pwaClasses.push('pwa-mode');
    if (pwaContext.isMobile) pwaClasses.push('mobile-device');
    if (pwaContext.showMobileUI) pwaClasses.push('mobile-ui');
    
    return `${baseClasses} ${pwaClasses.join(' ')}`.trim();
  };

  // Get container classes for PWA optimization
  const getPWAContainerClasses = () => {
    if (pwaContext.isPWA) {
      return 'container-fluid px-0';
    }
    return 'container';
  };

  // Check if component needs bottom padding for navigation
  const needsBottomPadding = () => {
    return isBottomNavVisible();
  };

  // Get PWA-safe margins and padding
  const getPWASafeSpacing = () => {
    if (!pwaContext.isPWA) {
      return {
        paddingTop: '1rem',
        paddingBottom: '1rem',
        paddingLeft: '1rem',
        paddingRight: '1rem'
      };
    }

    return {
      paddingTop: 'max(1rem, env(safe-area-inset-top))',
      paddingBottom: needsBottomPadding() ? '5rem' : 'max(1rem, env(safe-area-inset-bottom))',
      paddingLeft: 'max(1rem, env(safe-area-inset-left))',
      paddingRight: 'max(1rem, env(safe-area-inset-right))'
    };
  };

  // Check if touch optimizations should be applied
  const shouldOptimizeForTouch = () => {
    return pwaContext.isPWA || pwaContext.isMobile;
  };

  // Get appropriate button size for PWA/mobile
  const getButtonSize = (defaultSize = 'md') => {
    if (shouldOptimizeForTouch()) {
      return 'lg';
    }
    return defaultSize;
  };

  // Check if component should use full width
  const shouldUseFullWidth = () => {
    return pwaContext.isPWA || (pwaContext.isMobile && window.innerWidth < 768);
  };

  // Get PWA-optimized toast position
  const getToastPosition = () => {
    if (pwaContext.isPWA && pwaContext.isMobile) {
      return 'top-center';
    }
    return 'top-right';
  };

  // PWA-specific logging helper
  const logPWAEvent = (event, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PWA Event] ${event}:`, {
        ...data,
        isPWA: pwaContext.isPWA,
        displayMode: pwaContext.displayMode,
        timestamp: new Date().toISOString()
      });
    }
  };

  return {
    // PWA context (re-exported for convenience)
    ...pwaContext,
    
    // Helper functions
    shouldRenderPWAUI,
    shouldRenderMobileUI,
    isBottomNavVisible,
    isStandardNavHidden,
    getPWAComponentClasses,
    getPWAContainerClasses,
    needsBottomPadding,
    getPWASafeSpacing,
    shouldOptimizeForTouch,
    getButtonSize,
    shouldUseFullWidth,
    getToastPosition,
    logPWAEvent
  };
};

export default usePWAFeatures;
