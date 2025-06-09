import React from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { useResponsiveDesign } from '~/utils/responsive';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import MetricCard from '~/components/analytics/MetricCard';
import AIInsightCard from '~/components/analytics/AIInsightCard';
import Svg, { Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { AppColors } from '~/constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

// Desktop Analytics Content with Multi-Column Layout
interface DesktopAnalyticsContentProps {
  selectedTab: string;
  analytics: any;
  renderTabContent: () => React.ReactNode;
}

export const DesktopAnalyticsContent: React.FC<DesktopAnalyticsContentProps> = ({
  selectedTab,
  analytics,
  renderTabContent
}) => {
  const responsive = useResponsiveDesign();
  
  if (selectedTab === 'dashboard') {
    return (
      <View className="flex-row gap-8 h-full">
        {/* Left column - main metrics */}
        <View className="flex-2 min-w-0">
          <DesktopMetricsGrid analytics={analytics} />
          <DesktopEnergyChart analytics={analytics} />
        </View>
        
        {/* Right column - insights */}
        <View className="flex-1 min-w-0">
          <DesktopInsightsSidebar analytics={analytics} />
        </View>
      </View>
    );
  }
  
  if (selectedTab === 'trends') {
    return (
      <View className="gap-6">
        <DesktopTrendsLayout analytics={analytics} />
      </View>
    );
  }
  
  return (
    <View style={{ maxWidth: 1200, width: '100%' }}>
      {renderTabContent()}
    </View>
  );
};

// Desktop Metrics Grid with Enhanced Cards
const DesktopMetricsGrid: React.FC<{ analytics: any }> = ({ analytics }) => {
  const { isDark } = useTheme();
  
  return (
    <View className="mb-8">
             <Text className={cn(
         "text-2xl font-bold mb-6",
         isDark ? "text-white" : "text-gray-900"
       )}>📊 Today&apos;s Overview</Text>
      
      <View className="flex-row flex-wrap gap-4">
        <View className="flex-1 min-w-[240px]">
          <EnhancedMetricCard
            title="Tasks Completed"
            value={analytics?.todayMetrics.tasksCompleted ?? 0}
            icon="✅"
            trend="up"
            trendValue="+2 from yesterday"
            color="green"
          />
        </View>
        <View className="flex-1 min-w-[240px]">
          <EnhancedMetricCard
            title="Focus Hours"
            value={analytics?.todayMetrics.hoursFocused?.toFixed(1) ?? '0.0'}
            icon="⏱️"
            trend="up"
            trendValue="+0.8h"
            color="blue"
          />
        </View>
        <View className="flex-1 min-w-[240px]">
          <EnhancedMetricCard
            title="XP Earned"
            value={analytics?.todayMetrics.xpEarned ?? 0}
            icon="🌟"
            trend="up"
            trendValue="+15%"
            color="purple"
          />
        </View>
        <View className="flex-1 min-w-[240px]">
          <EnhancedMetricCard
            title="Efficiency Score"
            value={`${analytics?.todayMetrics.efficiencyScore ?? 0}%`}
            icon="🎯"
            trend="up"
            trendValue="+5%"
            color="orange"
          />
        </View>
      </View>
    </View>
  );
};

// Enhanced Metric Card for Desktop
const EnhancedMetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
}> = ({ title, value, icon, trend, trendValue, color }) => {
  const { isDark } = useTheme();
  
  const colorMap = {
    green: isDark ? 'bg-green-900/20 border-green-600/30' : 'bg-green-50 border-green-200',
    blue: isDark ? 'bg-blue-900/20 border-blue-600/30' : 'bg-blue-50 border-blue-200',
    purple: isDark ? 'bg-purple-900/20 border-purple-600/30' : 'bg-purple-50 border-purple-200',
    orange: isDark ? 'bg-orange-900/20 border-orange-600/30' : 'bg-orange-50 border-orange-200',
  };
  
  return (
    <View className={cn(
      "p-6 rounded-xl border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200",
      colorMap[color]
    )}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-3xl">{icon}</Text>
        <View className={cn(
          "px-2 py-1 rounded-lg",
          trend === 'up' 
            ? isDark ? "bg-green-900/30" : "bg-green-100"
            : isDark ? "bg-red-900/30" : "bg-red-100"
        )}>
          <Text className={cn(
            "text-xs font-semibold",
            trend === 'up' 
              ? isDark ? "text-green-400" : "text-green-700"
              : isDark ? "text-red-400" : "text-red-700"
          )}>
            {trendValue}
          </Text>
        </View>
      </View>
      
      <Text className={cn(
        "text-3xl font-bold mb-1",
        isDark ? "text-white" : "text-gray-900"
      )}>{value}</Text>
      
      <Text className={cn(
        "text-sm font-medium",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{title}</Text>
    </View>
  );
};

// Desktop Energy Chart with Enhanced Layout
const DesktopEnergyChart: React.FC<{ analytics: any }> = ({ analytics }) => {
  const { isDark } = useTheme();
  const responsive = useResponsiveDesign();
  
  const energyData = analytics?.energyCurve || [];
  const maxEnergy = Math.max(...energyData.map((d: any) => d.energy), 1);
  const chartWidth = Math.min(responsive.windowWidth * 0.5, 600);
  const chartHeight = 200;
  
  return (
    <View className={cn(
      "rounded-xl p-6 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center justify-between mb-6">
        <View>
          <Text className={cn(
            "text-xl font-bold mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>📈 Energy Curve</Text>
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Productivity levels throughout the day</Text>
        </View>
        <View className={cn(
          "px-3 py-2 rounded-lg",
          isDark ? "bg-indigo-900/30" : "bg-indigo-100"
        )}>
          <Text className={cn(
            "text-sm font-semibold",
            isDark ? "text-indigo-400" : "text-indigo-700"
          )}>Peak: 9-11 AM</Text>
        </View>
      </View>
      
      <View className="items-center">
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="energyGradientDesktop" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={AppColors.aiGradientStart} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={AppColors.aiGradientStart} stopOpacity="0.1" />
            </LinearGradient>
          </Defs>
          
          {/* Energy curve path */}
          {energyData.map((point: any, index: number) => {
            const x = (index / Math.max(energyData.length - 1, 1)) * chartWidth;
            const y = chartHeight - (point.energy / maxEnergy) * chartHeight;
            const nextPoint = energyData[index + 1];
            
            if (nextPoint && index < energyData.length - 1) {
              const nextX = ((index + 1) / Math.max(energyData.length - 1, 1)) * chartWidth;
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
          {energyData.map((point: any, index: number) => {
            const x = (index / Math.max(energyData.length - 1, 1)) * chartWidth;
            const y = chartHeight - (point.energy / maxEnergy) * chartHeight;
            
            return (
              <Circle
                key={`point-${point.hour}-${index}`}
                cx={x}
                cy={y}
                r="5"
                fill={AppColors.aiGradientStart}
              />
            );
          })}
        </Svg>
        
        {/* Time labels */}
        <View className="flex-row justify-between w-full px-2 pt-4">
          <Text className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-600")}>6 AM</Text>
          <Text className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-600")}>12 PM</Text>
          <Text className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-600")}>6 PM</Text>
          <Text className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-600")}>12 AM</Text>
        </View>
      </View>
    </View>
  );
};

// Desktop Insights Sidebar
const DesktopInsightsSidebar: React.FC<{ analytics: any }> = ({ analytics }) => {
  const { isDark } = useTheme();
  
  return (
    <View className="h-full">
      <Text className={cn(
        "text-xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🧠 AI Insights</Text>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="gap-4">
          {analytics?.aiInsights?.map((insight: any) => (
            <CompactInsightCard
              key={insight.id}
              insight={insight}
            />
          )) || (
            <View className="items-center py-8">
              <View className={cn(
                "rounded-xl p-6 items-center border",
                isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
              )}>
                <Text className="text-4xl mb-3">🧠</Text>
                <Text className={cn(
                  "text-lg font-semibold mb-2 text-center",
                  isDark ? "text-white" : "text-gray-900"
                )}>Learning Your Patterns</Text>
                <Text className={cn(
                  "text-sm text-center leading-5",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>
                  AI insights will appear as you use the app more
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// Compact Insight Card for Sidebar
const CompactInsightCard: React.FC<{ insight: any }> = ({ insight }) => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "p-4 rounded-xl border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-2">
        <Text className="text-lg mr-2">{insight.icon || '💡'}</Text>
        <Text className={cn(
          "font-semibold text-sm flex-1",
          isDark ? "text-white" : "text-gray-900"
        )}>{insight.title}</Text>
      </View>
      <Text className={cn(
        "text-xs leading-4",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{insight.summary}</Text>
    </View>
  );
};

// Desktop Trends Layout
const DesktopTrendsLayout: React.FC<{ analytics: any }> = ({ analytics }) => {
  const { isDark } = useTheme();
  
  return (
    <View className="gap-6">
      {/* Weekly Patterns */}
      <View className={cn(
        "rounded-xl p-6 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-xl font-bold mb-4",
          isDark ? "text-white" : "text-gray-900"
        )}>📅 Weekly Productivity Patterns</Text>
        
        <View className="gap-3">
          {analytics?.weeklyPatterns?.map((pattern: any) => (
            <View key={pattern.day} className="flex-row items-center">
              <Text className={cn(
                "text-sm font-medium w-20",
                isDark ? "text-white" : "text-gray-900"
              )}>{pattern.day}</Text>
              <View className={cn(
                "flex-1 h-6 rounded-lg mx-4 overflow-hidden",
                isDark ? "bg-slate-600" : "bg-gray-200"
              )}>
                <View 
                  className="h-full rounded-lg bg-green-500"
                  style={{ width: `${pattern.productivity}%` }} 
                />
              </View>
              <Text className={cn(
                "text-sm font-semibold w-12 text-right",
                isDark ? "text-white" : "text-gray-900"
              )}>{pattern.productivity}%</Text>
            </View>
          )) || (
            <Text className={cn(
              "text-center py-8",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Weekly patterns will appear after more usage</Text>
          )}
        </View>
      </View>
    </View>
  );
};

// Tablet Analytics Content
export const TabletAnalyticsContent: React.FC<{
  selectedTab: string;
  analytics: any;
  renderTabContent: () => React.ReactNode;
}> = ({ selectedTab, analytics, renderTabContent }) => {
  if (selectedTab === 'dashboard') {
    return (
      <View className="gap-6">
        <View className="flex-row flex-wrap gap-4">
          <View className="flex-1 min-w-[200px]">
            <MetricCard
              title="Tasks Done"
              value={analytics?.todayMetrics.tasksCompleted ?? 0}
              icon="✅"
              trend="up"
              trendValue="+2"
            />
          </View>
          <View className="flex-1 min-w-[200px]">
            <MetricCard
              title="Focus Hours"
              value={analytics?.todayMetrics.hoursFocused?.toFixed(1) ?? '0.0'}
              icon="⏱️"
              trend="up"
              trendValue="+0.8h"
            />
          </View>
        </View>
        <View className="flex-row flex-wrap gap-4">
          <View className="flex-1 min-w-[200px]">
            <MetricCard
              title="XP Earned"
              value={analytics?.todayMetrics.xpEarned ?? 0}
              icon="🌟"
              trend="up"
              trendValue="+15%"
            />
          </View>
          <View className="flex-1 min-w-[200px]">
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
      </View>
    );
  }
  
  return (
    <View className="flex-1">
      {renderTabContent()}
    </View>
  );
}; 