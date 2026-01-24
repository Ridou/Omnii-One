import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate 
} from 'react-native-reanimated';

// Types for context display (local definitions)
interface CachedConcept {
  id: string;
  name?: string;
  content?: string;
  description?: string;
  labels: string[];
  properties: Record<string, any>;
  relevanceScore?: number;
}

interface RelevantContext {
  emailContext: { relevant: any[], confidence: number };
  taskContext: { relevant: any[], confidence: number };
  calendarContext: { relevant: any[], confidence: number };
  contactContext: { relevant: any[], confidence: number };
  conceptContext: { relevant: CachedConcept[], confidence: number };
  totalRelevanceScore: number;
  reasoning: string[];
}

interface ContextPrompt {
  systemPrompt: string;
  contextSummary: string;
  totalTokens: number;
  includedDataTypes: string[];
}

interface AIContextDisplayProps {
  relevantContext: RelevantContext;
  contextPrompt: ContextPrompt;
  reasoning: string[];
  isVisible?: boolean;
}

/**
 * Modern AI Context Display Component
 * 
 * Shows Claude/ChatGPT-style "thinking" section with context sources
 * and reasoning in a clean, expandable format.
 */
export const AIContextDisplay: React.FC<AIContextDisplayProps> = ({
  relevantContext,
  contextPrompt,
  reasoning,
  isVisible = true
}) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Animated values for smooth expand/collapse
  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);
  
  useEffect(() => {
    if (isVisible) {
      animatedHeight.value = withSpring(isExpanded ? 300 : 60, {
        damping: 15,
        stiffness: 150
      });
      animatedOpacity.value = withTiming(1, { duration: 300 });
    } else {
      animatedHeight.value = withTiming(0, { duration: 300 });
      animatedOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isVisible, isExpanded]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
  }));
  
  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isExpanded ? 1 : 0, { duration: 300 }),
  }));
  
  if (!isVisible || !relevantContext) {
    return null;
  }

  // Calculate total context items
  const totalItems = 
    relevantContext.emailContext.relevant.length +
    relevantContext.taskContext.relevant.length +
    relevantContext.calendarContext.relevant.length +
    relevantContext.contactContext.relevant.length +
    relevantContext.conceptContext.relevant.length;

  // Get the most relevant context types
  const contextTypes = [
    { name: 'emails', count: relevantContext.emailContext.relevant.length, confidence: relevantContext.emailContext.confidence },
    { name: 'tasks', count: relevantContext.taskContext.relevant.length, confidence: relevantContext.taskContext.confidence },
    { name: 'calendar', count: relevantContext.calendarContext.relevant.length, confidence: relevantContext.calendarContext.confidence },
    { name: 'contacts', count: relevantContext.contactContext.relevant.length, confidence: relevantContext.contactContext.confidence },
    { name: 'concepts', count: relevantContext.conceptContext.relevant.length, confidence: relevantContext.conceptContext.confidence },
  ].filter(type => type.count > 0).slice(0, 3); // Show top 3 types

  // Convert reasoning array to string for display
  const reasoningText = Array.isArray(reasoning) ? reasoning.join(' ') : reasoning || '';

  return (
    <Animated.View style={[animatedStyle]}>
      <View className={cn(
        "mx-4 mb-3 rounded-xl border",
        isDark ? "bg-slate-800/60 border-slate-600/50" : "bg-blue-50/80 border-blue-200/60"
      )}>
        {/* Header - Always visible */}
        <TouchableOpacity 
          className="p-4 flex-row items-center justify-between"
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center gap-3 flex-1">
            <View className={cn(
              "w-8 h-8 rounded-full items-center justify-center",
              isDark ? "bg-blue-600/20" : "bg-blue-100"
            )}>
              <Text className="text-lg">🧠</Text>
            </View>
            
            <View className="flex-1">
              <Text className={cn(
                "text-sm font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}>
                AI Context Analysis
              </Text>
              <Text className={cn(
                "text-xs",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>
                {totalItems > 0 
                  ? `Found ${totalItems} relevant items${contextTypes.length > 0 ? ` from ${contextTypes.map(t => t.name).join(', ')}` : ''}`
                  : 'No specific context found'
                }
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              className={cn(
                "px-2 py-1 rounded-md",
                isDark ? "bg-slate-700" : "bg-gray-200"
              )}
            >
              <Text className={cn(
                "text-xs font-medium",
                isDark ? "text-slate-300" : "text-gray-700"
              )}>
                Details
              </Text>
            </TouchableOpacity>
            
            <Text className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-gray-500"
            )}>
              {isExpanded ? '↑' : '↓'}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Expandable content */}
        <Animated.View style={animatedContentStyle}>
          <View className="px-4 pb-4">
            {totalItems > 0 ? (
              <View className="space-y-3">
                {/* Context summary cards */}
                {contextTypes.map((type, index) => (
                  <View key={type.name} className={cn(
                    "p-3 rounded-lg border",
                    isDark ? "bg-slate-700/50 border-slate-600/30" : "bg-white/80 border-gray-200"
                  )}>
                    <View className="flex-row items-center gap-2 mb-2">
                      <Text className="text-sm">
                        {type.name === 'emails' ? '📧' : 
                         type.name === 'tasks' ? '📋' :
                         type.name === 'calendar' ? '📅' :
                         type.name === 'contacts' ? '👥' : '🧠'}
                      </Text>
                      <Text className={cn(
                        "text-sm font-medium capitalize",
                        isDark ? "text-white" : "text-gray-900"
                      )}>
                        {type.name}
                      </Text>
                      <View className={cn(
                        "px-2 py-0.5 rounded-full",
                        type.confidence > 0.7 
                          ? isDark ? "bg-green-900/30" : "bg-green-100"
                          : type.confidence > 0.4
                          ? isDark ? "bg-yellow-900/30" : "bg-yellow-100"
                          : isDark ? "bg-red-900/30" : "bg-red-100"
                      )}>
                        <Text className={cn(
                          "text-xs font-medium",
                          type.confidence > 0.7 
                            ? isDark ? "text-green-300" : "text-green-700"
                            : type.confidence > 0.4
                            ? isDark ? "text-yellow-300" : "text-yellow-700"
                            : isDark ? "text-red-300" : "text-red-700"
                        )}>
                          {Math.round(type.confidence * 100)}%
                        </Text>
                      </View>
                    </View>
                    <Text className={cn(
                      "text-xs",
                      isDark ? "text-slate-400" : "text-gray-600"
                    )}>
                      {type.count} relevant {type.count === 1 ? 'item' : 'items'} found
                    </Text>
                  </View>
                ))}
                
                {/* Reasoning snippet */}
                {reasoningText && (
                  <View className={cn(
                    "p-3 rounded-lg border-l-2",
                    isDark ? "bg-slate-700/30 border-l-blue-500" : "bg-blue-50 border-l-blue-400"
                  )}>
                    <Text className={cn(
                      "text-xs font-medium mb-1",
                      isDark ? "text-blue-300" : "text-blue-700"
                    )}>
                      AI Reasoning
                    </Text>
                    <Text className={cn(
                      "text-xs leading-4",
                      isDark ? "text-slate-300" : "text-gray-700"
                    )}>
                      {reasoningText.length > 100 ? reasoningText.substring(0, 100) + '...' : reasoningText}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="items-center py-3">
                <Text className={cn(
                  "text-sm",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>
                  No relevant context data found for this request
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
      
      {/* Simple Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View className={cn(
          "flex-1",
          isDark ? "bg-slate-900" : "bg-white"
        )}>
          <View className={cn(
            "px-6 py-4 border-b",
            isDark ? "border-slate-700" : "border-gray-200"
          )}>
            <View className="flex-row items-center justify-between">
              <Text className={cn(
                "text-lg font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}>
                🧠 Context Details
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                className={cn(
                  "w-8 h-8 rounded-full items-center justify-center",
                  isDark ? "bg-slate-800" : "bg-gray-100"
                )}
              >
                <Text className={cn(
                  "text-base font-medium",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView className="flex-1 px-6 py-4">
            <Text className={cn(
              "text-sm",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>
              Full context details would be shown here. This includes all reasoning steps, 
              data sources, and confidence scores used by the AI to generate the response.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </Animated.View>
  );
}; 