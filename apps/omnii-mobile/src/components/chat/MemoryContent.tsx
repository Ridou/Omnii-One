import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { TasksMemoryCard } from '~/components/TasksMemoryCard';
import { CalendarMemoryCard } from '~/components/CalendarMemoryCard';
import { ContactsMemoryCard } from '~/components/ContactsMemoryCard';
import { EmailMemoryCard } from '~/components/EmailMemoryCard';
import { PersonalContextCard } from '~/components/PersonalContextCard';

interface MemoryContentProps {
  tasksOverview: any;
  calendarData: any;
  onTaskAction: (action: string, data?: any) => void;
  onCalendarAction: (action: string, data?: any) => void;
  onContactAction?: (action: string, data?: any) => void;
  onEmailAction?: (action: string, data?: any) => void;
}

export const MemoryContent: React.FC<MemoryContentProps> = ({
  tasksOverview,
  calendarData,
  onTaskAction,
  onCalendarAction,
  onContactAction,
  onEmailAction
}) => {
  const { isDark } = useTheme();

  return (
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      <View className="py-4">
        <Text className={cn(
          "text-2xl font-bold mb-2",
          isDark ? "text-white" : "text-gray-900"
        )}>🧠 Memory</Text>
        <Text className={cn(
          "text-base mb-6",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>Long-term context and personal recordings</Text>
        
        {/* Personal Context Card - moved to top */}
        <PersonalContextCard />

        {/* Tasks Memory Section */}
        <TasksMemoryCard 
          tasksOverview={tasksOverview}
          onTaskAction={onTaskAction}
        />

        {/* Calendar Memory Section */}
        <CalendarMemoryCard 
          calendarData={calendarData}
          onCalendarAction={onCalendarAction}
        />

        {/* Contacts Memory Section */}
        <ContactsMemoryCard 
          onContactAction={onContactAction}
        />

        {/* Email Memory Section */}
        <EmailMemoryCard 
          onEmailAction={onEmailAction}
        />

        {/* Memory Graph Card - moved to bottom */}
        <MemoryGraphCard />

        {/* Voice Recording Card - moved to bottom */}
        <VoiceRecordingCard />
      </View>
    </ScrollView>
  );
};

const MemoryGraphCard: React.FC = () => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-blue-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3">
        <View className={cn(
          "w-10 h-10 rounded-lg items-center justify-center mr-3",
          isDark ? "bg-blue-900/30" : "bg-blue-100"
        )}>
          <Text className="text-xl">🕸️</Text>
        </View>
        <Text className={cn(
          "text-lg font-bold",
          isDark ? "text-white" : "text-gray-900"
        )}>Memory Graph</Text>
      </View>
      <Text className={cn(
        "text-sm leading-6 mb-4",
        isDark ? "text-slate-300" : "text-gray-600"
      )}>
        Knowledge graph powered by Neo4j for long-term context and relationship mapping.
      </Text>
      <View className="gap-2">
        <MemoryItem label="Work patterns and preferences" color="#3B82F6" />
        <MemoryItem label="Project relationships" color="#10B981" />
        <MemoryItem label="Goal hierarchies" color="#8B5CF6" />
      </View>
      <View className={cn(
        "px-3 py-2 rounded-lg self-start mt-4",
        isDark ? "bg-orange-900/20" : "bg-orange-100"
      )}>
        <Text className={cn(
          "text-xs font-semibold",
          isDark ? "text-orange-400" : "text-orange-700"
        )}>Coming Soon</Text>
      </View>
    </View>
  );
};

const VoiceRecordingCard: React.FC = () => {
  const { isDark } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    Alert.alert(
      "Recording Saved",
      `Your ${recordingDuration}s recording has been saved to long-term memory for AI context.`,
      [{ text: "OK", style: "default" }]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <View className={cn(
      "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-red-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-4">
        <View className={cn(
          "w-12 h-12 rounded-xl items-center justify-center mr-4",
          isDark ? "bg-red-900/30" : "bg-red-100"
        )}>
          <Text className="text-2xl">🎤</Text>
        </View>
        <View>
          <Text className={cn(
            "text-xl font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}>Voice Recording</Text>
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>Record context for AI memory</Text>
        </View>
      </View>
      
      <Text className={cn(
        "text-base leading-6 mb-5",
        isDark ? "text-slate-300" : "text-gray-700"
      )}>
        Record voice notes about your work patterns, preferences, and context that the AI should remember for future conversations.
      </Text>

      {isRecording && (
        <View className={cn(
          "rounded-xl p-4 mb-4",
          isDark ? "bg-red-900/20" : "bg-red-50"
        )}>
          <View className="flex-row items-center justify-center">
            <View className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse" />
            <Text className={cn(
              "text-sm font-semibold",
              isDark ? "text-red-400" : "text-red-600"
            )}>
              Recording: {formatTime(recordingDuration)}
            </Text>
          </View>
        </View>
      )}
      
      <TouchableOpacity
        className={cn(
          "px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg",
          isRecording ? "bg-red-600" : "bg-indigo-600"
        )}
        onPress={isRecording ? handleStopRecording : handleStartRecording}
      >
        <Text className="text-white text-base font-bold mr-2">
          {isRecording ? "🛑 Stop Recording" : "🎤 Start Recording"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const MemoryItem: React.FC<{ label: string; color: string }> = ({ label, color }) => {
  const { isDark } = useTheme();
  
  return (
    <View className="flex-row items-center">
      <View className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: color }} />
      <Text className={cn(
        "text-sm font-medium flex-1",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{label}</Text>
    </View>
  );
};