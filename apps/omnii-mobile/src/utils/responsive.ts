import { Dimensions, Platform } from 'react-native';

export const ResponsiveBreakpoints = {
  mobile: {
    xs: 320,      // iPhone SE, very small screens
    small: 375,   // iPhone 12/13 mini
    medium: 390,  // iPhone 12/13 
    large: 428,   // iPhone 12/13 Pro Max
  },
  tablet: {
    portrait: 768,  // iPad portrait
    landscape: 1024, // iPad landscape  
  },
  desktop: {
    small: 1280,   // Small laptops
    medium: 1440,  // Standard monitors
    large: 1920,   // Large monitors
    xlarge: 2560,  // 4K displays
  }
} as const;

export const useResponsiveDesign = () => {
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  
  const isMobileXS = windowWidth <= ResponsiveBreakpoints.mobile.xs;
  const isMobileSmall = windowWidth <= ResponsiveBreakpoints.mobile.small;
  const isMobile = windowWidth < ResponsiveBreakpoints.tablet.portrait;
  const isTablet = windowWidth >= ResponsiveBreakpoints.tablet.portrait && windowWidth < ResponsiveBreakpoints.desktop.small;
  const isDesktop = windowWidth >= ResponsiveBreakpoints.desktop.small;
  const isLargeDesktop = windowWidth >= ResponsiveBreakpoints.desktop.large;
  
  // Detect browser environment (web vs native)
  const isBrowser = Platform.OS === 'web';
  const isNative = !isBrowser;
  
  // Enhanced responsive logic - use responsive layouts for web or larger screens
  const shouldUseResponsiveLayout = isBrowser || isTablet || isDesktop;
  
  // Treat mobile browsers as tablets for enhanced layouts
  const effectiveIsTablet = isTablet || (isBrowser && isMobile);
  const effectiveIsDesktop = isDesktop;
  
  return {
    windowWidth,
    windowHeight,
    isMobileXS,
    isMobileSmall,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isBrowser,
    isNative,
    shouldUseResponsiveLayout,
    effectiveIsTablet,
    effectiveIsDesktop,
    
    // Mobile-optimized spacing following existing SACRED_SPACING pattern
    spacing: {
      horizontal: isMobileXS ? 16 : isMobileSmall ? 20 : isMobile ? 24 : isTablet ? 32 : 48,
      vertical: isMobileXS ? 12 : isMobile ? 16 : 24,
    },
    
    // Layout configurations
    layout: {
      featureColumns: isMobile ? 1 : isTablet ? 2 : 3,
      tabHeight: isMobile ? 60 : isTablet ? 70 : 80,
      maxContentWidth: Math.min(windowWidth - 32, 1440),
    },
    
    // Mobile-optimized typography scaling
    typography: {
      titleScale: isMobileXS ? 0.75 : isMobileSmall ? 0.85 : isMobile ? 0.9 : 1.0,
      bodyScale: isMobileXS ? 0.9 : isMobile ? 0.95 : 1.0,
      lineHeightScale: isMobile ? 1.2 : 1.3,
    },
    
    // Touch targets following iOS HIG
    touchTarget: {
      minimum: 44,
      recommended: isMobile ? 44 : 48,
    }
  };
};

// Export types for TypeScript
export type ResponsiveBreakpoint = keyof typeof ResponsiveBreakpoints;
export type DeviceType = 'mobile' | 'tablet' | 'desktop'; 