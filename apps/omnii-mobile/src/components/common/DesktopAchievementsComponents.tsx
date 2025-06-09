import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useResponsiveDesign } from '~/utils/responsive';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { XPProgressBar } from '~/components/common/XPProgressBar';
import { XPSystemUtils } from '~/constants/XPSystem';

// Desktop Achievements Content with Multi-Column Layout
interface DesktopAchievementsContentProps {
  selectedTab: string;
  achievementData: any;
  xpProgress: any;
  currentLevel: number;
  renderTabContent: () => React.ReactNode;
}

export const DesktopAchievementsContent: React.FC<DesktopAchievementsContentProps> = ({
  selectedTab,
  achievementData,
  xpProgress,
  currentLevel,
  renderTabContent
}) => {
  const responsive = useResponsiveDesign();
  
  if (selectedTab === 'evolve') {
    return (
      <View className="flex-row gap-8 h-full">
        {/* Left column - progress overview */}
        <View className="flex-2 min-w-0">
          <DesktopProgressOverview xpProgress={xpProgress} currentLevel={currentLevel} />
          <DesktopCurrentGoals achievementData={achievementData} />
        </View>
        
        {/* Right column - feature unlocks */}
        <View className="flex-1 min-w-0">
          <DesktopFeatureUnlocks currentLevel={currentLevel} />
        </View>
      </View>
    );
  }
  
  if (selectedTab === 'discover') {
    return (
      <View className="gap-6">
        <DesktopDiscoverGrid achievementData={achievementData} />
      </View>
    );
  }
  
  if (selectedTab === 'gallery') {
    return (
      <View className="gap-6">
        <DesktopGalleryLayout achievementData={achievementData} />
      </View>
    );
  }
  
  return (
    <View style={{ maxWidth: 1200, width: '100%' }}>
      {renderTabContent()}
    </View>
  );
};

