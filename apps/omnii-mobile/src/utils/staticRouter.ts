import { router } from 'expo-router';
import { Platform } from 'react-native';
import { STATIC_ROUTES } from '../static-routes.config';

// Static export detection (same as in navigation.ts)
export const isStaticExport = () => {
  return Platform.OS === 'web' && 
         typeof window !== 'undefined' && 
         !(window as any).__EXPO_ROUTER__;
};

// Static-safe router for hybrid navigation
export const staticSafeRouter = {
  push: (href: string) => {
    // For web platforms, check if we're in static mode and if target is a static route
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // If we're in static export mode, use browser navigation
      if (isStaticExport()) {
        window.location.href = href;
        return;
      }
      
      // If target is a static route, use direct navigation for better performance
      if (STATIC_ROUTES.includes(href)) {
        window.location.href = href;
        return;
      }
    }
    
    // Fall back to Expo Router for dynamic routes and mobile
    router.push(href);
  },
  
  replace: (href: string) => {
    // For web platforms, handle static vs dynamic routing
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // In static export mode, always use browser navigation
      if (isStaticExport()) {
        window.location.replace(href);
        return;
      }
      
      // For static routes, use direct navigation
      if (STATIC_ROUTES.includes(href)) {
        window.location.replace(href);
        return;
      }
    }
    
    // Fall back to Expo Router for dynamic routes and mobile
    router.replace(href);
  },
  
  back: () => {
    // For web platforms, handle browser history appropriately
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // In static export mode, use browser history
      if (isStaticExport()) {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/'; // Go home if no history
        }
        return;
      }
      
      // For dynamic mode, check if we can use browser history
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    }
    
    // Fall back to Expo Router
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  },
  
  // Helper method to determine navigation strategy
  getNavigationMode: () => {
    if (Platform.OS !== 'web') return 'mobile';
    if (isStaticExport()) return 'static';
    return 'dynamic';
  }
}; 