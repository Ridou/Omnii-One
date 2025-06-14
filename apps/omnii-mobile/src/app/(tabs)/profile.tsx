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
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAuth } from '~/context/AuthContext';
import { useProfile } from '~/context/ProfileContext';

import { useTheme } from '~/context/ThemeContext';
import { AppLogo } from '~/components/common/OmniiLogo';
import WorkStyleAssessment from '~/components/profile/WorkStyleAssessment';
import DataManagement from '~/components/profile/DataManagement';
import ThemeSelector from '~/components/profile/ThemeSelector';
import { Mascot, useMascotCheering, MascotContainer } from '~/components/common/Mascot';
import { XPProgressBar } from '~/components/common/XPProgressBar';
import { AppColors } from '~/constants/Colors';
import { BRAND_COLORS } from '~/lib/assets';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import type { ProfileTab, TabConfig } from '~/types/profile';
import { cn } from '~/utils/cn';
import { getMascotStageByLevel, CheeringTrigger, MascotSize } from '~/types/mascot';
import { useXPSystem } from '~/hooks/useXPSystem';
import { XPSystemUtils } from '~/constants/XPSystem';
import { ResponsiveTabLayout } from '~/components/common/ResponsiveTabLayout';
import { DesktopProfileContent, TabletProfileContent } from '~/components/common/DesktopProfileComponents';
import { useResponsiveDesign } from '~/utils/responsive';
import { GoogleIntegrationCard } from '~/components/integrations/GoogleIntegrationCard';
import { AuthGuard } from '~/components/common/AuthGuard';

const { width: screenWidth } = Dimensions.get('window');

// Tab configuration following tasks screen pattern
const profileTabs: TabConfig[] = [
  {
    key: 'connect',
    label: 'Connect',
    icon: '🔗',
    gradient: ['#4ECDC4', '#44A08D']
  },
  {
    key: 'dna',
    label: 'DNA',
    icon: '🧬',
    gradient: ['#667eea', '#764ba2']
  },
  {
    key: 'ai',
    label: 'AI Tuning',
    icon: '🤖',
    gradient: ['#FF7043', '#FF5722']
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: '⚙️',
    gradient: ['#FF3B30', '#DC143C']
  }
];

