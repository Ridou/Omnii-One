import React from 'react';
import { Tabs , useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
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

// V4 Color System - consistent with global.css
const V4_COLORS = {
  // Primary OMNII Purple
  primary: '#6366f1',
  
  // Tab States - consistent with global theme
  tabActive: '#ffffff',
  tabInactive: '#9ca3af',
  
  // Backgrounds
  tabBarBg: '#1f2937',  // gray-800
  
  // System colors from theme
  accent: '#3b82f6',
  muted: '#6b7280',
} as const;

// Breathing animation component for newly unlocked tabs - DISABLED to prevent visual artifacts
function BreathingIcon({ children, isNewlyUnlocked }: { 
  children: React.ReactNode; 
  isNewlyUnlocked: boolean;
}) {
  // DISABLED: No more breathing animation to prevent visual artifacts
  return (
    <View>
      {children}
    </View>
  );
}

export default function TabLayout() {
  const { user, session } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  
  // Use XPContext for all level/feature management
  const { 
    currentLevel, 
    isFeatureUnlocked, 
    recordFeatureVisit,
    getActiveNudges,
    dismissNudge,
    markNudgeShown,
    unlockedFeatures
  } = useXPContext();
  
  const [newlyUnlockedTabs, setNewlyUnlockedTabs] = useState<Set<string>>(new Set());
  
  // Check if user is authenticated
  const isAuthenticated = !!(user && session);
  
  // Track newly unlocked features and trigger breathing animation
  useEffect(() => {
    const currentUnlocked = new Set<string>();
    
    // Check for newly unlocked features based on current level
    if (isFeatureUnlocked('achievements')) currentUnlocked.add('achievements');
    if (isFeatureUnlocked('chat')) currentUnlocked.add('chat');
    if (isFeatureUnlocked('analytics')) currentUnlocked.add('analytics');
    if (isFeatureUnlocked('profile')) currentUnlocked.add('profile');
    
    setNewlyUnlockedTabs(currentUnlocked);
    
    // Clear newly unlocked status after tab interactions
    const clearTimer = setTimeout(() => {
      setNewlyUnlockedTabs(new Set());
    }, 60000); // Clear after 1 minute
    
    return () => clearTimeout(clearTimer);
  }, [currentLevel, isFeatureUnlocked]);

  // Award exploration XP when users visit newly unlocked features
  const awardExplorationXP = async (feature: string) => {
    if (isFeatureUnlocked(feature)) {
      try {
        await recordFeatureVisit(feature);
        console.log(`✨ [TabLayout] Recorded visit to ${feature}`);
      } catch (error) {
        console.error(`❌ [TabLayout] Failed to record visit to ${feature}:`, error);
      }
    }
  };

  // Get active nudges for displaying in UI
  const activeNudges = getActiveNudges();
  
  // Handle nudge dismissal
  const handleNudgeDismiss = (nudgeId: string) => {
    dismissNudge(nudgeId);
  };

  // Handle nudge shown tracking
  const handleNudgeShown = (nudgeId: string) => {
    markNudgeShown(nudgeId);
  };

  const shouldShowTabBar = useMemo(() => {
    const show = isAuthenticated && user;
    
    if (__DEV__) {
      console.log('📱 Tab Bar Auth State:', {
        isAuthenticated,
        user: user ? `${user.email} (${user.id})` : 'none',
        session: user ? 'exists' : 'none',
        currentLevel,
        isDark,
        isInitialized: true,
        shouldShowTabBar: show,
        newlyUnlocked: Array.from(newlyUnlockedTabs)
      });
    }
    
    return show;
  }, [isAuthenticated, user, currentLevel, isDark, newlyUnlockedTabs]);

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
              <BreathingIcon isNewlyUnlocked={newlyUnlockedTabs.has('analytics') && isFeatureUnlocked('analytics')}>
                <AnalyticsIcon 
                  size={size} 
                  color={isFeatureUnlocked('analytics') ? color : V4_COLORS.muted} 
                />
              </BreathingIcon>
            ),
            href: isFeatureUnlocked('analytics') ? '/analytics' : null,
          }}
          listeners={{
            tabPress: () => {
              if (isFeatureUnlocked('analytics')) {
                // Award exploration XP for first visit
                awardExplorationXP('analytics');
                
                // Remove breathing animation when tab is pressed
                setNewlyUnlockedTabs(prev => {
                  const newSet = new Set(prev);
                  newSet.delete('analytics');
                  return newSet;
                });
              }
            },
          }}
        />
        <Tabs.Screen
          name="achievements"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <BreathingIcon isNewlyUnlocked={newlyUnlockedTabs.has('achievements') && isFeatureUnlocked('achievements')}>
                <Trophy 
                  size={size} 
                  color={isFeatureUnlocked('achievements') ? color : V4_COLORS.muted} 
                />
              </BreathingIcon>
            ),
            href: isFeatureUnlocked('achievements') ? '/achievements' : null,
          }}
          listeners={{
            tabPress: () => {
              if (isFeatureUnlocked('achievements')) {
                // Award exploration XP for first visit
                awardExplorationXP('achievements');
                
                // Remove breathing animation when tab is pressed
                setNewlyUnlockedTabs(prev => {
                  const newSet = new Set(prev);
                  newSet.delete('achievements');
                  return newSet;
                });
              }
            },
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <BreathingIcon isNewlyUnlocked={false}>
                <HeaderLogo />
              </BreathingIcon>
            ),
          }}
          listeners={{
            tabPress: () => {
              awardExplorationXP('approvals');
            },
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <BreathingIcon isNewlyUnlocked={newlyUnlockedTabs.has('chat') && isFeatureUnlocked('chat')}>
                <ChatIcon 
                  size={size} 
                  color={isFeatureUnlocked('chat') ? color : V4_COLORS.muted} 
                />
              </BreathingIcon>
            ),
            href: isFeatureUnlocked('chat') ? '/chat' : null,
          }}
          listeners={{
            tabPress: () => {
              if (isFeatureUnlocked('chat')) {
                // Award exploration XP for first visit
                awardExplorationXP('chat');
                
                // Remove breathing animation when tab is pressed
                setNewlyUnlockedTabs(prev => {
                  const newSet = new Set(prev);
                  newSet.delete('chat');
                  return newSet;
                });
              }
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
                  color={isFeatureUnlocked('profile') ? color : V4_COLORS.muted} 
                />
              </BreathingIcon>
            ),
            href: isFeatureUnlocked('profile') ? '/profile' : null,
          }}
          listeners={{
            tabPress: () => {
              if (isFeatureUnlocked('profile')) {
                // Award exploration XP for first visit
                awardExplorationXP('profile');
                
                // Remove breathing animation when tab is pressed
                setNewlyUnlockedTabs(prev => {
                  const newSet = new Set(prev);
                  newSet.delete('profile');
                  return newSet;
                });
              }
            },
          }}
        />
      </Tabs>
    </GlobalCelebrationProvider>
  );
}