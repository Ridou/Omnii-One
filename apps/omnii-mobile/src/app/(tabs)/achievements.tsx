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
    gradient: ['#FFB347', '#FFD700'] // Orange-gold gradient (position 3)
  },
  {
    key: 'social',
    label: 'Social',
    icon: '👥',
    gradient: ['#FF6B6B', '#EE5A24'] // Red-orange gradient (position 4)
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
    const nextLevelXP = levelRequirements[currentLevel + 1] || levelRequirements[50];
    const xpInCurrentLevel = totalXP - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    
    return (
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className={cn(
          "rounded-2xl p-5 mb-4",
          "bg-omnii-card",
          isDark && "bg-omnii-dark-card"
        )}>
          <View className="flex-row justify-between items-center mb-3">
            <Text className={cn(
              "omnii-heading text-xl font-bold",
              isDark && "text-omnii-dark-text-primary"
            )}>Progress Overview</Text>
            <Text className="omnii-body text-base font-semibold text-ai-start">{xpInCurrentLevel} XP</Text>
          </View>
          
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className={cn(
                "omnii-body text-base font-semibold",
                isDark && "text-omnii-dark-text-primary"
              )}>Level {currentLevel}</Text>
              <Text className="omnii-body text-sm text-warning font-semibold">
                {xpNeededForLevel} XP to next level
              </Text>
            </View>
            <View className={cn(
              "h-2 rounded-full overflow-hidden",
              isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
            )}>
              <View className="h-2 bg-ai-start" style={{ width: `${xpProgress}%` }} />
            </View>
          </View>
          
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className={cn(
                "omnii-body text-xs font-medium mb-1",
                isDark && "text-omnii-dark-text-secondary"
              )}>Total XP</Text>
              <View className="bg-ai-start rounded-full px-2 py-1 mt-2">
                <Text className="text-white text-xs font-bold">{xpInCurrentLevel}</Text>
              </View>
            </View>
            <View className="items-center">
              <Text className={cn(
                "omnii-body text-xs font-medium mb-1",
                isDark && "text-omnii-dark-text-secondary"
              )}>Level</Text>
              <View className="bg-success rounded-full px-2 py-1 mt-2">
                <Text className="text-white text-xs font-bold">{currentLevel}</Text>
              </View>
            </View>
            <View className="items-center">
              <Text className={cn(
                "omnii-body text-xs font-medium mb-1",
                isDark && "text-omnii-dark-text-secondary"
              )}>Next Goal</Text>
              <View className="bg-warning rounded-full px-2 py-1 mt-2">
                <Text className="text-white text-xs font-bold">{nextLevelXP}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mb-6">
          <Text className={cn(
            "omnii-heading text-2xl font-bold mb-2",
            isDark && "text-omnii-dark-text-primary"
          )}>🎯 Current Goals</Text>
          {achievementData?.achievements.slice(0, 3).map((achievement) => (
            <View key={achievement.id} className="mb-4">
              <Text className={cn(
                "omnii-body text-base font-semibold mb-1",
                isDark && "text-omnii-dark-text-primary"
              )}>{achievement.title}</Text>
              <Text className={cn(
                "omnii-body text-sm",
                isDark && "text-omnii-dark-text-secondary"
              )}>{achievement.description}</Text>
              <Text className="omnii-body text-sm font-semibold text-ai-start">
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
        "omnii-heading text-2xl font-bold mb-4",
        isDark && "text-omnii-dark-text-primary"
      )}>🔍 Available Achievements</Text>
      {achievementData?.achievements.map((achievement) => (
        <View key={achievement.id} className="mb-4">
          <Text className={cn(
            "omnii-body text-base font-semibold mb-1",
            isDark && "text-omnii-dark-text-primary"
          )}>{achievement.title}</Text>
          <Text className={cn(
            "omnii-body text-sm",
            isDark && "text-omnii-dark-text-secondary"
          )}>{achievement.description}</Text>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="omnii-body text-sm font-semibold text-success">
              {achievement.xpReward} XP
            </Text>
            <Text className={cn(
              "omnii-body text-sm font-semibold",
              isDark ? "text-omnii-dark-text-secondary" : "text-omnii-text-secondary"
            )}>
              {achievement.difficulty.toUpperCase()}
            </Text>
          </View>
          {achievement.completed && (
            <View className="bg-success rounded-full px-2 py-1 mt-2">
              <Text className="omnii-body text-sm font-semibold text-white">✓</Text>
            </View>
          )}
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
        "omnii-heading text-2xl font-bold mb-4",
        isDark && "text-omnii-dark-text-primary"
      )}>🏆 Your Trophies</Text>
      <View className="flex-row gap-4 mb-4">
        <View className={cn(
          "flex-1 rounded-xl p-4",
          "bg-omnii-card",
          isDark && "bg-omnii-dark-card"
        )}>
          <Text className={cn(
            "omnii-body text-2xl font-bold mb-2",
            isDark && "text-omnii-dark-text-primary"
          )}>{achievementData?.stats.completedAchievements || 0}</Text>
          <Text className={cn(
            "omnii-body text-sm",
            isDark && "text-omnii-dark-text-secondary"
          )}>Completed</Text>
        </View>
        <View className={cn(
          "flex-1 rounded-xl p-4",
          "bg-omnii-card",
          isDark && "bg-omnii-dark-card"
        )}>
          <Text className={cn(
            "omnii-body text-2xl font-bold mb-2",
            isDark && "text-omnii-dark-text-primary"
          )}>{achievementData?.stats.totalXPFromAchievements || 0}</Text>
          <Text className={cn(
            "omnii-body text-sm",
            isDark && "text-omnii-dark-text-secondary"
          )}>XP Earned</Text>
        </View>
        <View className={cn(
          "flex-1 rounded-xl p-4",
          "bg-omnii-card",
          isDark && "bg-omnii-dark-card"
        )}>
          <Text className={cn(
            "omnii-body text-2xl font-bold mb-2",
            isDark && "text-omnii-dark-text-primary"
          )}>{achievementData?.stats.currentStreak || 0}</Text>
          <Text className={cn(
            "omnii-body text-sm",
            isDark && "text-omnii-dark-text-secondary"
          )}>Current Streak</Text>
        </View>
      </View>

      {achievementData?.achievements.filter(a => a.completed).map((achievement) => (
        <View key={achievement.id} className="mb-4">
          <View className="flex-row items-center">
            <Text className="omnii-body text-2xl font-semibold mr-2">{achievement.icon}</Text>
            <Text className={cn(
              "omnii-body text-base font-semibold",
              isDark && "text-omnii-dark-text-primary"
            )}>{achievement.title}</Text>
          </View>
          <Text className={cn(
            "omnii-body text-sm",
            isDark ? "text-omnii-dark-text-secondary" : "text-omnii-text-secondary"
          )}>
            Completed {achievement.completedAt && new Date(achievement.completedAt).toLocaleDateString()}
          </Text>
          <Text className="omnii-body text-sm font-semibold text-success">
            {achievement.xpReward} XP
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
        "omnii-heading text-2xl font-bold mb-4",
        isDark && "text-omnii-dark-text-primary"
      )}>👥 Community</Text>
      <View className={cn(
        "rounded-xl p-8",
        "bg-omnii-card",
        isDark && "bg-omnii-dark-card"
      )}>
        <Text className="omnii-body text-2xl font-semibold mb-2">🌟</Text>
        <Text className={cn(
          "omnii-body text-base font-semibold mb-2",
          isDark && "text-omnii-dark-text-primary"
        )}>Share Your Progress</Text>
        <Text className={cn(
          "omnii-body text-sm",
          isDark && "text-omnii-dark-text-secondary"
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
        "flex-1 bg-omnii-background",
        isDark && "bg-omnii-dark-background"
      )}>
        <View className="flex-1 justify-center items-center">
          <Text className={cn(
            "text-lg",
            isDark ? "text-omnii-dark-text-secondary" : "text-omnii-text-secondary"
          )}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className={cn(
        "flex-1 bg-omnii-background",
        isDark && "bg-omnii-dark-background"
      )}>
        <View className="p-5 pb-2.5">
          <Text className={cn(
            "omnii-heading text-3xl font-bold mb-1",
            isDark && "text-omnii-dark-text-primary"
          )}>🏆 Achievements</Text>
          <Text className={cn(
            "omnii-body text-base",
            isDark && "text-omnii-dark-text-secondary"
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
                  shadowColor: AppColors.aiGradientStart,
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