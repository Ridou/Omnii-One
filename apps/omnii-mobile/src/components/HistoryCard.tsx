import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CircleCheck as CheckCircle, Circle as XCircle, ChevronRight, Calendar } from 'lucide-react-native';
import { cn } from '~/utils/cn';
import { formatDate } from '~/utils/formatters';

interface HistoryCardProps {
  historyItem: {
    id: string;
    title: string;
    description: string;
    status: 'approved' | 'declined' | 'pending';
    processed_at: string;
    comment?: string;
    requestedBy: string;
  };
  className?: string; // Added for extensibility
  onPress?: () => void;
}

export default function HistoryCard({ historyItem, className, onPress }: HistoryCardProps) {
  const isApproved = historyItem.status === 'approved';
  const borderColorClass = isApproved ? "border-success" : historyItem.status === 'declined' ? "border-error" : "border-gray-200";
  const timeAgo = formatDate(historyItem.processed_at);
  const requestedBy = historyItem.requestedBy;

  return (
    <View
      className={cn(
        "card-omnii border-l-4 mb-4",
        borderColorClass,
        className
      )}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-omnii-heading text-base flex-1" numberOfLines={1}>
          {historyItem.title}
        </Text>
        <Text className="text-xs text-gray-500 ml-2">
          {timeAgo}
        </Text>
      </View>

      {/* Description */}
      <Text className="text-omnii-body text-sm mb-4" numberOfLines={2}>
        {historyItem.description}
      </Text>

      {/* Metadata */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-xs text-gray-500">By {requestedBy}</Text>
          {historyItem.status && (
            <View className="flex-row items-center ml-4">
              {historyItem.status === 'approved' ? (
                <>
                  <Text className="text-xs">✅</Text>
                  <Text className="text-omnii-heading text-sm text-success ml-1">
                    Approved
                  </Text>
                </>
              ) : historyItem.status === 'declined' ? (
                <>
                  <Text className="text-xs">❌</Text>
                  <Text className="text-omnii-heading text-sm text-error ml-1">
                    Declined
                  </Text>
                </>
              ) : null}
            </View>
          )}
        </View>

        {onPress && (
          <TouchableOpacity onPress={onPress} className="flex-row items-center">
            <Text className="text-omnii-body text-sm text-blue-500 mr-1">View Details</Text>
            <Text className="text-blue-500">→</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {historyItem.status === 'pending' && (
        <Text className="text-omnii-body text-sm italic text-gray-600">
          Waiting for response...
        </Text>
      )}
    </View>
  );
}