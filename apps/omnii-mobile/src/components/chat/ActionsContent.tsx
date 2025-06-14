import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { QUICK_ACTIONS } from '~/constants/chat';

interface ActionsContentProps {
  onActionTap: (action: any) => void;
}

export const ActionsContent: React.FC<ActionsContentProps> = ({ onActionTap }) => {
  const { isDark } = useTheme();

  return (
    <ScrollView 
      className="flex-1" 
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="space-y-3">
        {/* Header Section */}
        <View className="mb-1">
          <Text className={cn(
            "text-2xl font-bold mb-1",
            isDark ? "text-white" : "text-gray-900"
          )}>⚡ Quick Actions</Text>
          <Text className={cn(
            "text-base",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Tap to execute common tasks</Text>
        </View>

        {/* Quick Actions List */}
        <View className="gap-2">
          {QUICK_ACTIONS.map((action) => {
            const IconComponent = action.iconComponent;
            return (
              <TouchableOpacity
                key={action.id}
                className={cn(
                  "flex-row items-center p-3 rounded-xl border",
                  isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                )}
                onPress={() => onActionTap(action)}
              >
                <View className="w-10 h-10 rounded-lg bg-indigo-600 items-center justify-center mr-3">
                  <IconComponent size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text className={cn(
                    "font-semibold text-base mb-0.5",
                    isDark ? "text-white" : "text-gray-900"
                  )}>{action.label}</Text>
                  <Text className={cn(
                    "text-sm",
                    isDark ? "text-slate-400" : "text-gray-600"
                  )}>{action.description}</Text>
                </View>
                <View className="w-6 h-6 rounded-full bg-indigo-600 items-center justify-center">
                  <Text className="text-white text-xs">→</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};