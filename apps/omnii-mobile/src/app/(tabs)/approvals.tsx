import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { cn } from '~/utils/cn';
import { convertColorToClass } from '~/utils/colorMapping';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { useOnboardingContext } from '~/context/OnboardingContext';
import SimpleSwipeCard from '~/components/approvals/SimpleSwipeCard';
import StreamlinedApprovalCard from '~/components/approvals/StreamlinedApprovalCard';
import EmptyState from '~/components/EmptyState';
import DebugPanel from '~/components/common/DebugPanel';
import LevelCelebration from '~/components/onboarding/LevelCelebration';
import ContextualNudge from '~/components/common/ContextualNudge';
import { Mascot, MascotContainer, useMascotCheering } from '~/components/common/Mascot';
import { 
  MascotStage, 
  MascotSize, 
  CheeringTrigger, 
  getMascotStageByLevel 
} from '~/types/mascot';
import { AppColors } from '~/constants/Colors';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import type { OnboardingQuote, LevelProgression } from '~/types/onboarding';

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

// Tab configuration with gradient styling like achievements
const approvalTabs = [
  {
    key: 'pending',
    label: 'Pending',
    icon: '⏳',
    gradient: ['#667eea', '#764ba2'] // Purple gradient
  },
  {
    key: 'approved',
    label: 'Approved', 
    icon: '✅',
    gradient: ['#4ECDC4', '#44A08D'] // Teal gradient
  },
  {
    key: 'recent',
    label: 'Recent',
    icon: '📋',
    gradient: ['#FF7043', '#FF5722'] // NEW: Vibrant orange gradient
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: '📊',
    gradient: ['#FF3B30', '#DC143C'] // NEW: Clean red gradient
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
    getCurrentLevel,
    getXPProgressToNextLevel,
    getXPNeededForNextLevel,
    getNextCelebration,
    showCelebration,
    completeOnboarding,
    recordFeatureVisit,
    isSystemReady,
  } = useOnboardingContext();
  
  // Mascot state management
  const { cheeringState, triggerCheering } = useMascotCheering();
  const currentLevel = getCurrentLevel();
  const mascotStage = getMascotStageByLevel(currentLevel);
  
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [currentCelebration, setCurrentCelebration] = useState<LevelProgression | null>(null);
  // OPTIMISTIC UPDATES: Track pending XP for instant UI feedback
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
      getCurrentLevel() < 5; // Server: Level < 5

    console.log('🔍 AUTO-START CHECK (Clean & Proper):', {
      isSystemReady,
      user: !!user,
      userEmail: user?.email,
      serverLevel: getCurrentLevel(),
      serverXP: onboardingState.onboardingData.total_xp,
      serverCompleted: onboardingState.onboardingData.completed,
      isActive: onboardingState.isActive,
      shouldAutoStart,
      autoStartAttempted,
      decision: !shouldAutoStart ? (() => {
        if (!isSystemReady) return 'System not ready (quotes loading or server sync pending)';
        if (!user) return 'No user authenticated';
        if (onboardingState.isActive) return 'Onboarding already active';
        if (onboardingState.onboardingData.completed) return 'Server: Onboarding completed';
        if (getCurrentLevel() >= 5) return 'Server: Level 5+ reached (all core features unlocked)';
        return 'Unknown reason';
      })() : autoStartAttempted ? 'Already attempted this session' : 'SERVER VALIDATED: Continue onboarding to Level 5'
    });

    if (shouldAutoStart && !autoStartAttempted) {
      console.log('🚀 AUTO-START: Clean server-driven onboarding start', {
        userEmail: user.email,
        serverLevel: getCurrentLevel(),
        serverXP: onboardingState.onboardingData.total_xp,
        reason: 'System ready + Server confirms onboarding needed (Level < 5)'
      });
      
      startOnboarding();
      setAutoStartAttempted(true);
    }
  }, [
    isSystemReady, // NEW: Proper system readiness check
    user?.id, 
    onboardingState.onboardingData.completed,
    onboardingState.onboardingData.current_level,
    onboardingState.onboardingData.total_xp,
    onboardingState.isActive,
    getCurrentLevel,
    startOnboarding,
    autoStartAttempted
  ]);

  // RESET AUTO-START ATTEMPT: When server state changes significantly
  useEffect(() => {
    // Reset the auto-start attempt flag when server state changes
    // This allows re-attempting auto-start if server state changes (like after reset)
    console.log('🔄 Resetting auto-start attempt due to server state change');
    setAutoStartAttempted(false);
  }, [user?.id, onboardingState.onboardingData.completed, onboardingState.onboardingData.current_level]);

  // OPTIMISTIC CLEANUP: Clear pending XP when server responds
  useEffect(() => {
    // Clear ALL pending XP when any server XP update comes in
    if (pendingXP > 0) {
      console.log('🧹 CLEARING pending XP:', pendingXP, '→ 0 (server updated)');
      
      // LEVEL PROGRESSION FEEDBACK: Show progress toward next level
      const currentLevel = getCurrentLevel();
      const currentXP = onboardingState.onboardingData.total_xp;
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
                   'Advanced Features'
      });
      
      setPendingXP(0);
    }
  }, [onboardingState.onboardingData.total_xp, onboardingState.onboardingData.onboarding_xp, getCurrentLevel]);

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

  // Check if onboarding should show
  const shouldShowOnboarding = onboardingState.isActive && !onboardingState.onboardingData.completed && getCurrentLevel() < 5;

  // Get current items to display
  const getCurrentItems = useCallback((): Task[] => {
    const items: Task[] = [];
    
    // Add regular approvals using helper function
    items.push(...approvals.map(approvalToTask));

    // Add onboarding quote if active and before Level 5
    if (shouldShowOnboarding) {
      const currentQuote = getCurrentQuote();
      if (currentQuote) {
        items.push(quoteToTask(currentQuote));
      }
    }

    return items;
  }, [approvals, shouldShowOnboarding, getCurrentQuote]);

  // Handle level celebrations
  useEffect(() => {
    const nextCelebration = getNextCelebration();
    if (nextCelebration && !showCelebrationModal) {
      setCurrentCelebration(nextCelebration);
      setShowCelebrationModal(true);
    }
  }, [onboardingState.celebrationQueue]);

  const handleApprove = useCallback(async (task: Task) => {
    if (task.type === 'onboarding_quote' && task.quote) {
      // OPTIMISTIC UPDATE: Match actual server XP amounts for accurate feedback
      const expectedXP = 26; // Actual server amount (20 base + 5.5 engagement rounded up)
      setPendingXP(prev => prev + expectedXP);
      
      // Trigger mascot cheering for approval
      triggerCheering(CheeringTrigger.TASK_COMPLETE);
      
      // Handle onboarding quote approval silently
      const timeSpent = Math.round(Math.random() * 3000 + 1000); // 1-4 seconds realistic time, rounded to integer
      
      try {
        await recordQuoteResponse(task.quote.quote_id, 'approve', timeSpent);
        // Server response should trigger the useEffect that clears pending XP
        console.log('✅ Approve response complete - pending XP should be cleared by useEffect');
      } catch (error) {
        // Revert optimistic update on error
        console.log('❌ Approve failed, reverting optimistic XP:', expectedXP);
        setPendingXP(prev => Math.max(0, prev - expectedXP));
      }
      
      // No popup - just let it flow naturally
    } else if (task.type === 'approval' && task.approval) {
      // Handle regular approval silently - no ugly alert
      // Remove from list immediately
      setApprovals(prev => prev.filter(a => a.id !== task.approval!.id));
      
      // Trigger mascot cheering for approval
      triggerCheering(CheeringTrigger.TASK_COMPLETE);
    }
  }, [recordQuoteResponse, triggerCheering]);

  const handleReject = useCallback(async (task: Task) => {
    if (task.type === 'onboarding_quote' && task.quote) {
      // OPTIMISTIC UPDATE: Match actual server XP amounts for accurate feedback  
      const expectedXP = 14; // Actual server amount (8 base + 5.5 engagement rounded up)
      setPendingXP(prev => prev + expectedXP);
      
      // Trigger mascot cheering for reject (still positive engagement)
      triggerCheering(CheeringTrigger.TASK_COMPLETE);
      
      // Handle onboarding quote rejection silently
      const timeSpent = Math.round(Math.random() * 2000 + 800); // 0.8-2.8 seconds realistic time, rounded to integer
      
      try {
        await recordQuoteResponse(task.quote.quote_id, 'decline', timeSpent);
        // Server response should trigger the useEffect that clears pending XP
        console.log('✅ Decline response complete - pending XP should be cleared by useEffect');
      } catch (error) {
        // Revert optimistic update on error
        console.log('❌ Decline failed, reverting optimistic XP:', expectedXP);
        setPendingXP(prev => Math.max(0, prev - expectedXP));
      }
      
      // No popup - just let it flow naturally
    } else if (task.type === 'approval' && task.approval) {
      // Handle regular approval rejection silently - no ugly alert
      // Remove from list immediately
      setApprovals(prev => prev.filter(a => a.id !== task.approval!.id));
      
      // Trigger mascot cheering for engagement
      triggerCheering(CheeringTrigger.TASK_COMPLETE);
    }
  }, [recordQuoteResponse, triggerCheering]);

  const handleCelebrationComplete = () => {
    if (currentCelebration) {
      showCelebration(currentCelebration.id);
      setCurrentCelebration(null);
      
      // After celebration is complete, we can let nudges show
      console.log('🎉 Level celebration complete, nudges can now show');
    }
    setShowCelebrationModal(false);
  };

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

  // Get current tasks and apply filters
  const currentTasks = getCurrentItems();
  const filteredTasks = currentTasks.filter((task: Task) => {
    if (selectedFilter === 'all') return true;
    return task.priority === selectedFilter;
  });

  const stats = {
    all: currentTasks.length,
    high: currentTasks.filter((t: Task) => t.priority === 'high').length,
    medium: currentTasks.filter((t: Task) => t.priority === 'medium').length,
    low: currentTasks.filter((t: Task) => t.priority === 'low').length,
  };

  // REMOVED: Glow effects as requested - clean, professional design
  // Enhanced Filter Tabs component
  const FilterTabs = () => (
    <View className="flex-row px-5 pb-5 pt-2 gap-3">
      {approvalTabs.map((tab) => {
        const isActive = selectedFilter === tab.key;
        const count = stats[tab.key as keyof typeof stats];
        
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
            onPress={() => handleTabPress(tab.key as 'pending' | 'approved' | 'recent' | 'insights')}
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
                  className="text-xs font-bold text-white text-center mb-1"
                  style={{ 
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 1,
                  }}
                >
                  {tab.label}
                </Text>
                {count !== undefined && (
                  <View className="bg-black bg-opacity-20 rounded-full px-2 py-0.5">
                    <Text className="text-white text-xs font-bold">{count}</Text>
                  </View>
                )}
              </View>
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
            )}>⏳ Approvals</Text>
            <Text className={cn(
              "text-base",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Review and approve tasks</Text>
          </View>
          
          <View className="flex-row items-center gap-3">
            {/* Debug Button - Only show in development */}
            {__DEV__ && (
              <TouchableOpacity
                onPress={() => setShowDebugPanel(true)}
                className={cn(
                  "w-12 h-12 rounded-xl items-center justify-center border-2",
                  isDark 
                    ? "bg-slate-800 border-indigo-500/30" 
                    : "bg-white border-indigo-200"
                )}
                style={{
                  shadowColor: '#6366f1',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text className="text-lg">🔧</Text>
              </TouchableOpacity>
            )}
            
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

      {/* Level Celebration Modal */}
      {showCelebrationModal && currentCelebration && (
        <LevelCelebration
          visible={showCelebrationModal}
          levelProgression={currentCelebration}
          onComplete={handleCelebrationComplete}
        />
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