// Desktop Progress Overview with Enhanced Layout
const DesktopProgressOverview: React.FC<{ xpProgress: any; currentLevel: number }> = ({ 
  xpProgress, 
  currentLevel 
}) => {
  const { isDark } = useTheme();
  
  return (
    <View className="mb-8">
      <Text className={cn(
        "text-2xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🌱 Progress Overview</Text>
      
      <View className={cn(
        "rounded-xl p-6 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <View className="flex-row justify-between items-center mb-6">
          <Text className={cn(
            "text-xl font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}>Level Progress</Text>
          <Text className="text-lg font-semibold text-indigo-600">
            {xpProgress.xp_in_current_level} XP
          </Text>
        </View>
        
        {/* Enhanced XP Progress Bar */}
        <XPProgressBar
          variant="detailed"
          size="large"
          showText={true}
          showLevel={true}
          showProgress={true}
          showPending={true}
          animated={true}
          showSegments={false}
          className="mb-6"
        />
        
        {/* Level Insights Grid */}
        <View className="flex-row gap-4">
          <View className="flex-1 items-center">
            <Text className={cn(
              "text-sm font-medium mb-2",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Level Progress</Text>
            <View className="bg-green-500 rounded-xl px-4 py-2">
              <Text className="text-white text-lg font-bold">
                {Math.round(xpProgress.progress_percentage)}%
              </Text>
            </View>
          </View>
          <View className="flex-1 items-center">
            <Text className={cn(
              "text-sm font-medium mb-2",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>To Next Level</Text>
            <View className="bg-orange-500 rounded-xl px-4 py-2">
              <Text className="text-white text-lg font-bold">
                {xpProgress.xp_to_next_level} XP
              </Text>
            </View>
          </View>
          <View className="flex-1 items-center">
            <Text className={cn(
              "text-sm font-medium mb-2",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Level Title</Text>
            <View className="bg-purple-500 rounded-xl px-4 py-2">
              <Text className="text-white text-lg font-bold">
                {XPSystemUtils.getLevelTitle(currentLevel)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// Desktop Current Goals
const DesktopCurrentGoals: React.FC<{ achievementData: any }> = ({ achievementData }) => {
  const { isDark } = useTheme();
  
  return (
    <View className="mb-8">
      <Text className={cn(
        "text-2xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🎯 Current Goals</Text>
      
      <View className="flex-row flex-wrap gap-4">
        {achievementData?.achievements.slice(0, 3).map((achievement: any) => (
          <View key={achievement.id} className="flex-1 min-w-[300px]">
            <EnhancedGoalCard achievement={achievement} />
          </View>
        ))}
      </View>
    </View>
  );
};

// Enhanced Goal Card for Desktop
const EnhancedGoalCard: React.FC<{ achievement: any }> = ({ achievement }) => {
  const { isDark } = useTheme();
  
  const progressPercentage = (achievement.progress / achievement.maxProgress) * 100;
  
  return (
    <View className={cn(
      "p-6 rounded-xl border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl">{achievement.icon || '🎯'}</Text>
        <View className="bg-indigo-500 rounded-lg px-3 py-1">
          <Text className="text-white text-sm font-bold">{achievement.xpReward} XP</Text>
        </View>
      </View>
      
      <Text className={cn(
        "text-lg font-bold mb-2",
        isDark ? "text-white" : "text-gray-900"
      )}>{achievement.title}</Text>
      
      <Text className={cn(
        "text-sm mb-4 leading-5",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{achievement.description}</Text>
      
      <View className="mb-2">
        <View className="flex-row justify-between mb-2">
          <Text className={cn(
            "text-sm font-medium",
            isDark ? "text-slate-300" : "text-gray-700"
          )}>Progress</Text>
          <Text className={cn(
            "text-sm font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}>{achievement.progress} / {achievement.maxProgress}</Text>
        </View>
                 <View className={cn(
           "h-2 rounded-full overflow-hidden",
           isDark ? "bg-slate-600" : "bg-gray-200"
         )}>
           <View 
             className="h-full bg-indigo-500 rounded-full"
             style={{ width: `${progressPercentage}%` }}
           />
         </View>
       </View>
    </View>
  );
};

// Desktop Feature Unlocks Sidebar
const DesktopFeatureUnlocks: React.FC<{ currentLevel: number }> = ({ currentLevel }) => {
  const { isDark } = useTheme();
  
  return (
    <View className="h-full">
      <Text className={cn(
        "text-xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🔓 Unlocked Features</Text>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          {XPSystemUtils.getFeaturesUnlockedAtLevel(currentLevel).map((feature: string, index: number) => (
            <View key={index} className={cn(
              "rounded-xl p-4 border border-l-4 border-l-green-500",
              isDark ? "bg-green-900/20 border-green-600/30" : "bg-green-50 border-green-200"
            )}>
              <Text className={cn(
                "font-semibold",
                isDark ? "text-green-400" : "text-green-700"
              )}>✅ {feature}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Desktop Discover Grid
const DesktopDiscoverGrid: React.FC<{ achievementData: any }> = ({ achievementData }) => {
  const { isDark } = useTheme();
  
  return (
    <View>
      <Text className={cn(
        "text-2xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🔍 Available Achievements</Text>
      
      <View className="flex-row flex-wrap gap-6">
        {achievementData?.achievements.map((achievement: any) => (
          <View key={achievement.id} className="flex-1 min-w-[400px] max-w-[500px]">
            <DesktopAchievementCard achievement={achievement} />
          </View>
        ))}
      </View>
    </View>
  );
};

// Desktop Achievement Card
const DesktopAchievementCard: React.FC<{ achievement: any }> = ({ achievement }) => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "p-6 rounded-xl border transition-all",
      isDark 
        ? "bg-slate-800 border-slate-600 hover:bg-slate-700" 
        : "bg-white border-gray-200 hover:bg-gray-50"
    )}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-3xl">{achievement.icon || '🏆'}</Text>
        {achievement.completed && (
          <View className="bg-green-500 rounded-full w-8 h-8 items-center justify-center">
            <Text className="text-white font-bold">✓</Text>
          </View>
        )}
      </View>
      
      <Text className={cn(
        "text-lg font-bold mb-2",
        isDark ? "text-white" : "text-gray-900"
      )}>{achievement.title}</Text>
      
      <Text className={cn(
        "text-sm mb-4 leading-5",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{achievement.description}</Text>
      
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-3">
          <View className="bg-green-500 rounded-lg px-3 py-1">
            <Text className="text-white text-sm font-bold">
              {achievement.xpReward} XP
            </Text>
          </View>
          <View className={cn(
            "rounded-lg px-3 py-1",
            achievement.difficulty === 'easy' ? "bg-blue-100" :
            achievement.difficulty === 'medium' ? "bg-orange-100" :
            achievement.difficulty === 'hard' ? "bg-red-100" : "bg-purple-100"
          )}>
            <Text className={cn(
              "text-sm font-semibold",
              achievement.difficulty === 'easy' ? "text-blue-700" :
              achievement.difficulty === 'medium' ? "text-orange-700" :
              achievement.difficulty === 'hard' ? "text-red-700" : "text-purple-700"
            )}>
              {achievement.difficulty.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// Desktop Gallery Layout
const DesktopGalleryLayout: React.FC<{ achievementData: any }> = ({ achievementData }) => {
  const { isDark } = useTheme();
  
  return (
    <View>
      <Text className={cn(
        "text-2xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🏆 Your Trophies</Text>
      
      {/* Stats Cards */}
      <View className="flex-row gap-6 mb-8">
        <View className="flex-1">
          <EnhancedStatCard
            title="Completed"
            value={achievementData?.stats.completedAchievements || 0}
            icon="🏆"
            color="green"
          />
        </View>
        <View className="flex-1">
          <EnhancedStatCard
            title="XP Earned"
            value={achievementData?.stats.totalXPFromAchievements || 0}
            icon="⭐"
            color="purple"
          />
        </View>
        <View className="flex-1">
          <EnhancedStatCard
            title="Current Streak"
            value={achievementData?.stats.currentStreak || 0}
            icon="🔥"
            color="orange"
          />
        </View>
      </View>

      {/* Completed Achievements Grid */}
      <View className="flex-row flex-wrap gap-4">
        {achievementData?.achievements.filter((a: any) => a.completed).map((achievement: any) => (
          <View key={achievement.id} className="flex-1 min-w-[350px]">
            <CompletedAchievementCard achievement={achievement} />
          </View>
        ))}
      </View>
    </View>
  );
};

// Enhanced Stat Card for Desktop
const EnhancedStatCard: React.FC<{
  title: string;
  value: number;
  icon: string;
  color: 'green' | 'purple' | 'orange';
}> = ({ title, value, icon, color }) => {
  const { isDark } = useTheme();
  
  const colorMap = {
    green: isDark ? 'bg-green-900/20 border-green-600/30' : 'bg-green-50 border-green-200',
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
      </View>
      
      <Text className={cn(
        "text-3xl font-bold mb-2",
        isDark ? "text-white" : "text-gray-900"
      )}>{value}</Text>
      
      <Text className={cn(
        "text-sm font-medium",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{title}</Text>
    </View>
  );
};

// Completed Achievement Card
const CompletedAchievementCard: React.FC<{ achievement: any }> = ({ achievement }) => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "rounded-xl p-4 border border-l-4 border-l-green-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3">
        <Text className="text-2xl font-semibold mr-3">{achievement.icon}</Text>
        <Text className={cn(
          "text-lg font-bold flex-1",
          isDark ? "text-white" : "text-gray-900"
        )}>{achievement.title}</Text>
        <View className="bg-green-500 rounded-lg px-3 py-1">
          <Text className="text-white text-sm font-bold">{achievement.xpReward} XP</Text>
        </View>
      </View>
      <Text className={cn(
        "text-sm",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>
        Completed {achievement.completedAt && new Date(achievement.completedAt).toLocaleDateString()}
      </Text>
    </View>
  );
};

// Tablet Achievements Content
export const TabletAchievementsContent: React.FC<{
  selectedTab: string;
  achievementData: any;
  renderTabContent: () => React.ReactNode;
}> = ({ selectedTab, achievementData, renderTabContent }) => {
  if (selectedTab === 'discover' || selectedTab === 'gallery') {
    return (
      <View className="gap-6 px-6">
        {/* Use grid layouts for tablets */}
        {renderTabContent()}
      </View>
    );
  }
  
  return (
    <View className="flex-1 px-6">
      {renderTabContent()}
    </View>
  );
}; 