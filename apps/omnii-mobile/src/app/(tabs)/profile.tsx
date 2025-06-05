import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ScrollView,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { CircleUser as UserCircle } from 'lucide-react-native';
import { useAuth } from '~/context/AuthContext';
import { useProfile } from '~/context/ProfileContext';
import { useOnboardingContext } from '~/context/OnboardingContext';
import { useTheme } from '~/context/ThemeContext';
import { AppLogo } from '~/components/common/OmniiLogo';
import WorkStyleAssessment from '~/components/profile/WorkStyleAssessment';
import DataManagement from '~/components/profile/DataManagement';
import ThemeSelector from '~/components/profile/ThemeSelector';
import { AppColors } from '~/constants/Colors';
import { BRAND_COLORS } from '~/lib/assets';
import { cn } from '~/utils/cn';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import type { ProfileTab, TabConfig } from '~/types/profile';

const { width: screenWidth } = Dimensions.get('window');

// Tab configuration following approvals screen pattern
const profileTabs: TabConfig[] = [
  {
    key: 'connect',
    label: 'Connect',
    icon: '🔗',
    gradient: ['#667eea', '#764ba2']
  },
  {
    key: 'dna',
    label: 'DNA',
    icon: '🧬',
    gradient: ['#4ECDC4', '#44A08D']
  },
  {
    key: 'ai',
    label: 'AI Tuning',
    icon: '🤖',
    gradient: ['#FFB347', '#FFD700']
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: '⚙️',
    gradient: ['#FF6B6B', '#EE5A24']
  }
];

