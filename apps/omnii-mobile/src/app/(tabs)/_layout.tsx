import { Tabs , useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { useOnboardingContext } from '~/context/OnboardingContext';
import { useEffect, useState, useMemo, useRef } from 'react';
import { HeaderLogo } from '~/components/common/OmniiLogo';
import { 
  AnalyticsIcon, 
  ChatIcon, 
  ProfileIcon 
} from '~/components/common/TabIcons';
import ContextualNudge from '~/components/common/ContextualNudge';
import { Animated, View } from 'react-native';

// V4 Color System - consistent with global.css
const V4_COLORS = {
  // Primary OMNII brand color (same as CSS --color-omnii-primary)
  primary: '#667eea',
  
  // Text colors (same as CSS utilities)
  text: {
    primary: '#1a1b1f',
    secondary: '#6c6e73',
    tertiary: '#a8aaae',
  },
  
  // Dark mode colors (same as CSS dark mode)
  dark: {
    background: '#1a1b1f',
    card: '#2a2b2f',
    border: '#38393e',
    text: {
      primary: '#ffffff',
      secondary: '#a8aaae',
      tertiary: '#6c6e73',
    }
  },
  
  // Light mode colors
  light: {
    background: '#ffffff',
    card: '#ffffff',
    border: '#e9ecef',
    borderLight: '#f1f3f5',
  }
};

// Breathing Animation Component for newly unlocked tabs
const BreathingIcon = ({ children, isNewlyUnlocked }: { children: React.ReactNode, isNewlyUnlocked: boolean }) => {
  const breathingAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isNewlyUnlocked) {
      const breathingLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      breathingLoop.start();
      
      // Stop breathing after 30 seconds
      setTimeout(() => {
        breathingLoop.stop();
        Animated.timing(breathingAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 30000);
      
      return () => breathingLoop.stop();
    }
  }, [isNewlyUnlocked, breathingAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: breathingAnim }] }}>
      {children}
    </Animated.View>
  );
};

