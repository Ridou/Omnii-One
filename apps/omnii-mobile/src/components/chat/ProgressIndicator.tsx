import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withTiming,
  interpolate,
  Easing 
} from 'react-native-reanimated';

interface AIProgressStage {
  stage: 'context_analysis' | 'rdf_processing' | 'response_generation' | 'task_creation' | 'completed' | 'idle';
  percentage: number;
  details: string;
  timestamp?: number;
  variations?: number;
  citations?: number;
}

interface ProgressIndicatorProps {
  isProcessing: boolean;
  currentStage?: AIProgressStage;
  stages?: AIProgressStage[];
  activeRequestCount?: number;
  queueLength?: number;
  onExpandToggle?: () => void;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isProcessing,
  currentStage,
  stages = [],
  activeRequestCount = 0,
  queueLength = 0,
  onExpandToggle
}) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Animations
  const pulseAnimation = useSharedValue(1);
  const rotationAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);

  useEffect(() => {
    if (isProcessing) {
      // Pulse animation for active processing
      pulseAnimation.value = withRepeat(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
      
      // Rotation animation
      rotationAnimation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1
      );
    } else {
      pulseAnimation.value = withSpring(1);
      rotationAnimation.value = withSpring(0);
    }
    
    // Update progress animation
    const targetProgress = currentStage?.percentage || 0;
    progressAnimation.value = withSpring(targetProgress / 100);
  }, [isProcessing, currentStage?.percentage]);

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
    onExpandToggle?.();
  };

  if (!isProcessing && stages.length === 0) {
    return null; // Don't show when idle and no history
  }

  return (
    <>
      {/* Header Progress Indicator */}
      <HeaderProgressButton
        isProcessing={isProcessing}
        currentStage={currentStage}
        activeRequestCount={activeRequestCount}
        queueLength={queueLength}
        onPress={handleToggleExpanded}
        pulseAnimation={pulseAnimation}
        rotationAnimation={rotationAnimation}
        progressAnimation={progressAnimation}
      />

      {/* Expanded Progress Modal */}
      <Modal
        visible={isExpanded}
        transparent
        animationType="fade"
        onRequestClose={handleToggleExpanded}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={handleToggleExpanded}
        >
          <View className="flex-1 justify-center items-center p-4">
            <Pressable onPress={(e) => e.stopPropagation()}>
              <ExpandedProgressView
                isProcessing={isProcessing}
                currentStage={currentStage}
                stages={stages}
                activeRequestCount={activeRequestCount}
                queueLength={queueLength}
                onClose={handleToggleExpanded}
              />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

// Header Button Component
const HeaderProgressButton: React.FC<{
  isProcessing: boolean;
  currentStage?: AIProgressStage;
  activeRequestCount?: number;
  queueLength?: number;
  onPress: () => void;
  pulseAnimation: Animated.SharedValue<number>;
  rotationAnimation: Animated.SharedValue<number>;
  progressAnimation: Animated.SharedValue<number>;
}> = ({ isProcessing, currentStage, activeRequestCount = 0, queueLength = 0, onPress, pulseAnimation, rotationAnimation, progressAnimation }) => {
  const { isDark } = useTheme();

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationAnimation.value}deg` }],
  }));

  const progressRingStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: '-90deg' },
      { scale: interpolate(progressAnimation.value, [0, 1], [0.8, 1]) }
    ],
  }));

  const getStageColor = () => {
    if (!isProcessing) return isDark ? '#64748b' : '#9ca3af';
    
    switch (currentStage?.stage) {
      case 'context_analysis': return '#3b82f6';
      case 'rdf_processing': return '#8b5cf6';
      case 'response_generation': return '#10b981';
      case 'task_creation': return '#f59e0b';
      case 'completed': return '#22c55e';
      default: return '#6366f1';
    }
  };

  const getStageIcon = () => {
    if (!isProcessing) return '🧠';
    
    switch (currentStage?.stage) {
      case 'context_analysis': return '🔍';
      case 'rdf_processing': return '⚡';
      case 'response_generation': return '✨';
      case 'task_creation': return '📋';
      case 'completed': return '✅';
      default: return '🤖';
    }
  };

  return (
    <Animated.View style={containerStyle}>
      <TouchableOpacity
        onPress={onPress}
        className={cn(
          "relative w-12 h-12 items-center justify-center rounded-full",
          isDark ? "bg-slate-800" : "bg-white",
          "shadow-lg border-2",
          isProcessing ? "border-indigo-500" : (isDark ? "border-slate-600" : "border-gray-200")
        )}
      >
        {/* Progress Ring */}
        {isProcessing && (
          <Animated.View 
            style={progressRingStyle}
            className="absolute inset-0"
          >
            <View 
              className="w-full h-full rounded-full border-2 border-transparent"
              style={{
                borderTopColor: getStageColor(),
                transform: [{ rotate: `${(currentStage?.percentage || 0) * 3.6}deg` }]
              }}
            />
          </Animated.View>
        )}

        {/* Icon */}
        <Animated.View style={iconStyle}>
          <Text className="text-lg">{getStageIcon()}</Text>
        </Animated.View>

        {/* Request Counter Badge */}
        {(isProcessing || queueLength > 0) && (
          <View className={cn(
            "absolute -bottom-1 -right-1 w-6 h-6 rounded-full items-center justify-center",
            "bg-indigo-600 border-2",
            isDark ? "border-slate-800" : "border-white"
          )}>
            <Text className="text-xs font-bold text-white">
              {activeRequestCount + queueLength}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Expanded Progress View
const ExpandedProgressView: React.FC<{
  isProcessing: boolean;
  currentStage?: AIProgressStage;
  stages: AIProgressStage[];
  activeRequestCount?: number;
  queueLength?: number;
  onClose: () => void;
}> = ({ isProcessing, currentStage, stages, activeRequestCount = 0, queueLength = 0, onClose }) => {
  const { isDark } = useTheme();

  const allStages = [
    { key: 'context_analysis', label: 'Context Analysis', icon: '🔍', description: 'Understanding your request and gathering relevant context' },
    { key: 'rdf_processing', label: 'Knowledge Processing', icon: '⚡', description: 'Processing semantic relationships and knowledge graphs' },
    { key: 'response_generation', label: 'Response Generation', icon: '✨', description: 'Generating intelligent response using AI models' },
    { key: 'task_creation', label: 'Task Integration', icon: '📋', description: 'Creating tasks and updating your workflow' }
  ];

  return (
    <View className={cn(
      "w-80 max-h-[500px] rounded-2xl shadow-2xl", // Increased height
      isDark ? "bg-slate-800 border border-slate-600" : "bg-white border border-gray-200"
    )}>
      {/* Header */}
      <View className="flex-row items-center justify-between p-6 pb-4">
        <View className="flex-row items-center">
          <Text className="text-xl mr-3">🤖</Text>
          <View>
            <Text className={cn(
              "text-lg font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>AI Processing</Text>
            <Text className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {activeRequestCount > 0 ? `${activeRequestCount} active` : 'Ready'} 
              {queueLength > 0 && ` • ${queueLength} queued`}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={onClose}>
          <Text className={cn(
            "text-2xl",
            isDark ? "text-slate-400" : "text-gray-500"
          )}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        className="flex-1 px-6" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >

      {/* Current Stage Info */}
      {isProcessing && currentStage && (
        <View className={cn(
          "p-4 rounded-xl mb-4",
          isDark ? "bg-indigo-950/30" : "bg-indigo-50"
        )}>
          <Text className={cn(
            "text-sm font-medium mb-1",
            isDark ? "text-indigo-400" : "text-indigo-700"
          )}>Current Stage</Text>
          <Text className={cn(
            "text-base font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>{currentStage.details}</Text>
          
          {/* Progress Bar */}
          <View className={cn(
            "mt-3 h-2 rounded-full",
            isDark ? "bg-slate-700" : "bg-gray-200"
          )}>
            <View 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${currentStage.percentage}%` }}
            />
          </View>
          
          <Text className={cn(
            "text-sm mt-2",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>{Math.round(currentStage.percentage)}% complete</Text>
        </View>
      )}

      {/* Stage Timeline */}
      <View className="space-y-3">
        <Text className={cn(
          "text-sm font-medium",
          isDark ? "text-slate-300" : "text-gray-700"
        )}>Processing Pipeline</Text>
        
        {allStages.map((stage, index) => {
          const stageData = stages.find(s => s.stage === stage.key) || currentStage;
          const isActive = currentStage?.stage === stage.key;
          const isCompleted = stages.some(s => s.stage === stage.key && s.percentage === 100);
          
          return (
            <StageItem
              key={stage.key}
              stage={stage}
              isActive={isActive}
              isCompleted={isCompleted}
              percentage={isActive ? currentStage?.percentage : isCompleted ? 100 : 0}
            />
          );
        })}
      </View>

      </ScrollView>

      {/* Shape of AI - Trust Indicators */}
      <View className={cn(
        "mt-4 pt-4 border-t px-6 pb-6",
        isDark ? "border-slate-700" : "border-gray-200"
      )}>
        <Text className={cn(
          "text-xs text-center",
          isDark ? "text-slate-500" : "text-gray-500"
        )}>
          🔒 Processing happens securely • 🤖 AI-powered assistance • ⚡ Real-time updates
        </Text>
      </View>
    </View>
  );
};

