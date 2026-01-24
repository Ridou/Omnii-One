import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated,
} from 'react-native';
import { cn } from '~/utils/cn';
import { convertColorToClass } from '~/utils/colorMapping';
import { getMinimumTouchTarget } from '~/utils/typography';

interface ApprovalCardProps {
  approval: {
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    created_at: string;
    requested_by: string;
    type: string;
  };
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  onPress?: () => void;
  className?: string; // Added for extensibility
}

export default function ApprovalCard({ 
  approval, 
  onApprove, 
  onDecline, 
  onPress,
  className 
}: ApprovalCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const getPriorityConfig = (priority: string) => {
    switch(priority) {
      case 'high':
        return {
          badgeClass: 'bg-priority-high',
          borderClass: 'border-priority-high',
          label: 'HIGH PRIORITY',
          emoji: '🔥',
        };
      case 'medium':
        return {
          badgeClass: 'bg-priority-medium',
          borderClass: 'border-priority-medium',
          label: 'MEDIUM PRIORITY',
          emoji: '📊',
        };
      case 'low':
        return {
          badgeClass: 'bg-priority-low',
          borderClass: 'border-priority-low',
          label: 'LOW PRIORITY',
          emoji: '✅',
        };
      default:
        return {
          badgeClass: 'bg-ai-start',
          borderClass: 'border-ai-start',
          label: 'PRIORITY',
          emoji: '📋',
        };
    }
  };

  const priorityConfig = getPriorityConfig(approval.priority);
  const minimumTouchTarget = getMinimumTouchTarget();

  const handleApprove = async (id: string) => {
    if (onApprove) {
      onApprove(id);
    }
  };

  const handleDecline = async (id: string) => {
    if (onDecline) {
      onDecline(id);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      className={cn(
        "accessible-touch mb-3",
        className
      )}
      style={[minimumTouchTarget]}
    >
      <Animated.View
        className={cn(
          "card-omnii border-l-4",
          priorityConfig.borderClass,
          "opacity-100"
        )}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {/* Priority Badge */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xs text-omnii-text-secondary">
            {new Date(approval.created_at).toLocaleDateString()}
          </Text>
          <View 
            className={cn(
              "px-2 py-1 rounded-full",
              priorityConfig.badgeClass,
              "bg-opacity-10"
            )}
          >
            <Text 
              className={cn(
                "text-xs font-semibold capitalize",
                priorityConfig.badgeClass === 'bg-priority-high' && "text-priority-high",
                priorityConfig.badgeClass === 'bg-priority-medium' && "text-priority-medium",
                priorityConfig.badgeClass === 'bg-priority-low' && "text-priority-low"
              )}
            >
              {approval.priority} Priority
            </Text>
          </View>
        </View>

        {/* Title with Emoji */}
        <Text 
          className="text-omnii-heading text-lg mb-2 leading-7"
          numberOfLines={2}
        >
          {priorityConfig.emoji} {approval.title}
        </Text>

        {/* Description */}
        <Text 
          className="text-omnii-body text-sm mb-4 leading-6"
          numberOfLines={3}
        >
          {approval.description}
        </Text>

        {/* Meta Information */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xs text-omnii-text-secondary">
            Requested by: {approval.requested_by}
          </Text>
          <Text className="text-xs text-omnii-text-secondary">
            Type: {approval.type}
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          {onApprove && (
            <TouchableOpacity
              className="btn-omnii-primary bg-success flex-1"
              onPress={() => handleApprove(approval.id)}
              style={[minimumTouchTarget]}
            >
              <Text className="text-white text-sm font-semibold leading-5">✓ Approve</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="btn-omnii-primary bg-ai-start flex-1"
            onPress={onPress}
            style={[minimumTouchTarget]}
          >
            <Text className="text-white text-sm font-semibold leading-5">👁 Details</Text>
          </TouchableOpacity>

          {onDecline && (
            <TouchableOpacity
              className="btn-omnii-secondary border-2 flex-1"
              onPress={() => handleDecline(approval.id)}
              style={[minimumTouchTarget]}
            >
              <Text className="text-omnii-text-primary text-sm font-semibold leading-5">✕ Decline</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}