import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppColors } from '~/constants/Colors';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import type { AIInsight } from '~/types/analytics';

interface AIInsightCardProps {
  insight: AIInsight;
  onAction?: (action: string) => void;
  onDismiss?: () => void;
}

export default function AIInsightCard({ 
  insight, 
  onAction, 
  onDismiss 
}: AIInsightCardProps) {
  const { isDark } = useTheme();
  const [showSources, setShowSources] = useState(false);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return AppColors.success;
    if (confidence >= 70) return AppColors.warning;
    return AppColors.error;
  };

  const getImpactColor = (impact?: string) => {
    switch (impact) {
      case 'high': return AppColors.error;
      case 'medium': return AppColors.warning;
      case 'low': return AppColors.success;
      default: return isDark ? '#94a3b8' : '#6b7280';
    }
  };

  return (
    <View 
      className={cn(
        "rounded-2xl p-5 mb-4 border-l-4 shadow-sm",
        isDark ? "bg-slate-800" : "bg-white"
      )}
      style={{ borderLeftColor: AppColors.aiGradientStart }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <Text className={cn(
          "text-base font-semibold flex-1 mr-3",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {insight.title}
        </Text>
        <View className="flex-row gap-2">
          {insight.impact && (
            <View 
              className="px-2 py-1 rounded-lg"
              style={{ backgroundColor: getImpactColor(insight.impact) }}
            >
              <Text className="text-white text-xs font-bold">
                {insight.impact.toUpperCase()}
              </Text>
            </View>
          )}
          <View className={cn(
            "px-2 py-1 rounded-lg",
            isDark ? "bg-slate-700" : "bg-gray-100"
          )}>
            <Text 
              className="text-xs font-bold"
              style={{ color: getConfidenceColor(insight.confidence) }}
            >
              {insight.confidence}%
            </Text>
          </View>
        </View>
      </View>
      
      <Text className={cn(
        "text-sm leading-5 mb-3",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{insight.message}</Text>
      
      {insight.suggestions && insight.suggestions.length > 0 && (
        <View className="mb-3">
          {insight.suggestions.map((suggestion, index) => (
            <Text key={index} className={cn(
              "text-sm leading-5",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>• {suggestion}</Text>
          ))}
        </View>
      )}

      {/* Sources */}
      <TouchableOpacity 
        className={cn(
          "py-2 px-3 rounded-lg mb-3",
          isDark ? "bg-slate-700" : "bg-gray-100"
        )}
        onPress={() => setShowSources(!showSources)}
      >
        <Text className={cn(
          "text-sm font-medium",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {showSources ? 'Hide' : 'View'} Sources ({insight.sources.length})
        </Text>
      </TouchableOpacity>
      
      {showSources && (
        <View className="mb-3">
          {insight.sources.map((source, index) => (
            <Text key={index} className={cn(
              "text-sm leading-5",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>• {source}</Text>
          ))}
        </View>
      )}

      {/* Actions */}
      <View className="flex-row gap-2">
        {insight.action && (
          <TouchableOpacity 
            className="bg-indigo-600 py-2 px-4 rounded-lg flex-1"
            onPress={() => onAction?.(insight.action!)}
          >
            <Text className="text-white text-sm font-semibold text-center">{insight.action}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          className={cn(
            "py-2 px-4 rounded-lg border",
            isDark ? "bg-slate-700 border-slate-600" : "bg-gray-100 border-gray-200"
          )}
          onPress={onDismiss}
        >
          <Text className={cn(
            "text-sm font-semibold text-center",
            isDark ? "text-white" : "text-gray-900"
          )}>Not Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 