export default function ProfileScreen() {
  const { user, signOut, isLoading } = useAuth();
  const { state, updateTheme } = useProfile();
  const { 
    getCurrentLevel, 
    state: onboardingState,
    isOnboardingComplete
  } = useOnboardingContext();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  
  // Get real user progression data
  const level = getCurrentLevel();
  const currentXP = onboardingState.onboardingData.total_xp;
  const mascotStage = level <= 10 ? 'seed' : level <= 25 ? 'flower' : 'tree';
  
  const [selectedTab, setSelectedTab] = useState<ProfileTab>('connect');
  const [refreshing, setRefreshing] = useState(false);

  // Animation refs for each tab (SIMPLIFIED - no more glow effects)
  const scaleAnimations = useRef(
    profileTabs.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(1);
      return acc;
    }, {} as Record<ProfileTab, Animated.Value>)
  ).current;

  // Direct emergency logout function (bypasses all React logic)
  const emergencyLogout = async () => {
    console.log('🚨 === EMERGENCY DIRECT LOGOUT ===');
    
    try {
      // Step 1: Clear localStorage
      console.log('🧹 Step 1: Clearing localStorage...');
      if (typeof localStorage !== 'undefined') {
        const beforeKeys = Object.keys(localStorage);
        console.log('📦 LocalStorage keys before:', beforeKeys);
        localStorage.clear();
        const afterKeys = Object.keys(localStorage);
        console.log('📦 LocalStorage keys after:', afterKeys);
        console.log('✅ LocalStorage cleared successfully');
      } else {
        console.log('❌ localStorage not available');
      }
      
      // Step 2: Clear sessionStorage
      console.log('🧹 Step 2: Clearing sessionStorage...');
      if (typeof sessionStorage !== 'undefined') {
        const beforeKeys = Object.keys(sessionStorage);
        console.log('📦 SessionStorage keys before:', beforeKeys);
        sessionStorage.clear();
        const afterKeys = Object.keys(sessionStorage);
        console.log('📦 SessionStorage keys after:', afterKeys);
        console.log('✅ SessionStorage cleared successfully');
      } else {
        console.log('❌ sessionStorage not available');
      }
      
      // Step 3: Direct Supabase signOut
      console.log('🔄 Step 3: Direct Supabase signOut...');
      if (typeof window !== 'undefined') {
        console.log('🔍 Window object available');
        if ('supabase' in window) {
          console.log('🔍 Supabase found in window');
          try {
            // Direct call exactly like the emergency script
            const result = await (window as Window & { supabase: { auth: { signOut: () => Promise<unknown> } } }
              ).supabase.auth.signOut();
            console.log('✅ Supabase signOut result:', result);
            console.log('✅ Direct Supabase signOut completed');
          } catch (supabaseError) {
            console.error('❌ Supabase signOut error:', supabaseError);
            console.log('⚠️ Continuing despite Supabase error...');
          }
        } else {
          console.log('❌ Supabase not found in window');
        }
      } else {
        console.log('❌ Window object not available');
      }
      
      // Step 4: Force redirect
      console.log('🎯 Step 4: Force redirect...');
      if (typeof window !== 'undefined') {
        console.log('🔄 Executing window.location.href = "/"');
        window.location.href = '/';
        console.log('✅ Redirect initiated');
      } else {
        console.log('❌ Cannot redirect - window not available');
      }
      
    } catch (error) {
      console.error('💥 Emergency logout failed:', error);
      console.log('🔄 Fallback: Force page reload...');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  const handleLogout = async () => {
    if (!user) {
      return;
    }
    
    // Direct logout action - AuthContext will handle redirect automatically
    try {
      console.log('🚪 === STANDARD LOGOUT ===');
      await signOut();
      console.log('✅ Logout successful - AuthContext will handle redirect');
      // AuthContext will automatically redirect to landing page
    } catch (error) {
      console.error('❌ Logout failed:', error);
      console.log('Failed to logout. Please try again.');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh - in real app, this would sync with backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleTabPress = (tabKey: ProfileTab) => {
    // Scale animation on press (identical to approvals screen)
    const scaleAnim = scaleAnimations[tabKey];
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedTab(tabKey);
  };

  // Filter tabs component
  const ProfileTabs = () => (
    <View className="flex-row px-5 pb-5 pt-2 gap-3">
      {profileTabs.map((tab) => {
        const isActive = selectedTab === tab.key;
        
        return (
          <TouchableOpacity
            key={tab.key}
            className="flex-1 h-20 rounded-xl overflow-hidden"
            style={[
              isActive && {
                elevation: 4,
                shadowColor: tab.gradient[0],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }
            ]}
            onPress={() => handleTabPress(tab.key)}
          >
            <Animated.View
              className="flex-1 relative overflow-hidden rounded-xl"
              style={{
                transform: [{ scale: scaleAnimations[tab.key] }],
              }}
            >
              <Svg width="100%" height="100%" className="absolute inset-0">
                <Defs>
                  <LinearGradient
                    id={`gradient-${tab.key}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={tab.gradient[0]} />
                    <Stop offset="100%" stopColor={tab.gradient[1]} />
                  </LinearGradient>
                </Defs>
                <Rect
                  width="100%"
                  height="100%"
                  fill={`url(#gradient-${tab.key})`}
                  rx="12"
                />
              </Svg>
              <View className="absolute inset-0 flex-1 justify-center items-center" style={{ zIndex: 20 }}>
                <Text 
                  className="text-2xl font-bold mb-0.5"
                  style={{ 
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  {tab.icon}
                </Text>
                <Text 
                  className="text-xs font-bold text-white text-center"
                  style={{ 
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 1,
                  }}
                >
                  {tab.label}
                </Text>
                {/* Show notification dot on Connect tab for new users */}
                {tab.key === 'connect' && level >= 3 && (
                  <View className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-white" />
                )}
              </View>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render tab content
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'connect':
        return (
          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            {/* Discord CTA Card for Level 5+ */}
            {level >= 5 && (
              <View className={cn(
                "rounded-2xl p-5 mb-4 border-l-4 border-purple-500",
                "bg-omnii-card",
                isDark && "bg-omnii-dark-card"
              )}>
                <View className="flex-row items-center mb-3">
                  <Text className="text-3xl mr-3">💬</Text>
                  <View className="flex-row items-center justify-between flex-1">
                    <Text className={cn(
                      "omnii-heading text-xl font-bold flex-1",
                      isDark && "text-omnii-dark-text-primary"
                    )}>Join Our Community</Text>
                    <View className="bg-red-500 px-2 py-1 rounded-xl">
                      <Text className="text-white text-xs font-bold tracking-wide">NEW</Text>
                    </View>
                  </View>
                </View>
                
                <Text className={cn(
                  "omnii-body text-base leading-6 mb-4",
                  isDark && "text-omnii-dark-text-secondary"
                )}>
                  Connect with other productivity enthusiasts and share your OMNII journey! Get tips, insights, and be part of our growing community.
                </Text>
                
                <View className="mb-5">
                  <Text className={cn(
                    "omnii-body text-sm font-medium mb-1.5 leading-5",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>
                    • Early access to new features and updates
                  </Text>
                  <Text className={cn(
                    "omnii-body text-sm font-medium mb-1.5 leading-5",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>
                    • Share productivity tips and celebrate achievements
                  </Text>
                  <Text className={cn(
                    "omnii-body text-sm font-medium mb-1.5 leading-5",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>
                    • Direct feedback channel to shape OMNII's future
                  </Text>
                  <Text className={cn(
                    "omnii-body text-sm font-medium leading-5",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>
                    • Connect with like-minded productivity enthusiasts
                  </Text>
                </View>
                
                <TouchableOpacity
                  className="bg-ai-start py-3.5 px-5 rounded-xl flex-row items-center justify-center mt-4"
                  onPress={async () => {
                    try {
                      await Linking.openURL('https://discord.gg/HPgAARkhkE');
                    } catch (error) {
                      console.error('Failed to open Discord link:', error);
                    }
                  }}
                >
                  <Text className="text-white text-base font-bold mr-2">Join Discord Community</Text>
                  <Text className="text-white text-base font-bold">→</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Placeholder Cards */}
            <View className={cn(
              "rounded-2xl p-5 mb-4 border-l-4 border-purple-500",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-lg font-semibold mb-2",
                isDark && "text-omnii-dark-text-primary"
              )}>📱 Calendar Integration</Text>
              <Text className={cn(
                "omnii-body text-sm leading-5 mb-3",
                isDark && "text-omnii-dark-text-secondary"
              )}>
                Connect your calendar to optimize scheduling and task management.
              </Text>
              <Text className={cn(
                "omnii-caption text-xs",
                isDark && "text-omnii-dark-text-tertiary"
              )}>Coming Soon</Text>
            </View>
            
            <View className={cn(
              "rounded-2xl p-5 mb-4 border-l-4 border-purple-500",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-lg font-semibold mb-2",
                isDark && "text-omnii-dark-text-primary"
              )}>✉️ Email Integration</Text>
              <Text className={cn(
                "omnii-body text-sm leading-5 mb-3",
                isDark && "text-omnii-dark-text-secondary"
              )}>
                Smart email processing and task extraction from your inbox.
              </Text>
              <Text className={cn(
                "omnii-caption text-xs",
                isDark && "text-omnii-dark-text-tertiary"
              )}>Coming Soon</Text>
            </View>
            
            <View className={cn(
              "rounded-2xl p-5 mb-4 border-l-4 border-purple-500",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-lg font-semibold mb-2",
                isDark && "text-omnii-dark-text-primary"
              )}>💬 Slack Integration</Text>
              <Text className={cn(
                "omnii-body text-sm leading-5 mb-3",
                isDark && "text-omnii-dark-text-secondary"
              )}>
                Seamlessly manage tasks and projects from your team workspace.
              </Text>
              <Text className={cn(
                "omnii-caption text-xs",
                isDark && "text-omnii-dark-text-tertiary"
              )}>Coming Soon</Text>
            </View>
          </ScrollView>
        );
        
      case 'dna':
        return (
          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            {/* Automatic DNA Generation */}
            <View className={cn(
              "rounded-2xl p-5 mb-4 border-l-4 border-ai-start",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <View className="flex-row items-center mb-3">
                <Text className="text-3xl mr-3">🧬</Text>
                <View>
                  <Text className={cn(
                    "omnii-heading text-xl font-bold",
                    isDark && "text-omnii-dark-text-primary"
                  )}>Your Productivity DNA</Text>
                  <Text className={cn(
                    "omnii-body text-sm font-medium",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Generated from your inspiration preferences</Text>
                </View>
              </View>
              
              {level >= 2 ? (
                <View>
                  <Text className={cn(
                    "omnii-body text-base leading-6 mb-4",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>
                    Based on your quote responses, we've crafted your unique productivity profile. You can customize these insights below.
                  </Text>
                  
                  <View className="mt-3">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className={cn(
                        "omnii-body text-sm font-semibold",
                        isDark && "text-omnii-dark-text-primary"
                      )}>Work Style:</Text>
                      <Text className={cn(
                        "omnii-body text-sm font-medium",
                        isDark && "text-omnii-dark-text-secondary"
                      )}>Results-Oriented</Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className={cn(
                        "omnii-body text-sm font-semibold",
                        isDark && "text-omnii-dark-text-primary"
                      )}>Energy Pattern:</Text>
                      <Text className={cn(
                        "omnii-body text-sm font-medium",
                        isDark && "text-omnii-dark-text-secondary"
                      )}>Morning Focused</Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className={cn(
                        "omnii-body text-sm font-semibold",
                        isDark && "text-omnii-dark-text-primary"
                      )}>Communication:</Text>
                      <Text className={cn(
                        "omnii-body text-sm font-medium",
                        isDark && "text-omnii-dark-text-secondary"
                      )}>Direct & Clear</Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className={cn(
                        "omnii-body text-sm font-semibold",
                        isDark && "text-omnii-dark-text-primary"
                      )}>Goal Orientation:</Text>
                      <Text className={cn(
                        "omnii-body text-sm font-medium",
                        isDark && "text-omnii-dark-text-secondary"
                      )}>Achievement Driven</Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className={cn(
                        "omnii-body text-sm font-semibold",
                        isDark && "text-omnii-dark-text-primary"
                      )}>Focus Preference:</Text>
                      <Text className={cn(
                        "omnii-body text-sm font-medium",
                        isDark && "text-omnii-dark-text-secondary"
                      )}>Deep Work Sessions</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity className="bg-ai-start py-3.5 px-5 rounded-xl flex-row items-center justify-center mt-4">
                    <Text className="text-white text-base font-bold mr-2">Customize Your DNA</Text>
                    <Text className="text-white text-base font-bold">→</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="items-center justify-center">
                  <Text className={cn(
                    "omnii-body text-sm font-medium mb-2",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>
                    Complete more daily inspiration to unlock your personalized DNA profile.
                  </Text>
                  <Text className={cn(
                    "omnii-caption text-xs font-medium",
                    isDark && "text-omnii-dark-text-tertiary"
                  )}>
                    Progress: {Math.min(level - 1, 1)}/1 completed
                  </Text>
                </View>
              )}
            </View>
            
            <View className={cn(
              "rounded-2xl p-5 mb-4",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-lg font-semibold mb-2",
                isDark && "text-omnii-dark-text-primary"
              )}>⚡ Energy Mapping</Text>
              <Text className={cn(
                "omnii-body text-sm leading-5 mb-3",
                isDark && "text-omnii-dark-text-secondary"
              )}>
                Map your energy patterns to optimize your daily schedule.
              </Text>
              <Text className={cn(
                "omnii-caption text-xs",
                isDark && "text-omnii-dark-text-tertiary"
              )}>Coming Soon</Text>
            </View>
            
            <View className={cn(
              "rounded-2xl p-5 mb-4",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-lg font-semibold mb-2",
                isDark && "text-omnii-dark-text-primary"
              )}>🎯 Goal Hierarchy</Text>
              <Text className={cn(
                "omnii-body text-sm leading-5 mb-3",
                isDark && "text-omnii-dark-text-secondary"
              )}>
                Set and prioritize your goals for maximum impact.
              </Text>
              <Text className={cn(
                "omnii-caption text-xs",
                isDark && "text-omnii-dark-text-tertiary"
              )}>Coming Soon</Text>
            </View>
          </ScrollView>
        );
        
      case 'ai':
        return (
          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            {/* AI Persona Tuning */}
            <View className={cn(
              "rounded-2xl p-5 mb-4 border-l-4 border-ai-start",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-xl font-bold mb-2",
                isDark && "text-omnii-dark-text-primary"
              )}>AI Persona</Text>
              <Text className={cn(
                "omnii-body text-sm leading-6 mb-4",
                isDark && "text-omnii-dark-text-secondary"
              )}>
                Customize how your AI assistant communicates and behaves
              </Text>
              
              {/* Communication Style Dial */}
              <View className="mb-3">
                <Text className={cn(
                  "omnii-body text-base font-semibold mb-2",
                  isDark && "text-omnii-dark-text-primary"
                )}>Communication Style</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Casual</Text>
                  <View className={cn(
                    "flex-1 h-5 rounded-2xl overflow-hidden relative",
                    isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
                  )}>
                    <View className="absolute top-0 left-0 bottom-0 bg-ai-start rounded-2xl" style={{ width: '65%' }} />
                    <View className={cn(
                      "absolute top-0 bottom-0 w-5 h-5 rounded-full border-2",
                      isDark ? "bg-omnii-dark-card border-omnii-dark-border-light" : "bg-omnii-card border-omnii-border-light"
                    )} style={{ left: '60%' }} />
                  </View>
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Professional</Text>
                </View>
                <Text className={cn(
                  "omnii-caption text-xs font-medium mt-1",
                  isDark && "text-omnii-dark-text-tertiary"
                )}>Balanced Professional</Text>
              </View>

              {/* Response Length Dial */}
              <View className="mb-3">
                <Text className={cn(
                  "omnii-body text-base font-semibold mb-2",
                  isDark && "text-omnii-dark-text-primary"
                )}>Response Length</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Brief</Text>
                  <View className={cn(
                    "flex-1 h-5 rounded-2xl overflow-hidden relative",
                    isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
                  )}>
                    <View className="absolute top-0 left-0 bottom-0 bg-success rounded-2xl" style={{ width: '40%' }} />
                    <View className={cn(
                      "absolute top-0 bottom-0 w-5 h-5 rounded-full border-2",
                      isDark ? "bg-omnii-dark-card border-omnii-dark-border-light" : "bg-omnii-card border-omnii-border-light"
                    )} style={{ left: '35%' }} />
                  </View>
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Detailed</Text>
                </View>
                <Text className={cn(
                  "omnii-caption text-xs font-medium mt-1",
                  isDark && "text-omnii-dark-text-tertiary"
                )}>Concise</Text>
              </View>

              {/* Proactivity Level */}
              <View className="mb-3">
                <Text className={cn(
                  "omnii-body text-base font-semibold mb-2",
                  isDark && "text-omnii-dark-text-primary"
                )}>Proactivity Level</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Reactive</Text>
                  <View className={cn(
                    "flex-1 h-5 rounded-2xl overflow-hidden relative",
                    isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
                  )}>
                    <View className="absolute top-0 left-0 bottom-0 bg-warning rounded-2xl" style={{ width: '80%' }} />
                    <View className={cn(
                      "absolute top-0 border-0 w-5 h-5 rounded-full border-2",
                      isDark ? "bg-omnii-dark-card border-omnii-dark-border-light" : "bg-omnii-card border-omnii-border-light"
                    )} style={{ left: '75%' }} />
                  </View>
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Proactive</Text>
                </View>
                <Text className={cn(
                  "omnii-caption text-xs font-medium mt-1",
                  isDark && "text-omnii-dark-text-tertiary"
                )}>Highly Proactive</Text>
              </View>
            </View>

            {/* Notification Intelligence */}
            <View className={cn(
              "rounded-2xl p-5 mb-4 border-l-4 border-success",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-xl font-bold mb-2",
                isDark && "text-omnii-dark-text-primary"
              )}>🔔 Notification Intelligence</Text>
              <Text className={cn(
                "omnii-body text-sm leading-6 mb-4",
                isDark && "text-omnii-dark-text-secondary"
              )}>
                Smart notifications based on your context and energy
              </Text>
              
              {/* Focus Respect */}
              <View className="mb-3">
                <Text className={cn(
                  "omnii-body text-base font-semibold mb-2",
                  isDark && "text-omnii-dark-text-primary"
                )}>Focus Time Respect</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Interrupt</Text>
                  <View className={cn(
                    "flex-1 h-5 rounded-2xl overflow-hidden relative",
                    isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
                  )}>
                    <View className="absolute top-0 left-0 bottom-0 rounded-2xl" style={{ width: '90%', backgroundColor: '#4ECDC4' }} />
                    <View className={cn(
                      "absolute top-0 bottom-0 w-5 h-5 rounded-full border-2",
                      isDark ? "bg-omnii-dark-card border-omnii-dark-border-light" : "bg-omnii-card border-omnii-border-light"
                    )} style={{ left: '85%' }} />
                  </View>
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Respect</Text>
                </View>
                <Text className={cn(
                  "omnii-caption text-xs font-medium mt-1",
                  isDark && "text-omnii-dark-text-tertiary"
                )}>Maximum Respect</Text>
              </View>

              {/* Urgency Threshold */}
              <View className="mb-3">
                <Text className={cn(
                  "omnii-body text-base font-semibold mb-2",
                  isDark && "text-omnii-dark-text-primary"
                )}>Urgency Threshold</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>Low</Text>
                  <View className={cn(
                    "flex-1 h-5 rounded-2xl overflow-hidden relative",
                    isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
                  )}>
                    <View className="absolute top-0 left-0 bottom-0 rounded-2xl" style={{ width: '60%', backgroundColor: '#FFB347' }} />
                    <View className={cn(
                      "absolute top-0 bottom-0 w-5 h-5 rounded-full border-2",
                      isDark ? "bg-omnii-dark-card border-omnii-dark-border-light" : "bg-omnii-card border-omnii-border-light"
                    )} style={{ left: '55%' }} />
                  </View>
                  <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-secondary"
                  )}>High</Text>
                </View>
                <Text className={cn(
                  "omnii-caption text-xs font-medium mt-1",
                  isDark && "text-omnii-dark-text-tertiary"
                )}>Moderate Threshold</Text>
              </View>
            </View>
          </ScrollView>
        );
        
      case 'settings':
        return (
          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            {/* Account Management Section */}
            <View className={cn(
              "rounded-2xl p-5 mb-4",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-xl font-bold mb-3",
                isDark && "text-omnii-dark-text-primary"
              )}>
                👤 Account Overview
              </Text>
              <View className="flex-row justify-between items-center mb-3">
                <Text className={cn(
                  "omnii-body text-sm font-semibold",
                  isDark && "text-omnii-dark-text-primary"
                )}>Email:</Text>
                <Text className={cn(
                  "omnii-body text-sm font-medium",
                  isDark && "text-omnii-dark-text-secondary"
                )}>{user?.email || 'Not available'}</Text>
              </View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className={cn(
                  "omnii-body text-sm font-semibold",
                  isDark && "text-omnii-dark-text-primary"
                )}>Level:</Text>
                <Text className="omnii-body text-sm font-medium text-success">Level {level}</Text>
              </View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className={cn(
                  "omnii-body text-sm font-semibold",
                  isDark && "text-omnii-dark-text-primary"
                )}>Mascot Stage:</Text>
                <Text className={cn(
                  "omnii-body text-sm font-medium",
                  isDark && "text-omnii-dark-text-secondary"
                )}>
                  🌱 {mascotStage === 'seed' ? 'Seed Stage' : mascotStage === 'flower' ? 'Flower Stage' : 'Tree Stage'}
                </Text>
              </View>
            </View>

            {/* NEW: Appearance Section - PLACED BEFORE DataManagement */}
            <View className={cn(
              "rounded-2xl p-5 mb-4",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-xl font-bold mb-3",
                isDark && "text-omnii-dark-text-primary"
              )}>
                🎨 Appearance
              </Text>
              
              <ThemeSelector 
                currentTheme={state.theme?.colorScheme || 'light'}
                onThemeChange={(theme) => updateTheme({ colorScheme: theme })}
              />
            </View>

            {/* GDPR Data Management Component */}
            <DataManagement
              userEmail={user?.email}
            />
          </ScrollView>
        );
        
      default:
        return (
          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            <View className={cn(
              "rounded-2xl p-5",
              "bg-omnii-card",
              isDark && "bg-omnii-dark-card"
            )}>
              <Text className={cn(
                "omnii-heading text-lg font-semibold mb-2",
                isDark && "text-omnii-dark-text-primary"
              )}>Coming Soon</Text>
              <Text className={cn(
                "omnii-body text-sm",
                isDark && "text-omnii-dark-text-secondary"
              )}>This section is under development.</Text>
            </View>
          </ScrollView>
        );
    }
  };

  // Show logged out state
  if (!user) {
    return (
      <SafeAreaView className={cn(
        "flex-1 bg-omnii-background",
        isDark && "bg-omnii-dark-background"
      )}>
        <View className="flex-1 justify-center items-center p-6">
          <UserCircle size={64} color={isDark ? '#a8aaae' : '#8E8E93'} />
          <Text className={cn(
            "omnii-heading text-3xl font-bold mt-4",
            isDark && "text-omnii-dark-text-primary"
          )}>Profile</Text>
          <Text className={cn(
            "omnii-body text-base text-center mt-2",
            isDark && "text-omnii-dark-text-secondary"
          )}>Please log in to view your profile</Text>
          
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="bg-ai-start py-3 px-6 rounded-xl mt-4">
              <Text className="text-white text-base font-semibold">Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={cn(
      "flex-1 bg-omnii-background",
      isDark && "bg-omnii-dark-background"
    )}>
      {/* Header Section */}
      <View className={cn(
        "bg-omnii-card p-6 pt-5 border-b border-omnii-border",
        isDark && "bg-omnii-dark-card border-omnii-dark-border"
      )}>
        <View className="flex-row justify-between items-center mb-3 min-h-[40px]">
          <View className="flex-row items-center gap-3 flex-1">
            <Text className={cn(
              "omnii-heading text-3xl font-bold",
              isDark && "text-omnii-dark-text-primary"
            )}>Profile</Text>
          </View>
          <TouchableOpacity
            className="bg-error px-4 py-2 rounded-xl shadow-sm"
            onPress={handleLogout}
          >
            <Text className="text-white text-sm font-semibold">Logout</Text>
          </TouchableOpacity>
        </View>
        <Text className={cn(
          "omnii-body text-base mt-1",
          isDark && "text-omnii-dark-text-secondary"
        )}>
          Your AI partnership command center
        </Text>
        
        {/* User Info Row */}
        <View className="flex-row items-center justify-between mt-4">
          <View className="flex-row items-center gap-3">
            <View className={cn(
              "w-10 h-10 rounded-full bg-omnii-background items-center justify-center",
              isDark && "bg-omnii-dark-background"
            )}>
              <UserCircle size={24} color={isDark ? '#a8aaae' : '#8E8E93'} />
            </View>
            <View>
              <Text className={cn(
                "omnii-body text-base font-semibold",
                isDark && "text-omnii-dark-text-primary"
              )}>{user.email}</Text>
              <Text className={cn(
                "omnii-caption text-sm",
                isDark && "text-omnii-dark-text-secondary"
              )}>Level {level}</Text>
            </View>
          </View>
          <View className="bg-success px-3 py-1.5 rounded-full">
            <Text className="text-white text-sm font-bold">Level {level}</Text>
          </View>
        </View>
      </View>

      {/* Enhanced Filter Tabs */}
      <ProfileTabs />

      {/* Content */}
      <FlatList
        data={[1]}
        renderItem={() => <View>{renderTabContent()}</View>}
        keyExtractor={() => 'profile-content'}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AppColors.aiGradientStart}
          />
        }
        className="flex-1"
      />
    </SafeAreaView>
  );
}