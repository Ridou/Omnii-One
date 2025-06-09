import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useResponsiveDesign } from '~/utils/responsive';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import SimpleSwipeCard from '~/components/approvals/SimpleSwipeCard';
import StreamlinedApprovalCard from '~/components/approvals/StreamlinedApprovalCard';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';

// Enhanced Desktop Approvals Content
interface DesktopApprovalsContentProps {
  filteredTasks: any[];
  handleApprove: (task: any) => void;
  handleReject: (task: any) => void;
  selectedFilter: string;
  stats: Record<string, number>;
}

export const DesktopApprovalsContent: React.FC<DesktopApprovalsContentProps> = ({
  filteredTasks,
  handleApprove,
  handleReject,
  selectedFilter,
  stats
}) => {
  const { isDark } = useTheme();
  
  return (
    <View className="flex-1">
      {/* Enhanced Header with Stats */}
      <View className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
        <View className="flex-row items-center justify-between mb-4">
          <Text className={cn(
            "text-2xl font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            {getFilterTitle(selectedFilter)} Tasks
          </Text>
          <View className="flex-row items-center space-x-4">
            <StatsCard label="Total" value={Object.values(stats).reduce((a, b) => a + b, 0)} color="gray" />
            <StatsCard label={getFilterTitle(selectedFilter)} value={stats[selectedFilter] || 0} color={getFilterColor(selectedFilter)} />
          </View>
        </View>
        
        <Text className={cn(
          "text-sm",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          {getFilterDescription(selectedFilter)}
        </Text>
      </View>
      
      {/* Enhanced Content Area */}
      <ScrollView className="flex-1 px-8 py-6" showsVerticalScrollIndicator={false}>
        {filteredTasks.length === 0 ? (
          <EmptyStateCard selectedFilter={selectedFilter} />
        ) : (
          <View className="space-y-4 max-w-6xl">
            <View className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredTasks.map((task, index) => (
                <EnhancedTaskCard
                  key={task.id}
                  task={task}
                  onApprove={() => handleApprove(task)}
                  onReject={() => handleReject(task)}
                  index={index}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Task Card with better styling
const EnhancedTaskCard: React.FC<{
  task: any;
  onApprove: () => void;
  onReject: () => void;
  index: number;
}> = ({ task, onApprove, onReject, index }) => {
  const { isDark } = useTheme();
  
  const priorityConfig = {
    high: {
      badge: 'HIGH PRIORITY',
      color: '#EF4444',
      bgColor: isDark ? 'bg-red-900/20' : 'bg-red-50',
      borderColor: 'border-l-red-500',
      icon: '🔥'
    },
    medium: {
      badge: 'MEDIUM PRIORITY',
      color: '#F59E0B',
      bgColor: isDark ? 'bg-orange-900/20' : 'bg-orange-50',
      borderColor: 'border-l-orange-500',
      icon: '⚡'
    },
    low: {
      badge: 'LOW PRIORITY',
      color: '#10B981',
      bgColor: isDark ? 'bg-green-900/20' : 'bg-green-50',
      borderColor: 'border-l-green-500',
      icon: '✨'
    }
  };
  
  const config = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const aiConfidence = Math.floor(Math.random() * 15) + 85; // 85-99%
  
  return (
    <TouchableOpacity
      className={cn(
        "rounded-2xl border-2 border-l-4 overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-xl",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200",
        config.borderColor
      )}
      style={{
        shadowColor: config.color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      {/* Header Section */}
      <View className={cn("px-6 py-4 border-b", isDark ? "border-slate-700" : "border-gray-100")}>
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-lg mr-2">{config.icon}</Text>
              <View 
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: config.color + '20' }}
              >
                <Text 
                  className="text-xs font-bold tracking-wider"
                  style={{ color: config.color }}
                >
                  {config.badge}
                </Text>
              </View>
            </View>
            
            <Text className={cn(
              "text-lg font-bold leading-6 mb-2",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {task.title}
            </Text>
            
            <Text className={cn(
              "text-sm leading-5",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {task.description}
            </Text>
          </View>
          
          {/* Type Icon */}
          <View className={cn(
            "w-12 h-12 rounded-xl items-center justify-center",
            config.bgColor
          )}>
            <Text className="text-xl">
              {task.type === 'onboarding_quote' ? '💭' : 
               task.type === 'approval' ? '📋' : '📄'}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Content Section */}
      <View className="px-6 py-4">
        {/* Metadata Row */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className={cn(
              "w-6 h-6 rounded-full items-center justify-center mr-2",
              isDark ? "bg-slate-700" : "bg-gray-100"
            )}>
              <Text className="text-xs">👤</Text>
            </View>
            <Text className={cn(
              "text-sm font-medium",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>
              {task.requested_by}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <View className={cn(
              "w-6 h-6 rounded-full items-center justify-center mr-2",
              isDark ? "bg-slate-700" : "bg-gray-100"
            )}>
              <Text className="text-xs">⏰</Text>
            </View>
            <Text className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              Suggested for today at 2:00 PM
            </Text>
          </View>
        </View>
        
        {/* AI Confidence Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className={cn(
              "text-sm font-semibold",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>
              AI Confidence:
            </Text>
            <View className="flex-row items-center">
              <Text className={cn(
                "text-sm font-bold mr-2",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {aiConfidence}%
              </Text>
              <TouchableOpacity>
                <Text className="text-xs text-blue-500 font-semibold">AI Generated</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Enhanced Progress Bar */}
          <View className={cn(
            "h-2 rounded-full overflow-hidden",
            isDark ? "bg-slate-700" : "bg-gray-200"
          )}>
            <View className="h-full flex-row">
              <View 
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${aiConfidence}%` }}
              />
            </View>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={onReject}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl border-2 flex-row items-center justify-center transition-all",
              isDark 
                ? "bg-slate-700 border-slate-600 hover:bg-slate-600" 
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
            )}
          >
            <Text className="text-lg mr-2">👎</Text>
            <Text className={cn(
              "font-semibold",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>
              Decline
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={onApprove}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 flex-row items-center justify-center transition-all shadow-lg"
            style={{
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
          >
            <Text className="text-lg mr-2">👍</Text>
            <Text className="font-semibold text-white">
              Approve
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Enhanced Empty State
const EmptyStateCard: React.FC<{ selectedFilter: string }> = ({ selectedFilter }) => {
  const { isDark } = useTheme();
  
  const emptyStateConfig = {
    easy: { icon: '⚡', title: 'No Easy Wins', subtitle: 'All simple tasks completed!' },
    smart: { icon: '🤖', title: 'No Smart Suggestions', subtitle: 'AI has no recommendations right now' },
    complex: { icon: '📝', title: 'No Complex Tasks', subtitle: 'No challenging items to review' },
    priority: { icon: '🔥', title: 'No Priority Items', subtitle: 'No urgent tasks requiring attention' }
  };
  
  const config = emptyStateConfig[selectedFilter as keyof typeof emptyStateConfig] || emptyStateConfig.smart;
  
  return (
    <View className="flex-1 justify-center items-center py-20">
      <View className={cn(
        "rounded-2xl p-12 items-center border max-w-md mx-auto",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <View className={cn(
          "w-20 h-20 rounded-full items-center justify-center mb-6",
          isDark ? "bg-slate-700" : "bg-gray-100"
        )}>
          <Text className="text-4xl">{config.icon}</Text>
        </View>
        
        <Text className={cn(
          "font-semibold text-xl mb-3 text-center",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {config.title}
        </Text>
        
        <Text className={cn(
          "text-center leading-6",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          {config.subtitle}
        </Text>
        
        <View className="mt-6 flex-row items-center">
          <View className="w-2 h-2 bg-green-500 rounded-full mr-2"></View>
          <Text className={cn(
            "text-sm font-medium",
            isDark ? "text-green-400" : "text-green-600"
          )}>
            Great work staying on top of everything!
          </Text>
        </View>
      </View>
    </View>
  );
};

// Enhanced Stats Card
const StatsCard: React.FC<{
  label: string;
  value: number;
  color: string;
}> = ({ label, value, color }) => {
  const { isDark } = useTheme();
  
  const colorMap = {
    gray: isDark ? 'bg-slate-700' : 'bg-gray-100',
    easy: isDark ? 'bg-teal-900/20' : 'bg-teal-50',
    smart: isDark ? 'bg-purple-900/20' : 'bg-purple-50',
    complex: isDark ? 'bg-orange-900/20' : 'bg-orange-50',
    priority: isDark ? 'bg-red-900/20' : 'bg-red-50'
  };
  
  return (
    <View className={cn(
      "px-4 py-2 rounded-xl border",
      isDark ? "border-slate-600" : "border-gray-200",
             colorMap[color as keyof typeof colorMap] || colorMap.gray
    )}>
      <Text className={cn(
        "text-2xl font-bold text-center mb-1",
        isDark ? "text-white" : "text-gray-900"
      )}>
        {value}
      </Text>
      <Text className={cn(
        "text-xs font-medium text-center",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>
        {label}
      </Text>
    </View>
  );
};

// Helper functions
const getFilterTitle = (filter: string): string => {
  const titles = {
    easy: 'Easy',
    smart: 'Smart',
    complex: 'Complex',
    priority: 'Priority'
  };
  return titles[filter as keyof typeof titles] || 'All';
};

const getFilterColor = (filter: string): string => {
  const colors = {
    easy: 'easy',
    smart: 'smart',
    complex: 'complex',
    priority: 'priority'
  };
  return colors[filter as keyof typeof colors] || 'gray';
};

const getFilterDescription = (filter: string): string => {
  const descriptions = {
    easy: 'Quick wins and simple decisions to build momentum',
    smart: 'AI-curated recommendations based on your patterns and priorities',
    complex: 'Items requiring deeper analysis and careful consideration',
    priority: 'High-impact tasks that need immediate attention'
  };
  return descriptions[filter as keyof typeof descriptions] || 'All available tasks and approvals';
};

// Tablet Approvals Content
export const TabletApprovalsContent: React.FC<{
  filteredTasks: any[];
  handleApprove: (task: any) => void;
  handleReject: (task: any) => void;
}> = ({ filteredTasks, handleApprove, handleReject }) => {
  return (
    <View className="flex-1 px-6">
      <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => (
          <SimpleSwipeCard
            key={task.id}
            onSwipeLeft={() => handleReject(task)}
            onSwipeRight={() => handleApprove(task)}
          >
            <StreamlinedApprovalCard
              approval={task.approval || {
                id: task.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                created_at: task.created_at,
                requested_by: task.requested_by,
                type: task.type,
              }} 
              onPress={() => {
                // Handle press if needed
              }}
            />
          </SimpleSwipeCard>
        ))}
      </View>
    </View>
  );
}; 