import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { 
  checkGoogleTokenStatus, 
  initiateGoogleOAuth, 
  disconnectGoogleIntegration,
  type GoogleTokenStatus 
} from '~/services/googleIntegration';
import { cn } from '~/utils/cn';

interface GoogleIntegrationCardProps {
  onStatusChange?: (connected: boolean) => void;
}

export const GoogleIntegrationCard: React.FC<GoogleIntegrationCardProps> = ({ 
  onStatusChange 
}) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
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
      console.error('Failed to check Google status:', error);
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
      
      Alert.alert('Success', 'Google Workspace connected successfully!');
    } catch (error) {
      console.error('Failed to connect Google:', error);
      Alert.alert('Connection Failed', 'Please try again. Make sure to grant all permissions.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google Workspace',
      'This will disconnect all Google services. You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectGoogleIntegration();
              await checkStatus();
              Alert.alert('Disconnected', 'Google Workspace has been disconnected.');
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className={cn("rounded-2xl p-6 border shadow-sm border-l-4 border-l-blue-500", 
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200")}>
        <View className="flex-row items-center justify-center py-8">
          <ActivityIndicator size="small" color={isDark ? "#3B82F6" : "#1D4ED8"} />
          <Text className={cn("ml-3 text-sm", isDark ? "text-slate-300" : "text-gray-600")}>
            Checking Google connection...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className={cn("rounded-2xl p-6 border shadow-sm border-l-4", 
      status.isValid 
        ? "border-l-green-500" 
        : "border-l-blue-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-4">
        <View className={cn("w-12 h-12 rounded-xl items-center justify-center mr-4", 
          status.isValid
            ? (isDark ? "bg-green-900/30" : "bg-green-100")
            : (isDark ? "bg-blue-900/30" : "bg-blue-100")
        )}>
          <Text className="text-2xl">
            {status.isValid ? '✅' : '🔗'}
          </Text>
        </View>
        
        <View className="flex-1">
          <Text className={cn("text-xl font-bold font-omnii-bold", 
            isDark ? "text-white" : "text-gray-900")}>
            Google Workspace
          </Text>
          <Text className={cn("text-sm leading-6", 
            isDark ? "text-slate-400" : "text-gray-600")}>
            {status.isValid 
              ? `Connected • ${status.services.length} services`
              : 'Connect Gmail, Calendar, Tasks & more'
            }
          </Text>
        </View>

        {status.isValid && (
          <View className={cn("px-3 py-1.5 rounded-full", 
            isDark ? "bg-green-900/20" : "bg-green-100")}>
            <Text className={cn("text-xs font-semibold", 
              isDark ? "text-green-400" : "text-green-700")}>
              Connected
            </Text>
          </View>
        )}
      </View>

      {status.isValid ? (
        <>
          {/* Connected State */}
          <View className="mb-4">
            <Text className={cn("text-sm font-medium mb-2", 
              isDark ? "text-slate-300" : "text-gray-700")}>
              Account: {status.email}
            </Text>
            <Text className={cn("text-xs", 
              isDark ? "text-slate-400" : "text-gray-500")}>
              Last connected: {status.lastConnected ? 
                new Date(status.lastConnected).toLocaleDateString() : 'Recently'
              }
            </Text>
          </View>

          <View className="mb-4">
            <Text className={cn("text-sm font-medium mb-2", 
              isDark ? "text-slate-300" : "text-gray-700")}>
              Connected Services:
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {status.services.map((service) => (
                <View key={service} className={cn("px-2 py-1 rounded", 
                  isDark ? "bg-slate-700" : "bg-gray-100")}>
                  <Text className={cn("text-xs", 
                    isDark ? "text-slate-300" : "text-gray-600")}>
                    {service}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            className={cn("px-4 py-3 rounded-xl border", 
              isDark 
                ? "bg-red-900/20 border-red-700 hover:bg-red-900/30" 
                : "bg-red-50 border-red-200 hover:bg-red-100"
            )}
            onPress={handleDisconnect}
          >
            <Text className={cn("text-sm font-semibold text-center", 
              isDark ? "text-red-400" : "text-red-700")}>
              Disconnect
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Disconnected State */}
          <Text className={cn("text-sm leading-6 mb-4", 
            isDark ? "text-slate-300" : "text-gray-600")}>
            Connect your Google account to unlock AI-powered email management, 
            calendar optimization, and task synchronization.
          </Text>

          <View className="mb-4">
            <Text className={cn("text-sm font-medium mb-2", 
              isDark ? "text-slate-300" : "text-gray-700")}>
              Features you'll unlock:
            </Text>
            <View className="space-y-2">
              {[
                'Smart email processing & task extraction',
                'Calendar event optimization',
                'Automatic task synchronization',
                'Contact management integration'
              ].map((feature, index) => (
                <View key={index} className="flex-row items-center">
                  <View className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></View>
                  <Text className={cn("text-sm", 
                    isDark ? "text-slate-400" : "text-gray-600")}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            className={cn("px-6 py-4 rounded-xl flex-row items-center justify-center", 
              isConnecting
                ? (isDark ? "bg-blue-900/50" : "bg-blue-100")
                : (isDark ? "bg-blue-900/20 hover:bg-blue-900/30" : "bg-blue-50 hover:bg-blue-100")
            )}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <ActivityIndicator size="small" color={isDark ? "#60A5FA" : "#2563EB"} />
                <Text className={cn("ml-3 text-sm font-semibold", 
                  isDark ? "text-blue-400" : "text-blue-700")}>
                  Connecting...
                </Text>
              </>
            ) : (
              <Text className={cn("text-sm font-semibold", 
                isDark ? "text-blue-400" : "text-blue-700")}>
                🔗 Connect Google Workspace
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}; 