/**
 * GoogleConnectionManager Component
 *
 * UI for managing Google service connections via MCP backend.
 * Shows connection status per service, connect/disconnect buttons,
 * and individual sync triggers.
 *
 * Uses the useGoogleConnection hook for state and actions.
 */

import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import {
  Calendar,
  CheckSquare,
  Mail,
  Users,
  X,
  RefreshCw,
  Link2,
  Unlink,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import {
  useGoogleConnection,
  type GoogleService,
  type ServiceConnection,
} from '~/hooks/useGoogleConnection';

// Service configuration with icons, labels, and colors
const SERVICE_CONFIG: Record<
  GoogleService,
  { Icon: typeof Calendar; label: string; colorClass: string; iconColor: string }
> = {
  calendar: {
    Icon: Calendar,
    label: 'Calendar',
    colorClass: 'text-blue-500',
    iconColor: '#3B82F6',
  },
  tasks: {
    Icon: CheckSquare,
    label: 'Tasks',
    colorClass: 'text-green-500',
    iconColor: '#22C55E',
  },
  gmail: {
    Icon: Mail,
    label: 'Gmail',
    colorClass: 'text-red-500',
    iconColor: '#EF4444',
  },
  contacts: {
    Icon: Users,
    label: 'Contacts',
    colorClass: 'text-purple-500',
    iconColor: '#A855F7',
  },
};

/**
 * Format last sync time as relative string
 */
const formatLastSync = (isoString?: string): string => {
  if (!isoString) return 'Never synced';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
};

/**
 * Individual service row showing status and sync button
 */
const ServiceRow = ({
  connection,
  onSync,
  isSyncing,
  isDark,
}: {
  connection: ServiceConnection;
  onSync: () => void;
  isSyncing: boolean;
  isDark: boolean;
}) => {
  const config = SERVICE_CONFIG[connection.service];
  const { Icon, label, iconColor } = config;

  return (
    <View
      className={cn(
        'flex-row items-center py-3 border-b',
        isDark ? 'border-slate-700' : 'border-gray-100'
      )}
    >
      {/* Icon */}
      <View
        className={cn(
          'w-10 h-10 rounded-full items-center justify-center',
          isDark ? 'bg-slate-700' : 'bg-gray-100'
        )}
      >
        <Icon size={20} color={iconColor} />
      </View>

      {/* Info */}
      <View className="flex-1 ml-3">
        <Text
          className={cn(
            'text-base font-medium',
            isDark ? 'text-white' : 'text-gray-900'
          )}
        >
          {label}
        </Text>
        <Text className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
          {connection.isConnected
            ? `${connection.itemsSynced || 0} items - ${formatLastSync(connection.lastSync)}`
            : 'Not connected'}
        </Text>
      </View>

      {/* Status/Sync Button */}
      {connection.isConnected ? (
        <Pressable onPress={onSync} disabled={isSyncing} className="p-2">
          {isSyncing ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : (
            <RefreshCw size={20} color={isDark ? '#64748B' : '#9CA3AF'} />
          )}
        </Pressable>
      ) : (
        <View
          className={cn(
            'w-6 h-6 rounded-full items-center justify-center',
            isDark ? 'bg-slate-700' : 'bg-gray-200'
          )}
        >
          <X size={14} color={isDark ? '#475569' : '#9CA3AF'} />
        </View>
      )}
    </View>
  );
};

interface GoogleConnectionManagerProps {
  /** Show detailed view with all services */
  detailed?: boolean;
}

/**
 * Google Connection Manager
 *
 * Displays connection status for all Google services and provides
 * connect/disconnect/sync functionality.
 */
export const GoogleConnectionManager = ({
  detailed = true,
}: GoogleConnectionManagerProps) => {
  const { isDark } = useTheme();
  const {
    isLoading,
    isConnecting,
    error,
    connections,
    overallStatus,
    connect,
    disconnect,
    triggerSync,
    refresh,
  } = useGoogleConnection();

  const [syncingService, setSyncingService] = useState<GoogleService | null>(null);

  // Handle connect with error display
  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Connection Error', errorMessage);
    }
  }, [connect]);

  // Handle disconnect with confirmation
  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect Google',
      'This will remove access to all Google services. Your synced data will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: disconnect,
        },
      ]
    );
  }, [disconnect]);

  // Handle sync for a service
  const handleSync = useCallback(
    async (service: GoogleService) => {
      setSyncingService(service);
      try {
        await triggerSync(service);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        Alert.alert('Sync Error', errorMessage);
      } finally {
        setSyncingService(null);
      }
    },
    [triggerSync]
  );

  if (isLoading) {
    return (
      <View
        className={cn(
          'rounded-2xl p-6 items-center',
          isDark ? 'bg-slate-800' : 'bg-white'
        )}
      >
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className={cn('mt-2', isDark ? 'text-slate-400' : 'text-gray-500')}>
          Loading connections...
        </Text>
      </View>
    );
  }

  return (
    <View
      className={cn(
        'rounded-2xl overflow-hidden border',
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      )}
    >
      {/* Header */}
      <View
        className={cn(
          'px-4 py-4 border-b',
          isDark ? 'border-slate-700' : 'border-gray-100'
        )}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className={cn(
                'w-3 h-3 rounded-full mr-2',
                overallStatus === 'connected'
                  ? 'bg-green-500'
                  : overallStatus === 'partial'
                  ? 'bg-yellow-500'
                  : isDark
                  ? 'bg-slate-600'
                  : 'bg-gray-300'
              )}
            />
            <Text
              className={cn(
                'text-lg font-bold',
                isDark ? 'text-white' : 'text-gray-900'
              )}
            >
              Google Services
            </Text>
          </View>

          <Pressable onPress={refresh} className="p-2">
            <RefreshCw size={18} color={isDark ? '#64748B' : '#9CA3AF'} />
          </Pressable>
        </View>

        {/* Error Message */}
        {error && (
          <View
            className={cn(
              'flex-row items-center mt-2 rounded-lg px-3 py-2',
              isDark ? 'bg-red-900/30' : 'bg-red-50'
            )}
          >
            <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8 }} />
            <Text
              className={cn(
                'text-sm flex-1',
                isDark ? 'text-red-400' : 'text-red-600'
              )}
            >
              {error}
            </Text>
          </View>
        )}
      </View>

      {/* Services List */}
      {detailed && (
        <View className="px-4">
          {connections.map(conn => (
            <ServiceRow
              key={conn.service}
              connection={conn}
              onSync={() => handleSync(conn.service)}
              isSyncing={syncingService === conn.service}
              isDark={isDark}
            />
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View className="p-4">
        {overallStatus === 'disconnected' ? (
          <Pressable
            onPress={handleConnect}
            disabled={isConnecting}
            className={cn(
              'flex-row items-center justify-center rounded-xl py-3 px-4',
              isConnecting
                ? isDark
                  ? 'bg-indigo-900/50'
                  : 'bg-indigo-200'
                : isDark
                ? 'bg-indigo-600'
                : 'bg-indigo-500'
            )}
          >
            {isConnecting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Link2 size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold">Connect Google Account</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={handleDisconnect}
            className={cn(
              'flex-row items-center justify-center border rounded-xl py-3 px-4',
              isDark ? 'border-red-800/50' : 'border-red-200'
            )}
          >
            <Unlink size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text className={cn('font-medium', isDark ? 'text-red-400' : 'text-red-500')}>
              Disconnect
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default GoogleConnectionManager;
