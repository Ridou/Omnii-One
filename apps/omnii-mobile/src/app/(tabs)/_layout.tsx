import React from 'react';
import { Tabs , useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { useXPContext } from '~/context/XPContext';
import { useEffect, useState, useMemo, useRef } from 'react';
import { HeaderLogo } from '~/components/common/OmniiLogo';
import { 
  AnalyticsIcon, 
  ChatIcon, 
  ProfileIcon 
} from '~/components/common/TabIcons';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlobalCelebrationProvider } from '~/components/common/GlobalCelebrationProvider';

// V4 Color System - theme-aware colors
const getV4Colors = (isDark: boolean) => ({
  // Primary OMNII Purple
  primary: '#6366f1',
  
  // Tab States - theme aware
  tabActive: isDark ? '#ffffff' : '#1f2937',
  tabInactive: isDark ? '#9ca3af' : '#6b7280',
  
  // Backgrounds - theme aware
  tabBarBg: isDark ? '#1f2937' : '#ffffff',  // dark: gray-800, light: white
  
  // System colors from theme
  accent: '#3b82f6',
  muted: isDark ? '#6b7280' : '#9ca3af',
});



export default function TabLayout() {
  const { user, session } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  
  // Get theme-aware colors
  const V4_COLORS = getV4Colors(isDark);
  
  // Use XPContext for feature visit tracking
  const { 
    recordFeatureVisit
  } = useXPContext();
  
  const [visitedFeatures, setVisitedFeatures] = useState<Set<string>>(new Set());
  
  // Check if user is authenticated
  const isAuthenticated = !!(user && session);
  


  // Reset visited features when user changes
  useEffect(() => {
    if (user?.id) {
      setVisitedFeatures(new Set());
    }
  }, [user?.id]);

  // Award exploration XP when users visit features
  const awardExplorationXP = async (feature: string) => {
    // ✅ CLIENT-SIDE PROTECTION: Check if we've already visited this feature
    if (visitedFeatures.has(feature)) {
      return;
    }

    try {
      // Mark as visited BEFORE the server call to prevent race conditions
      setVisitedFeatures(prev => new Set(prev).add(feature));
      
      await recordFeatureVisit(feature);
    } catch (error) {
      // On error, remove from visited set to allow retry
      setVisitedFeatures(prev => {
        const newSet = new Set(prev);
        newSet.delete(feature);
        return newSet;
      });
    }
  };

    const shouldShowTabBar = useMemo(() => {
    // Always show tab bar for authenticated users, regardless of screen
    return !!(isAuthenticated && user);
  }, [isAuthenticated, user]);

  const insets = useSafeAreaInsets();

  if (!shouldShowTabBar) {
    return null;
  }

  return (
    <GlobalCelebrationProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: V4_COLORS.tabActive,
          tabBarInactiveTintColor: V4_COLORS.tabInactive,
          tabBarStyle: {
            backgroundColor: V4_COLORS.tabBarBg,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#374151' : '#e5e7eb',
            paddingBottom: 8,
            paddingTop: 8,
            height: 70,
          },
          tabBarShowLabel: false,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="analytics"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Text style={{ fontSize: 24, color }}>📊</Text>
            ),
          }}
          listeners={{
            tabPress: () => {
              // Award exploration XP for first visit
              awardExplorationXP('analytics');
            },
          }}
        />
        <Tabs.Screen
          name="achievements"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Text style={{ fontSize: 24, color }}>🏆</Text>
            ),
          }}
          listeners={{
            tabPress: () => {
              // Award exploration XP for first visit
              awardExplorationXP('achievements');
            },
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ 
                width: 60, 
                height: 60, 
                alignItems: 'center', 
                justifyContent: 'center',
                transform: [{ scale: focused ? 1.1 : 1.0 }]
              }}>
                <HeaderLogo />
              </View>
            ),
          }}
          listeners={{
            tabPress: () => {
              awardExplorationXP('tasks');
            },
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Text style={{ fontSize: 24, color }}>💬</Text>
            ),
          }}
          listeners={{
            tabPress: () => {
              // Award exploration XP for first visit
              awardExplorationXP('chat');
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Text style={{ fontSize: 24, color }}>👤</Text>
            ),
          }}
          listeners={{
            tabPress: () => {
              // Award exploration XP for first visit
              awardExplorationXP('profile');
            },
          }}
        />
      </Tabs>
    </GlobalCelebrationProvider>
  );
}