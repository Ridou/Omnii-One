import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colorScheme } from 'nativewind';
import { cn } from '~/utils/cn';
import { useTheme } from '~/context/ThemeContext';
import type { ThemeSettings } from '~/types/profile';

interface ThemeSelectorProps {
  currentTheme: ThemeSettings['colorScheme'] | null;
  onThemeChange: (theme: ThemeSettings['colorScheme']) => void;
}

export default function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const { isDark, systemTheme, isFollowingSystem } = useTheme();
  
  const handleThemeChange = (newTheme: ThemeSettings['colorScheme']) => {
    // Update our custom profile context
    onThemeChange(newTheme);
    
    // Also update NativeWind's colorScheme to trigger dark: classes
    colorScheme.set(newTheme);
  };

  return (
    <View className="space-y-4">
      {/* System Status Info */}
      {isFollowingSystem && (
        <View className={cn(
          "p-3 rounded-lg border",
          isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
        )}>
          <Text className={cn(
            "text-sm font-medium",
            isDark ? "text-blue-300" : "text-blue-800"
          )}>
            Following system preference • Currently {systemTheme || 'light'}
          </Text>
        </View>
      )}

      {/* Light/Dark Toggle */}
      <View className={cn(
        "flex-row rounded-xl p-1 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-gray-100 border-gray-200"
      )}>
        {/* Light Option */}
        <TouchableOpacity
          className={cn(
            "flex-1 flex-row items-center justify-center p-3 rounded-lg",
            currentTheme === 'light'
              ? "bg-white shadow-sm border border-gray-200"
              : "bg-transparent"
          )}
          onPress={() => handleThemeChange('light')}
          accessible={true}
          accessibilityRole="radio"
          accessibilityState={{ checked: currentTheme === 'light' }}
          accessibilityLabel="Light theme"
        >
          <Text className="text-xl mr-2">☀️</Text>
          <Text className={cn(
            "font-semibold",
            currentTheme === 'light'
              ? "text-gray-900"
              : cn(isDark ? "text-slate-400" : "text-gray-600")
          )}>
            Light
          </Text>
        </TouchableOpacity>

        {/* Dark Option */}
        <TouchableOpacity
          className={cn(
            "flex-1 flex-row items-center justify-center p-3 rounded-lg",
            currentTheme === 'dark'
              ? cn(
                  "shadow-sm border",
                  isDark ? "bg-slate-700 border-slate-600" : "bg-slate-800 border-slate-700"
                )
              : "bg-transparent"
          )}
          onPress={() => handleThemeChange('dark')}
          accessible={true}
          accessibilityRole="radio"
          accessibilityState={{ checked: currentTheme === 'dark' }}
          accessibilityLabel="Dark theme"
        >
          <Text className="text-xl mr-2">🌙</Text>
          <Text className={cn(
            "font-semibold",
            currentTheme === 'dark'
              ? "text-white"
              : cn(isDark ? "text-slate-400" : "text-gray-600")
          )}>
            Dark
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reset to System Button */}
      {!isFollowingSystem && (
        <TouchableOpacity
          className={cn(
            "items-center p-2 rounded-lg",
            isDark ? "bg-slate-800" : "bg-gray-50"
          )}
          onPress={() => {
            // Reset to system preference by setting to null in profile context
            // This will be handled by the parent component
            const systemPreference = systemTheme || 'light';
            handleThemeChange(systemPreference);
          }}
        >
          <Text className={cn(
            "text-sm font-medium",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            🔄 Reset to system preference
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
} 