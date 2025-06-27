import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { useAuth } from '~/context/AuthContext';
import { cn } from '~/utils/cn';
import { 
  checkGoogleTokenStatus, 
  initiateGoogleOAuth,
  type GoogleTokenStatus 
} from '~/services/googleIntegration';

interface GoogleServicesStatusProps {
  showCompactView?: boolean;
  onStatusChange?: (connected: boolean) => void;
}

export const GoogleServicesStatus: React.FC<GoogleServicesStatusProps> = ({
  showCompactView = false,
  onStatusChange
}) => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [status, setStatus] = useState<GoogleTokenStatus>({
    isValid: false,
    needsReconnection: true,
    services: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check status on mount and when user changes
  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user]);

  const checkStatus = async () => {
    try {
      setIsLoading(true);
      const result = await checkGoogleTokenStatus();
      setStatus(result);
      onStatusChange?.(result.isValid);
    } catch (error) {
      setStatus({ isValid: false, needsReconnection: true, services: [] });
      onStatusChange?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await initiateGoogleOAuth();
      
      // Check status after connection attempt
      await checkStatus();
      
    } catch (error) {
      console.error('[GoogleServicesStatus] Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <View className={cn(
        "p-4 rounded-xl border flex-row items-center",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <ActivityIndicator size="small" color={isDark ? "#64748b" : "#6b7280"} />
        <Text className={cn(
          "ml-3 text-sm",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          Checking Google services...
        </Text>
      </View>
    );
  }

  // Compact view for analytics screen
  if (showCompactView) {
    if (status.isValid) {
      return (
        <View className={cn(
          "px-3 py-2 rounded-lg flex-row items-center",
          isDark ? "bg-green-900/30 border border-green-700" : "bg-green-50 border border-green-200"
        )}>
          <Text className="text-green-500 text-sm mr-2">✅</Text>
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-green-400" : "text-green-700"
          )}>
            Google Connected
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={handleConnect}
        disabled={isConnecting}
        className={cn(
          "px-3 py-2 rounded-lg flex-row items-center",
          isDark ? "bg-amber-900/30 border border-amber-700" : "bg-amber-50 border border-amber-200"
        )}
      >
        <Text className="text-amber-500 text-sm mr-2">⚠️</Text>
        <Text className={cn(
          "text-xs font-medium",
          isDark ? "text-amber-400" : "text-amber-700"
        )}>
          {isConnecting ? "Connecting..." : "Connect Google"}
        </Text>
      </TouchableOpacity>
    );
  }

  // Full view for settings/profile screens
  return (
    <View className={cn(
      "rounded-xl border p-4",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className={cn(
            "w-10 h-10 rounded-lg items-center justify-center mr-3",
            status.isValid 
              ? isDark ? "bg-green-900/30" : "bg-green-100"
              : isDark ? "bg-amber-900/30" : "bg-amber-100"
          )}>
            <Text className="text-xl">
              {status.isValid ? "✅" : "🔗"}
            </Text>
          </View>
          <View>
            <Text className={cn(
              "text-base font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              Google Workspace
            </Text>
            <Text className={cn(
              "text-sm",
              status.isValid 
                ? isDark ? "text-green-400" : "text-green-600"
                : isDark ? "text-amber-400" : "text-amber-600"
            )}>
              {status.isValid ? "Connected" : "Not Connected"}
            </Text>
          </View>
        </View>

        {!status.isValid && (
          <TouchableOpacity
            onPress={handleConnect}
            disabled={isConnecting}
            className={cn(
              "px-4 py-2 rounded-lg",
              isDark ? "bg-blue-600" : "bg-blue-500"
            )}
          >
            <Text className="text-white text-sm font-medium">
              {isConnecting ? "Connecting..." : "Connect"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Service Status Details */}
      <View className="space-y-2">
        {[
          { key: 'gmail', name: 'Gmail', icon: '📧' },
          { key: 'calendar', name: 'Calendar', icon: '📅' },
          { key: 'tasks', name: 'Tasks', icon: '📋' },
          { key: 'contacts', name: 'Contacts', icon: '👥' }
        ].map((service) => {
          const isServiceConnected = status.services.includes(service.key);
          
          return (
            <View key={service.key} className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-base mr-2">{service.icon}</Text>
                <Text className={cn(
                  "text-sm",
                  isDark ? "text-slate-300" : "text-gray-700"
                )}>
                  {service.name}
                </Text>
              </View>
              
              <View className="flex-row items-center">
                <Text className={cn(
                  "text-xs mr-1",
                  isServiceConnected 
                    ? isDark ? "text-green-400" : "text-green-600"
                    : isDark ? "text-slate-500" : "text-gray-500"
                )}>
                  {isServiceConnected ? "Connected" : "Pending"}
                </Text>
                <Text className="text-sm">
                  {isServiceConnected ? "✅" : "⏳"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {status.isValid && (
        <View className={cn(
          "mt-3 p-3 rounded-lg",
          isDark ? "bg-green-900/20" : "bg-green-50"
        )}>
          <Text className={cn(
            "text-xs text-center",
            isDark ? "text-green-400" : "text-green-700"
          )}>
            🎉 All set! Your Google services are connected and data is being cached for fast access.
          </Text>
        </View>
      )}

      {!status.isValid && (
        <View className={cn(
          "mt-3 p-3 rounded-lg",
          isDark ? "bg-amber-900/20" : "bg-amber-50"
        )}>
          <Text className={cn(
            "text-xs text-center",
            isDark ? "text-amber-400" : "text-amber-700"
          )}>
            ⚡ Connect Google to unlock AI-powered analytics, task management, and productivity insights.
          </Text>
        </View>
      )}
    </View>
  );
}; 