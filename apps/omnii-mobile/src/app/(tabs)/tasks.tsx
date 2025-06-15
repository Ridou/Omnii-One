import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity, Animated,
  Dimensions,
  RefreshControl,
  SafeAreaView, FlatList
} from 'react-native';
import { Link } from 'expo-router';
import { cn } from '~/utils/cn';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { useRouter } from 'expo-router';
import { useXPContext } from '~/context/XPContext';
import SimpleSwipeCard from '~/components/tasks/SimpleSwipeCard';
import StreamlinedTaskCard from '~/components/tasks/StreamlinedTaskCard';
import DebugPanel from '~/components/common/DebugPanel';
import { Mascot, MascotContainer, useMascotCheering } from '~/components/common/Mascot';
import { XPProgressBar } from '~/components/common/XPProgressBar';
import {
  MascotSize,
  CheeringTrigger,
  getMascotStageByLevel
} from '~/types/mascot';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useXPSystem } from '~/hooks/useXPSystem';
import { ResponsiveTabLayout } from '~/components/common/ResponsiveTabLayout';
import { DesktopTasksContent, TabletTasksContent } from '~/components/common/DesktopTasksComponents';
import { useResponsiveDesign } from '~/utils/responsive';
import { useTasks } from '~/hooks/useTasks';
import type { TaskData } from '@omnii/validators';

const { width: screenWidth } = Dimensions.get('window');

// Tab configuration with AI-focused productivity patterns (Shape of AI inspired)
const taskTabs = [
  {
    key: 'auto',
    label: 'Auto',
    icon: '🤖',
    gradient: ['#667eea', '#764ba2'], // Purple for AI automation
    description: 'Auto'
  },
  {
    key: 'collab',
    label: 'Collab',
    icon: '👥',
    gradient: ['#4ECDC4', '#44A08D'], // Teal for collaboration
    description: 'Collab'
  },
  {
    key: 'daily',
    label: 'Daily',
    icon: '📅',
    gradient: ['#FF7043', '#FF5722'], // Orange for daily tasks
    description: 'Daily'
  },
  {
    key: 'goal',
    label: 'Goal',
    icon: '🎯',
    gradient: ['#FF3B30', '#DC143C'], // Red for goal-oriented
    description: 'Goal'
  }
];

