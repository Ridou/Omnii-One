import React from 'react';
import { View, Text } from 'react-native';
import { AppColors } from '~/constants/Colors';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  trendValue 
}: MetricCardProps) {
  const { isDark } = useTheme();
  
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return AppColors.success;
      case 'down': return AppColors.error;
      default: return AppColors.textSecondary;
    }
  };

  return (
    <View className={cn(
      "rounded-2xl p-5 flex-1 mx-2 shadow-sm",
      "bg-omnii-card",
      isDark && "bg-omnii-dark-card"
    )}>
      <View className="flex-row justify-between items-center mb-3">
        <Text className={cn(
          "text-sm font-medium",
          isDark ? "text-omnii-dark-text-secondary" : "text-omnii-text-secondary"
        )}>{title}</Text>
        {icon && <Text className="text-base">{icon}</Text>}
      </View>
      <Text className={cn(
        "text-3xl font-extrabold leading-9",
        isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
      )}>{value}</Text>
      {subtitle && <Text className={cn(
        "text-xs mt-1",
        isDark ? "text-omnii-dark-text-secondary" : "text-omnii-text-secondary"
      )}>{subtitle}</Text>}
      {trend && trendValue && (
        <View className="mt-2">
          <Text 
            className="text-xs font-semibold"
            style={{ color: getTrendColor() }}
          >
            {trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '→'} {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
} 