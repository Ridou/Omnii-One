import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppColors } from '~/constants/Colors';
import { getWebSocketUrl } from '~/lib/env';
import Constants from 'expo-constants';

interface ConnectionErrorProps {
  error: string;
  onRetry: () => void;
}

export function ConnectionError({ error, onRetry }: ConnectionErrorProps) {
  return (
    <View className="flex-1 justify-center items-center p-6">
      <View 
        className="w-16 h-16 rounded-2xl justify-center items-center mb-4"
        style={{ backgroundColor: `${AppColors.error}20` }}
      >
        <Text className="text-3xl">⚠️</Text>
      </View>
      
      <Text className="omnii-heading text-xl font-bold mb-2">Connection Issue</Text>
      <Text className="omnii-body text-base text-center mb-6">{error}</Text>
      
      <TouchableOpacity 
        className="bg-ai-start px-6 py-3 rounded-xl mb-8"
        onPress={onRetry}
      >
        <Text className="text-white text-base font-semibold">Retry Connection</Text>
      </TouchableOpacity>
      
      <View className="omnii-card-elevated p-4 rounded-xl w-full">
        <Text className="omnii-body text-sm font-semibold mb-2">
          Debug Info:
        </Text>
        <Text className="omnii-body text-sm leading-5">
          • Check if WebSocket server is running{'\n'}
          • URL: {getWebSocketUrl()}{'\n'}
          • Environment: {Constants.expoConfig?.extra?.environment || 'development'}
        </Text>
      </View>
    </View>
  );
}