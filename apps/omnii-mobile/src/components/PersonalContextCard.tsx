import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { cn } from '~/utils/cn';
import { useColorScheme } from 'nativewind';

export const PersonalContextCard: React.FC = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className={cn(
      "rounded-2xl p-6 mb-6 border shadow-sm border-l-4 border-l-blue-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3">
        <View className={cn(
          "w-10 h-10 rounded-lg items-center justify-center mr-3",
          isDark ? "bg-blue-900/30" : "bg-blue-100"
        )}>
          <Text className="text-xl">👤</Text>
        </View>
        <Text className={cn(
          "text-lg font-bold",
          isDark ? "text-white" : "text-gray-900"
        )}>Personal Context</Text>
      </View>
      <Text className={cn(
        "text-sm leading-6 mb-4",
        isDark ? "text-slate-300" : "text-gray-600"
      )}>
        Manage what the AI remembers about your preferences and working style.
      </Text>
      <TouchableOpacity className={cn(
        "px-4 py-3 rounded-lg border",
        isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"
      )}>
        <Text className={cn(
          "text-sm font-medium text-center",
          isDark ? "text-white" : "text-gray-900"
        )}>View & Edit Context</Text>
      </TouchableOpacity>
    </View>
  );
}; 