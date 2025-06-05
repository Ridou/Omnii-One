import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated,
  AccessibilityInfo,
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
          accessibilityLabel: 'High priority task',
        };
      case 'medium':
        return {
          badgeClass: 'bg-priority-medium',
          borderClass: 'border-priority-medium',
          label: 'MEDIUM PRIORITY',
          emoji: '📊',
          accessibilityLabel: 'Medium priority task',
        };
      case 'low':
        return {
          badgeClass: 'bg-priority-low',
          borderClass: 'border-priority-low',
          label: 'LOW PRIORITY',
          emoji: '✅',
          accessibilityLabel: 'Low priority task',
        };
      default:
        return {
          badgeClass: 'bg-ai-start',
          borderClass: 'border-ai-start',
          label: 'PRIORITY',
          emoji: '📋',
          accessibilityLabel: 'Priority task',
        };
    }
  };

  const priorityConfig = getPriorityConfig(approval.priority);
  const minimumTouchTarget = getMinimumTouchTarget();

  // Create comprehensive accessibility label
  const createAccessibilityLabel = () => {
    return `${priorityConfig.accessibilityLabel}. ${approval.title}. ${approval.description}. AI Generated task suggested for today at 2 PM.`;
  };

  const createAccessibilityHint = () => {
    const actions = [];
    if (onApprove) actions.push('approve');
    if (onDecline) actions.push('decline');
    if (onPress) actions.push('view details');
    
    return actions.length > 0 
      ? `Double tap to view details. Available actions: ${actions.join(', ')}.`
      : 'Double tap to view details.';
  };

  const handleApprove = async (id: string) => {
    if (onApprove) {
      onApprove(id);
      // Announce to screen reader
      AccessibilityInfo.announceForAccessibility('Task approved');
    }
  };

  const handleDecline = async (id: string) => {
    if (onDecline) {
      onDecline(id);
      // Announce to screen reader
      AccessibilityInfo.announceForAccessibility('Task declined');
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={createAccessibilityLabel()}
      accessibilityHint={createAccessibilityHint()}
      accessibilityState={{
        selected: false,
        disabled: false,
      }}
      className={cn(
        "accessible-touch mb-3",
        className
      )}
      style={[minimumTouchTarget]}
    >
      <Animated.View
        className={cn(
          "omnii-card border-l-4",
          priorityConfig.borderClass
        )}
        style={{ transform: [{ scale: scaleAnim }] }}
        accessible={false} // Let parent handle accessibility
      >
        {/* Priority Badge */}
        <View 
          className="mb-3"
          accessible={false} // Part of main accessibility label
        >
          <View
            className={cn(
              "self-start px-3 py-1.5 rounded-xl min-h-[28px]",
              priorityConfig.badgeClass
            )}
            accessible={false} // Part of main accessibility label
          >
            <Text 
              className="text-white text-xs font-semibold leading-4"
              accessible={false} // Part of main accessibility label
            >
              {priorityConfig.label}
            </Text>
          </View>
        </View>

        {/* Title with Emoji */}
        <Text 
          className="omnii-heading text-lg mb-2 leading-7"
          accessible={false} // Part of main accessibility label
        >
          {priorityConfig.emoji} {approval.title}
        </Text>

        {/* Description */}
        <Text 
          className="omnii-body text-sm mb-4 leading-6"
          accessible={false} // Part of main accessibility label
        >
          {approval.description}
        </Text>

        {/* Meta Information */}
        <View 
          className="flex-row justify-between items-center mb-4 flex-wrap gap-2"
          accessible={false} // Part of main accessibility label
        >
          <Text 
            className="omnii-caption text-sm leading-5"
            accessible={false} // Part of main accessibility label
          >
            📅 Suggested for today at 2:00 PM
          </Text>
          <View 
            className="bg-ai-start/10 px-2.5 py-1.5 rounded-lg min-h-[28px]"
            accessible={false} // Part of main accessibility label
          >
            <Text 
              className="text-ai-start text-xs font-semibold leading-4"
              accessible={false} // Part of main accessibility label
            >
              AI Generated
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View 
          className="flex-row gap-3 flex-wrap"
          accessible={false} // Individual buttons handle their own accessibility
        >
          {onApprove && (
            <TouchableOpacity
              className="omnii-btn-primary bg-success flex-1"
              onPress={() => handleApprove(approval.id)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Approve ${approval.title}`}
              accessibilityHint="Double tap to approve this AI suggested task"
              accessibilityState={{
                disabled: false,
              }}
              style={[minimumTouchTarget]}
            >
              <Text className="text-white text-sm font-semibold leading-5">✓ Approve</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="omnii-btn-primary bg-ai-start flex-1"
            onPress={onPress}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${approval.title}`}
            accessibilityHint="Double tap to view detailed information about this task"
            accessibilityState={{
              disabled: false,
            }}
            style={[minimumTouchTarget]}
          >
            <Text className="text-white text-sm font-semibold leading-5">Details</Text>
          </TouchableOpacity>

          {onDecline && (
            <TouchableOpacity
              className="omnii-btn-secondary border-2 flex-1"
              onPress={() => handleDecline(approval.id)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Decline ${approval.title}`}
              accessibilityHint="Double tap to decline this AI suggested task"
              accessibilityState={{
                disabled: false,
              }}
              style={[minimumTouchTarget]}
            >
              <Text className="text-omnii-text-secondary text-sm font-semibold leading-5">✕ Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}