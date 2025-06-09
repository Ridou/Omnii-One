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
import { useOnboardingContext } from '~/context/OnboardingContext';
import { useFetchAnalytics } from '~/hooks/useFetchAnalytics';
import MetricCard from '~/components/analytics/MetricCard';
import AIInsightCard from '~/components/analytics/AIInsightCard';
import { Mascot, MascotContainer, useMascotCheering } from '~/components/common/Mascot';
import { XPProgressBar } from '~/components/common/XPProgressBar';
import { 
  MascotStage, 
  MascotSize, 
  CheeringTrigger, 
  getMascotStageByLevel 
} from '~/types/mascot';
import { AppColors } from '~/constants/Colors';
import Svg, { Defs, LinearGradient, Stop, Rect, Line, Circle } from 'react-native-svg';
import type { AnalyticsTab, AnalyticsTabConfig } from '~/types/analytics';
import { useXPContext } from '~/context/XPContext';
import { ResponsiveTabLayout } from '~/components/common/ResponsiveTabLayout';
import { DesktopAnalyticsContent, TabletAnalyticsContent } from '~/components/common/DesktopAnalyticsComponents';
import { useResponsiveDesign } from '~/utils/responsive';

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
    gradient: ['#FF7043', '#FF5722'] // NEW: Vibrant orange gradient (position 3)
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: '📋',
    gradient: ['#FF3B30', '#DC143C'] // NEW: Clean red gradient (position 4)
  }
];

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const responsive = useResponsiveDesign();

  const { currentLevel } = useXPContext();
  const { analytics, isLoading, refetch } = useFetchAnalytics();
  const router = useRouter();
  
  // Mascot state management
  const { cheeringState, triggerCheering } = useMascotCheering();
  const mascotStage = getMascotStageByLevel(currentLevel);
  
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
            "text-xs",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>6 AM</Text>
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>12 PM</Text>
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>6 PM</Text>
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-400" : "text-gray-600"
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
        "rounded-xl p-4 mb-4 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-lg font-semibold mb-1",
          isDark ? "text-white" : "text-gray-900"
        )}>📈 Energy Curve</Text>
        <Text className={cn(
          "text-sm mb-4",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>Real-time productivity levels throughout the day</Text>
        
        <EnergyCurveChart />
        
        <Text className={cn(
          "text-xs text-center mt-2",
          isDark ? "text-slate-500" : "text-gray-500"
        )}>
          Peak performance window: 9:00 AM - 11:30 AM
        </Text>
      </View>

      {/* Focus Streaks Card */}
      <View className={cn(
        "border-l-4 border-green-500 rounded-xl p-4 mb-4 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-lg font-semibold mb-4",
          isDark ? "text-white" : "text-gray-900"
        )}>🔥 Focus Streaks</Text>
        <View className="flex-row items-center mb-4">
          <View className="flex-1 items-center">
            <Text className={cn(
              "text-xs font-medium mb-1",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Current</Text>
            <Text className={cn(
              "text-2xl font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>{analytics?.todayMetrics.currentStreak ?? 0} min</Text>
          </View>
          <View className={cn(
            "w-px h-10 mx-5",
            isDark ? "bg-slate-600" : "bg-gray-200"
          )} />
          <View className="flex-1 items-center">
            <Text className={cn(
              "text-xs font-medium mb-1",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Best Today</Text>
            <Text className={cn(
              "text-2xl font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>{analytics?.todayMetrics.bestStreak ?? 0} min</Text>
          </View>
        </View>
        <View className="mt-2">
          <View className={cn(
            "h-1.5 rounded-full overflow-hidden mb-2",
            isDark ? "bg-slate-600" : "bg-gray-200"
          )}>
            <View 
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${((analytics?.todayMetrics.currentStreak ?? 0) / 180) * 100}%` }}
            />
          </View>
          <Text className={cn(
            "text-xs text-center",
            isDark ? "text-slate-500" : "text-gray-500"
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
          <View className={cn(
            "rounded-xl p-8 items-center border max-w-sm",
            isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
          )}>
            <Text className="text-5xl mb-4">🧠</Text>
            <Text className={cn(
              "text-lg font-semibold mb-2",
              isDark ? "text-white" : "text-gray-900"
            )}>AI is learning your patterns</Text>
            <Text className={cn(
              "text-sm text-center leading-5",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              Continue using the app to get personalized productivity insights
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const TrendsContent = () => (
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      {/* Weekly Patterns Heatmap */}
      <View className={cn(
        "rounded-xl p-4 mb-4 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-lg font-semibold mb-1",
          isDark ? "text-white" : "text-gray-900"
        )}>📅 Weekly Productivity Heatmap</Text>
        <Text className={cn(
          "text-sm mb-4",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>Your productive vs. challenging times</Text>
        
        <View className={cn(
          "rounded-xl p-4",
          isDark ? "bg-slate-900" : "bg-gray-50"
        )}>
          <Text className={cn(
            "text-base text-center mb-4 font-medium",
            isDark ? "text-white" : "text-gray-900"
          )}>Weekly Heatmap Chart</Text>
          {analytics?.weeklyPatterns.map((pattern) => (
            <View key={pattern.day} className="flex-row items-center mb-2">
              <Text className={cn(
                "text-xs font-medium w-15",
                isDark ? "text-white" : "text-gray-900"
              )}>{pattern.day}</Text>
              <View className={cn(
                "flex-1 h-4 rounded-lg mx-3 overflow-hidden",
                isDark ? "bg-slate-600" : "bg-gray-200"
              )}>
                <View 
                  className="h-full rounded-lg bg-green-500"
                  style={{ width: `${pattern.productivity}%` }} 
                />
              </View>
              <Text className={cn(
                "text-xs font-semibold w-10 text-right",
                isDark ? "text-white" : "text-gray-900"
              )}>{pattern.productivity}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Task Completion Velocity */}
      <View className={cn(
        "rounded-xl p-4 mb-4 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-lg font-semibold mb-1",
          isDark ? "text-white" : "text-gray-900"
        )}>⚡ Task Completion Velocity</Text>
        <Text className={cn(
          "text-sm mb-4",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>How quickly you finish different types of work</Text>
        
        <View className={cn(
          "flex-row justify-around rounded-xl p-5",
          isDark ? "bg-slate-900" : "bg-gray-50"
        )}>
          <View className="items-center">
            <Text className={cn(
              "text-sm mb-2 font-medium",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Average</Text>
            <Text className={cn(
              "text-xl font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>6.2 tasks/day</Text>
          </View>
          <View className="items-center">
            <Text className={cn(
              "text-sm mb-2 font-medium",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Trend</Text>
            <Text className="text-xl font-bold text-green-600">↗️ +15%</Text>
          </View>
        </View>
      </View>

      {/* Time Saved Meter */}
      <View className={cn(
        "rounded-xl p-4 mb-4 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-lg font-semibold mb-1",
          isDark ? "text-white" : "text-gray-900"
        )}>⏰ Time Saved This Week</Text>
        <Text className={cn(
          "text-sm mb-4",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>AI-powered automation impact</Text>
        
        <View className="items-center">
          <Text className={cn(
            "text-3xl font-bold mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>2.4 hours</Text>
          <View className={cn(
            "w-full h-2 rounded-full overflow-hidden mb-2",
            isDark ? "bg-slate-600" : "bg-gray-200"
          )}>
            <View className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }} />
          </View>
          <Text className={cn(
            "text-xs text-center",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>60% of weekly goal (4 hours)</Text>
        </View>
      </View>
    </ScrollView>
  );

  const ReportsContent = () => (
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      {/* Monthly Summary */}
      <View className={cn(
        "rounded-xl p-4 mb-4 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-lg font-semibold mb-4",
          isDark ? "text-white" : "text-gray-900"
        )}>📊 Monthly Summary</Text>
        
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className={cn(
              "text-2xl font-bold mb-1",
              isDark ? "text-white" : "text-gray-900"
            )}>127</Text>
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Tasks Completed</Text>
          </View>
          <View className="items-center">
            <Text className={cn(
              "text-2xl font-bold mb-1",
              isDark ? "text-white" : "text-gray-900"
            )}>89%</Text>
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Success Rate</Text>
          </View>
          <View className="items-center">
            <Text className={cn(
              "text-2xl font-bold mb-1",
              isDark ? "text-white" : "text-gray-900"
            )}>42h</Text>
            <Text className={cn(
              "text-xs font-medium",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Focus Time</Text>
          </View>
        </View>
        
        <View className={cn(
          "rounded-xl p-4 border-l-4 border-l-blue-500",
          isDark ? "bg-slate-900" : "bg-blue-50"
        )}>
          <Text className={cn(
            "text-sm font-medium mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>🎯 Best Performing Day</Text>
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Tuesday - 12 tasks completed with 95% efficiency</Text>
        </View>
      </View>

      {/* Export Options */}
      <View className={cn(
        "rounded-xl p-4 mb-4 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-lg font-semibold mb-4",
          isDark ? "text-white" : "text-gray-900"
        )}>📤 Export Data</Text>
        
        <TouchableOpacity className={cn(
          "flex-row items-center p-3 rounded-lg mb-3 border",
          isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"
        )}>
          <Text className="text-xl mr-3">📋</Text>
          <View className="flex-1">
            <Text className={cn(
              "font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>Weekly Report</Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Export last 7 days as PDF</Text>
          </View>
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className={cn(
          "flex-row items-center p-3 rounded-lg border",
          isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"
        )}>
          <Text className="text-xl mr-3">📊</Text>
          <View className="flex-1">
            <Text className={cn(
              "font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>Raw Data</Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Export all data as CSV</Text>
          </View>
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>→</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

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
        return <DashboardContent />;
    }
  };

  // Authentication check using established pattern
  if (!user) {
    return (
      <SafeAreaView className={cn(
        "flex-1",
        isDark ? "bg-slate-900" : "bg-white"
      )}>
        <View className="flex-1 justify-center items-center p-6">
          <TrendingUp size={64} color={isDark ? '#94a3b8' : '#6b7280'} />
          <Text className={cn(
            "text-3xl font-bold mt-4",
            isDark ? "text-white" : "text-gray-900"
          )}>Analytics</Text>
          <Text className={cn(
            "text-base text-center mt-2",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Please log in to view your analytics</Text>
          
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="bg-indigo-600 py-3 px-6 rounded-xl mt-4">
              <Text className="text-white text-base font-semibold">Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  // Only use responsive layout for tablet and desktop
  if (responsive.isTablet || responsive.isDesktop) {
    // Enhanced content rendering for tablet/desktop only
    const renderResponsiveContent = () => {
      if (responsive.isDesktop) {
        return (
          <DesktopAnalyticsContent 
            selectedTab={selectedTab}
            analytics={analytics}
            renderTabContent={renderTabContent}
          />
        );
      }
      
      if (responsive.isTablet) {
        return (
          <TabletAnalyticsContent 
            selectedTab={selectedTab}
            analytics={analytics}
            renderTabContent={renderTabContent}
          />
        );
      }
      
      return renderTabContent();
    };

    // Header component for tablet/desktop
    const AnalyticsHeader = () => (
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className={cn(
            "text-3xl font-bold mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>📊 Analytics</Text>
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
            level={currentLevel}
            size={MascotSize.STANDARD}
            showLevel={true}
            enableInteraction={true}
            enableCheering={cheeringState.isActive}
            cheeringTrigger={cheeringState.trigger}
            onTap={() => triggerCheering(CheeringTrigger.TAP_INTERACTION)}
          />
        </MascotContainer>
      </View>
    );

    return (
      <ResponsiveTabLayout
        tabs={analyticsTabs}
        selectedTab={selectedTab}
        onTabPress={handleTabPress}
        scaleAnimations={scaleAnimations}
        header={<AnalyticsHeader />}
        renderTabContent={renderResponsiveContent}
      />
    );
  }

  // MOBILE: Keep original layout exactly as it was
  return (
    <SafeAreaView className={cn(
      "flex-1",
      isDark ? "bg-slate-900" : "bg-white"
    )}>
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
            )}>📊 Analytics</Text>
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
              level={currentLevel}
              size={MascotSize.STANDARD}
              showLevel={true}
              enableInteraction={true}
              enableCheering={cheeringState.isActive}
              cheeringTrigger={cheeringState.trigger}
              onTap={() => triggerCheering(CheeringTrigger.TAP_INTERACTION)}
            />
          </MascotContainer>
        </View>
      </View>

      {/* Tabs */}
      <AnalyticsTabs />

      {/* Content */}
      <View className="flex-1">
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}