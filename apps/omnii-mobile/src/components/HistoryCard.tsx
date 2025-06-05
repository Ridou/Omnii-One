import React from 'react';
import { View, Text } from 'react-native';
import { CircleCheck as CheckCircle, Circle as XCircle, ChevronRight, Calendar } from 'lucide-react-native';
import { cn } from '~/utils/cn';
import { formatDate } from '~/utils/formatters';

interface HistoryCardProps {
  historyItem: {
    id: string;
    title: string;
    description: string;
    status: 'approved' | 'declined';
    processed_at: string;
    comment?: string;
  };
  className?: string; // Added for extensibility
}

export default function HistoryCard({ historyItem, className }: HistoryCardProps) {
  const isApproved = historyItem.status === 'approved';
  
  return (
    <View className={cn(
      "omnii-card border-l-4 mb-4",
      isApproved ? "border-success" : "border-error",
      className
    )}>
      {/* Header with Status Icon and Title */}
      <View className="flex-row items-center mb-3">
        {isApproved ? (
          <CheckCircle
            size={16}
            color="#34C759"
            className="mr-2"
          />
        ) : (
          <XCircle
            size={16}
            color="#FF3B30"
            className="mr-2"
          />
        )}
        <Text className="omnii-heading text-base flex-1" numberOfLines={1}>
          {historyItem.title}
        </Text>
      </View>
      
      {/* Description */}
      <Text className="omnii-body text-sm mb-4" numberOfLines={2}>
        {historyItem.description}
      </Text>
      
      {/* Date Meta */}
      <View className="flex-row items-center mb-4">
        <Calendar size={16} color="#666666" />
        <Text className="omnii-caption text-xs ml-1">
          {formatDate(historyItem.processed_at)}
        </Text>
      </View>
      
      {/* Comment Section (if exists) */}
      {historyItem.comment && (
        <View className="bg-gray-50 rounded-lg p-3 mb-4">
          <Text className="omnii-body text-sm italic text-gray-600">
            "{historyItem.comment}"
          </Text>
        </View>
      )}
      
      {/* Footer with Status and Details */}
      <View className="flex-row justify-between items-center border-t border-gray-200 pt-3">
        <View className="flex-row items-center">
          {isApproved ? (
            <>
              <CheckCircle size={16} color="#34C759" />
              <Text className="omnii-heading text-sm text-success ml-1">
                Approved
              </Text>
            </>
          ) : (
            <>
              <XCircle size={16} color="#FF3B30" />
              <Text className="omnii-heading text-sm text-error ml-1">
                Declined
              </Text>
            </>
          )}
        </View>
        
        <View className="flex-row items-center">
          <Text className="omnii-body text-sm text-blue-500 mr-1">View Details</Text>
          <ChevronRight size={16} color="#007AFF" />
        </View>
      </View>
    </View>
  );
}