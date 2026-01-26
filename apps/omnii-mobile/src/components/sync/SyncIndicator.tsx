/**
 * SyncIndicator - Compact sync status indicator
 *
 * A minimal colored dot that shows sync status.
 * Suitable for navigation headers or other space-constrained areas.
 *
 * Features:
 * - Color-coded status (green=synced, blue=syncing, yellow=connecting, gray=offline, red=error)
 * - Pulse animation when syncing/connecting
 * - Interactive tap to trigger sync
 *
 * Usage:
 * ```tsx
 * <Stack.Screen
 *   options={{
 *     headerRight: () => <SyncIndicator className="mr-4" />,
 *   }}
 * />
 * ```
 */

import { View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSyncState, type SyncStatus } from '~/context/SyncContext';

// Color mapping for status dot
const STATUS_COLORS: Record<SyncStatus, string> = {
  offline: '#9ca3af', // gray-400
  connecting: '#facc15', // yellow-400
  syncing: '#60a5fa', // blue-400
  synced: '#4ade80', // green-400
  error: '#f87171', // red-400
};

interface SyncIndicatorProps {
  /** Size of the dot in pixels */
  size?: number;
  /** Allow tap to trigger sync */
  interactive?: boolean;
  /** Custom class names (not used directly but kept for API consistency) */
  className?: string;
}

export const SyncIndicator = ({
  size = 8,
  interactive = true,
  className = '',
}: SyncIndicatorProps) => {
  const { status, isSyncing, isConnected, triggerSync } = useSyncState();

  // Pulsing animation for syncing/connecting states
  const pulseStyle = useAnimatedStyle(() => {
    if (status === 'syncing' || status === 'connecting') {
      return {
        opacity: withRepeat(
          withSequence(
            withTiming(0.3, { duration: 500, easing: Easing.ease }),
            withTiming(1, { duration: 500, easing: Easing.ease })
          ),
          -1,
          true
        ),
      };
    }
    return { opacity: 1 };
  });

  const handlePress = async () => {
    if (interactive && !isSyncing && isConnected) {
      await triggerSync();
    }
  };

  const color = STATUS_COLORS[status];

  return (
    <Pressable
      onPress={handlePress}
      disabled={!interactive || isSyncing}
      style={{ padding: 8 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          pulseStyle,
        ]}
      />
    </Pressable>
  );
};

export default SyncIndicator;
