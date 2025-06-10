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
import { useRouter } from 'expo-router';
import { useXPContext } from '~/context/XPContext';
import SimpleSwipeCard from '~/components/approvals/SimpleSwipeCard';
import StreamlinedApprovalCard from '~/components/approvals/StreamlinedApprovalCard';
import EmptyState from '~/components/EmptyState';
import DebugPanel from '~/components/common/DebugPanel';
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
import { useXPSystem } from '~/hooks/useXPSystem';
import { XPSystemUtils, XP_REWARDS } from '~/constants/XPSystem';
import { ResponsiveTabLayout } from '~/components/common/ResponsiveTabLayout';
import { DesktopApprovalsContent, TabletApprovalsContent } from '~/components/common/DesktopApprovalsComponents';
import { useResponsiveDesign } from '~/utils/responsive';


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
  const responsive = useResponsiveDesign();
  const { xpProgress, currentLevel, currentXP, awardXP } = useXPSystem();
  const { getNextCelebration, showCelebration } = useXPContext();
  
  // Mascot state management
  const { cheeringState, triggerCheering } = useMascotCheering();
  const mascotStage = getMascotStageByLevel(currentLevel);
  
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals);
  const [selectedFilter, setSelectedFilter] = useState('smart');
  const [refreshing, setRefreshing] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const router = useRouter();

  // Animation refs for each tab
  const scaleAnimations = useRef(
    approvalTabs.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  const handleApprove = useCallback(async (approval: Approval) => {
    // Handle regular approval - award XP for engagement
    const approvalXP = 15; // Standard approval XP
    
    try {
      await awardXP(approvalXP, 'Task Approval', 'productivity');
      console.log('✅ [Unified XP] Task approval XP awarded:', approvalXP);
    } catch (error) {
      console.error('❌ Failed to award approval XP:', error);
    }
    
    // Remove from list immediately
    setApprovals(prev => prev.filter(a => a.id !== approval.id));
    
    // Trigger mascot cheering for approval
    triggerCheering(CheeringTrigger.TASK_COMPLETE);
  }, [awardXP, triggerCheering]);

  const handleReject = useCallback(async (approval: Approval) => {
    // Handle regular approval rejection - still award some XP for engagement
    const engagementXP = 5; // Small XP for engagement even when declining
    
    try {
      await awardXP(engagementXP, 'Task Review', 'productivity');
      console.log('✅ [Unified XP] Task decline XP awarded:', engagementXP);
    } catch (error) {
      console.error('❌ Failed to award decline XP:', error);
    }
    
    // Remove from list immediately
    setApprovals(prev => prev.filter(a => a.id !== approval.id));
    
    // Trigger mascot cheering for engagement
    triggerCheering(CheeringTrigger.TASK_COMPLETE);
  }, [awardXP, triggerCheering]);

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

  // AI-powered filtering logic
  const getAIFilteredTasks = (approvals: Approval[], filter: string): Approval[] => {
    switch (filter) {
      case 'easy':
        // Easy wins - prioritize low complexity items for momentum
        return approvals
          .filter(approval => approval.priority === 'low')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
      case 'smart':
        // AI-curated recommendations (mix of priorities for balance)
        return approvals
          .sort((a, b) => {
            const getSmartScore = (approval: Approval): number => {
              let score = 0;
              if (approval.priority === 'medium') score += 5; // Balanced difficulty
              if (approval.priority === 'high') score += 3; // Still important
              if (approval.priority === 'low') score += 2; // Easy wins
              return score;
            };
            return getSmartScore(b) - getSmartScore(a);
          });
          
      case 'complex':
        // Items needing more context - high complexity approvals
        return approvals
          .filter(approval => approval.priority === 'high')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
      case 'priority':
        // AI suggests high-impact items (high priority first, then by recency)
        return approvals
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          
      default:
        return approvals;
    }
  };

  const filteredApprovals = getAIFilteredTasks(approvals, selectedFilter);

  // Updated stats for AI-focused tabs
  const stats = {
    easy: getAIFilteredTasks(approvals, 'easy').length,
    smart: getAIFilteredTasks(approvals, 'smart').length,
    complex: getAIFilteredTasks(approvals, 'complex').length,
    priority: getAIFilteredTasks(approvals, 'priority').length,
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
        <DesktopApprovalsContent
          filteredTasks={filteredApprovals}
          handleApprove={handleApprove}
          handleReject={handleReject}
          selectedFilter={selectedFilter}
          stats={stats}
        />
      );
    }
    
    if (responsive.effectiveIsTablet) {
      return (
        <TabletApprovalsContent
          filteredTasks={filteredApprovals}
          handleApprove={handleApprove}
          handleReject={handleReject}
        />
      );
    }
    
    return (
      <View className="flex-1">
        {filteredApprovals.length === 0 ? (
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
            data={filteredApprovals}
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

  const renderItem = ({ item }: { item: Approval }) => (
    <View className="mb-2">
      <SimpleSwipeCard
        onSwipeLeft={() => handleReject(item)}
        onSwipeRight={() => handleApprove(item)}
      >
        <StreamlinedApprovalCard
          approval={item} 
          onPress={() => {
            console.log('Navigating to task details:', item.id);
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

  // Use responsive layout for browsers (including mobile) and larger screens
  if (responsive.shouldUseResponsiveLayout) {
    // Header component for tablet/desktop
    const ApprovalsHeader = () => (
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
        tabs={approvalTabs}
        selectedTab={selectedFilter}
        onTabPress={handleTabPress}
        scaleAnimations={scaleAnimations}
        header={<ApprovalsHeader />}
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
        {filteredApprovals.length === 0 ? (
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
            data={filteredApprovals}
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