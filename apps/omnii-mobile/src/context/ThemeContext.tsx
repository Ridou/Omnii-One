import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme, AccessibilityInfo } from 'react-native';
import { useProfile } from '~/context/ProfileContext';
import type { ThemeSettings } from '~/types/profile';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  isDark: boolean;
  resolvedTheme: 'light' | 'dark';
  systemTheme: 'light' | 'dark' | null;
  userTheme: ThemeSettings['colorScheme'];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  isDark: false,
  resolvedTheme: 'light',
  systemTheme: null,
  userTheme: 'light'
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const profileContext = useProfile();
  const systemColorScheme = useColorScheme();

  // PERFORMANCE: Memoized theme resolution with proper error handling
  const themeValue = useMemo(() => {
    try {
      // SAFETY: Handle case when profile context isn't ready
      const userTheme = profileContext?.state?.theme?.colorScheme || 'light';
      
      // FIXED: Proper handling of all theme types
      let resolvedTheme: 'light' | 'dark';
      
      if (userTheme === 'auto') {
        resolvedTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
      } else if (userTheme === 'high_contrast') {
        // High contrast maps to dark theme with special styling
        resolvedTheme = 'dark';
      } else {
        // 'light' or 'dark'
        resolvedTheme = userTheme === 'dark' ? 'dark' : 'light';
      }
      
      // Handle systemTheme with proper type safety
      const systemTheme: 'light' | 'dark' | null = 
        systemColorScheme === 'dark' ? 'dark' 
        : systemColorScheme === 'light' ? 'light' 
        : null;
      
      return {
        theme: resolvedTheme,
        isDark: resolvedTheme === 'dark',
        resolvedTheme,
        systemTheme,
        userTheme
      };
    } catch (error) {
      // FALLBACK: Safe defaults if anything fails
      console.warn('ThemeContext error, using defaults:', error);
      
      const fallbackSystemTheme: 'light' | 'dark' | null = 
        systemColorScheme === 'dark' ? 'dark' 
        : systemColorScheme === 'light' ? 'light' 
        : null;
      
      return {
        theme: 'light' as const,
        isDark: false,
        resolvedTheme: 'light' as const,
        systemTheme: fallbackSystemTheme,
        userTheme: 'light' as const
      };
    }
  }, [profileContext?.state?.theme?.colorScheme, systemColorScheme]);

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook for theme consumption
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Integration hook with ProfileContext
export function useThemeIntegration() {
  const { state, updateTheme } = useProfile();
  const { theme, isDark } = useTheme();
  
  // ACCESSIBILITY: Announce theme changes to screen readers
  const handleThemeChange = async (newTheme: ThemeSettings['colorScheme']) => {
    try {
      updateTheme({ colorScheme: newTheme });
      
      // Announce to screen readers
      const announcement = newTheme === 'auto' 
        ? 'Theme set to automatic mode'
        : `Theme changed to ${newTheme} mode`;
        
      AccessibilityInfo.announceForAccessibility(announcement);
    } catch (error) {
      console.warn('Theme change failed:', error);
    }
  };
  
  return { 
    themeSettings: state.theme, 
    handleThemeChange,
    currentTheme: theme,
    isDark 
  };
} 