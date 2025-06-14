import { router } from 'expo-router';
import { Platform } from 'react-native';

interface SmartBackOptions {
  fallbackRoute?: string;
  authAwareFallback?: boolean;
  webBehavior?: 'navigate' | 'close' | 'history';
  customFallback?: () => void;
}

// Static export detection utility
export const isStaticExport = () => {
  return Platform.OS === 'web' && 
         typeof window !== 'undefined' && 
         !(window as any).__EXPO_ROUTER__;
};

// React app mode detection and management
export const shouldShowReactApp = () => {
  if (typeof window === 'undefined') return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('app') === '1' || 
         window.sessionStorage.getItem('omnii-app-mode') === 'react';
};

export const enableReactAppMode = () => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('omnii-app-mode', 'react');
  }
};

// Hook version for components that can use hooks
export function useSmartBack(options: SmartBackOptions = {}) {
  const smartBack = () => {
    try {
      // Static export handling - use browser history
      if (isStaticExport()) {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        } else {
          // No history, go to fallback or home
          const fallbackRoute = options.fallbackRoute || '/';
          window.location.href = fallbackRoute;
        }
        return;
      }
      
      // Web-specific handling for dynamic mode
      if (Platform.OS === 'web') {
        if (options.webBehavior === 'history' && typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
          return;
        }
        if (options.webBehavior === 'close' && typeof window !== 'undefined') {
          window.close();
          return;
        }
      }
      
      // Custom fallback logic
      if (options.customFallback) {
        options.customFallback();
        return;
      }
      
      // Standard router back with fallback
      if (router.canGoBack()) {
        router.back();
        return;
      }
      
      // Determine fallback route
      let fallbackRoute = options.fallbackRoute;
      
      if (options.authAwareFallback && !fallbackRoute) {
        // For now, we'll use a simple fallback - this could be enhanced with auth context later
        fallbackRoute = '/';
      }
      
      const finalRoute = fallbackRoute || '/';
      router.push(finalRoute);
      
    } catch (error) {
      // Ultimate fallback - just go home
      if (isStaticExport() && typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.push('/');
      }
    }
  };
  
  return smartBack;
}

// Direct function for non-hook contexts
export function createSmartBack(options: SmartBackOptions = {}) {
  return () => {
    try {
      // Static export handling - use browser history
      if (isStaticExport()) {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        } else {
          // No history, go to fallback or home
          const fallbackRoute = options.fallbackRoute || '/';
          window.location.href = fallbackRoute;
        }
        return;
      }
      
      // Web-specific handling for dynamic mode
      if (Platform.OS === 'web') {
        if (options.webBehavior === 'history' && typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
          return;
        }
        if (options.webBehavior === 'close' && typeof window !== 'undefined') {
          window.close();
          return;
        }
      }
      
      // Custom fallback logic
      if (options.customFallback) {
        options.customFallback();
        return;
      }
      
      // Standard router back with fallback
      if (router.canGoBack()) {
        router.back();
        return;
      }
      
      // Determine fallback route
      let fallbackRoute = options.fallbackRoute;
      
      if (options.authAwareFallback && !fallbackRoute) {
        // For now, we'll use a simple fallback - this could be enhanced with auth context later
        fallbackRoute = '/';
      }
      
      const finalRoute = fallbackRoute || '/';
      router.push(finalRoute);
      
    } catch (error) {
      // Ultimate fallback - just go home
      if (isStaticExport() && typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.push('/');
      }
    }
  };
} 