export default function ProfileScreen() {
  const { user, signOut, isLoading } = useAuth();
  const { state, updateTheme } = useProfile();
  const searchParams = useLocalSearchParams();

  const { xpProgress, currentLevel, currentXP } = useXPSystem();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const responsive = useResponsiveDesign();
  
  // Add NativeWind's useColorScheme to force re-renders when theme changes
  const { colorScheme: nativeWindColorScheme } = useColorScheme();
  
  // Get real user progression data
  const level = currentLevel;
  const mascotStage = getMascotStageByLevel(level);
  
  // Mascot cheering functionality
  const { cheeringState, triggerCheering } = useMascotCheering();
  const prevLevel = useRef(level);
  
  // Initialize selectedTab based on URL parameter or default to 'connect'
  const initialTab = (searchParams.tab as ProfileTab) || 'connect';
  const [selectedTab, setSelectedTab] = useState<ProfileTab>(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  // Animation refs for each tab (SIMPLIFIED - no more glow effects)
  const scaleAnimations = useRef(
    profileTabs.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(1);
      return acc;
    }, {} as Record<ProfileTab, Animated.Value>)
  ).current;

  // Trigger cheering on level up
  useEffect(() => {
    if (level > prevLevel.current && prevLevel.current > 0) {
      triggerCheering(CheeringTrigger.LEVEL_UP);
    }
    prevLevel.current = level;
  }, [level, triggerCheering]);

  // Update selectedTab when URL parameters change
  useEffect(() => {
    const urlTab = searchParams.tab as ProfileTab;
    if (urlTab && urlTab !== selectedTab) {
      setSelectedTab(urlTab);
    }
  }, [searchParams.tab]);

  // Handle mascot tap interaction
  const handleMascotTap = () => {
    triggerCheering(CheeringTrigger.TAP_INTERACTION);
  };

  const handleLogout = async () => {
    if (!user) {
      return;
    }
    
    // Direct logout action - AuthContext will handle redirect automatically
    try {
      await signOut();
      // AuthContext will automatically redirect to landing page
    } catch (error) {
      // Silent error handling
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh - in real app, this would sync with backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleTabPress = (tabKey: ProfileTab) => {
    // Scale animation on press (identical to tasks screen)
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
                  <View className={cn("absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 shadow-sm", isDark ? "border-slate-800" : "border-white")} />
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
          <ScrollView className={cn("flex-1 px-5", isDark ? "bg-slate-900" : "bg-white")} showsVerticalScrollIndicator={false}>
            {/* Google Integration Card */}
            <GoogleIntegrationCard 
              onStatusChange={(connected) => {
                // Optional: Track connection status changes
              }}
            />

            {/* Discord Feedback CTA Card */}
              <View className={cn("rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-purple-500", 
                isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200")}>
                <View className="flex-row items-center mb-4">
                  <View className={cn("w-12 h-12 rounded-xl items-center justify-center mr-4", 
                    isDark ? "bg-purple-900/30" : "bg-purple-100")}>
                    <Text className="text-2xl">💬</Text>
                  </View>
                <View className="flex-1">
                  <Text className={cn("text-xl font-bold font-omnii-bold", 
                    isDark ? "text-white" : "text-gray-900")}>Share Your Feedback</Text>
                  <Text className={cn("text-sm font-medium", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Help us improve OMNII</Text>
                  </View>
                </View>
                
                <Text className={cn("text-base leading-6 mb-5", 
                  isDark ? "text-slate-300" : "text-gray-700")}>
                Have ideas, suggestions, or feedback? Join our Discord community to share your thoughts and help shape the future of OMNII.
                </Text>
                
                <View className="space-y-3 mb-6">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-purple-500 rounded-full mr-3"></View>
                    <Text className={cn("text-sm font-medium leading-5 flex-1", 
                      isDark ? "text-slate-400" : "text-gray-600")}>
                    Direct feedback channel to shape OMNII&apos;s future
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-purple-500 rounded-full mr-3"></View>
                    <Text className={cn("text-sm font-medium leading-5 flex-1", 
                      isDark ? "text-slate-400" : "text-gray-600")}>
                    Connect with like-minded productivity enthusiasts
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-purple-500 rounded-full mr-3"></View>
                    <Text className={cn("text-sm font-medium leading-5 flex-1", 
                      isDark ? "text-slate-400" : "text-gray-600")}>
                    Early access to new features and updates
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-purple-500 rounded-full mr-3"></View>
                    <Text className={cn("text-sm font-medium leading-5 flex-1", 
                      isDark ? "text-slate-400" : "text-gray-600")}>
                    Share productivity tips and celebrate achievements
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  className="bg-purple-600 hover:bg-purple-700 active:bg-purple-700 px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg"
                  onPress={async () => {
                    try {
                      await Linking.openURL('https://discord.gg/HPgAARkhkE');
                    } catch (error) {
                      // Silently handle URL open errors
                    }
                  }}
                >
                  <Text className="text-white text-base font-bold mr-2">Join Discord Community</Text>
                  <Text className="text-white text-base font-bold">→</Text>
                </TouchableOpacity>
            </View>
          </ScrollView>
        );
        
      case 'dna':
        return (
          <ScrollView className={cn("flex-1 px-5", isDark ? "bg-slate-900" : "bg-white")} showsVerticalScrollIndicator={false}>
            {/* Automatic DNA Generation */}
            <View className={cn("rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-omnii-primary", 
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200")}>
              <View className="flex-row items-center mb-4">
                <View className={cn("w-12 h-12 rounded-xl items-center justify-center mr-4", 
                  isDark ? "bg-indigo-900/30" : "bg-indigo-100")}>
                  <Text className="text-2xl">🧬</Text>
                </View>
                <View className="flex-1">
                  <Text className={cn("text-xl font-bold font-omnii-bold", 
                    isDark ? "text-white" : "text-gray-900")}>Your Productivity DNA</Text>
                  <Text className={cn("text-sm font-medium", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Generated from your inspiration preferences</Text>
                </View>
              </View>
              
              {level >= 2 ? (
                <View>
                  <Text className={cn("text-base leading-6 mb-5", 
                    isDark ? "text-slate-300" : "text-gray-700")}>
                    Based on your quote responses, we&apos;ve crafted your unique productivity profile. You can customize these insights below.
                  </Text>
                  
                  <View className={cn("rounded-xl p-4 mb-5", 
                    isDark ? "bg-slate-700/50" : "bg-gray-50")}>
                    <View className={cn("flex-row justify-between items-center py-2 border-b", 
                      isDark ? "border-slate-600" : "border-gray-200")}>
                      <Text className={cn("text-sm font-semibold", 
                        isDark ? "text-slate-300" : "text-gray-700")}>Work Style:</Text>
                      <View className={cn("px-3 py-1 rounded-full", 
                        isDark ? "bg-blue-900/30" : "bg-blue-100")}>
                        <Text className={cn("text-sm font-medium", 
                          isDark ? "text-blue-400" : "text-blue-700")}>Results-Oriented</Text>
                      </View>
                    </View>
                    <View className={cn("flex-row justify-between items-center py-2 border-b", 
                      isDark ? "border-slate-600" : "border-gray-200")}>
                      <Text className={cn("text-sm font-semibold", 
                        isDark ? "text-slate-300" : "text-gray-700")}>Energy Pattern:</Text>
                      <View className={cn("px-3 py-1 rounded-full", 
                        isDark ? "bg-green-900/30" : "bg-green-100")}>
                        <Text className={cn("text-sm font-medium", 
                          isDark ? "text-green-400" : "text-green-700")}>Morning Focused</Text>
                      </View>
                    </View>
                    <View className={cn("flex-row justify-between items-center py-2 border-b", 
                      isDark ? "border-slate-600" : "border-gray-200")}>
                      <Text className={cn("text-sm font-semibold", 
                        isDark ? "text-slate-300" : "text-gray-700")}>Communication:</Text>
                      <View className={cn("px-3 py-1 rounded-full", 
                        isDark ? "bg-purple-900/30" : "bg-purple-100")}>
                        <Text className={cn("text-sm font-medium", 
                          isDark ? "text-purple-400" : "text-purple-700")}>Direct &amp; Clear</Text>
                      </View>
                    </View>
                    <View className={cn("flex-row justify-between items-center py-2 border-b", 
                      isDark ? "border-slate-600" : "border-gray-200")}>
                      <Text className={cn("text-sm font-semibold", 
                        isDark ? "text-slate-300" : "text-gray-700")}>Goal Orientation:</Text>
                      <View className={cn("px-3 py-1 rounded-full", 
                        isDark ? "bg-orange-900/30" : "bg-orange-100")}>
                        <Text className={cn("text-sm font-medium", 
                          isDark ? "text-orange-400" : "text-orange-700")}>Achievement Driven</Text>
                      </View>
                    </View>
                    <View className="flex-row justify-between items-center py-2">
                      <Text className={cn("text-sm font-semibold", 
                        isDark ? "text-slate-300" : "text-gray-700")}>Focus Preference:</Text>
                      <View className={cn("px-3 py-1 rounded-full", 
                        isDark ? "bg-indigo-900/30" : "bg-indigo-100")}>
                        <Text className={cn("text-sm font-medium", 
                          isDark ? "text-indigo-400" : "text-indigo-700")}>Deep Work Sessions</Text>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg">
                    <Text className="text-white text-base font-bold mr-2">Customize Your DNA</Text>
                    <Text className="text-white text-base font-bold">→</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="items-center justify-center py-8">
                  <View className={cn("w-16 h-16 rounded-full items-center justify-center mb-4", 
                    isDark ? "bg-slate-700" : "bg-gray-100")}>
                    <Text className="text-2xl">🔒</Text>
                  </View>
                  <Text className={cn("text-sm font-medium mb-2 text-center", 
                    isDark ? "text-slate-400" : "text-gray-600")}>
                    Complete more daily inspiration to unlock your personalized DNA profile.
                  </Text>
                  <View className={cn("px-3 py-1.5 rounded-full", 
                    isDark ? "bg-slate-700" : "bg-gray-100")}>
                    <Text className={cn("text-xs font-medium", 
                      isDark ? "text-slate-500" : "text-gray-500")}>
                      Progress: {Math.min(level - 1, 1)}/1 completed
                    </Text>
                  </View>
                </View>
              )}
            </View>
            
            <View className={cn("rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-orange-500", 
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200")}>
              <View className="flex-row items-center mb-3">
                <View className={cn("w-10 h-10 rounded-lg items-center justify-center mr-3", 
                  isDark ? "bg-orange-900/30" : "bg-orange-100")}>
                  <Text className="text-xl">⚡</Text>
                </View>
                <Text className={cn("text-lg font-bold font-omnii-bold", 
                  isDark ? "text-white" : "text-gray-900")}>Energy Mapping</Text>
              </View>
              <Text className={cn("text-sm leading-6 mb-4", 
                isDark ? "text-slate-300" : "text-gray-600")}>
                Map your energy patterns to optimize your daily schedule.
              </Text>
              <View className={cn("px-3 py-2 rounded-lg self-start", 
                isDark ? "bg-orange-900/20" : "bg-orange-100")}>
                <Text className={cn("text-xs font-semibold", 
                  isDark ? "text-orange-400" : "text-orange-700")}>Coming Soon</Text>
              </View>
            </View>
            
            <View className={cn("rounded-2xl p-6 mb-6 border shadow-sm border-l-4 border-l-green-500", 
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200")}>
              <View className="flex-row items-center mb-3">
                <View className={cn("w-10 h-10 rounded-lg items-center justify-center mr-3", 
                  isDark ? "bg-green-900/30" : "bg-green-100")}>
                  <Text className="text-xl">🎯</Text>
                </View>
                <Text className={cn("text-lg font-bold font-omnii-bold", 
                  isDark ? "text-white" : "text-gray-900")}>Goal Hierarchy</Text>
              </View>
              <Text className={cn("text-sm leading-6 mb-4", 
                isDark ? "text-slate-300" : "text-gray-600")}>
                Set and prioritize your goals for maximum impact.
              </Text>
              <View className={cn("px-3 py-2 rounded-lg self-start", 
                isDark ? "bg-orange-900/20" : "bg-orange-100")}>
                <Text className={cn("text-xs font-semibold", 
                  isDark ? "text-orange-400" : "text-orange-700")}>Coming Soon</Text>
              </View>
            </View>
          </ScrollView>
        );
        
      case 'ai':
        return (
          <ScrollView className={cn("flex-1 px-5", isDark ? "bg-slate-900" : "bg-white")} showsVerticalScrollIndicator={false}>
            {/* AI Persona Tuning */}
            <View className={cn("rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-omnii-primary", 
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200")}>
              <View className="flex-row items-center mb-4">
                <View className={cn("w-12 h-12 rounded-xl items-center justify-center mr-4", 
                  isDark ? "bg-indigo-900/30" : "bg-indigo-100")}>
                  <Text className="text-2xl">🤖</Text>
                </View>
                <View className="flex-1">
                  <Text className={cn("text-xl font-bold font-omnii-bold", 
                    isDark ? "text-white" : "text-gray-900")}>AI Persona</Text>
                  <Text className={cn("text-sm leading-6", 
                    isDark ? "text-slate-400" : "text-gray-600")}>
                    Customize how your AI assistant communicates and behaves
                  </Text>
                </View>
              </View>
              
              {/* Communication Style Dial */}
              <View className="mb-6">
                <Text className={cn("text-base font-bold mb-3", 
                  isDark ? "text-white" : "text-gray-800")}>Communication Style</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Casual</Text>
                  <View className={cn("flex-1 h-6 rounded-2xl overflow-hidden relative", 
                    isDark ? "bg-slate-700" : "bg-gray-200")}>
                    <View className="absolute top-0 left-0 bottom-0 bg-indigo-600 rounded-2xl" style={{ width: '65%' }} />
                    <View className={cn("absolute top-0 bottom-0 w-6 h-6 rounded-full border-2 shadow-sm", 
                      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-300")} style={{ left: '58%' }} />
                  </View>
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Professional</Text>
                </View>
                <Text className={cn("text-xs font-medium mt-2 text-center", 
                  isDark ? "text-slate-500" : "text-gray-500")}>Balanced Professional</Text>
              </View>

              {/* Response Length Dial */}
              <View className="mb-6">
                <Text className={cn("text-base font-bold mb-3", 
                  isDark ? "text-white" : "text-gray-800")}>Response Length</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Brief</Text>
                  <View className={cn("flex-1 h-6 rounded-2xl overflow-hidden relative", 
                    isDark ? "bg-slate-700" : "bg-gray-200")}>
                    <View className="absolute top-0 left-0 bottom-0 bg-green-500 rounded-2xl" style={{ width: '40%' }} />
                    <View className={cn("absolute top-0 bottom-0 w-6 h-6 rounded-full border-2 shadow-sm", 
                      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-300")} style={{ left: '32%' }} />
                  </View>
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Detailed</Text>
                </View>
                <Text className={cn("text-xs font-medium mt-2 text-center", 
                  isDark ? "text-slate-500" : "text-gray-500")}>Concise</Text>
              </View>

              {/* Proactivity Level */}
              <View className="mb-4">
                <Text className={cn("text-base font-bold mb-3", 
                  isDark ? "text-white" : "text-gray-800")}>Proactivity Level</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Reactive</Text>
                  <View className={cn("flex-1 h-6 rounded-2xl overflow-hidden relative", 
                    isDark ? "bg-slate-700" : "bg-gray-200")}>
                    <View className="absolute top-0 left-0 bottom-0 bg-orange-500 rounded-2xl" style={{ width: '80%' }} />
                    <View className={cn("absolute top-0 bottom-0 w-6 h-6 rounded-full border-2 shadow-sm", 
                      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-300")} style={{ left: '72%' }} />
                  </View>
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Proactive</Text>
                </View>
                <Text className={cn("text-xs font-medium mt-2 text-center", 
                  isDark ? "text-slate-500" : "text-gray-500")}>Highly Proactive</Text>
              </View>
            </View>

            {/* Notification Intelligence */}
            <View className={cn("rounded-2xl p-6 mb-6 border shadow-sm border-l-4 border-l-green-500", 
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200")}>
              <View className="flex-row items-center mb-4">
                <View className={cn("w-12 h-12 rounded-xl items-center justify-center mr-4", 
                  isDark ? "bg-green-900/30" : "bg-green-100")}>
                  <Text className="text-2xl">🔔</Text>
                </View>
                <View className="flex-1">
                  <Text className={cn("text-xl font-bold font-omnii-bold", 
                    isDark ? "text-white" : "text-gray-900")}>Notification Intelligence</Text>
                  <Text className={cn("text-sm leading-6", 
                    isDark ? "text-slate-400" : "text-gray-600")}>
                    Smart notifications based on your context and energy
                  </Text>
                </View>
              </View>
              
              {/* Focus Respect */}
              <View className="mb-6">
                <Text className={cn("text-base font-bold mb-3", 
                  isDark ? "text-white" : "text-gray-800")}>Focus Time Respect</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Interrupt</Text>
                  <View className={cn("flex-1 h-6 rounded-2xl overflow-hidden relative", 
                    isDark ? "bg-slate-700" : "bg-gray-200")}>
                    <View className="absolute top-0 left-0 bottom-0 rounded-2xl" style={{ width: '90%', backgroundColor: '#4ECDC4' }} />
                    <View className={cn("absolute top-0 bottom-0 w-6 h-6 rounded-full border-2 shadow-sm", 
                      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-300")} style={{ left: '82%' }} />
                  </View>
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Respect</Text>
                </View>
                <Text className={cn("text-xs font-medium mt-2 text-center", 
                  isDark ? "text-slate-500" : "text-gray-500")}>Maximum Respect</Text>
              </View>

              {/* Urgency Threshold */}
              <View className="mb-4">
                <Text className={cn("text-base font-bold mb-3", 
                  isDark ? "text-white" : "text-gray-800")}>Urgency Threshold</Text>
                <View className="flex-row items-center gap-3">
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Low</Text>
                  <View className={cn("flex-1 h-6 rounded-2xl overflow-hidden relative", 
                    isDark ? "bg-slate-700" : "bg-gray-200")}>
                    <View className="absolute top-0 left-0 bottom-0 rounded-2xl" style={{ width: '60%', backgroundColor: '#FF7043' }} />
                    <View className={cn("absolute top-0 bottom-0 w-6 h-6 rounded-full border-2 shadow-sm", 
                      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-300")} style={{ left: '52%' }} />
                  </View>
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-400" : "text-gray-600")}>High</Text>
                </View>
                <Text className={cn("text-xs font-medium mt-2 text-center", 
                  isDark ? "text-slate-500" : "text-gray-500")}>Moderate Threshold</Text>
              </View>
            </View>
          </ScrollView>
        );
        
      case 'settings':
        return (
          <ScrollView className={cn("flex-1 px-5", isDark ? "bg-slate-900" : "bg-white")} showsVerticalScrollIndicator={false}>
            {/* Account Settings Section - Consolidated */}
            <View className={cn("rounded-2xl p-6 mb-4 border shadow-sm", 
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200")}>
              <View className="flex-row items-center mb-6">
                <View className={cn("w-12 h-12 rounded-xl items-center justify-center mr-4", 
                  isDark ? "bg-blue-900/30" : "bg-blue-100")}>
                  <Text className="text-2xl">⚙️</Text>
                </View>
                <View className="flex-1">
                <Text className={cn("text-xl font-bold font-omnii-bold", 
                  isDark ? "text-white" : "text-gray-900")}>Account Settings</Text>
                  <Text className={cn("text-sm", 
                    isDark ? "text-slate-400" : "text-gray-600")}>Manage your account and preferences</Text>
                </View>
              </View>
              
              {/* Account Info */}
              <View className="space-y-4 mb-6">
                <View className={cn("flex-row justify-between items-center py-3 border-b", 
                  isDark ? "border-slate-700" : "border-gray-100")}>
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-300" : "text-gray-700")}>Email</Text>
                  <Text className={cn("text-sm font-medium", 
                    isDark ? "text-slate-400" : "text-gray-600")}>{user?.email}</Text>
                </View>
                <View className={cn("flex-row justify-between items-center py-3 border-b", 
                  isDark ? "border-slate-700" : "border-gray-100")}>
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-300" : "text-gray-700")}>Current Level</Text>
                  <View className={cn("px-3 py-1.5 rounded-full", 
                    isDark ? "bg-green-900/30" : "bg-green-100")}>
                    <Text className={cn("text-sm font-bold", 
                      isDark ? "text-green-400" : "text-green-700")}>Level {level}</Text>
                  </View>
                </View>
                <View className={cn("flex-row justify-between items-center py-3 border-b", 
                  isDark ? "border-slate-700" : "border-gray-100")}>
                  <Text className={cn("text-sm font-semibold", 
                    isDark ? "text-slate-300" : "text-gray-700")}>Total XP</Text>
                  <View className={cn("px-3 py-1.5 rounded-full", 
                    isDark ? "bg-purple-900/30" : "bg-purple-100")}>
                    <Text className={cn("text-sm font-bold", 
                      isDark ? "text-purple-400" : "text-purple-700")}>{currentXP} XP</Text>
                </View>
              </View>
            </View>

              {/* Theme Settings */}
              <View className="mb-6">
              <View className="flex-row items-center mb-4">
                  <View className={cn("w-8 h-8 rounded-lg items-center justify-center mr-3", 
                  isDark ? "bg-indigo-900/30" : "bg-indigo-100")}>
                    <Text className="text-lg">🎨</Text>
                </View>
                  <Text className={cn("text-base font-bold", 
                  isDark ? "text-white" : "text-gray-900")}>Appearance</Text>
              </View>
              
              <ThemeSelector 
                  currentTheme={state.theme?.colorScheme || null}
                onThemeChange={(theme) => updateTheme({ colorScheme: theme })}
              />
            </View>

              {/* Sign Out Button */}
              <View>
              <View className="flex-row items-center mb-4">
                  <View className={cn("w-8 h-8 rounded-lg items-center justify-center mr-3", 
                  isDark ? "bg-red-900/30" : "bg-red-100")}>
                    <Text className="text-lg">🚪</Text>
                </View>
                  <Text className={cn("text-base font-bold", 
                  isDark ? "text-white" : "text-gray-900")}>Account Actions</Text>
              </View>

              <TouchableOpacity 
                  className={cn("px-6 py-4 rounded-xl border-2 flex-row items-center justify-between shadow-sm", 
                  isDark 
                      ? "bg-red-900/10 border-red-800/50 hover:bg-red-900/20 active:bg-red-900/20" 
                      : "bg-red-50 border-red-200 hover:bg-red-100 active:bg-red-100")}
                onPress={handleLogout}
              >
                  <View className="flex-row items-center flex-1">
                    <View className={cn("w-10 h-10 rounded-lg items-center justify-center mr-3", 
                      isDark ? "bg-red-900/30" : "bg-red-100")}>
                      <Text className="text-lg">🔐</Text>
                    </View>
                    <View className="flex-1">
                <Text className={cn("text-base font-bold", 
                        isDark ? "text-red-400" : "text-red-700")}>Sign Out</Text>
                      <Text className={cn("text-sm", 
                        isDark ? "text-red-500" : "text-red-600")}>Exit your OMNII account</Text>
                    </View>
                  </View>
                  <Text className={cn("text-lg ml-2", 
                    isDark ? "text-red-400" : "text-red-600")}>→</Text>
              </TouchableOpacity>

                {/* Help text */}
                <Text className={cn("text-xs text-center mt-3", 
                  isDark ? "text-slate-500" : "text-gray-500")}>
                  Your data will be preserved and you can sign back in anytime
                </Text>
              </View>
            </View>

            {/* Privacy Notice */}
            <View className={cn("rounded-2xl p-6 mb-4 border shadow-sm", 
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200")}>
              <View className="flex-row items-center mb-3">
                <View className={cn("w-10 h-10 rounded-lg items-center justify-center mr-3", 
                  isDark ? "bg-green-900/30" : "bg-green-100")}>
                  <Text className="text-xl">🔒</Text>
                </View>
                <Text className={cn("text-lg font-bold font-omnii-bold", 
                  isDark ? "text-white" : "text-gray-900")}>Privacy &amp; Data</Text>
              </View>
              <Text className={cn("text-sm leading-6", 
                isDark ? "text-slate-300" : "text-gray-600")}>
                Your inspiration data and productivity insights are private and stored securely. We never share your personal information.
              </Text>
            </View>
            
            <DataManagement />
          </ScrollView>
        );

      default:
        return null;
    }
  };

  // Use responsive layout for browsers (including mobile) and larger screens
  if (responsive.shouldUseResponsiveLayout) {
    // Enhanced content rendering for tablet/desktop only
    const renderResponsiveContent = () => {
      if (responsive.effectiveIsDesktop) {
        return (
          <DesktopProfileContent 
            selectedTab={selectedTab}
            level={level}
            user={user}
            state={state}
            currentXP={currentXP}
            updateTheme={updateTheme}
            handleLogout={handleLogout}
            renderTabContent={renderTabContent}
          />
        );
      }
      
      if (responsive.effectiveIsTablet) {
        return (
          <TabletProfileContent 
            selectedTab={selectedTab}
            renderTabContent={renderTabContent}
          />
        );
      }
      
      return renderTabContent();
    };

    // Header component for tablet/desktop
    const ProfileHeader = () => (
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className={cn(
            "text-3xl font-bold mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>👤 Profile</Text>
          <XPProgressBar
            variant="compact"
            size="small"
            showText={true}
            showLevel={true}
          />
        </View>
        
        <MascotContainer position="header">
          <Mascot
            stage={mascotStage}
            level={level}
            size={MascotSize.STANDARD}
            showLevel={true}
            enableInteraction={true}
            enableCheering={cheeringState.isActive}
            cheeringTrigger={cheeringState.trigger}
            onTap={handleMascotTap}
          />
        </MascotContainer>
      </View>
    );

    return (
      <AuthGuard>
        <ResponsiveTabLayout
          tabs={profileTabs}
          selectedTab={selectedTab}
          onTabPress={handleTabPress}
          scaleAnimations={scaleAnimations}
          header={<ProfileHeader />}
          renderTabContent={renderResponsiveContent}
        />
      </AuthGuard>
    );
  }

  // MOBILE: Keep original layout exactly as it was with authentication guard
  return (
    <AuthGuard>
      <SafeAreaView className={cn("flex-1", isDark ? "bg-slate-900" : "bg-white")} key={`profile-theme-${isDark}`}>
        {/* Header */}
        <View className={cn(
          "px-5 py-4 border-b",
          isDark ? "border-slate-600" : "border-gray-200"
        )}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className={cn(
                "text-3xl font-bold mb-1",
                isDark ? "text-white" : "text-gray-900"
              )}>👤 Profile</Text>
              <XPProgressBar
                variant="compact"
                size="small"
                showText={true}
                showLevel={true}
              />
            </View>
            
            {/* Mascot in header */}
            <MascotContainer position="header">
              <Mascot
                stage={mascotStage}
                level={level}
                size={MascotSize.STANDARD}
                showLevel={true}
                enableInteraction={true}
                enableCheering={cheeringState.isActive}
                cheeringTrigger={cheeringState.trigger}
                onTap={handleMascotTap}
              />
            </MascotContainer>
          </View>
        </View>

        {/* Tab Navigation */}
        <ProfileTabs />

        {/* Tab Content */}
        {renderTabContent()}
      </SafeAreaView>
    </AuthGuard>
  );
}