import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withDelay,
  runOnJS
} from 'react-native-reanimated';

// Types for smart suggestions
interface SmartSuggestion {
  id: string;
  type: 'task_creation' | 'scheduling' | 'follow_up' | 'automation' | 'insight';
  title: string;
  description: string;
  action: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  context: {
    source: string;
    reasoning: string;
    dataUsed: string[];
  };
  autoExecutable?: boolean;
}

interface SmartSuggestionCardsProps {
  suggestions: SmartSuggestion[];
  onSuggestionSelect: (suggestion: SmartSuggestion) => void;
  onAutoExecute?: (suggestion: SmartSuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
}

/**
 * Smart Suggestion Cards Component
 * Provides proactive AI suggestions based on context analysis
 * Following Shape of AI patterns: Nudges, Templates, Auto Fill
 */
export const SmartSuggestionCards: React.FC<SmartSuggestionCardsProps> = ({
  suggestions,
  onSuggestionSelect,
  onAutoExecute,
  onDismiss
}) => {
  const { isDark } = useTheme();
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [autoExecutingId, setAutoExecutingId] = useState<string | null>(null);

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.includes(s.id));

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50 dark:bg-red-950/20';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      case 'low': return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20';
    }
  };

  const getTypeIcon = (type: SmartSuggestion['type']) => {
    switch (type) {
      case 'task_creation': return '📋';
      case 'scheduling': return '📅';
      case 'follow_up': return '📧';
      case 'automation': return '⚡';
      case 'insight': return '💡';
    }
  };

  const handleDismiss = (suggestionId: string) => {
    setDismissedSuggestions(prev => [...prev, suggestionId]);
    onDismiss?.(suggestionId);
  };

  const handleAutoExecute = async (suggestion: SmartSuggestion) => {
    if (!suggestion.autoExecutable) return;
    
    Alert.alert(
      'Auto-Execute Suggestion',
      `Would you like me to automatically ${suggestion.action.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Execute',
          onPress: () => {
            setAutoExecutingId(suggestion.id);
            onAutoExecute?.(suggestion);
            
            // Auto-dismiss after execution
            setTimeout(() => {
              setAutoExecutingId(null);
              handleDismiss(suggestion.id);
            }, 2000);
          }
        }
      ]
    );
  };

  const SuggestionCard: React.FC<{ suggestion: SmartSuggestion; index: number }> = ({ 
    suggestion, 
    index 
  }) => {
    const cardOpacity = useSharedValue(0);
    const cardTranslateY = useSharedValue(50);
    const isAutoExecuting = autoExecutingId === suggestion.id;

    useEffect(() => {
      const delay = index * 100; // Stagger animation
      cardOpacity.value = withDelay(delay, withSpring(1));
      cardTranslateY.value = withDelay(delay, withSpring(0));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: cardOpacity.value,
      transform: [{ translateY: cardTranslateY.value }]
    }));

    const getConfidenceDisplay = (confidence: number) => {
      const percentage = Math.round(confidence * 100);
      if (percentage >= 90) return { text: 'Very High', color: 'text-green-600' };
      if (percentage >= 75) return { text: 'High', color: 'text-green-500' };
      if (percentage >= 60) return { text: 'Medium', color: 'text-yellow-500' };
      return { text: 'Low', color: 'text-orange-500' };
    };

    const confidenceDisplay = getConfidenceDisplay(suggestion.confidence);

    return (
      <Animated.View style={animatedStyle}>
        <View className={cn(
          "mx-4 mb-3 rounded-xl border-l-4 p-4",
          getPriorityColor(suggestion.priority),
          isDark ? "border-slate-700" : "border-gray-200",
          isAutoExecuting ? "opacity-50" : ""
        )}>
          {/* Header */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-row items-start flex-1">
              <Text className="text-2xl mr-3 mt-0.5">{suggestion.icon}</Text>
              
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className={cn(
                    "text-sm font-semibold flex-1",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {suggestion.title}
                  </Text>
                  
                  {/* Priority badge */}
                  <View className={cn(
                    "px-2 py-1 rounded-full ml-2",
                    suggestion.priority === 'high' ? "bg-red-500" : 
                    suggestion.priority === 'medium' ? "bg-yellow-500" : "bg-blue-500"
                  )}>
                    <Text className="text-white text-xs font-medium capitalize">
                      {suggestion.priority}
                    </Text>
                  </View>
                </View>
                
                <Text className={cn(
                  "text-sm leading-5 mb-2",
                  isDark ? "text-slate-300" : "text-gray-700"
                )}>
                  {suggestion.description}
                </Text>

                {/* Context info */}
                <View className={cn(
                  "p-2 rounded-lg mb-3",
                  isDark ? "bg-slate-800/50" : "bg-white/50"
                )}>
                  <Text className={cn(
                    "text-xs font-medium mb-1",
                    isDark ? "text-slate-400" : "text-gray-600"
                  )}>
                    💭 AI Reasoning
                  </Text>
                  <Text className={cn(
                    "text-xs leading-4",
                    isDark ? "text-slate-500" : "text-gray-500"
                  )}>
                    {suggestion.context.reasoning}
                  </Text>
                  
                  {/* Confidence indicator */}
                  <View className="flex-row items-center mt-2">
                    <Text className={cn(
                      "text-xs font-medium mr-2",
                      isDark ? "text-slate-400" : "text-gray-600"
                    )}>
                      Confidence:
                    </Text>
                    <Text className={cn(
                      "text-xs font-semibold",
                      confidenceDisplay.color
                    )}>
                      {confidenceDisplay.text} ({Math.round(suggestion.confidence * 100)}%)
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Dismiss button */}
            <TouchableOpacity
              onPress={() => handleDismiss(suggestion.id)}
              className={cn(
                "w-6 h-6 rounded-full items-center justify-center ml-2",
                isDark ? "bg-slate-700" : "bg-gray-200"
              )}
              activeOpacity={0.7}
            >
              <Text className={cn(
                "text-xs",
                isDark ? "text-slate-400" : "text-gray-500"
              )}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-2">
            {/* Main action button */}
            <TouchableOpacity
              onPress={() => onSuggestionSelect(suggestion)}
              className={cn(
                "flex-1 py-3 px-4 rounded-lg items-center",
                suggestion.priority === 'high' ? "bg-red-500" :
                suggestion.priority === 'medium' ? "bg-yellow-500" : "bg-blue-500"
              )}
              activeOpacity={0.8}
              disabled={isAutoExecuting}
            >
              <Text className="text-white text-sm font-semibold">
                {isAutoExecuting ? 'Executing...' : suggestion.action}
              </Text>
            </TouchableOpacity>

            {/* Auto-execute button (if available) */}
            {suggestion.autoExecutable && (
              <TouchableOpacity
                onPress={() => handleAutoExecute(suggestion)}
                className={cn(
                  "py-3 px-4 rounded-lg border-2",
                  suggestion.priority === 'high' ? "border-red-500" :
                  suggestion.priority === 'medium' ? "border-yellow-500" : "border-blue-500",
                  isDark ? "bg-slate-800" : "bg-white"
                )}
                activeOpacity={0.8}
                disabled={isAutoExecuting}
              >
                <Text className={cn(
                  "text-sm font-semibold",
                  suggestion.priority === 'high' ? "text-red-500" :
                  suggestion.priority === 'medium' ? "text-yellow-500" : "text-blue-500"
                )}>
                  ⚡ Auto
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Data sources used */}
          <View className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
            <Text className={cn(
              "text-xs font-medium mb-1",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              📊 Based on: {suggestion.context.source}
            </Text>
            <View className="flex-row flex-wrap">
              {suggestion.context.dataUsed.map((data, index) => (
                <View
                  key={index}
                  className={cn(
                    "px-2 py-1 rounded mr-1 mb-1",
                    isDark ? "bg-slate-700" : "bg-gray-100"
                  )}
                >
                  <Text className={cn(
                    "text-xs",
                    isDark ? "text-slate-300" : "text-gray-600"
                  )}>
                    {data}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <View className="mt-4">
      {/* Header */}
      <View className="px-4 mb-3">
        <View className="flex-row items-center">
          <View className={cn(
            "w-8 h-8 rounded-lg items-center justify-center mr-3",
            isDark ? "bg-purple-950/50" : "bg-purple-100"
          )}>
            <Text className="text-base">💡</Text>
          </View>
          
          <View className="flex-1">
            <Text className={cn(
              "text-base font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              Smart Suggestions
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              AI-powered recommendations based on your context
            </Text>
          </View>

          {/* Suggestion count */}
          <View className={cn(
            "px-2 py-1 rounded-full",
            isDark ? "bg-purple-600" : "bg-purple-500"
          )}>
            <Text className="text-white text-xs font-medium">
              {visibleSuggestions.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Suggestions list */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {visibleSuggestions.map((suggestion, index) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            index={index}
          />
        ))}
      </ScrollView>

      {/* Footer note */}
      <View className="px-4 mt-2 mb-4">
        <Text className={cn(
          "text-xs text-center",
          isDark ? "text-slate-500" : "text-gray-500"
        )}>
          Suggestions adapt based on your data patterns and preferences
        </Text>
      </View>
    </View>
  );
};

// Export helper function to generate smart suggestions
export const generateSmartSuggestions = (
  relevantContext: any,
  userMessage: string,
  rdfInsights?: any
): SmartSuggestion[] => {
  const suggestions: SmartSuggestion[] = [];

  // Task creation suggestions
  if (relevantContext?.emailContext?.relevant?.length > 0) {
    const unreadEmails = relevantContext.emailContext.relevant.filter((e: any) => !e.isRead);
    if (unreadEmails.length > 2) {
      suggestions.push({
        id: 'task-email-followup',
        type: 'task_creation',
        title: 'Create Follow-up Tasks',
        description: `You have ${unreadEmails.length} unread emails that might need follow-up actions.`,
        action: 'Create Tasks from Emails',
        icon: '📋',
        priority: 'medium',
        confidence: 0.75,
        context: {
          source: 'Recent unread emails',
          reasoning: 'Multiple unread emails detected, likely containing action items',
          dataUsed: ['Unread emails', 'Email subjects', 'Sender analysis']
        },
        autoExecutable: true
      });
    }
  }

  // Calendar scheduling suggestions
  if (relevantContext?.taskContext?.relevant?.length > 0) {
    const overdueTasks = relevantContext.taskContext.relevant.filter((t: any) => 
      t.due && new Date(t.due) < new Date()
    );
    if (overdueTasks.length > 0) {
      suggestions.push({
        id: 'schedule-overdue',
        type: 'scheduling',
        title: 'Schedule Overdue Tasks',
        description: `${overdueTasks.length} overdue tasks need rescheduling.`,
        action: 'Schedule Time Blocks',
        icon: '📅',
        priority: 'high',
        confidence: 0.9,
        context: {
          source: 'Overdue task analysis',
          reasoning: 'Overdue tasks detected, calendar integration can help prioritize',
          dataUsed: ['Task due dates', 'Calendar availability', 'Task priority']
        },
        autoExecutable: true
      });
    }
  }

  // Contact-based suggestions
  if (userMessage.toLowerCase().includes('email') || userMessage.toLowerCase().includes('contact')) {
    if (relevantContext?.contactContext?.relevant?.length > 0) {
      suggestions.push({
        id: 'contact-insight',
        type: 'follow_up',
        title: 'Quick Contact Action',
        description: 'I found relevant contacts for your request.',
        action: 'Send Email',
        icon: '📧',
        priority: 'medium',
        confidence: 0.8,
        context: {
          source: 'Contact search results',
          reasoning: 'Relevant contacts found matching your query',
          dataUsed: ['Contact database', 'Communication history', 'Name matching']
        },
        autoExecutable: false
      });
    }
  }

  // Automation suggestions
  if (relevantContext?.totalRelevanceScore > 0.7) {
    suggestions.push({
      id: 'automation-pattern',
      type: 'automation',
      title: 'Automate This Pattern',
      description: 'This request shows patterns that could be automated.',
      action: 'Set Up Automation',
      icon: '⚡',
      priority: 'low',
      confidence: 0.65,
      context: {
        source: 'Pattern analysis',
        reasoning: 'High context relevance suggests repeatable workflow',
        dataUsed: ['Request patterns', 'Data relationships', 'User behavior']
      },
      autoExecutable: false
    });
  }

  return suggestions;
}; 