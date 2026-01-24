import React from 'react';
    import { View, Text } from 'react-native';
import { cn } from '~/utils/cn';
import { useColorScheme } from 'nativewind';
import { createCalendarComponent } from '~/components/chat/MessageComponents';

interface CalendarMemoryCardProps {
  calendarData?: any;
  onCalendarAction?: (action: string, data?: any) => void;
}

export const CalendarMemoryCard: React.FC<CalendarMemoryCardProps> = ({ 
  calendarData, 
  onCalendarAction = () => {} 
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!calendarData) {
    return null;
  }

  return (
    <View className={cn(
      "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-green-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3">
        <View className={cn(
          "w-10 h-10 rounded-lg items-center justify-center mr-3",
          isDark ? "bg-green-900/30" : "bg-green-100"
        )}>
          <Text className="text-xl">📅</Text>
        </View>
        <Text className={cn(
          "text-lg font-bold",
          isDark ? "text-white" : "text-gray-900"
        )}>Calendar Memory</Text>
      </View>
      <Text className={cn(
        "text-sm leading-6 mb-4",
        isDark ? "text-slate-300" : "text-gray-600"
      )}>
        Recent events and scheduling patterns from your Google Calendar, helping AI understand your availability.
      </Text>
      
      {createCalendarComponent(calendarData, {
        onEmailAction: () => {},
        onAction: onCalendarAction,
        data: calendarData
      })}
    </View>
  );
}; 