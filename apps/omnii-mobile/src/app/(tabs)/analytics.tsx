import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { cn } from '~/utils/cn';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { useFetchAnalytics } from '~/hooks/useFetchAnalytics';
import MetricCard from '~/components/analytics/MetricCard';
import AIInsightCard from '~/components/analytics/AIInsightCard';
import { AppColors } from '~/constants/Colors';
import Svg, { Defs, LinearGradient, Stop, Rect, Line, Circle } from 'react-native-svg';
import type { AnalyticsTab, AnalyticsTabConfig } from '~/types/analytics';

const { width: screenWidth } = Dimensions.get('window');

// Tab configuration following EXACT profile.tsx pattern
const analyticsTabs: AnalyticsTabConfig[] = [
  {
    key: 'dashboard',
    label: 'Today',
    icon: '📊',
    gradient: ['#667eea', '#764ba2'] // Purple gradient (position 1)
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: '🧠',
    gradient: ['#4ECDC4', '#44A08D'] // Teal gradient (position 2)
  },
  {
    key: 'trends',
    label: 'Trends',
    icon: '📈',
    gradient: ['#FFB347', '#FFD700'] // Orange-gold gradient (position 3)
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: '📋',
    gradient: ['#FF6B6B', '#EE5A24'] // Red-orange gradient (position 4)
  }
];

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { analytics, isLoading, refetch } = useFetchAnalytics();
  const router = useRouter();
  
  const [selectedTab, setSelectedTab] = useState<AnalyticsTab>('dashboard');
  const [refreshing, setRefreshing] = useState(false);

  // Animation refs (SIMPLIFIED - no more glow effects)
  const scaleAnimations = useRef(
    analyticsTabs.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(1);
      return acc;
    }, {} as Record<AnalyticsTab, Animated.Value>)
  ).current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleTabPress = (tabKey: AnalyticsTab) => {
    // Scale animation on press
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

  // REMOVED: Glow effects as requested - clean, professional design
  // Energy Curve Chart Component
  const EnergyCurveChart = () => {
    const energyData = analytics?.energyCurve || [];
    const maxEnergy = Math.max(...energyData.map(d => d.energy));
    const chartWidth = screenWidth - 80;
    const chartHeight = 160;
    
    return (
      <View className="mb-5">
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="energyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={AppColors.aiGradientStart} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={AppColors.aiGradientStart} stopOpacity="0.1" />
            </LinearGradient>
          </Defs>
          
          {/* Energy curve path */}
          {energyData.map((point, index) => {
            const x = (index / (energyData.length - 1)) * chartWidth;
            const y = chartHeight - (point.energy / maxEnergy) * chartHeight;
            const nextPoint = energyData[index + 1];
            
            if (nextPoint && index < energyData.length - 1) {
              const nextX = ((index + 1) / (energyData.length - 1)) * chartWidth;
              const nextY = chartHeight - (nextPoint.energy / maxEnergy) * chartHeight;
              
              return (
                <Line
                  key={`line-${point.hour}-${index}`}
                  x1={x}
                  y1={y}
                  x2={nextX}
                  y2={nextY}
                  stroke={AppColors.aiGradientStart}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            }
            return null;
          })}
          
          {/* Data points */}
          {energyData.map((point, index) => {
            const x = (index / (energyData.length - 1)) * chartWidth;
            const y = chartHeight - (point.energy / maxEnergy) * chartHeight;
            
            return (
              <Circle
                key={`point-${point.hour}-${index}`}
                cx={x}
                cy={y}
                r="4"
                fill={AppColors.aiGradientStart}
              />
            );
          })}
        </Svg>
        
        {/* Time labels */}
        <View className="flex-row justify-between px-2.5 pt-2.5">
          <Text className={cn(
            "omnii-caption text-xs",
            isDark && "text-omnii-dark-text-secondary"
          )}>6 AM</Text>
          <Text className={cn(
            "omnii-caption text-xs",
            isDark && "text-omnii-dark-text-secondary"
          )}>12 PM</Text>
          <Text className={cn(
            "omnii-caption text-xs",
            isDark && "text-omnii-dark-text-secondary"
          )}>6 PM</Text>
          <Text className={cn(
            "omnii-caption text-xs",
            isDark && "text-omnii-dark-text-secondary"
          )}>12 AM</Text>
        </View>
      </View>
    );
  };

  // Analytics Tabs with clean design (no glow effects)
  const AnalyticsTabs = () => (
    <View className="flex-row px-5 pb-5 pt-2 gap-3">
      {analyticsTabs.map((tab) => {
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
              </View>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Tab content implementations
  const DashboardContent = () => (
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      {/* Today's Metrics Grid */}
      <View className="mb-5">
        <View className="flex-row mb-4 -mx-2">
          <MetricCard
            title="Tasks Done"
            value={analytics?.todayMetrics.tasksCompleted ?? 0}
            icon="✅"
            trend="up"
            trendValue="+2 from yesterday"
          />
          <MetricCard
            title="Focus Hours"
            value={analytics?.todayMetrics.hoursFocused?.toFixed(1) ?? '0.0'}
            icon="⏱️"
            trend="up"
            trendValue="+0.8h"
          />
        </View>
        <View className="flex-row -mx-2">
          <MetricCard
            title="XP Earned"
            value={analytics?.todayMetrics.xpEarned ?? 0}
            icon="🌟"
            trend="up"
            trendValue="+15%"
          />
          <MetricCard
            title="Efficiency"
            value={`${analytics?.todayMetrics.efficiencyScore ?? 0}%`}
            icon="🎯"
            subtitle="AI-calculated score"
            trend="up"
            trendValue="+5%"
          />
        </View>
      </View>

      {/* Energy Curve Chart Card */}
      <View className={cn(
        "mb-4 rounded-2xl p-5",
        "bg-omnii-card",
        isDark && "bg-omnii-dark-card"
      )}>
        <Text className={cn(
          "omnii-heading text-lg mb-1",
          isDark && "text-omnii-dark-text-primary"
        )}>📈 Energy Curve</Text>
        <Text className={cn(
          "omnii-body text-sm mb-4",
          isDark && "text-omnii-dark-text-secondary"
        )}>Real-time productivity levels throughout the day</Text>
        
        <EnergyCurveChart />
        
        <Text className={cn(
          "omnii-caption text-xs text-center mt-2",
          isDark && "text-omnii-dark-text-tertiary"
        )}>
          Peak performance window: 9:00 AM - 11:30 AM
        </Text>
      </View>

      {/* Focus Streaks Card */}
      <View className={cn(
        "border-l-4 border-success mb-4 rounded-2xl p-5",
        "bg-omnii-card",
        isDark && "bg-omnii-dark-card"
      )}>
        <Text className={cn(
          "omnii-heading text-lg mb-4",
          isDark && "text-omnii-dark-text-primary"
        )}>🔥 Focus Streaks</Text>
        <View className="flex-row items-center mb-4">
          <View className="flex-1 items-center">
            <Text className={cn(
              "omnii-caption text-xs font-medium mb-1",
              isDark && "text-omnii-dark-text-secondary"
            )}>Current</Text>
            <Text className={cn(
              "text-2xl font-bold",
              isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
            )}>{analytics?.todayMetrics.currentStreak ?? 0} min</Text>
          </View>
          <View className={cn(
            "w-px h-10 mx-5",
            isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
          )} />
          <View className="flex-1 items-center">
            <Text className={cn(
              "omnii-caption text-xs font-medium mb-1",
              isDark && "text-omnii-dark-text-secondary"
            )}>Best Today</Text>
            <Text className={cn(
              "text-2xl font-bold",
              isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
            )}>{analytics?.todayMetrics.bestStreak ?? 0} min</Text>
          </View>
        </View>
        <View className="mt-2">
          <View className={cn(
            "h-1.5 rounded-full overflow-hidden mb-2",
            isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
          )}>
            <View 
              className="h-full bg-success rounded-full"
              style={{ width: `${((analytics?.todayMetrics.currentStreak ?? 0) / 180) * 100}%` }}
            />
          </View>
          <Text className={cn(
            "omnii-caption text-xs text-center",
            isDark && "text-omnii-dark-text-tertiary"
          )}>Goal: 3 hours focused work</Text>
        </View>
      </View>
    </ScrollView>
  );

  const InsightsContent = () => (
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      {analytics?.aiInsights.map((insight) => (
        <AIInsightCard
          key={insight.id}
          insight={insight}
          onAction={(action) => {
            console.log('Action:', action);
            // Handle AI suggestion actions
          }}
          onDismiss={() => {
            console.log('Dismissed insight:', insight.id);
            // Handle dismissing insights
          }}
        />
      ))}
      
      {/* Empty state for insights */}
      {(!analytics?.aiInsights || analytics.aiInsights.length === 0) && (
        <View className="items-center py-10">
          <Text className="text-5xl mb-4">🧠</Text>
          <Text className={cn(
            "omnii-heading text-lg mb-2",
            isDark && "text-omnii-dark-text-primary"
          )}>AI is learning your patterns</Text>
          <Text className={cn(
            "omnii-body text-sm text-center leading-5",
            isDark && "text-omnii-dark-text-secondary"
          )}>
            Continue using the app to get personalized productivity insights
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const TrendsContent = () => (
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      {/* Weekly Patterns Heatmap */}
      <View className={cn(
        "mb-4 rounded-2xl p-5",
        "bg-omnii-card",
        isDark && "bg-omnii-dark-card"
      )}>
        <Text className={cn(
          "omnii-heading text-lg mb-1",
          isDark && "text-omnii-dark-text-primary"
        )}>📅 Weekly Productivity Heatmap</Text>
        <Text className={cn(
          "omnii-body text-sm mb-4",
          isDark && "text-omnii-dark-text-secondary"
        )}>Your productive vs. challenging times</Text>
        
        <View className={cn(
          "bg-omnii-background rounded-xl p-4",
          isDark && "bg-omnii-dark-background"
        )}>
          <Text className={cn(
            "omnii-heading text-base text-center mb-4",
            isDark && "text-omnii-dark-text-primary"
          )}>Weekly Heatmap Chart</Text>
          {analytics?.weeklyPatterns.map((pattern) => (
            <View key={pattern.day} className="flex-row items-center mb-2">
              <Text className={cn(
                "omnii-heading text-xs font-medium w-15",
                isDark && "text-omnii-dark-text-primary"
              )}>{pattern.day}</Text>
              <View className={cn(
                "flex-1 h-4 rounded-lg mx-3 overflow-hidden",
                isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
              )}>
                <View 
                  className="h-full rounded-lg"
                  style={{ 
                    width: `${pattern.productivity}%`, 
                    backgroundColor: AppColors.success 
                  }} 
                />
              </View>
              <Text className={cn(
                "omnii-heading text-xs font-semibold w-10 text-right",
                isDark && "text-omnii-dark-text-primary"
              )}>{pattern.productivity}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Task Completion Velocity */}
      <View className={cn(
        "mb-4 rounded-2xl p-5",
        "bg-omnii-card",
        isDark && "bg-omnii-dark-card"
      )}>
        <Text className={cn(
          "omnii-heading text-lg mb-1",
          isDark && "text-omnii-dark-text-primary"
        )}>⚡ Task Completion Velocity</Text>
        <Text className={cn(
          "omnii-body text-sm mb-4",
          isDark && "text-omnii-dark-text-secondary"
        )}>How quickly you finish different types of work</Text>
        
        <View className={cn(
          "flex-row justify-around bg-omnii-background rounded-xl p-5",
          isDark && "bg-omnii-dark-background"
        )}>
          <View className="items-center">
            <Text className={cn(
              "omnii-body text-sm mb-2",
              isDark && "text-omnii-dark-text-secondary"
            )}>Average</Text>
            <Text className={cn(
              "text-xl font-bold",
              isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
            )}>6.2 tasks/day</Text>
          </View>
          <View className="items-center">
            <Text className={cn(
              "omnii-body text-sm mb-2",
              isDark && "text-omnii-dark-text-secondary"
            )}>Trend</Text>
            <Text className="text-xl font-bold text-success">↗️ +15%</Text>
          </View>
        </View>
      </View>

      {/* Time Saved Meter */}
      <View className={cn(
        "border-l-4 border-ai-start mb-4 rounded-2xl p-5",
        "bg-omnii-card",
        isDark && "bg-omnii-dark-card"
      )}>
        <Text className={cn(
          "omnii-heading text-lg mb-4",
          isDark && "text-omnii-dark-text-primary"
        )}>💎 AI Impact This Month</Text>
        <View className="flex-row items-center gap-5">
          <View className={cn(
            "w-20 h-20 rounded-full bg-omnii-background justify-center items-center",
            isDark && "bg-omnii-dark-background"
          )}>
            <Text className="text-xl font-bold text-ai-start">12.5h</Text>
            <Text className={cn(
              "omnii-caption text-xs",
              isDark && "text-omnii-dark-text-secondary"
            )}>saved</Text>
          </View>
          <View className="flex-1">
            <Text className={cn(
              "omnii-body text-sm mb-3 leading-5",
              isDark && "text-omnii-dark-text-secondary"
            )}>
              Through automated scheduling and smart suggestions
            </Text>
            <View className="gap-1">
              <Text className={cn(
                "omnii-caption text-xs",
                isDark && "text-omnii-dark-text-tertiary"
              )}>• 6.2h from smart scheduling</Text>
              <Text className={cn(
                "omnii-caption text-xs",
                isDark && "text-omnii-dark-text-tertiary"
              )}>• 4.1h from focus optimization</Text>
              <Text className={cn(
                "omnii-caption text-xs",
                isDark && "text-omnii-dark-text-tertiary"
              )}>• 2.2h from distraction reduction</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const ReportsContent = () => (
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      {/* Shareable Reports */}
      <View className={cn(
        "mb-4 rounded-2xl p-5",
        "bg-omnii-card",
        isDark && "bg-omnii-dark-card"
      )}>
        <Text className={cn(
          "omnii-heading text-lg mb-1",
          isDark && "text-omnii-dark-text-primary"
        )}>📊 Share Your Progress</Text>
        <Text className={cn(
          "omnii-body text-sm mb-4",
          isDark && "text-omnii-dark-text-secondary"
        )}>Show off your productivity wins</Text>
        
        <TouchableOpacity className={cn(
          "flex-row items-center bg-omnii-background rounded-xl p-4 mb-3",
          isDark && "bg-omnii-dark-background"
        )}>
          <Text className="text-2xl mr-4">🏆</Text>
          <View className="flex-1">
            <Text className={cn(
              "omnii-heading text-base mb-1",
              isDark && "text-omnii-dark-text-primary"
            )}>Weekly Wins Summary</Text>
            <Text className={cn(
              "omnii-body text-sm",
              isDark && "text-omnii-dark-text-secondary"
            )}>8 tasks • 87% efficiency • 5.2h focus</Text>
          </View>
          <Text className={cn(
            "omnii-body text-sm",
            isDark && "text-omnii-dark-text-secondary"
          )}>Share →</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className={cn(
          "flex-row items-center bg-omnii-background rounded-xl p-4 mb-3",
          isDark && "bg-omnii-dark-background"
        )}>
          <Text className="text-2xl mr-4">📈</Text>
          <View className="flex-1">
            <Text className={cn(
              "omnii-heading text-base mb-1",
              isDark && "text-omnii-dark-text-primary"
            )}>Growth Journey</Text>
            <Text className={cn(
              "omnii-body text-sm",
              isDark && "text-omnii-dark-text-secondary"
            )}>From Seed to Flower • +340 XP this week</Text>
          </View>
          <Text className={cn(
            "omnii-body text-sm",
            isDark && "text-omnii-dark-text-secondary"
          )}>Share →</Text>
        </TouchableOpacity>

        <TouchableOpacity className={cn(
          "flex-row items-center bg-omnii-background rounded-xl p-4 mb-3",
          isDark && "bg-omnii-dark-background"
        )}>
          <Text className="text-2xl mr-4">🔥</Text>
          <View className="flex-1">
            <Text className={cn(
              "omnii-heading text-base mb-1",
              isDark && "text-omnii-dark-text-primary"
            )}>Streak Achievement</Text>
            <Text className={cn(
              "omnii-body text-sm",
              isDark && "text-omnii-dark-text-secondary"
            )}>120 minutes focused today • Personal best!</Text>
          </View>
          <Text className={cn(
            "omnii-body text-sm",
            isDark && "text-omnii-dark-text-secondary"
          )}>Share →</Text>
        </TouchableOpacity>
      </View>

      {/* Friends Leaderboard */}
      <View className={cn(
        "mb-4 rounded-2xl p-5",
        "bg-omnii-card",
        isDark && "bg-omnii-dark-card"
      )}>
        <Text className={cn(
          "omnii-heading text-lg mb-1",
          isDark && "text-omnii-dark-text-primary"
        )}>👥 Friends Leaderboard</Text>
        <Text className={cn(
          "omnii-body text-sm mb-4",
          isDark && "text-omnii-dark-text-secondary"
        )}>See how you compare this week</Text>
        
        <View className="flex-row items-center mb-3">
          <Text className="text-2xl font-bold mr-3">🥇</Text>
          <View className="flex-1">
            <Text className={cn(
              "omnii-heading text-base",
              isDark && "text-omnii-dark-text-primary"
            )}>Alex Chen</Text>
            <Text className={cn(
              "omnii-body text-sm",
              isDark && "text-omnii-dark-text-secondary"
            )}>1,240 XP • Flower Stage</Text>
          </View>
        </View>

        <View className="flex-row items-center mb-3">
          <Text className="text-2xl font-bold mr-3">🥈</Text>
          <View className="flex-1">
            <Text className={cn(
              "omnii-heading text-base",
              isDark && "text-omnii-dark-text-primary"
            )}>You</Text>
            <Text className={cn(
              "omnii-body text-sm",
              isDark && "text-omnii-dark-text-secondary"
            )}>1,180 XP • Flower Stage</Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4">
          <Text className="text-2xl font-bold mr-3">🥉</Text>
          <View className="flex-1">
            <Text className={cn(
              "omnii-heading text-base",
              isDark && "text-omnii-dark-text-primary"
            )}>Sarah Kim</Text>
            <Text className={cn(
              "omnii-body text-sm",
              isDark && "text-omnii-dark-text-secondary"
            )}>1,120 XP • Flower Stage</Text>
          </View>
        </View>

        <TouchableOpacity className="bg-ai-start py-3 px-6 rounded-xl items-center">
          <Text className="text-white text-base font-semibold">📧 Invite More Friends</Text>
        </TouchableOpacity>
      </View>

      {/* Analytics Milestones Progress */}
      <View className={cn(
        "mb-4 rounded-2xl p-5",
        "bg-omnii-card",
        isDark && "bg-omnii-dark-card"
      )}>
        <Text className={cn(
          "omnii-heading text-lg mb-1",
          isDark && "text-omnii-dark-text-primary"
        )}>🏆 Analytics Milestones</Text>
        <Text className={cn(
          "omnii-body text-sm mb-4",
          isDark && "text-omnii-dark-text-secondary"
        )}>Track your analytics achievements</Text>
        
        <View className="mb-5">
          <View className="flex-row justify-between items-center mb-2">
            <Text className={cn(
              "omnii-heading text-base",
              isDark && "text-omnii-dark-text-primary"
            )}>Pattern Seeker</Text>
            <Text className="omnii-heading text-sm text-ai-start">+75 XP</Text>
          </View>
          <Text className={cn(
            "omnii-body text-sm mb-3 leading-5",
            isDark && "text-omnii-dark-text-secondary"
          )}>Review analytics for 7 consecutive days</Text>
          <View className="flex-row items-center gap-3">
            <View className={cn(
              "flex-1 h-1.5 rounded-full overflow-hidden",
              isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
            )}>
              <View className="h-full bg-ai-start rounded-full w-[71%]" />
            </View>
            <Text className={cn(
              "omnii-caption text-xs",
              isDark && "text-omnii-dark-text-tertiary"
            )}>5/7 days</Text>
          </View>
        </View>

        <View className="mb-5">
          <View className="flex-row justify-between items-center mb-2">
            <Text className={cn(
              "omnii-heading text-base",
              isDark && "text-omnii-dark-text-primary"
            )}>Data Detective</Text>
            <Text className="omnii-heading text-sm text-ai-start">+200 XP</Text>
          </View>
          <Text className={cn(
            "omnii-body text-sm mb-3 leading-5",
            isDark && "text-omnii-dark-text-secondary"
          )}>Discover and act on 3 personal productivity patterns</Text>
          <View className="flex-row items-center gap-3">
            <View className={cn(
              "flex-1 h-1.5 rounded-full overflow-hidden",
              isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
            )}>
              <View className="h-full bg-ai-start rounded-full w-[33%]" />
            </View>
            <Text className={cn(
              "omnii-caption text-xs",
              isDark && "text-omnii-dark-text-tertiary"
            )}>1/3 patterns</Text>
          </View>
        </View>

        <View className="mb-0">
          <View className="flex-row justify-between items-center mb-2">
            <Text className={cn(
              "omnii-heading text-base",
              isDark && "text-omnii-dark-text-primary"
            )}>Efficiency Engineer</Text>
            <Text className="omnii-heading text-sm text-ai-start">+300 XP</Text>
          </View>
          <Text className={cn(
            "omnii-body text-sm mb-3 leading-5",
            isDark && "text-omnii-dark-text-secondary"
          )}>Improve weekly productivity score by 25%</Text>
          <View className="flex-row items-center gap-3">
            <View className={cn(
              "flex-1 h-1.5 rounded-full overflow-hidden",
              isDark ? "bg-omnii-dark-border-light" : "bg-omnii-border-light"
            )}>
              <View className="h-full bg-ai-start rounded-full w-[0%]" />
            </View>
            <Text className={cn(
              "omnii-caption text-xs",
              isDark && "text-omnii-dark-text-tertiary"
            )}>0% improvement</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // Tab content renderer
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'dashboard':
        return <DashboardContent />;
      case 'insights':
        return <InsightsContent />;
      case 'trends':
        return <TrendsContent />;
      case 'reports':
        return <ReportsContent />;
      default:
        return null;
    }
  };

  // Authentication check using established pattern
  if (!user) {
    return (
      <SafeAreaView className={cn(
        "flex-1 bg-omnii-background",
        isDark && "bg-omnii-dark-background"
      )}>
        <View className="flex-1 justify-center items-center p-6">
          <TrendingUp size={64} color={isDark ? '#a8aaae' : '#8E8E93'} />
          <Text className={cn(
            "omnii-heading text-3xl font-bold mt-4",
            isDark && "text-omnii-dark-text-primary"
          )}>Analytics</Text>
          <Text className={cn(
            "omnii-body text-base text-center mt-2",
            isDark && "text-omnii-dark-text-secondary"
          )}>Please log in to view your analytics</Text>
          
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
      {/* Header Section using established pattern */}
      <View className={cn(
        "bg-omnii-card p-6 pt-5 border-b border-omnii-border",
        isDark && "bg-omnii-dark-card border-omnii-dark-border"
      )}>
        <View className="flex-row justify-between items-center mb-3 min-h-[40px]">
          <View className="flex-row items-center gap-3 flex-1">
            <Text className={cn(
              "omnii-heading text-3xl font-bold",
              isDark && "text-omnii-dark-text-primary"
            )}>Analytics</Text>
          </View>
        </View>
        <Text className={cn(
          "omnii-body text-base mt-1",
          isDark && "text-omnii-dark-text-secondary"
        )}>
          Your productivity scientist
        </Text>
      </View>

      {/* Analytics Tabs using established pattern */}
      <AnalyticsTabs />

      {/* Tab Content */}
      <View className="flex-1">
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}