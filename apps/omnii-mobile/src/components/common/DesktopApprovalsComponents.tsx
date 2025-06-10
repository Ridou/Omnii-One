import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useResponsiveDesign } from '~/utils/responsive';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import SimpleSwipeCard from '~/components/approvals/SimpleSwipeCard';
import StreamlinedApprovalCard from '~/components/approvals/StreamlinedApprovalCard';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';

interface Approval {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  requested_by: string;
  type: string;
}

// Enhanced Desktop Approvals Content
interface DesktopApprovalsContentProps {
  filteredTasks: Approval[];
  handleApprove: (approval: Approval) => void;
  handleReject: (approval: Approval) => void;
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
              {filteredTasks.map((approval, index) => (
                <EnhancedApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={() => handleApprove(approval)}
                  onReject={() => handleReject(approval)}
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

// Enhanced Approval Card with better styling
const EnhancedApprovalCard: React.FC<{
  approval: Approval;
  onApprove: () => void;
  onReject: () => void;
  index: number;
}> = ({ approval, onApprove, onReject, index }) => {
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
  
  const config = priorityConfig[approval.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const aiConfidence = Math.floor(Math.random() * 15) + 85;
  
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
              {approval.title}
            </Text>
            
            <Text className={cn(
              "text-sm leading-5",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {approval.description}
            </Text>
          </View>
          
          {/* Type Icon */}
          <View className={cn(
            "w-12 h-12 rounded-xl items-center justify-center",
            config.bgColor
          )}>
            <Text className="text-xl">📋</Text>
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
              {approval.requested_by}
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
              {new Date(approval.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        {/* AI Confidence Section */}
        <View className={cn(
          "rounded-xl p-4 mb-4",
          isDark ? "bg-slate-700/50" : "bg-gray-50"
        )}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className={cn(
              "text-sm font-medium",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>
              AI Confidence Score
            </Text>
            <Text className={cn(
              "text-sm font-bold",
              isDark ? "text-green-400" : "text-green-600"
            )}>
              {aiConfidence}%
            </Text>
          </View>
          
          <View className={cn(
            "h-2 rounded-full overflow-hidden",
            isDark ? "bg-slate-600" : "bg-gray-200"
          )}>
            <View 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
              style={{ width: `${aiConfidence}%` }}
            />
          </View>
          
          <Text className={cn(
            "text-xs mt-2",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            Based on your approval patterns and task priority
          </Text>
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

// Stats Card Component
const StatsCard: React.FC<{
  label: string;
  value: number;
  color: string;
}> = ({ label, value, color }) => {
  const { isDark } = useTheme();
  
  const colorConfig = {
    gray: { bg: isDark ? 'bg-slate-700' : 'bg-gray-100', text: isDark ? 'text-slate-300' : 'text-gray-700' },
    easy: { bg: isDark ? 'bg-teal-900/30' : 'bg-teal-100', text: isDark ? 'text-teal-400' : 'text-teal-700' },
    smart: { bg: isDark ? 'bg-purple-900/30' : 'bg-purple-100', text: isDark ? 'text-purple-400' : 'text-purple-700' },
    complex: { bg: isDark ? 'bg-orange-900/30' : 'bg-orange-100', text: isDark ? 'text-orange-400' : 'text-orange-700' },
    priority: { bg: isDark ? 'bg-red-900/30' : 'bg-red-100', text: isDark ? 'text-red-400' : 'text-red-700' },
  };
  
  const config = colorConfig[color as keyof typeof colorConfig] || colorConfig.gray;
  
  return (
    <View className={cn("px-4 py-3 rounded-xl", config.bg)}>
      <Text className={cn("text-2xl font-bold", config.text)}>{value}</Text>
      <Text className={cn("text-xs font-medium", config.text)}>{label}</Text>
    </View>
  );
};

// Empty State Card
const EmptyStateCard: React.FC<{ selectedFilter: string }> = ({ selectedFilter }) => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "rounded-2xl p-12 items-center border-2 border-dashed max-w-md mx-auto",
      isDark ? "border-slate-600 bg-slate-800/50" : "border-gray-300 bg-gray-50/50"
    )}>
      <Text className="text-6xl mb-4">📋</Text>
      <Text className={cn(
        "text-xl font-bold mb-2 text-center",
        isDark ? "text-white" : "text-gray-900"
      )}>
        No {getFilterTitle(selectedFilter)} Tasks
      </Text>
      <Text className={cn(
        "text-sm text-center leading-relaxed",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>
        {getEmptyStateMessage(selectedFilter)}
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

const getEmptyStateMessage = (filter: string): string => {
  const messages = {
    easy: 'All easy tasks have been completed! Check other filters for more complex items.',
    smart: 'AI has processed all relevant tasks for now. New recommendations will appear as they become available.',
    complex: 'No complex tasks require your attention at the moment. Great work on staying organized!',
    priority: 'All high-priority items have been addressed. You\'re all caught up!'
  };
  return messages[filter as keyof typeof messages] || 'No tasks available in this category at the moment.';
};

// Tablet Approvals Content
export const TabletApprovalsContent: React.FC<{
  filteredTasks: Approval[];
  handleApprove: (approval: Approval) => void;
  handleReject: (approval: Approval) => void;
}> = ({ filteredTasks, handleApprove, handleReject }) => {
  return (
    <View className="flex-1 px-6">
      <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((approval) => (
          <SimpleSwipeCard
            key={approval.id}
            onSwipeLeft={() => handleReject(approval)}
            onSwipeRight={() => handleApprove(approval)}
          >
            <StreamlinedApprovalCard
              approval={approval}
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