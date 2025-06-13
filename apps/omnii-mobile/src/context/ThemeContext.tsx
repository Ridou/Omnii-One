import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemeSettings } from '~/types/profile';

// Safe hook to optionally use profile context
function useSafeProfile() {
  try {
    const { useProfile } = require('~/context/ProfileContext');
    return useProfile();
  } catch {
    return null;
  }
}

interface ThemeContextValue {
  theme: 'light' | 'dark';
  isDark: boolean;
  resolvedTheme: 'light' | 'dark';
  systemTheme: 'light' | 'dark' | null;
  userTheme: ThemeSettings['colorScheme'] | null;
  isFollowingSystem: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  isDark: false,
  resolvedTheme: 'light',
  systemTheme: null,
  userTheme: null,
  isFollowingSystem: true
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const profileContext = useSafeProfile();
  const systemColorScheme = useColorScheme();

  // PERFORMANCE: Memoized theme resolution with proper error handling
  const themeValue = useMemo(() => {
    try {
      // SAFETY: Handle case when profile context isn't available (SSR/web)
      const userTheme = profileContext?.state?.theme?.colorScheme || null;
      
      // SIMPLIFIED: Only handle light/dark, default to system when no user preference
      let resolvedTheme: 'light' | 'dark';
      let isFollowingSystem = false;
      
      if (userTheme === null) {
        // No user preference set, follow system
        resolvedTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
        isFollowingSystem = true;
      } else {
        // User has set a preference, use it
        resolvedTheme = userTheme;
        isFollowingSystem = false;
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
        userTheme,
        isFollowingSystem
      };
    } catch (error) {
      // FALLBACK: Safe defaults if anything fails (SSR-safe)
      console.warn('ThemeContext error, using defaults:', error);
      
      const fallbackSystemTheme: 'light' | 'dark' | null = 
        systemColorScheme === 'dark' ? 'dark' 
        : systemColorScheme === 'light' ? 'light' 
        : null;
      
      return {
        theme: 'light' as 'light',
        isDark: false,
        resolvedTheme: 'light' as 'light',
        systemTheme: fallbackSystemTheme,
        userTheme: null,
        isFollowingSystem: true
      };
    }
  }, [profileContext?.state?.theme?.colorScheme, systemColorScheme]);

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook for theme consumption - SSR-safe
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return safe defaults instead of throwing during SSR
    return {
      theme: 'light' as 'light',
      isDark: false,
      resolvedTheme: 'light' as 'light',
      systemTheme: null,
      userTheme: null,
      isFollowingSystem: true
    };
  }
  return context;
}

// Integration hook with ProfileContext - only available when ProfileProvider exists
export function useThemeIntegration() {
  try {
    const { useProfile } = require('~/context/ProfileContext');
    const { state, updateTheme } = useProfile();
    const { theme, isDark } = useTheme();
    
    // Simple theme change handler
    const handleThemeChange = async (newTheme: ThemeSettings['colorScheme']) => {
      try {
        updateTheme({ colorScheme: newTheme });
        
        // Simple theme change without accessibility announcements
        console.log(`Theme changed to ${newTheme} mode`);
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
  } catch {
    // Fallback when ProfileProvider is not available
    const { theme, isDark } = useTheme();
    return {
      themeSettings: { colorScheme: 'light' as 'light' },
      handleThemeChange: () => console.warn('Theme updates not available without ProfileProvider'),
      currentTheme: theme,
      isDark
    };
  }
} 