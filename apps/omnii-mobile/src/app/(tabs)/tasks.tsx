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
import { useCachedTasks } from '~/hooks/useCachedTasks';
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
  
  // ✅ FIXED: Use cached tasks for better performance and 37 cached tasks access
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
    totalPending,
    // Add cache performance metrics for debugging
    isCacheValid,
    cacheStats,
    lastFetchTime
  } = useCachedTasks();
  
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

  // ✅ Get cached tasks - should now show 37 tasks instead of 0
  const allTasks = getAllTasks();

  // ✅ Log cache performance for debugging
  console.log(`[TasksScreen] 🧠 Cache Status:`, {
    totalTasks,
    isCacheValid,
    cacheStats,
    lastFetchTime: lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString() : 'Never',
    allTasksCount: allTasks.length
  });

  // ✅ Convert Google Tasks TaskData to StreamlinedTaskCard expected Task format
  const convertTaskDataToTask = (taskData: TaskData) => {
    return {
      id: taskData.id,
      title: taskData.title,
      description: taskData.notes || taskData.title || 'No description available',
      priority: 'medium' as const, // Default priority since Google Tasks doesn't have this
      created_at: taskData.updated || new Date().toISOString(),
      requested_by: 'Google Tasks',
      type: 'google_task'
    };
  };

  const handleTaskApprove = useCallback(async (task: TaskData) => {
    // Handle real task approval - award XP for engagement
    const taskXP = 15; // Standard task XP
    
    try {
      await awardXP(taskXP, 'Task Approval', 'productivity');
    } catch (error) {
    }
    
    // TODO: Implement actual task completion via tRPC
    
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

  // Task list mapping - maps your Google Task lists to categories
  const getTaskListMapping = () => {
    if (!tasksOverview?.taskLists) {
      // Return default mapping structure to avoid undefined errors
      return {
        auto: [],
        collab: [],
        daily: [],
        goal: []
      };
    }
    
    const mapping: Record<string, string[]> = {
      auto: [],
      collab: [],
      daily: [],
      goal: []
    };
    
    // Map your actual Google Task lists to categories
    tasksOverview.taskLists.forEach(list => {
      const listTitle = list.title.toLowerCase();
      const listId = list.id;
      
      // Map based on list names (adjust these to match your actual list names)
      if (listTitle.includes('auto') || listTitle.includes('automation')) {
        mapping.auto?.push(listId);
      } else if (listTitle.includes('collab') || listTitle.includes('collaboration') || listTitle.includes('team')) {
        mapping.collab?.push(listId);
      } else if (listTitle.includes('daily') || listTitle.includes('routine') || listTitle.includes('habit')) {
        mapping.daily?.push(listId);
      } else if (listTitle.includes('goal') || listTitle.includes('project') || listTitle.includes('learn')) {
        mapping.goal?.push(listId);
      } else {
        // For now, distribute tasks evenly across categories for demo
        // You can create specific lists later
        const listIndex = tasksOverview.taskLists.indexOf(list);
        const categories = ['auto', 'collab', 'daily', 'goal'];
        const categoryKey = categories[listIndex % categories.length] as keyof typeof mapping;
        mapping[categoryKey]?.push(listId);
      }
    });
    
    return mapping;
  };

  // Filter tasks by their actual Google Task list
  const getTasksByList = (filter: string): TaskData[] => {
    if (!tasksOverview?.taskLists) return [];
    
    const listMapping = getTaskListMapping();
    const targetListIds = listMapping[filter as keyof typeof listMapping] || [];
    
    // Get all tasks from the target lists
    const tasks: TaskData[] = [];
    
    tasksOverview.taskLists.forEach(list => {
      if (targetListIds.includes(list.id)) {
        // Only include pending tasks
        const pendingTasks = list.tasks?.filter(task => task.status === 'needsAction') || [];
        tasks.push(...pendingTasks);
      }
    });
    
    // Sort by update time (most recent first)
    return tasks.sort((a, b) => {
      return new Date(b.updated || '').getTime() - new Date(a.updated || '').getTime();
    });
  };

  const filteredTasks = getTasksByList(selectedFilter);

  // Updated stats for list-based filtering using real Google Task lists
  const stats = {
    auto: getTasksByList('auto').length,
    collab: getTasksByList('collab').length,
    daily: getTasksByList('daily').length,
    goal: getTasksByList('goal').length,
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

  // Enhanced content rendering for desktop - Skip desktop/tablet components for now to avoid type conflicts
  const renderResponsiveContent = () => {
    // Skip desktop/tablet specific components for now to avoid TaskData vs Task type conflicts
    // These components expect a different Task type structure
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
          task={convertTaskDataToTask(item)} 
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