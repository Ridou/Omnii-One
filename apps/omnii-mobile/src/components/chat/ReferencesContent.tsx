import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';

interface ReferenceCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  borderColor: string;
  children: React.ReactNode;
}

const ReferenceCard: React.FC<ReferenceCardProps> = ({ 
  icon, 
  title, 
  subtitle, 
  borderColor, 
  children 
}) => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "rounded-2xl p-4 mb-3 border shadow-sm border-l-4",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )} style={{ borderLeftColor: borderColor }}>
      <View className="flex-row items-center mb-2">
        <View className={cn(
          "w-10 h-10 rounded-lg items-center justify-center mr-3",
          isDark ? "bg-gray-800" : "bg-gray-100"
        )} style={{ backgroundColor: `${borderColor}20` }}>
          <Text className="text-xl">{icon}</Text>
        </View>
        <View>
          <Text className={cn(
            "text-lg font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}>{title}</Text>
          {subtitle && (
            <Text className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>{subtitle}</Text>
          )}
        </View>
      </View>
      {children}
    </View>
  );
};

export const ReferencesContent: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
      <View className="py-3">
        <Text className={cn(
          "text-2xl font-bold mb-1",
          isDark ? "text-white" : "text-gray-900"
        )}>📚 References</Text>
        <Text className={cn(
          "text-base mb-3",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>Data sources the AI uses for context</Text>
        
        {/* Current Context Card */}
        <ReferenceCard
          icon="🎯"
          title="Current Context"
          subtitle="What the AI knows right now"
          borderColor="#3B82F6"
        >
          <View className="gap-2">
            <ContextRow label="Recent Emails:" value="12 unread (last 24h)" color="#3B82F6" />
            <ContextRow label="Calendar Events:" value="5 events (next 7 days)" color="#10B981" />
            <ContextRow label="Active Tasks:" value="8 pending" color="#8B5CF6" />
            <ContextRow label="Work Patterns:" value="Morning focused" color="#F97316" />
          </View>
        </ReferenceCard>

        {/* Chat History Card */}
        <ReferenceCard
          icon="💬"
          title="Chat History"
          borderColor="#10B981"
        >
          <Text className={cn(
            "text-sm leading-5 mb-3",
            isDark ? "text-slate-300" : "text-gray-600"
          )}>
            Conversation context from recent sessions to maintain continuity.
          </Text>
          <View className={cn(
            "px-3 py-2 rounded-lg self-start",
            isDark ? "bg-green-900/20" : "bg-green-100"
          )}>
            <Text className={cn(
              "text-xs font-semibold",
              isDark ? "text-green-400" : "text-green-700"
            )}>Active</Text>
          </View>
        </ReferenceCard>

        {/* Connected Sources Card */}
        <ReferenceCard
          icon="🔗"
          title="Connected Sources"
          borderColor="#8B5CF6"
        >
          <Text className={cn(
            "text-sm leading-5 mb-3",
            isDark ? "text-slate-300" : "text-gray-600"
          )}>
            External services providing real-time data for personalized assistance.
          </Text>
          <View className="gap-1.5">
            <ConnectedSource name="Google Calendar - Events & scheduling" />
            <ConnectedSource name="Gmail - Email communication" />
            <ConnectedSource name="Google Contacts - Contact information" />
          </View>
        </ReferenceCard>
      </View>
    </ScrollView>
  );
};

const ContextRow: React.FC<{ label: string; value: string; color: string }> = ({ 
  label, 
  value, 
  color 
}) => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "flex-row justify-between items-center py-2 border-b",
      isDark ? "border-slate-700" : "border-gray-100"
    )}>
      <Text className={cn(
        "text-sm font-semibold",
        isDark ? "text-slate-300" : "text-gray-700"
      )}>{label}</Text>
      <Text className="text-sm font-medium" style={{ color }}>
        {value}
      </Text>
    </View>
  );
};

const ConnectedSource: React.FC<{ name: string }> = ({ name }) => {
  const { isDark } = useTheme();
  
  return (
    <View className="flex-row items-center">
      <View className="w-2 h-2 bg-green-500 rounded-full mr-3" />
      <Text className={cn(
        "text-sm font-medium flex-1",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{name}</Text>
    </View>
  );
};