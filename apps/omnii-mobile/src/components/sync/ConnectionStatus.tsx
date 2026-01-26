/**
 * ConnectionStatus - Full connection status display component
 *
 * Shows detailed sync information:
 * - Current status (offline/connecting/syncing/synced/error)
 * - Status icon and label
 * - Pending changes count
 * - Last synced time
 * - Error message (when applicable)
 *
 * Usage:
 * ```tsx
 * <ConnectionStatus detailed interactive />
 * ```
 */

import { View, Text, Pressable } from 'react-native';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSyncState, type SyncStatus } from '~/context/SyncContext';

// Status configuration for display
const STATUS_CONFIG: Record<
  SyncStatus,
  {
    icon: typeof Wifi;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  offline: {
    icon: WifiOff,
    color: '#6b7280', // gray-500
    bgColor: '#f3f4f6', // gray-100
    label: 'Offline',
  },
  connecting: {
    icon: Wifi,
    color: '#eab308', // yellow-500
    bgColor: '#fefce8', // yellow-50
    label: 'Connecting...',
  },
  syncing: {
    icon: RefreshCw,
    color: '#3b82f6', // blue-500
    bgColor: '#eff6ff', // blue-50
    label: 'Syncing...',
  },
  synced: {
    icon: Check,
    color: '#22c55e', // green-500
    bgColor: '#f0fdf4', // green-50
    label: 'Synced',
  },
  error: {
    icon: AlertCircle,
    color: '#ef4444', // red-500
    bgColor: '#fef2f2', // red-50
    label: 'Sync Error',
  },
};

/**
 * Format relative time for last synced display
 */
const formatLastSynced = (date: Date | null): string => {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

interface ConnectionStatusProps {
  /** Show detailed info (last synced, pending count) */
  detailed?: boolean;
  /** Allow tap to trigger sync */
  interactive?: boolean;
  /** Custom class names */
  className?: string;
}

export const ConnectionStatus = ({
  detailed = false,
  interactive = true,
  className = '',
}: ConnectionStatusProps) => {
  const {
    status,
    isSyncing,
    isConnected,
    lastSyncedAt,
    pendingChanges,
    error,
    triggerSync,
  } = useSyncState();

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Spinning animation for syncing state
  const spinStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: isSyncing
          ? withRepeat(
              withTiming('360deg', { duration: 1000, easing: Easing.linear }),
              -1,
              false
            )
          : '0deg',
      },
    ],
  }));

  const handlePress = async () => {
    if (interactive && !isSyncing && isConnected) {
      await triggerSync();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!interactive || isSyncing}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: config.bgColor,
      }}
    >
      {/* Status Icon */}
      <Animated.View style={status === 'syncing' ? spinStyle : undefined}>
        <Icon size={16} color={config.color} strokeWidth={2.5} />
      </Animated.View>

      {/* Status Label */}
      <Text
        style={{
          marginLeft: 8,
          fontSize: 14,
          fontWeight: '500',
          color: config.color,
        }}
      >
        {config.label}
      </Text>

      {/* Pending Changes Badge */}
      {pendingChanges > 0 && status !== 'syncing' && (
        <View
          style={{
            marginLeft: 8,
            backgroundColor: '#3b82f6',
            borderRadius: 9999,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              color: '#ffffff',
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            {pendingChanges}
          </Text>
        </View>
      )}

      {/* Detailed Info */}
      {detailed && (
        <View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {lastSyncedAt && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={12} color="#9ca3af" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {formatLastSynced(lastSyncedAt)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Error Message */}
      {error && detailed && (
        <Text
          style={{
            marginLeft: 8,
            fontSize: 12,
            color: '#ef4444',
          }}
          numberOfLines={1}
        >
          {error}
        </Text>
      )}
    </Pressable>
  );
};

export default ConnectionStatus;
