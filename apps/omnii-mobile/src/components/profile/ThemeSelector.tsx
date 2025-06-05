import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colorScheme } from 'nativewind';
import { cn } from '~/utils/cn';
import { useTheme, useThemeIntegration } from '~/context/ThemeContext';
import type { ThemeSettings } from '~/types/profile';

interface ThemeSelectorProps {
  currentTheme: ThemeSettings['colorScheme'];
  onThemeChange: (theme: ThemeSettings['colorScheme']) => void;
}

export default function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const { isDark, systemTheme } = useTheme();
  
  const handleThemeChange = (newTheme: ThemeSettings['colorScheme']) => {
    // Update our custom profile context
    onThemeChange(newTheme);
    
    // Also update NativeWind's colorScheme to trigger dark: classes
    if (newTheme === 'dark') {
      colorScheme.set('dark');
    } else if (newTheme === 'light') {
      colorScheme.set('light');
    } else if (newTheme === 'auto') {
      colorScheme.set('system');
    } else if (newTheme === 'high_contrast') {
      // High contrast maps to dark mode with special styling
      colorScheme.set('dark');
    }
  };
  
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
            currentTheme === option.value 
              ? "border-omnii-primary bg-omnii-primary/10"
              : cn(
                  isDark ? "border-slate-600 bg-slate-700" : "border-gray-200 bg-white"
                )
          )}
          onPress={() => handleThemeChange(option.value)}
          accessible={true}
          accessibilityRole="radio"
          accessibilityState={{ checked: currentTheme === option.value }}
          accessibilityLabel={`${option.label} theme option. ${option.description}`}
        >
          <Text className="text-2xl mr-4">{option.icon}</Text>
          <View className="flex-1">
            <Text className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>
              {option.label}
            </Text>
            <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
              {option.description}
            </Text>
          </View>
          {currentTheme === option.value && (
            <View className="w-6 h-6 rounded-full bg-omnii-primary items-center justify-center">
              <Text className="text-white text-xs">✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
} 