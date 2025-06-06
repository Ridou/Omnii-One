import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  Platform,
  Linking,
  FlatList,
} from 'react-native';
import { Link } from 'expo-router';
import { cn } from '~/utils/cn';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { useOnboardingContext } from '~/context/OnboardingContext';
import { useRouter } from 'expo-router';
import { useXPContext } from '~/context/XPContext';
import SimpleSwipeCard from '~/components/approvals/SimpleSwipeCard';
import StreamlinedApprovalCard from '~/components/approvals/StreamlinedApprovalCard';
import EmptyState from '~/components/EmptyState';
import DebugPanel from '~/components/common/DebugPanel';
import ContextualNudge from '~/components/common/ContextualNudge';
import { Mascot, MascotContainer, useMascotCheering } from '~/components/common/Mascot';
import { XPProgressBar } from '~/components/common/XPProgressBar';
import { 
  MascotStage, 
  MascotSize, 
  CheeringTrigger, 
  getMascotStageByLevel 
} from '~/types/mascot';
import { AppColors } from '~/constants/Colors';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import type { OnboardingQuote, LevelProgression } from '~/types/onboarding';
import { useXPSystem } from '~/hooks/useXPSystem';
import { XPSystemUtils, XP_REWARDS } from '~/constants/XPSystem';


const { width: screenWidth } = Dimensions.get('window');

interface Approval {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  requested_by: string;
  type: string;
}

// Unified task interface for both approvals and onboarding quotes
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  requested_by: string;
  type: 'approval' | 'onboarding_quote';
  quote?: OnboardingQuote; // For onboarding quotes
  approval?: Approval; // For regular approvals
}

// Tab configuration with AI-focused productivity patterns (Shape of AI inspired)
const approvalTabs = [
  {
    key: 'easy',
    label: 'Easy',
    icon: '⚡',
    gradient: ['#4ECDC4', '#44A08D'], // Light teal for easy
    description: 'Easy'
  },
  {
    key: 'smart',
    label: 'Smart',
    icon: '🤖',
    gradient: ['#667eea', '#764ba2'], // Purple for AI
    description: 'Smart'
  },
  {
    key: 'complex',
    label: 'Complex',
    icon: '📝',
    gradient: ['#FF7043', '#FF5722'], // Orange for attention
    description: 'Complex'
  },
  {
    key: 'priority',
    label: 'Priority',
    icon: '🔥',
    gradient: ['#FF3B30', '#DC143C'], // Red for urgent
    description: 'Priority'
  }
];

// Mock data for testing - Adding back for stable state
const mockApprovals: Approval[] = [
  {
    id: '1',
    title: 'Production Database Access Request',
    description: 'Request to grant read-only access to production database for troubleshooting issues.',
    priority: 'high',
    created_at: '2025-03-15T10:30:00Z',
    requested_by: 'Sarah Johnson',
    type: 'Access Request',
  },
  {
    id: '2',
    title: 'Marketing Campaign Budget Increase',
    description: 'Request to increase Q2 marketing campaign budget by 15% to expand reach.',
    priority: 'medium',
    created_at: '2025-03-14T14:45:00Z',
    requested_by: 'Michael Rodriguez',
    type: 'Budget Request',
  },
  {
    id: '3',
    title: 'New Hire Equipment Procurement',
    description: 'Request to approve equipment purchase for new software developer joining next month.',
    priority: 'low',
    created_at: '2025-03-13T09:15:00Z',
    requested_by: 'Emma Chen',
    type: 'Procurement',
  },
];

