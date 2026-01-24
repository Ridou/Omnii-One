import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { AppColors } from '~/constants/Colors';
import { getWebSocketUrl } from '~/lib/env';
import Constants from 'expo-constants';

interface ConnectionErrorProps {
  error: string;
  onRetry: () => void;
}

export function ConnectionError({ error, onRetry }: ConnectionErrorProps) {
  const { isDark } = useTheme();
  
  return (
    <View className="flex-1 justify-center items-center p-6">
      <View 
        className="w-16 h-16 rounded-2xl justify-center items-center mb-4"
        style={{ backgroundColor: `${AppColors.error}20` }}
      >
        <Text className="text-3xl">⚠️</Text>
      </View>
      
      <Text className={cn(
        "text-xl font-bold mb-2",
        isDark ? "text-white" : "text-gray-900"
      )}>Connection Issue</Text>
      <Text className={cn(
        "text-base text-center mb-6",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{error}</Text>
      
      <TouchableOpacity 
        className="bg-indigo-600 px-6 py-3 rounded-xl mb-8"
        onPress={onRetry}
      >
        <Text className="text-white text-base font-semibold">Retry Connection</Text>
      </TouchableOpacity>
      
      <View className={cn(
        "p-4 rounded-xl w-full border shadow-sm",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-sm font-semibold mb-2",
          isDark ? "text-white" : "text-gray-900"
        )}>
          Debug Info:
        </Text>
        <Text className={cn(
          "text-sm leading-5",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          • Check if WebSocket server is running{'\n'}
          • URL: {getWebSocketUrl()}{'\n'}
          • Environment: {Constants.expoConfig?.extra?.environment || 'development'}
        </Text>
      </View>
    </View>
  );
}