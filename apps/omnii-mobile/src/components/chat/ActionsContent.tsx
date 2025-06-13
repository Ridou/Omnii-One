import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { QUICK_ACTIONS } from '~/constants/chat';
import { createTaskComponent, createCalendarComponent } from '~/components/chat/MessageComponents';

interface ActionsContentProps {
  tasksOverview: any;
  tasksLoading: boolean | undefined;
  tasksError: boolean | undefined;
  calendarData: any;
  calendarLoading: boolean | undefined;
  calendarError: boolean | undefined;
  totalEvents: number;
  getUpcomingEvents: () => any[];
  getTodaysEvents: () => any[];
  onRefetchTasks: () => void;
  onRefetchCalendar: () => void;
  onActionTap: (action: any) => void;
}

export const ActionsContent: React.FC<ActionsContentProps> = ({
  tasksOverview,
  tasksLoading,
  tasksError,
  calendarData,
  calendarLoading,
  calendarError,
  totalEvents,
  getUpcomingEvents,
  getTodaysEvents,
  onRefetchTasks,
  onRefetchCalendar,
  onActionTap
}) => {
  const { isDark } = useTheme();

  return (
    <ScrollView 
      className="flex-1" 
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="space-y-4">
        {/* Header Section */}
        <View className="mb-2">
          <Text className={cn(
            "text-2xl font-bold mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>⚡ Quick Actions</Text>
          <Text className={cn(
            "text-base",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Tap to execute common tasks</Text>
        </View>

        {/* AI Context Enhancement Notice */}
        <View className={cn(
          "p-4 rounded-2xl border",
          isDark ? "bg-blue-900/10 border-blue-800/50" : "bg-blue-50 border-blue-200"
        )}>
          <View className="flex-row items-center mb-1">
            <Text className={cn(
              "text-base font-medium",
              isDark ? "text-blue-300" : "text-blue-800"
            )}>
              🤖 AI Context Enhancement
            </Text>
          </View>
          <Text className={cn(
            "text-sm",
            isDark ? "text-blue-400" : "text-blue-600"
          )}>
            I analyze your Gmail, Calendar, and Tasks to provide personalized assistance and actionable insights.
          </Text>
        </View>

        {/* Tasks Section */}
        {tasksOverview && (
          <View className="mb-6">
            {__DEV__ && (
              <View className={cn(
                "rounded-xl p-3 mb-3 border",
                isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
              )}>
                <Text className={cn(
                  "text-xs font-mono",
                  isDark ? "text-green-400" : "text-green-600"
                )}>
                  🐛 DEBUG: Tasks loaded - {tasksOverview?.totalTasks || 0} tasks
                </Text>
              </View>
            )}
            
            {createTaskComponent(tasksOverview, {
              onEmailAction: () => {},
              data: tasksOverview
            })}
            
            <TouchableOpacity 
              className="mt-3 p-2 bg-blue-500 rounded-lg"
              onPress={onRefetchTasks}
              disabled={tasksLoading}
            >
              <Text className="text-white text-center font-semibold">
                {tasksLoading ? "Refreshing..." : "🔄 Refresh Tasks"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Calendar Section */}
        {calendarData && (
          <View className={cn(
            "rounded-2xl p-4 mb-6 border",
            isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
          )}>
            <Text className={cn(
              "text-lg font-semibold mb-3",
              isDark ? "text-white" : "text-gray-900"
            )}>📅 Calendar Events</Text>
            <Text className={cn(
              "text-xs font-mono",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>
              Total Events: {calendarData?.totalCount || 0}
            </Text>
            <Text className={cn(
              "text-xs font-mono",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>
              Upcoming: {getUpcomingEvents().length}
            </Text>
            <Text className={cn(
              "text-xs font-mono",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>
              Today: {getTodaysEvents().length}
            </Text>
          </View>
        )}

        {/* Loading States */}
        {tasksLoading && !tasksOverview && (
          <LoadingCard text="🔄 Loading tasks via tRPC..." />
        )}

        {calendarLoading && !calendarData && (
          <LoadingCard text="🔄 Loading calendar events via tRPC..." />
        )}

        {/* Error States */}
        {tasksError && (
          <ErrorCard 
            text="❌ Failed to load tasks via tRPC" 
            onRetry={onRefetchTasks}
          />
        )}

        {calendarError && (
          <ErrorCard 
            text="❌ Failed to load calendar events via tRPC" 
            onRetry={onRefetchCalendar}
          />
        )}
        
        {/* Quick Actions List */}
        <View className="gap-3">
          {QUICK_ACTIONS.map((action) => {
            const IconComponent = action.iconComponent;
            return (
              <TouchableOpacity
                key={action.id}
                className={cn(
                  "flex-row items-center p-4 rounded-xl border",
                  isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                )}
                onPress={() => onActionTap(action)}
              >
                <View className="w-10 h-10 rounded-lg bg-indigo-600 items-center justify-center mr-3">
                  <IconComponent size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text className={cn(
                    "font-semibold text-base mb-1",
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

const LoadingCard: React.FC<{ text: string }> = ({ text }) => {
  const { isDark } = useTheme();
  return (
    <View className={cn(
      "rounded-2xl p-4 mb-6 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <Text className={cn(
        "text-center text-sm",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{text}</Text>
    </View>
  );
};

const ErrorCard: React.FC<{ text: string; onRetry: () => void }> = ({ text, onRetry }) => {
  const { isDark } = useTheme();
  return (
    <View className={cn(
      "rounded-2xl p-4 mb-6 border border-red-500",
      isDark ? "bg-red-900/20" : "bg-red-50"
    )}>
      <Text className="text-red-500 text-center text-sm">{text}</Text>
      <TouchableOpacity 
        className="mt-2 p-2 bg-red-500 rounded-lg"
        onPress={onRetry}
      >
        <Text className="text-white text-center font-semibold">
          🔄 Retry
        </Text>
      </TouchableOpacity>
    </View>
  );
};