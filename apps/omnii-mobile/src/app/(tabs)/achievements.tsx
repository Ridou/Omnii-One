import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import LandingPageContent from '~/components/landing/LandingPageContent';
import { View, Text, ScrollView, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '~/utils/cn';
import { AppColors } from '~/constants/Colors';
import { useFetchAchievements } from '~/hooks/useFetchAchievements';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Link, useRouter } from 'expo-router';
import { useOnboardingContext } from '~/context/OnboardingContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Tab configuration following EXACT profile.tsx pattern
const achievementTabs = [
  {
    key: 'evolve',
    label: 'Evolve',
    icon: '🌱',
    gradient: ['#667eea', '#764ba2'] // Purple gradient (position 1)
  },
  {
    key: 'discover',
    label: 'Discover', 
    icon: '🔍',
    gradient: ['#4ECDC4', '#44A08D'] // Teal gradient (position 2)
  },
  {
    key: 'gallery',
    label: 'Gallery',
    icon: '🏆',
    gradient: ['#FF7043', '#FF5722'] // NEW: Vibrant orange gradient (position 3)
  },
  {
    key: 'social',
    label: 'Social',
    icon: '👥',
    gradient: ['#FF3B30', '#DC143C'] // NEW: Clean red gradient (position 4)
  }
];

type AchievementTab = 'evolve' | 'discover' | 'gallery' | 'social';