// Individual Stage Item
const StageItem: React.FC<{
  stage: any;
  isActive: boolean;
  isCompleted: boolean;
  percentage?: number;
}> = ({ stage, isActive, isCompleted, percentage = 0 }) => {
  const { isDark } = useTheme();

  return (
    <View className="flex-row items-center">
      <View className={cn(
        "w-8 h-8 rounded-full items-center justify-center mr-3",
        isActive 
          ? "bg-indigo-600" 
          : isCompleted 
          ? "bg-green-600" 
          : (isDark ? "bg-slate-700" : "bg-gray-200")
      )}>
        <Text className={cn(
          "text-sm",
          isActive || isCompleted ? "text-white" : (isDark ? "text-slate-400" : "text-gray-500")
        )}>
          {isCompleted ? '✓' : stage.icon}
        </Text>
      </View>
      
      <View className="flex-1">
        <Text className={cn(
          "text-sm font-medium",
          isActive ? (isDark ? "text-indigo-400" : "text-indigo-600") : (isDark ? "text-white" : "text-gray-900")
        )}>{stage.label}</Text>
        <Text className={cn(
          "text-xs",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>{stage.description}</Text>
        
        {isActive && percentage > 0 && (
          <View className={cn(
            "mt-1 h-1 rounded-full",
            isDark ? "bg-slate-700" : "bg-gray-200"
          )}>
            <View 
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </View>
        )}
      </View>
    </View>
  );
}; 