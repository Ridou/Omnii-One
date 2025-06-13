import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { useEmail, useEmailStats } from '~/hooks/useEmail';
import type { EmailData } from '@omnii/validators';

interface EmailMemoryCardProps {
  onEmailAction?: (action: string, data?: any) => void;
}

export const EmailMemoryCard: React.FC<EmailMemoryCardProps> = ({
  onEmailAction
}) => {
  const { isDark } = useTheme();
  
  // Use email hooks
  const {
    emails,
    isLoading,
    hasError,
    totalEmails,
    unreadCount,
    hasEmails,
  } = useEmail(5, "newer_than:7d"); // Get first 5 emails from last 7 days

  const { stats } = useEmailStats();

  const handleViewAllEmails = () => {
    onEmailAction?.('view_all_emails', null);
  };

  const handleEmailPress = (email: EmailData) => {
    onEmailAction?.('email_selected', { email });
  };

  if (hasError) {
    return (
      <View className={cn(
        "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-amber-500",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <View className="flex-row items-center mb-3">
          <View className={cn(
            "w-10 h-10 rounded-lg items-center justify-center mr-3",
            isDark ? "bg-amber-900/30" : "bg-amber-100"
          )}>
            <Text className="text-xl">📧</Text>
          </View>
          <Text className={cn(
            "text-lg font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}>Emails</Text>
        </View>
        <Text className={cn(
          "text-sm",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>Failed to load emails</Text>
      </View>
    );
  }

  const formatSender = (from: string) => {
    // Extract name from "Name <email@domain.com>" format
    const match = from.match(/^(.+?)\s*<.+>$/);
    if (match) {
      return match[1]!.replace(/['"]/g, ''); // Remove quotes
    }
    // If no name, show first part of email
    const emailMatch = from.match(/([^@]+)@/);
    return emailMatch ? emailMatch[1]! : from;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <View className={cn(
      "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-blue-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className={cn(
            "w-10 h-10 rounded-lg items-center justify-center mr-3",
            isDark ? "bg-blue-900/30" : "bg-blue-100"
          )}>
            <Text className="text-xl">📧</Text>
          </View>
          <View>
            <Text className={cn(
              "text-lg font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>Emails</Text>
            <Text className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {isLoading ? 'Loading...' : `${totalEmails} emails • ${unreadCount} unread`}
            </Text>
          </View>
        </View>
        
        {hasEmails && (
          <TouchableOpacity
            onPress={handleViewAllEmails}
            className={cn(
              "px-3 py-1.5 rounded-lg",
              isDark ? "bg-blue-600" : "bg-blue-500"
            )}
          >
            <Text className="text-white text-xs font-medium">View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Row */}
      {stats && (
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className={cn(
              "text-lg font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {stats.total_emails}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              Total
            </Text>
          </View>
          <View className="items-center">
            <Text className={cn(
              "text-lg font-semibold",
              unreadCount > 0 
                ? isDark ? "text-red-400" : "text-red-600"
                : isDark ? "text-white" : "text-gray-900"
            )}>
              {stats.unread_emails}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              Unread
            </Text>
          </View>
          <View className="items-center">
            <Text className={cn(
              "text-lg font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {stats.read_emails}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              Read
            </Text>
          </View>
        </View>
      )}

      {/* Recent Emails */}
      {hasEmails && emails.length > 0 && (
        <View>
          <Text className={cn(
            "text-sm font-medium mb-3",
            isDark ? "text-slate-300" : "text-gray-700"
          )}>
            Recent Emails
          </Text>
          <View className="gap-2">
            {emails.slice(0, 3).map((email) => (
              <TouchableOpacity
                key={email.id}
                onPress={() => handleEmailPress(email)}
                className={cn(
                  "p-3 rounded-lg border",
                  !email.isRead 
                    ? isDark ? "bg-blue-900/20 border-blue-700/50" : "bg-blue-50 border-blue-200"
                    : isDark ? "bg-slate-700/50 border-slate-600" : "bg-gray-50 border-gray-200"
                )}
              >
                <View className="flex-row items-start justify-between mb-1">
                  <Text className={cn(
                    "text-sm font-medium flex-1 mr-2",
                    !email.isRead 
                      ? isDark ? "text-blue-300" : "text-blue-700"
                      : isDark ? "text-white" : "text-gray-900"
                  )} numberOfLines={1}>
                    {formatSender(email.from)}
                  </Text>
                  <Text className={cn(
                    "text-xs",
                    isDark ? "text-slate-400" : "text-gray-500"
                  )}>
                    {formatTimeAgo(email.date ?? email.messageTimestamp ?? '')}
                  </Text>
                </View>
                
                <Text className={cn(
                  "text-sm font-medium mb-1",
                  !email.isRead 
                    ? isDark ? "text-white" : "text-gray-900"
                    : isDark ? "text-slate-300" : "text-gray-700"
                )} numberOfLines={1}>
                  {email.subject}
                </Text>
                
                {email.preview && (
                  <Text className={cn(
                    "text-xs",
                    isDark ? "text-slate-400" : "text-gray-600"
                  )} numberOfLines={2}>
                    {email.preview}
                  </Text>
                )}
                
                <View className="flex-row items-center justify-between mt-2">
                  <View className="flex-row items-center">
                    {!email.isRead && (
                      <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                    )}
                    {email.attachments && email.attachments.length > 0 && (
                      <Text className={cn(
                        "text-xs mr-2",
                        isDark ? "text-slate-400" : "text-gray-500"
                      )}>
                        📎 {email.attachments.length}
                      </Text>
                    )}
                  </View>
                  
                  <Text className={cn(
                    "text-xs",
                    isDark ? "text-slate-400" : "text-gray-400"
                  )}>
                    ›
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !hasEmails && (
        <View className="items-center py-4">
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            No recent emails
          </Text>
        </View>
      )}
    </View>
  );
}; 