import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { cn } from '~/utils/cn';
import { useTheme, useThemeIntegration } from '~/context/ThemeContext';
import type { ThemeSettings } from '~/types/profile';

interface ThemeSelectorProps {
  currentTheme: ThemeSettings['colorScheme'];
  onThemeChange: (theme: ThemeSettings['colorScheme']) => void;
}

export default function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const { isDark, systemTheme } = useTheme();
  
  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: '☀️',
      description: 'Classic light theme'
    },
    {
      value: 'dark' as const, 
      label: 'Dark',
      icon: '🌙',
      description: 'Dark theme for low-light environments'
    },
    {
      value: 'auto' as const,
      label: 'Auto',
      icon: '🔄',
      description: `Follow system preference (currently ${systemTheme || 'light'})`
    },
    {
      value: 'high_contrast' as const,
      label: 'High Contrast',
      icon: '🔍', 
      description: 'Enhanced accessibility mode'
    }
  ];

  return (
    <View className="space-y-3">
      {themeOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          className={cn(
            "flex-row items-center p-4 rounded-xl border-2",
            // FIXED: React Native compatible conditional classes
            currentTheme === option.value 
              ? "border-ai-start bg-ai-start/10"
              : "border-omnii-border bg-omnii-background",
            // Dark theme variants
            isDark && currentTheme === option.value && "bg-ai-start/20",
            isDark && currentTheme !== option.value && "border-omnii-dark-border bg-omnii-dark-background"
          )}
          onPress={() => onThemeChange(option.value)}
          accessible={true}
          accessibilityRole="radio"
          accessibilityState={{ checked: currentTheme === option.value }}
          accessibilityLabel={`${option.label} theme option. ${option.description}`}
        >
          <Text className="text-2xl mr-4">{option.icon}</Text>
          <View className="flex-1">
            <Text className={cn(
              "omnii-body font-semibold",
              isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
            )}>
              {option.label}
            </Text>
            <Text className={cn(
              "omnii-caption",
              isDark ? "text-omnii-dark-text-secondary" : "text-omnii-text-secondary"
            )}>
              {option.description}
            </Text>
          </View>
          {currentTheme === option.value && (
            <View className="w-6 h-6 rounded-full bg-ai-start items-center justify-center">
              <Text className="text-white text-xs">✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
} 