export default function TabLayout() {
  const { user, session, isInitialized } = useAuth();
  const { isDark } = useTheme();
  const { state, isFeatureUnlocked } = useOnboardingContext();
  const [newlyUnlockedTabs, setNewlyUnlockedTabs] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  // Track mounting state
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // Check if user is authenticated
  const isAuthenticated = !!(user && session);
  
  // 🔒 ROUTE PROTECTION: Redirect unauthenticated users to landing page
  useEffect(() => {
    // Only redirect if component is mounted, auth is initialized, and user is not authenticated
    if (isMounted && isInitialized && !isAuthenticated) {
      console.log('🔒 Unauthenticated user detected in protected tabs, scheduling redirect to landing page');
      // Use setTimeout to ensure safe navigation
      setTimeout(() => {
        if (isMounted && !isAuthenticated) {
          console.log('🏠 Executing redirect to landing page');
          router.replace('/');
        }
      }, 100);
    }
  }, [isMounted, isInitialized, isAuthenticated, router]);
  
  // Memoize current level to prevent unnecessary re-renders
  const currentLevel = useMemo(() => {
    return state.onboardingData.current_level;
  }, [state.onboardingData.current_level]);

  // Track newly unlocked features and trigger breathing animation
  useEffect(() => {
    const currentUnlocked = state.unlockedFeatures;
    const newlyUnlocked = new Set<string>();
    
    // Check for newly unlocked features
    currentUnlocked.forEach(feature => {
      if (['achievements', 'chat', 'analytics', 'profile'].includes(feature)) {
        newlyUnlocked.add(feature);
      }
    });
    
    setNewlyUnlockedTabs(newlyUnlocked);
    
    // Clear newly unlocked status after tab interactions
    const clearTimer = setTimeout(() => {
      setNewlyUnlockedTabs(new Set());
    }, 60000); // Clear after 1 minute
    
    return () => clearTimeout(clearTimer);
  }, [state.unlockedFeatures, currentLevel]);
  
  // Debug authentication state for tab bar (only when values actually change)
  useEffect(() => {
    if (__DEV__) {
      console.log('📱 Tab Bar Auth State:', {
        user: user ? `${user.email} (${user.id})` : 'null',
        session: session ? 'exists' : 'null',
        isAuthenticated,
        isInitialized,
        currentLevel,
        shouldShowTabBar: isAuthenticated,
        newlyUnlocked: Array.from(newlyUnlockedTabs),
        isDark
      });
    }
  }, [isAuthenticated, isInitialized, currentLevel, user?.id, newlyUnlockedTabs, isDark]);

  // Don't render tabs if not authenticated (additional protection)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        // V4 Color System - consistent with global.css
        tabBarActiveTintColor: V4_COLORS.primary,
        tabBarInactiveTintColor: isDark ? V4_COLORS.dark.text.tertiary : V4_COLORS.text.secondary,
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
          backgroundColor: isDark ? V4_COLORS.dark.background : V4_COLORS.light.background,
          borderTopColor: isDark ? V4_COLORS.dark.border : V4_COLORS.light.border,
          borderTopWidth: 1,
        },
        tabBarShowLabel: false, // Remove all text labels
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <BreathingIcon isNewlyUnlocked={newlyUnlockedTabs.has('analytics') && isFeatureUnlocked('analytics')}>
              <AnalyticsIcon 
                size={size} 
                color={isFeatureUnlocked('analytics') ? color : (isDark ? V4_COLORS.dark.text.tertiary : V4_COLORS.text.secondary)}
                focused={focused}
              />
            </BreathingIcon>
          ),
          href: isFeatureUnlocked('analytics') ? undefined : null, // Hide tab if not unlocked
        }}
        listeners={{
          tabPress: () => {
            // Remove breathing animation when tab is pressed
            setNewlyUnlockedTabs(prev => {
              const newSet = new Set(prev);
              newSet.delete('analytics');
              return newSet;
            });
          },
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Achievements',
          tabBarIcon: ({ color, size, focused }) => (
            <BreathingIcon isNewlyUnlocked={newlyUnlockedTabs.has('achievements') && isFeatureUnlocked('achievements')}>
              <Trophy 
                size={size} 
                color={isFeatureUnlocked('achievements') ? color : (isDark ? V4_COLORS.dark.text.tertiary : V4_COLORS.text.secondary)}
              />
            </BreathingIcon>
          ),
          href: isFeatureUnlocked('achievements') ? undefined : null,
        }}
        listeners={{
          tabPress: () => {
            setNewlyUnlockedTabs(prev => {
              const newSet = new Set(prev);
              newSet.delete('achievements');
              return newSet;
            });
          },
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          tabBarIcon: ({ color, size }) => (
            <HeaderLogo 
              style={{ 
                transform: [{ scale: 0.8 }],
                opacity: color === V4_COLORS.primary ? 1 : 0.6 
              }} 
            />
          ),
          // Approvals is always available (onboarding happens here)
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <BreathingIcon isNewlyUnlocked={newlyUnlockedTabs.has('chat') && isFeatureUnlocked('chat')}>
              <ChatIcon 
                size={size} 
                color={isFeatureUnlocked('chat') ? color : (isDark ? V4_COLORS.dark.text.tertiary : V4_COLORS.text.secondary)}
                focused={focused}
              />
            </BreathingIcon>
          ),
          href: isFeatureUnlocked('chat') ? undefined : null,
        }}
        listeners={{
          tabPress: () => {
            setNewlyUnlockedTabs(prev => {
              const newSet = new Set(prev);
              newSet.delete('chat');
              return newSet;
            });
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <BreathingIcon isNewlyUnlocked={newlyUnlockedTabs.has('profile') && isFeatureUnlocked('profile')}>
              <ProfileIcon 
                size={size} 
                color={isFeatureUnlocked('profile') ? color : (isDark ? V4_COLORS.dark.text.tertiary : V4_COLORS.text.secondary)}
                focused={focused}
              />
            </BreathingIcon>
          ),
          href: isFeatureUnlocked('profile') ? undefined : null,
        }}
        listeners={{
          tabPress: () => {
            setNewlyUnlockedTabs(prev => {
              const newSet = new Set(prev);
              newSet.delete('profile');
              return newSet;
            });
          },
        }}
      />
    </Tabs>
  );
}