export default function ApprovalsScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const {
    state: onboardingState,
    startOnboarding,
    recordQuoteResponse,
    getCurrentQuote,
    isOnboardingComplete,
    completeOnboarding,
    isSystemReady,
  } = useOnboardingContext();
  const { xpProgress, currentLevel, currentXP, awardXP } = useXPSystem();
  const { recordFeatureVisit, getNextCelebration, showCelebration } = useXPContext();
  
  // Mascot state management
  const { cheeringState, triggerCheering } = useMascotCheering();
  const mascotStage = getMascotStageByLevel(currentLevel);
  
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals);
  const [selectedFilter, setSelectedFilter] = useState('smart');
  const [refreshing, setRefreshing] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  // OPTIMISTIC UPDATES: Track pending XP for instant UI feedback - managed by XP system
  const [pendingXP, setPendingXP] = useState(0);
  // PREVENT RECURSIVE AUTO-START: Track if we've already attempted to start
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);
  const router = useRouter();

  // Record feature visit for exploration tracking
  useEffect(() => {
    recordFeatureVisit('approvals');
  }, []);

  // AUTO-START ONBOARDING: Start onboarding when system is ready and conditions are met
  useEffect(() => {
    // PROPER SYSTEM CHECK: Use the context's system readiness indicator
    const shouldAutoStart = 
      isSystemReady && // System ready (quotes loaded, server synced, no errors)
      user && // User authenticated
      !onboardingState.isActive && // Not already active
      !onboardingState.onboardingData.completed && // Server: Not completed
      currentLevel < 5; // Server: Level 1-4 (fixed to exclude level 5 - onboarding completes AT level 5)

    console.log('🚀 AUTO-START CHECK (Fixed Level 1-4):', {
      isSystemReady,
      user: !!user,
      userEmail: user?.email,
      serverLevel: currentLevel,
      serverXP: currentXP,
      serverCompleted: onboardingState.onboardingData.completed,
      isActive: onboardingState.isActive,
      shouldAutoStart,
      autoStartAttempted,
      decision: !shouldAutoStart ? (() => {
        if (!isSystemReady) return 'System not ready (quotes loading or server sync pending)';
        if (!user) return 'No user authenticated';
        if (onboardingState.isActive) return 'Onboarding already active';
        if (onboardingState.onboardingData.completed) return 'Server: Onboarding completed';
        if (currentLevel >= 5) return 'Server: Level 5+ reached (onboarding completes at Level 5)';
        return 'Unknown reason';
      })() : autoStartAttempted ? 'Already attempted this session' : 'SERVER VALIDATED: Starting/Continuing onboarding for Level 1-4'
    });

    if (shouldAutoStart && !autoStartAttempted) {
      console.log('🚀 AUTO-START: Clean server-driven onboarding start (Level 1-4)', {
        userEmail: user.email,
        serverLevel: currentLevel,
        serverXP: currentXP,
        reason: 'System ready + Server confirms onboarding needed (Level 1-4)'
      });
      
      startOnboarding();
      setAutoStartAttempted(true);
    }
  }, [
    isSystemReady, // NEW: Proper system readiness check
    user?.id, 
    onboardingState.onboardingData.completed,
    currentXP,
    onboardingState.isActive,
    currentLevel,
    startOnboarding,
    autoStartAttempted
  ]);

  // RESET AUTO-START ATTEMPT: When server state changes significantly
  useEffect(() => {
    // Reset the auto-start attempt flag when server state changes
    // This allows re-attempting auto-start if server state changes (like after reset)
    console.log('🔄 Resetting auto-start attempt due to server state change');
    setAutoStartAttempted(false);
  }, [user?.id, onboardingState.onboardingData.completed, currentLevel]);

  // OPTIMISTIC CLEANUP: Clear pending XP when server responds
  useEffect(() => {
    // Clear ALL pending XP when any server XP update comes in
    if (pendingXP > 0) {
      console.log('🧹 CLEARING pending XP:', pendingXP, '→ 0 (server updated)');
      
      // LEVEL PROGRESSION FEEDBACK: Show progress toward next level
      const levelRequirements: Record<number, number> = {
        1: 0, 2: 100, 3: 200, 4: 320, 5: 450, 6: 750, 7: 1100, 8: 1500
      };
      const nextLevelXP = levelRequirements[currentLevel + 1] || 0;
      const xpNeeded = nextLevelXP - currentXP;
      
      console.log('📈 LEVEL PROGRESS UPDATE:', {
        currentLevel,
        currentXP,
        nextLevelAt: nextLevelXP,
        xpNeeded: xpNeeded > 0 ? xpNeeded : 0,
        progress: nextLevelXP > 0 ? `${Math.round((currentXP / nextLevelXP) * 100)}%` : '100%',
        nextUnlock: currentLevel === 1 ? 'Achievements (Level 2)' :
                   currentLevel === 2 ? 'Chat & Voice (Level 3)' :
                   currentLevel === 3 ? 'Analytics (Level 4)' :
                   currentLevel === 4 ? 'Profile & ALL CORE FEATURES (Level 5)' :
                   currentLevel === 5 ? 'Onboarding Complete!' :
                   'Advanced Features'
      });
      
      setPendingXP(0);
    }
  }, [currentXP, onboardingState.onboardingData.onboarding_xp, currentLevel]);

  // Animation refs for each tab (SIMPLIFIED - no more glow effects)
  const scaleAnimations = useRef(
    approvalTabs.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  // Helper function to convert onboarding quote to task
  const quoteToTask = (quote: OnboardingQuote): Task => ({
    id: `quote_${quote.quote_id}`,
    title: quote.text,
    description: `— ${quote.author}`,
    priority: quote.difficulty === 'beginner' ? 'low' : quote.difficulty === 'intermediate' ? 'medium' : 'high',
    created_at: new Date().toISOString(),
    requested_by: 'Daily Inspiration',
    type: 'onboarding_quote',
    quote,
  });

  // Helper function to convert approval to task
  const approvalToTask = (approval: Approval): Task => ({
    id: approval.id,
    title: approval.title,
    description: approval.description,
    priority: approval.priority,
    created_at: approval.created_at,
    requested_by: approval.requested_by,
    type: 'approval',
    approval,
  });

  // Check if onboarding should show (stop at Level 5)
  const shouldShowOnboarding = onboardingState.isActive && !onboardingState.onboardingData.completed && currentLevel < 5;

  // Get current items to display
  const getCurrentItems = useCallback((): Task[] => {
    const items: Task[] = [];
    
    // Add regular approvals using helper function
    items.push(...approvals.map(approvalToTask));

    // Add onboarding quote if active and before Level 5 (game starts at Level 5)
    if (shouldShowOnboarding) {
      const currentQuote = getCurrentQuote();
      if (currentQuote) {
        items.push(quoteToTask(currentQuote));
      }
    }

    return items;
  }, [approvals, shouldShowOnboarding, getCurrentQuote]);

  const handleApprove = useCallback(async (task: Task) => {
    if (task.type === 'onboarding_quote' && task.quote) {
      // Use unified XP system directly with proper constants
      const baseXP = XP_REWARDS.QUOTE_APPROVAL; // 10 XP from constants
      const engagementBonus = XP_REWARDS.QUOTE_INTERACTION; // 3 XP from constants  
      const totalXP = baseXP + engagementBonus; // 13 XP total
      
      // OPTIMISTIC UPDATE: Match actual unified system amounts
      setPendingXP(prev => prev + totalXP);
      
      // Trigger mascot cheering for approval
      triggerCheering(CheeringTrigger.TASK_COMPLETE);
      
      // Award XP directly through unified system
      try {
        await awardXP(totalXP, 'Quote Approval', 'onboarding');
        console.log('✅ [Unified XP] Quote approval XP awarded:', totalXP);
        
        // Clear optimistic update since unified system handles real updates
        setPendingXP(prev => Math.max(0, prev - totalXP));
        
        // Still record the quote response for tracking (without XP duplication)
        const timeSpent = Math.round(Math.random() * 3000 + 1000);
        // Note: recordQuoteResponse may also award XP, but unified system will handle deduplication
        await recordQuoteResponse(task.quote.quote_id, 'approve', timeSpent);
        
      } catch (error) {
        // Revert optimistic update on error
        console.log('❌ Approve failed, reverting optimistic XP:', totalXP);
        setPendingXP(prev => Math.max(0, prev - totalXP));
      }
      
    } else if (task.type === 'approval' && task.approval) {
      // Handle regular approval - award XP for engagement
      const approvalXP = 15; // Standard approval XP
      
      try {
        await awardXP(approvalXP, 'Task Approval', 'productivity');
        console.log('✅ [Unified XP] Task approval XP awarded:', approvalXP);
      } catch (error) {
        console.error('❌ Failed to award approval XP:', error);
      }
      
      // Remove from list immediately
      setApprovals(prev => prev.filter(a => a.id !== task.approval!.id));
      
      // Trigger mascot cheering for approval
      triggerCheering(CheeringTrigger.TASK_COMPLETE);
    }
  }, [awardXP, recordQuoteResponse, triggerCheering]);

  const handleReject = useCallback(async (task: Task) => {
    if (task.type === 'onboarding_quote' && task.quote) {
      // Use unified XP system directly with proper constants
      const baseXP = XP_REWARDS.QUOTE_DECLINE; // 5 XP from constants
      const engagementBonus = XP_REWARDS.QUOTE_INTERACTION; // 3 XP from constants
      const totalXP = baseXP + engagementBonus; // 8 XP total
      
      // OPTIMISTIC UPDATE: Match actual unified system amounts
      setPendingXP(prev => prev + totalXP);
      
      // Trigger mascot cheering for reject (still positive engagement)
      triggerCheering(CheeringTrigger.TASK_COMPLETE);
      
      // Award XP directly through unified system
      try {
        await awardXP(totalXP, 'Quote Decline', 'onboarding');
        console.log('✅ [Unified XP] Quote decline XP awarded:', totalXP);
        
        // Clear optimistic update since unified system handles real updates
        setPendingXP(prev => Math.max(0, prev - totalXP));
        
        // Still record the quote response for tracking (without XP duplication)
        const timeSpent = Math.round(Math.random() * 2000 + 800);
        // Note: recordQuoteResponse may also award XP, but unified system will handle deduplication
        await recordQuoteResponse(task.quote.quote_id, 'decline', timeSpent);
        
      } catch (error) {
        // Revert optimistic update on error
        console.log('❌ Decline failed, reverting optimistic XP:', totalXP);
        setPendingXP(prev => Math.max(0, prev - totalXP));
      }
      
    } else if (task.type === 'approval' && task.approval) {
      // Handle regular approval rejection - still award some XP for engagement
      const engagementXP = 5; // Small XP for engagement even when declining
      
      try {
        await awardXP(engagementXP, 'Task Review', 'productivity');
        console.log('✅ [Unified XP] Task decline XP awarded:', engagementXP);
      } catch (error) {
        console.error('❌ Failed to award decline XP:', error);
      }
      
      // Remove from list immediately
      setApprovals(prev => prev.filter(a => a.id !== task.approval!.id));
      
      // Trigger mascot cheering for engagement
      triggerCheering(CheeringTrigger.TASK_COMPLETE);
    }
  }, [awardXP, recordQuoteResponse, triggerCheering]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

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

  // Get current tasks and apply AI-focused filters
  const currentTasks = getCurrentItems();
  
  // AI-powered filtering logic
  const getAIFilteredTasks = (tasks: Task[], filter: string): Task[] => {
    switch (filter) {
      case 'easy':
        // Easy wins - prioritize low complexity items for momentum
        return tasks
          .filter(task => task.priority === 'low' || task.type === 'onboarding_quote')
          .sort((a, b) => {
            // Onboarding quotes are typically easier decisions
            if (a.type === 'onboarding_quote' && b.type !== 'onboarding_quote') return -1;
            if (b.type === 'onboarding_quote' && a.type !== 'onboarding_quote') return 1;
            return 0;
          });
          
      case 'smart':
        // AI-curated recommendations (mix of priorities, favor onboarding for learning)
        return tasks
          .sort((a, b) => {
            // Prioritize onboarding quotes for learning + medium priority for balance
            const getSmartScore = (task: Task): number => {
              let score = 0;
              if (task.type === 'onboarding_quote') score += 10; // Learning priority
              if (task.priority === 'medium') score += 5; // Balanced difficulty
              if (task.priority === 'high') score += 3; // Still important
              return score;
            };
            return getSmartScore(b) - getSmartScore(a);
          });
          
      case 'complex':
        // Items needing more context - high complexity or approval types
        return tasks
          .filter(task => task.priority === 'high' || task.type === 'approval')
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });
          
      case 'priority':
        // AI suggests high-impact items (high priority first, then by complexity)
        return tasks
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });
          
      default:
        return tasks;
    }
  };

  const filteredTasks = getAIFilteredTasks(currentTasks, selectedFilter);

  // Updated stats for AI-focused tabs
  const stats = {
    easy: getAIFilteredTasks(currentTasks, 'easy').length,
    smart: getAIFilteredTasks(currentTasks, 'smart').length,
    complex: getAIFilteredTasks(currentTasks, 'complex').length,
    priority: getAIFilteredTasks(currentTasks, 'priority').length,
  };

  // Enhanced Filter Tabs component with AI descriptions
  const FilterTabs = () => (
    <View className="flex-row px-5 pb-5 pt-2 gap-3">
      {approvalTabs.map((tab) => {
        const isActive = selectedFilter === tab.key;
        const count = stats[tab.key as keyof typeof stats];
        
        return (
          <TouchableOpacity
            key={tab.key}
            className="flex-1 h-24 rounded-xl overflow-hidden" // Increased height for description
            style={[
              isActive && {
                elevation: 4,
                shadowColor: tab.gradient[0],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }
            ]}
            onPress={() => handleTabPress(tab.key as 'easy' | 'smart' | 'complex' | 'priority')}
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
                  className="text-lg font-bold mb-0.5"
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

  const renderItem = ({ item }: { item: Task }) => (
    <View className="mb-2">
      <SimpleSwipeCard
        onSwipeLeft={() => handleReject(item)}
        onSwipeRight={() => handleApprove(item)}
      >
        <StreamlinedApprovalCard
          approval={item.approval || {
            id: item.id,
            title: item.title,
            description: item.description,
            priority: item.priority,
            created_at: item.created_at,
            requested_by: item.requested_by,
            type: item.type,
          }} 
          onPress={() => {
            if (item.type === 'approval') {
              console.log('Navigating to task details:', item.id);
              router.push(`/request/${item.id}`);
            }
            // Onboarding quotes are swipe-only - no tap action needed
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
            Please log in to view your approvals.
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
            )}>⏳ Approvals</Text>
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
              )}>No pending approvals at the moment. Great work!</Text>
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