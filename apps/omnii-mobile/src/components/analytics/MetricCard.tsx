import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function MetricCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  trendValue,
}: MetricCardProps) {
  const { isDark } = useTheme();

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return isDark ? 'text-slate-400' : 'text-gray-600';
    }
  };

  return (
    <View className={cn(
      "flex-1 mx-2 rounded-xl p-4 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-2">
        <Text className="text-xl mr-2">{icon}</Text>
        <Text className={cn(
          "text-sm font-medium flex-1",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          {title}
        </Text>
      </View>
      
      <Text className={cn(
        "text-2xl font-bold mb-1",
        isDark ? "text-white" : "text-gray-900"
      )}>
        {value}
      </Text>
      
      {subtitle && (
        <Text className={cn(
          "text-xs mb-1",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          {subtitle}
        </Text>
      )}
      
      {trendValue && (
        <Text className={cn("text-xs", getTrendColor())}>
          {trendValue}
        </Text>
      )}
    </View>
  );
} 