export default function HomeScreen() {
  const { user, session, isInitialized } = useAuth();
  const { isDark } = useTheme();
  const { data: achievementData, loading, error } = useFetchAchievements();
  const { recordFeatureVisit, getCurrentLevel, state, getXPProgressToNextLevel } = useOnboardingContext();
  const router = useRouter();
  
  // Tab state following EXACT profile.tsx pattern
  const [selectedTab, setSelectedTab] = useState<AchievementTab>('evolve');
  
  // Animation refs (SIMPLIFIED - no more glow effects)
  const scaleAnimations = {
    evolve: useRef(new Animated.Value(1)).current,
    discover: useRef(new Animated.Value(1)).current,
    gallery: useRef(new Animated.Value(1)).current,
    social: useRef(new Animated.Value(1)).current,
  };

  // Check if user is authenticated (using both user and session for reliability)
  const isAuthenticated = !!(user && session);

  // Debug authentication state in development
  useEffect(() => {
    if (__DEV__) {
      console.log('🏆 Achievements Screen Auth State:', {
        user: user ? `${user.email} (${user.id})` : 'null',
        session: session ? 'exists' : 'null',
        isAuthenticated,
        isInitialized
      });
    }
  }, [user, session, isAuthenticated, isInitialized]);

  // Handle tab selection with animation
  const handleTabPress = (tab: AchievementTab) => {
    // Scale animation for tab press
    Animated.sequence([
      Animated.timing(scaleAnimations[tab], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimations[tab], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedTab(tab);
  };

  // Record feature visit for exploration tracking
  useEffect(() => {
    recordFeatureVisit('achievements');
  }, []);

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <LandingPageContent />;
  }

  // REMOVED: Glow effects as requested - clean, professional design
  // Tab content components
  const EvolveContent = () => {
    const currentLevel = getCurrentLevel();
    const totalXP = state.onboardingData.total_xp;
    const xpProgress = getXPProgressToNextLevel();
    
    // Calculate XP for current level range
    const levelRequirements: Record<number, number> = {
      1: 0, 2: 100, 3: 200, 4: 320, 5: 450, 6: 750, 7: 1100, 8: 1500, 
      9: 1950, 10: 2500, 15: 5000, 20: 8000, 25: 12000, 30: 18000, 40: 35000, 50: 60000
    };
    
    const currentLevelXP = levelRequirements[currentLevel] || 0;
    const nextLevelXP = levelRequirements[currentLevel + 1] || levelRequirements[50] || 60000;
    const xpInCurrentLevel = totalXP - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    
    return (
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className={cn(
          "rounded-xl p-4 mb-6 border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <View className="flex-row justify-between items-center mb-3">
            <Text className={cn(
              "text-xl font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>Progress Overview</Text>
            <Text className="text-base font-semibold text-indigo-600">{xpInCurrentLevel} XP</Text>
          </View>
          
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className={cn(
                "text-base font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}>Level {currentLevel}</Text>
              <Text className="text-sm text-orange-500 font-semibold">
                {xpNeededForLevel} XP to next level
              </Text>
            </View>
            <View className={cn(
              "h-2 rounded-full overflow-hidden",
              isDark ? "bg-slate-600" : "bg-gray-200"
            )}>
              <View 
                className="h-full bg-indigo-600 rounded-full" 
                style={{ width: `${xpProgress}%` }} 
              />
            </View>
          </View>
          
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className={cn(
                "text-xs font-medium mb-1",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Total XP</Text>
              <View className="bg-indigo-600 rounded-full px-2 py-1 mt-2">
                <Text className="text-white text-xs font-bold">{xpInCurrentLevel}</Text>
              </View>
            </View>
            <View className="items-center">
              <Text className={cn(
                "text-xs font-medium mb-1",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Level</Text>
              <View className="bg-green-500 rounded-full px-2 py-1 mt-2">
                <Text className="text-white text-xs font-bold">{currentLevel}</Text>
              </View>
            </View>
            <View className="items-center">
              <Text className={cn(
                "text-xs font-medium mb-1",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Next Goal</Text>
              <View className="bg-orange-500 rounded-full px-2 py-1 mt-2">
                <Text className="text-white text-xs font-bold">{nextLevelXP || 'Max'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mb-6">
          <Text className={cn(
            "text-2xl font-bold mb-4",
            isDark ? "text-white" : "text-gray-900"
          )}>🎯 Current Goals</Text>
          {achievementData?.achievements.slice(0, 3).map((achievement) => (
            <View key={achievement.id} className={cn(
              "rounded-xl p-4 mb-4 border",
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
            )}>
              <Text className={cn(
                "text-base font-semibold mb-1",
                isDark ? "text-white" : "text-gray-900"
              )}>{achievement.title}</Text>
              <Text className={cn(
                "text-sm mb-2",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>{achievement.description}</Text>
              <Text className="text-sm font-semibold text-indigo-600">
                {achievement.progress} / {achievement.maxProgress} • {achievement.xpReward} XP
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const DiscoverContent = () => (
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{ padding: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className={cn(
        "text-2xl font-bold mb-4",
        isDark ? "text-white" : "text-gray-900"
      )}>🔍 Available Achievements</Text>
      {achievementData?.achievements.map((achievement) => (
        <View key={achievement.id} className={cn(
          "rounded-xl p-4 mb-4 border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <Text className={cn(
            "text-base font-semibold mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>{achievement.title}</Text>
          <Text className={cn(
            "text-sm mb-3",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>{achievement.description}</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <View className="bg-green-500 rounded-full px-3 py-1">
                <Text className="text-white text-xs font-bold">
                  {achievement.xpReward} XP
                </Text>
              </View>
              <View className={cn(
                "rounded-full px-3 py-1",
                achievement.difficulty === 'easy' ? "bg-blue-100" :
                achievement.difficulty === 'medium' ? "bg-orange-100" :
                achievement.difficulty === 'hard' ? "bg-red-100" : "bg-purple-100"
              )}>
                <Text className={cn(
                  "text-xs font-semibold",
                  achievement.difficulty === 'easy' ? "text-blue-700" :
                  achievement.difficulty === 'medium' ? "text-orange-700" :
                  achievement.difficulty === 'hard' ? "text-red-700" : "text-purple-700"
                )}>
                  {achievement.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>
            {achievement.completed && (
              <View className="bg-green-500 rounded-full w-6 h-6 items-center justify-center">
                <Text className="text-white text-xs font-bold">✓</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const GalleryContent = () => (
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{ padding: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className={cn(
        "text-2xl font-bold mb-4",
        isDark ? "text-white" : "text-gray-900"
      )}>🏆 Your Trophies</Text>
      
      {/* Stats Cards */}
      <View className="flex-row gap-4 mb-6">
        <View className={cn(
          "flex-1 rounded-xl p-4 border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <Text className={cn(
            "text-2xl font-bold mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>{achievementData?.stats.completedAchievements || 0}</Text>
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Completed</Text>
        </View>
        <View className={cn(
          "flex-1 rounded-xl p-4 border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <Text className={cn(
            "text-2xl font-bold mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>{achievementData?.stats.totalXPFromAchievements || 0}</Text>
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>XP Earned</Text>
        </View>
        <View className={cn(
          "flex-1 rounded-xl p-4 border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <Text className={cn(
            "text-2xl font-bold mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>{achievementData?.stats.currentStreak || 0}</Text>
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Current Streak</Text>
        </View>
      </View>

      {/* Completed Achievements */}
      {achievementData?.achievements.filter(a => a.completed).map((achievement) => (
        <View key={achievement.id} className={cn(
          "rounded-xl p-4 mb-4 border border-l-4 border-l-green-500",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl font-semibold mr-3">{achievement.icon}</Text>
            <Text className={cn(
              "text-base font-semibold flex-1",
              isDark ? "text-white" : "text-gray-900"
            )}>{achievement.title}</Text>
            <View className="bg-green-500 rounded-full px-2 py-1">
              <Text className="text-white text-xs font-bold">{achievement.xpReward} XP</Text>
            </View>
          </View>
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            Completed {achievement.completedAt && new Date(achievement.completedAt).toLocaleDateString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  const SocialContent = () => (
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{ padding: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className={cn(
        "text-2xl font-bold mb-4",
        isDark ? "text-white" : "text-gray-900"
      )}>👥 Community</Text>
      <View className={cn(
        "rounded-xl p-8 items-center border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className="text-4xl mb-3">🌟</Text>
        <Text className={cn(
          "text-base font-semibold mb-2",
          isDark ? "text-white" : "text-gray-900"
        )}>Share Your Progress</Text>
        <Text className={cn(
          "text-sm text-center",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          Connect with friends and celebrate achievements together!
        </Text>
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'evolve':
        return <EvolveContent />;
      case 'discover':
        return <DiscoverContent />;
      case 'gallery':
        return <GalleryContent />;
      case 'social':
        return <SocialContent />;
      default:
        return <EvolveContent />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView className={cn(
        "flex-1",
        isDark ? "bg-slate-900" : "bg-white"
      )}>
        <View className="flex-1 justify-center items-center">
          <Text className={cn(
            "text-lg",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className={cn(
        "flex-1",
        isDark ? "bg-slate-900" : "bg-white"
      )}>
        {/* Header */}
        <View className={cn(
          "px-5 py-4 border-b",
          isDark ? "border-slate-600" : "border-gray-200"
        )}>
          <Text className={cn(
            "text-3xl font-bold mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>🏆 Achievements</Text>
          <Text className={cn(
            "text-base",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Your personal victory celebration</Text>
        </View>

        {/* Tabs with clean design (no glow effects) */}
        <View className="flex-row px-5 pb-5 pt-2 gap-3">
          {achievementTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              className="flex-1 h-20 rounded-xl overflow-hidden"
              style={[
                selectedTab === tab.key && {
                  elevation: 4,
                  shadowColor: tab.gradient[0],
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }
              ]}
              onPress={() => handleTabPress(tab.key as AchievementTab)}
            >
              <Animated.View
                className="flex-1 relative overflow-hidden rounded-xl"
                style={{
                  transform: [{ scale: scaleAnimations[tab.key as AchievementTab] }],
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
                    className="text-3xl font-bold mb-1"
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
                </View>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {renderTabContent()}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}