export default function TasksScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const responsive = useResponsiveDesign();
  const { xpProgress, currentLevel, currentXP, awardXP } = useXPSystem();
  const { getNextCelebration, showCelebration } = useXPContext();
  
  // Use real tRPC data instead of mock data
  const { 
    tasksOverview, 
    isLoading, 
    hasError, 
    errorMessage, 
    refetch,
    getAllTasks,
    getPendingTasks,
    totalTasks,
    totalCompleted,
    totalPending 
  } = useTasks();
  
  // Mascot state management
  const { cheeringState, triggerCheering } = useMascotCheering();
  const mascotStage = getMascotStageByLevel(currentLevel);
  
  const [selectedFilter, setSelectedFilter] = useState('auto');
  const [refreshing, setRefreshing] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const router = useRouter();

  // Animation refs for each tab
  const scaleAnimations = useRef(
    taskTabs.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  // Get real tasks from tRPC
  const allTasks = getAllTasks();

  const handleTaskApprove = useCallback(async (task: TaskData) => {
    // Handle real task approval - award XP for engagement
    const taskXP = 15; // Standard task XP
    
    try {
      await awardXP(taskXP, 'Task Approval', 'productivity');
    } catch (error) {
    }
    
    // TODO: Implement actual task completion via tRPC
    console.log('[TasksScreen] Task approved:', task.id);
    
    // Trigger mascot cheering for task completion
    triggerCheering(CheeringTrigger.TASK_COMPLETE);
    
    // Refresh tasks to get updated data
    refetch();
  }, [awardXP, triggerCheering, refetch]);

  const handleTaskReject = useCallback(async (task: TaskData) => {
    // Handle task rejection - still award some XP for engagement
    const engagementXP = 5; // Small XP for engagement even when declining
    
    try {
      await awardXP(engagementXP, 'Task Review', 'productivity');
    } catch (error) {
    }
    
    // TODO: Implement actual task deletion via tRPC  
    console.log('[TasksScreen] Task rejected:', task.id);
    
    // Trigger mascot cheering for engagement
    triggerCheering(CheeringTrigger.TASK_COMPLETE);
    
    // Refresh tasks to get updated data
    refetch();
  }, [awardXP, triggerCheering, refetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleTabPress = (tabKey: string) => {
    // Scale animation on press
    const scaleAnim = scaleAnimations[tabKey];
    
    if (scaleAnim) {
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
    }

    setSelectedFilter(tabKey);
  };

  // AI-powered filtering logic for real tasks
  const getAIFilteredTasks = (tasks: TaskData[], filter: string): TaskData[] => {
    if (!tasks || tasks.length === 0) return [];
    
    switch (filter) {
      case 'auto':
        // AI-automated recommendations - smart task suggestions
        return tasks
          .filter(task => task.status === 'needsAction') // Only pending tasks
          .sort((a, b) => {
            const getAutoScore = (task: TaskData): number => {
              let score = 0;
              // Prioritize tasks with due dates
              if (task.due) score += 5;
              // Favor tasks with notes/details
              if (task.notes && task.notes.length > 0) score += 3;
              // Recent tasks get priority
              const daysDiff = Math.floor((Date.now() - new Date(task.updated || task.created || '').getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff <= 1) score += 2;
              return score;
            };
            return getAutoScore(b) - getAutoScore(a);
          });
          
      case 'collab':
        // Collaborative tasks - items that might need coordination
        return tasks
          .filter(task => 
            task.status === 'needsAction' &&
            (task.title.toLowerCase().includes('meet') || 
             task.title.toLowerCase().includes('call') ||
             task.title.toLowerCase().includes('review') ||
             task.notes?.toLowerCase().includes('team') ||
             task.notes?.toLowerCase().includes('collaborate'))
          )
          .sort((a, b) => new Date(b.updated || b.created || '').getTime() - new Date(a.updated || a.created || '').getTime());
          
      case 'daily':
        // Daily tasks - tasks due today or overdue
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        return tasks
          .filter(task => {
            if (task.status !== 'needsAction') return false;
            if (!task.due) return false;
            const dueDate = new Date(task.due);
            return dueDate <= today; // Due today or overdue
          })
          .sort((a, b) => {
            const aDate = new Date(a.due || '');
            const bDate = new Date(b.due || '');
            return aDate.getTime() - bDate.getTime(); // Earliest due first
          });
          
      case 'goal':
        // Goal-oriented tasks - important tasks with clear outcomes
        return tasks
          .filter(task => 
            task.status === 'needsAction' &&
            (task.title.length > 20 || // Detailed titles suggest important tasks
             task.notes && task.notes.length > 50 || // Detailed notes
             task.due) // Tasks with deadlines are usually important
          )
          .sort((a, b) => {
            // Prioritize tasks with due dates, then by update time
            if (a.due && !b.due) return -1;
            if (!a.due && b.due) return 1;
            if (a.due && b.due) {
              return new Date(a.due).getTime() - new Date(b.due).getTime();
            }
            return new Date(b.updated || b.created || '').getTime() - new Date(a.updated || a.created || '').getTime();
          });
          
      default:
        return tasks.filter(task => task.status === 'needsAction');
    }
  };

  const filteredTasks = getAIFilteredTasks(allTasks, selectedFilter);

  // Updated stats for AI-focused tabs using real data
  const stats = {
    auto: getAIFilteredTasks(allTasks, 'auto').length,
    collab: getAIFilteredTasks(allTasks, 'collab').length,
    daily: getAIFilteredTasks(allTasks, 'daily').length,
    goal: getAIFilteredTasks(allTasks, 'goal').length,
  };

  // Enhanced Filter Tabs component with AI descriptions
  const FilterTabs = () => (
    <View className="flex-row px-5 pb-5 pt-2 gap-3">
      {taskTabs.map((tab) => {
        const isActive = selectedFilter === tab.key;
        const count = stats[tab.key as keyof typeof stats];
        
        return (
          <TouchableOpacity
            key={tab.key}
            className="flex-1 h-20 rounded-xl overflow-hidden" // Reduced from h-24 to h-20
            style={[
              isActive && {
                elevation: 4,
                shadowColor: tab.gradient[0],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }
            ]}
            onPress={() => handleTabPress(tab.key as 'auto' | 'collab' | 'daily' | 'goal')}
          >
            <Animated.View
              className="flex-1 relative overflow-hidden rounded-xl"
              style={{
                transform: scaleAnimations[tab.key] ? [{ scale: scaleAnimations[tab.key]! }] : [{ scale: 1 }],
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
              <View className="absolute inset-0 flex-1 justify-center items-center px-2" style={{ zIndex: 20 }}>
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
              
              {/* Aesthetic count badge in top-right corner */}
              {count !== undefined && count > 0 && (
                <View 
                  className="absolute top-2 right-2 w-5 h-5 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <Text className="text-white text-xs font-bold">{count}</Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Enhanced content rendering for desktop
  const renderResponsiveContent = () => {
    if (responsive.effectiveIsDesktop) {
      return (
        <DesktopTasksContent
          filteredTasks={filteredTasks}
          handleApprove={handleTaskApprove}
          handleReject={handleTaskReject}
          selectedFilter={selectedFilter}
          stats={stats}
        />
      );
    }
    
    if (responsive.effectiveIsTablet) {
      return (
        <TabletTasksContent
          filteredTasks={filteredTasks}
          handleApprove={handleTaskApprove}
          handleReject={handleTaskReject}
        />
      );
    }
    
    return (
      <View className="flex-1">
        {filteredTasks.length === 0 ? (
          <View className="flex-1 justify-center items-center px-5">
            <View className={cn(
              "rounded-xl p-8 items-center border max-w-sm",
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
            )}>
              <Text className="text-4xl mb-3">✅</Text>
              <Text className={cn(
                "font-semibold text-lg mb-2 text-center",
                isDark ? "text-white" : "text-gray-900"
              )}>All Caught Up!</Text>
              <Text className={cn(
                "text-sm text-center",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>No pending tasks at the moment. Great work!</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={isDark ? '#94a3b8' : '#6b7280'}
              />
            }
          />
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: TaskData }) => (
    <View className="mb-2">
      <SimpleSwipeCard
        onSwipeLeft={() => handleTaskReject(item)}
        onSwipeRight={() => handleTaskApprove(item)}
      >
        <StreamlinedTaskCard
          task={item} 
          onPress={() => {
            router.push(`/request/${item.id}`);
          }}
        />
      </SimpleSwipeCard>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView className={cn(
        "flex-1",
        isDark ? "bg-slate-900" : "bg-white"
      )}>
        <View className="flex-1 justify-center items-center p-6">
          <Text className={cn(
            "text-base text-center mt-4",
            isDark ? "text-white" : "text-gray-900"
          )}>
            Please log in to view your tasks.
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="bg-indigo-600 rounded-xl py-3 px-6 mt-4">
              <Text className="text-white text-base font-semibold">Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  // Use responsive layout for browsers (including mobile) and larger screens
  if (responsive.shouldUseResponsiveLayout) {
    // Header component for tablet/desktop
    const TasksHeader = () => (
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className={cn(
            "text-3xl font-bold mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>Tasks</Text>
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
        tabs={taskTabs}
        selectedTab={selectedFilter}
        onTabPress={handleTabPress}
        scaleAnimations={scaleAnimations}
        header={<TasksHeader />}
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
      {/* Header - RESTORED! */}
      <View className={cn(
        "px-5 py-4 border-b",
        isDark ? "border-slate-600" : "border-gray-200"
      )}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className={cn(
              "text-3xl font-bold mb-1",
              isDark ? "text-white" : "text-gray-900"
            )}>⏳ Tasks</Text>
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

      {/* Filter Tabs */}
      <FilterTabs />

      {/* Content */}
      <View className="flex-1">
        {filteredTasks.length === 0 ? (
          <View className="flex-1 justify-center items-center px-5">
            <View className={cn(
              "rounded-xl p-8 items-center border max-w-sm",
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
            )}>
              <Text className="text-4xl mb-3">✅</Text>
              <Text className={cn(
                "font-semibold text-lg mb-2 text-center",
                isDark ? "text-white" : "text-gray-900"
              )}>All Caught Up!</Text>
              <Text className={cn(
                "text-sm text-center",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>No pending tasks at the moment. Great work!</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={isDark ? '#94a3b8' : '#6b7280'}
              />
            }
          />
        )}
      </View>

      {/* Debug Button - Floating position for development */}
      {__DEV__ && (
        <TouchableOpacity
          onPress={() => setShowDebugPanel(true)}
          className={cn(
            "absolute bottom-6 right-6 w-12 h-12 rounded-full items-center justify-center border-2 shadow-lg",
            isDark 
              ? "bg-slate-800 border-indigo-500/30" 
              : "bg-white border-indigo-200"
          )}
          style={{
            shadowColor: '#6366f1',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Text className="text-lg">🔧</Text>
        </TouchableOpacity>
      )}

      {/* Debug Panel */}
      {__DEV__ && showDebugPanel && (
        <DebugPanel
          visible={showDebugPanel}
          onClose={() => setShowDebugPanel(false)}
        />
      )}
    </SafeAreaView>
  );
}