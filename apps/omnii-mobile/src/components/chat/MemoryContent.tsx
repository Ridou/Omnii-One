import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, TextInput } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolate 
} from 'react-native-reanimated';

// ✅ Import real data hooks
import { useContacts, useContactStats } from '~/hooks/useContacts';
import { useEmail } from '~/hooks/useEmail';
import { useNeo4jCachedClient } from '~/hooks/useNeo4jCachedClient';

// Import RDF Memory Card component
import { RDFMemoryCard } from './RDFMemoryCard';

interface MemoryContentProps {
  tasksOverview: any;
  calendarData: any;
  conceptsData?: any;
  onTaskAction: (action: string, data?: any) => void;
  onCalendarAction: (action: string, data?: any) => void;
  onContactAction?: (action: string, data?: any) => void;
  onEmailAction?: (action: string, data?: any) => void;
}

export const MemoryContent: React.FC<MemoryContentProps> = ({
  tasksOverview,
  calendarData,
  conceptsData,
  onTaskAction,
  onCalendarAction,
  onContactAction,
  onEmailAction
}) => {
  const { isDark } = useTheme();

  // ✅ Get real contact and email data
  const { contactsData, contacts, totalContacts } = useContacts(1000);
  const { stats: contactStats } = useContactStats();
  const { 
    emails, 
    totalEmails, 
    unreadCount,
    getUnreadEmails,
    getEmailsWithAttachments 
  } = useEmail(50, "newer_than:30d"); // Get emails from last 30 days
  
  // ✅ Get Neo4j data using brain memory cache - optimized with Supabase caching
  const { 
    concepts, 
    searchResults, 
    loading: neo4jLoading, 
    searchLoading,
    totalConcepts,
    isConnected,
    memorySystemStatus,
    listConcepts, 
    searchConcepts,
    forceRefresh,
    cache,
    directNeo4j
  } = useNeo4jCachedClient('current_week');
  
  // Local state for current search
  const [currentSearch, setCurrentSearch] = useState('test');
  
  // Fetch concepts when component mounts (only once when connected)
  useEffect(() => {
    if (isConnected && concepts.length === 0) {
      listConcepts(10); // Get first 10 concepts
    }
  }, [isConnected]); // Only when connection status changes
  
  // Search when search term changes (only once when connected)
  useEffect(() => {
    if (isConnected && currentSearch && searchResults.length === 0) {
      searchConcepts(currentSearch, 10);
    }
  }, [isConnected, currentSearch]); // Only when connection or search term changes

  return (
    <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
      <View className="mb-4">
        <Text className={cn(
          "text-3xl font-bold mb-1",
          isDark ? "text-white" : "text-gray-900"
        )}>AI Memory</Text>
        <Text className={cn(
          "text-base leading-5",
          isDark ? "text-slate-300" : "text-gray-600"
        )}>
          Your personal context stored across conversations. AI learns from your patterns to provide better assistance.
        </Text>
      </View>

      <View className="mb-4">
        <View className="gap-2">
          <MemorySummaryCard
            icon="📋"
            title="Task Analytics"
            items={[
              `${tasksOverview?.totalTasks || 0} total tasks`,
              `${tasksOverview?.totalCompleted || 0} completed this month`,
              `${tasksOverview?.totalPending || 0} pending tasks`,
              `${tasksOverview?.totalOverdue || 0} overdue items`
            ]}
            color="purple"
            data={tasksOverview}
            onExpand={() => onTaskAction('view_all')}
            expandedContent={<TaskMemoryDetails data={tasksOverview} />}
          />

          <MemorySummaryCard
            icon="📅"
            title="Calendar Overview"
            items={[
              `${calendarData?.events?.filter((e: any) => new Date(e.start) > new Date()).length || 0} upcoming events`,
              `${calendarData?.totalCount || 0} total events loaded`,
              calendarData?.events?.length > 0 
                ? (() => {
                    const counts = calendarData.events.reduce((acc: any, event: any) => {
                      const day = new Date(event.start).toLocaleDateString('en-US', { weekday: 'long' });
                      acc[day] = (acc[day] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const entries = Object.entries(counts);
                    const peakDay = entries.length > 0 
                      ? entries.sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'Monday'
                      : 'Monday';
                    return `Peak day: ${peakDay}`;
                  })()
                : "Peak day: Monday",
              calendarData?.events?.length > 0 
                ? `${Math.round(calendarData.events.filter((e: any) => !!e.meetingLink).length / calendarData.events.length * 100) || 0}% virtual meetings`
                : "0% virtual meetings"
            ]}
            color="green"
            data={calendarData}
            onExpand={() => onCalendarAction('view_patterns')}
            expandedContent={<CalendarMemoryDetails data={calendarData} />}
          />

          <MemorySummaryCard
            icon="👥"
            title="Contact Statistics"
            items={[
              `${totalContacts} total contacts`,
              `${contactStats?.contacts_with_email || 0} have email addresses`,
              `${contactStats?.contacts_with_phone || 0} have phone numbers`,
              `${contactStats?.email_percentage || 0}% email coverage`
            ]}
            color="orange"
            data={contactsData}
            onExpand={() => onContactAction?.('view_network')}
            expandedContent={<ContactMemoryDetails data={contactsData} />}
          />

          <MemorySummaryCard
            icon="📧"
            title="Email Analytics"
            items={[
              `${unreadCount} unread emails`,
              `${totalEmails} total emails loaded`,
              `${emails.filter(e => e.attachments && e.attachments.length > 0).length} have attachments`,
              `${Math.round((emails.filter(e => e.isRead === false).length / Math.max(totalEmails, 1)) * 100)}% unread rate`
            ]}
            color="red"
            data={{ emails, totalEmails, unreadCount }}
            onExpand={() => onEmailAction?.('view_patterns')}
            expandedContent={<EmailMemoryDetails data={{ emails, totalEmails, unreadCount }} />}
          />

          {/* Neo4j Knowledge Graph */}
          <MemorySummaryCard
            icon="🧠"
            title="Brain Memory"
            items={[
              `${concepts.length} concepts listed`,
              `${searchResults.length} results for "${currentSearch}"`,
              `${totalConcepts} total concepts in database`,
              isConnected ? `✅ Brain Memory (${memorySystemStatus.neo4j.responseTime}ms)` : '❌ Disconnected'
            ]}
            color="blue"
            data={{ 
              concepts, 
              searchResults, 
              loading: neo4jLoading, 
              searchLoading,
              currentSearch,
              totalConcepts,
              memorySystemStatus,
              cache,
              refetch: forceRefresh,
              searchConcepts 
            }}
            onExpand={() => {
              forceRefresh();
            }}
            expandedContent={
              <BrainMemoryDetails 
                data={{ 
                  concepts, 
                  searchResults, 
                  loading: neo4jLoading, 
                  searchLoading,
                  currentSearch,
                  refetch: listConcepts,
                  searchConcepts 
                }} 
              />
            }
          />
        </View>

        {/* RDF Semantic Analysis Card */}
        <RDFMemoryCard />

        {/* Shape of AI - Trust Indicators: Memory Controls */}
        <MemoryControlsSection />
      </View>
    </ScrollView>
  );
};

// Helper functions for insights with real data
const getInsightTitle = (color: string, index: number): string => {
  const insights = {
    purple: ["📈 Completion Rate", "⏰ Peak Productivity"],
    green: ["📊 Weekly Schedule", "🎯 Meeting Types"], 
    orange: ["🔥 Most Active", "📈 Network Growth"],
    red: ["⚡ Response Time", "📋 Categories"]
  };
  return insights[color as keyof typeof insights]?.[index] || "Insight";
};

const getInsightData = (color: string, index: number, data?: any): string => {
  // Use real data when available, fallback to smart insights
  switch (color) {
    case 'purple': // Tasks
      if (index === 0) {
        const completed = data?.totalCompleted || 0;
        const total = data?.totalTasks || 0;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return `${rate}% completion rate • ${completed}/${total} tasks`;
      } else {
        const pending = data?.totalPending || 0;
        const overdue = data?.totalOverdue || 0;
        return `${pending} pending • ${overdue} overdue`;
      }
    case 'green': // Calendar
      if (index === 0) {
        const events = data?.events?.length || 0;
        const upcomingCount = data?.events?.filter((event: any) => new Date(event.start) > new Date()).length || 0;
        return `${upcomingCount} upcoming • ${events} total events`;
      } else {
        // Analyze meeting types from real data if available
        if (data?.events?.length > 0) {
          const events = data.events;
          const meetingCount = events.filter((e: any) => 
            e.title.toLowerCase().includes('meeting') || 
            e.title.toLowerCase().includes('standup') ||
            e.attendees?.length > 2
          ).length;
          const callCount = events.filter((e: any) => 
            e.title.toLowerCase().includes('call') || 
            e.title.toLowerCase().includes('zoom') ||
            !!e.meetingLink
          ).length;
          const oneOnOneCount = events.filter((e: any) => 
            e.title.toLowerCase().includes('1:1') || 
            e.title.toLowerCase().includes('one-on-one') ||
            e.attendees?.length === 2
          ).length;
          
          const total = events.length;
          if (total > 0) {
            const meetingPercent = Math.round((meetingCount / total) * 100);
            const callPercent = Math.round((callCount / total) * 100);
            const oneOnOnePercent = Math.round((oneOnOneCount / total) * 100);
            return `${oneOnOnePercent}% 1:1s • ${meetingPercent}% meetings • ${callPercent}% calls`;
          }
        }
        return "40% 1:1s • 35% team meetings • 25% external calls";
      }
    case 'orange': // Contacts
      if (index === 0) {
        // Show top contacts by name
        if (data?.contacts?.length > 0) {
          const topContacts = data.contacts
            .filter((c: any) => c.name && c.name.trim())
            .slice(0, 3)
            .map((c: any) => c.name.split(' ')[0])
            .join(' • ');
          return topContacts || "Top contacts available";
        }
        return "Connect to see top contacts";
      } else {
        // Show contact growth stats
        if (data?.contacts?.length > 0) {
          const workContacts = data.contacts.filter((c: any) => c.company).length;
          const personalContacts = data.contacts.length - workContacts;
          return `${workContacts} work • ${personalContacts} personal`;
        }
        return "Contact network analysis";
      }
    case 'red': // Email
      if (index === 0) {
        // Show email response metrics from real data
        if (data?.emails?.length > 0) {
          const unreadCount = data.emails.filter((e: any) => e.isRead === false).length;
          const totalEmails = data.emails.length;
          const unreadPercent = Math.round((unreadCount / totalEmails) * 100);
          return `${unreadCount} unread • ${100 - unreadPercent}% read rate`;
        }
        return "Email metrics available";
      } else {
        // Show email categorization from real data
        if (data?.emails?.length > 0) {
          const workEmails = data.emails.filter((e: any) => 
            e.from.includes('work') || 
            e.from.includes('.com') ||
            e.subject.toLowerCase().includes('meeting')
          ).length;
          const personalEmails = data.emails.filter((e: any) =>
            e.from.includes('gmail') ||
            e.subject.toLowerCase().includes('personal')
          ).length;
          const newsletterEmails = data.emails.filter((e: any) =>
            e.subject.toLowerCase().includes('newsletter') ||
            e.subject.toLowerCase().includes('update') ||
            e.subject.toLowerCase().includes('digest')
          ).length;
          
          const total = data.emails.length;
          if (total > 0) {
            const workPercent = Math.round((workEmails / total) * 100);
            const personalPercent = Math.round((personalEmails / total) * 100);
            const newsletterPercent = Math.round((newsletterEmails / total) * 100);
            return `${workPercent}% work • ${personalPercent}% personal • ${newsletterPercent}% newsletters`;
          }
        }
        return "Email classification analysis";
      }
    default:
      return "Data insight";
  }
};

// Shape of AI - Memory Pattern: Expandable Summary Cards
interface MemorySummaryCardProps {
  icon: string;
  title: string;
  items: string[];
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red';
  onExpand: () => void;
  expandedContent?: React.ReactNode;
  data?: any; // Add data prop for real insights
}

const MemorySummaryCard: React.FC<MemorySummaryCardProps> = ({
  icon,
  title,
  items,
  color,
  onExpand,
  expandedContent,
  data
}) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnimation = useSharedValue(0);

  const colorConfig = {
    blue: { bg: 'bg-blue-500', border: 'border-l-blue-500', accent: isDark ? 'bg-blue-950/30' : 'bg-blue-50' },
    purple: { bg: 'bg-purple-500', border: 'border-l-purple-500', accent: isDark ? 'bg-purple-950/30' : 'bg-purple-50' },
    green: { bg: 'bg-green-500', border: 'border-l-green-500', accent: isDark ? 'bg-green-950/30' : 'bg-green-50' },
    orange: { bg: 'bg-orange-500', border: 'border-l-orange-500', accent: isDark ? 'bg-orange-950/30' : 'bg-orange-50' },
    red: { bg: 'bg-red-500', border: 'border-l-red-500', accent: isDark ? 'bg-red-950/30' : 'bg-red-50' }
  };

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    expandAnimation.value = withSpring(newState ? 1 : 0);
    if (newState) onExpand();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(expandAnimation.value, [0, 1], [0, 180])}deg` }]
  }));
  
  return (
    <View className={cn(
      "rounded-2xl border shadow-sm border-l-4",
      colorConfig[color].border,
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      {/* Summary Header */}
      <Pressable onPress={handleToggle} className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className={cn(
              "w-10 h-10 rounded-xl items-center justify-center mr-3",
              colorConfig[color].accent
            )}>
              <Text className="text-xl">{icon}</Text>
            </View>
            <View className="flex-1">
              <Text className={cn(
                "text-lg font-semibold", // Back to normal size
                isDark ? "text-white" : "text-gray-900"
              )}>{title}</Text>
              <Text className={cn(
                "text-sm", // Back to normal size
                isDark ? "text-slate-400" : "text-gray-600"
              )}>{items.length} insights</Text>
            </View>
          </View>
          
          <Animated.View style={animatedStyle}>
            <Text className={cn(
              "text-lg",
              isDark ? "text-slate-400" : "text-gray-500"
            )}>⌄</Text>
          </Animated.View>
        </View>

        {/* Insights Preview - Show When Collapsed */}
        {!isExpanded && (
          <View className="mt-3">
            {/* 2 Horizontal Insight Blocks */}
            <View className="flex-row gap-2 mb-2">
              {/* First insight block */}
              <View className={cn(
                "flex-1 p-3 rounded-lg",
                colorConfig[color].accent
              )}>
                <Text className={cn(
                  "text-sm font-medium",
                  isDark ? "text-white" : "text-gray-900"
                )}>{getInsightTitle(color, 0)}</Text>
                <Text className={cn(
                  "text-xs mt-1",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>{getInsightData(color, 0, data)}</Text>
              </View>
              
              {/* Second insight block */}
              <View className={cn(
                "flex-1 p-3 rounded-lg",
                colorConfig[color].accent
              )}>
                <Text className={cn(
                  "text-sm font-medium",
                  isDark ? "text-white" : "text-gray-900"
                )}>{getInsightTitle(color, 1)}</Text>
                <Text className={cn(
                  "text-xs mt-1",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>{getInsightData(color, 1, data)}</Text>
              </View>
            </View>
            
            {/* Data Preview Hint */}
            <Text className={cn(
              "text-xs text-center",
              isDark ? "text-slate-500" : "text-gray-500"
            )}>Tap to view actual data →</Text>
          </View>
        )}
      </Pressable>

      {/* Expanded Content - Show Actual Data */}
      {isExpanded && (
        <View className={cn(
          "px-4 pb-4 border-t",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          {/* ✅ Go directly to detailed content - no intermediate "Actual Data" list */}
          {expandedContent}
        </View>
      )}
      </View>
  );
};

// Shape of AI - Trust Indicators & Controls
const MemoryControlsSection: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <View className="mt-4">
      <Text className={cn(
        "text-lg font-semibold mb-2",
        isDark ? "text-white" : "text-gray-900"
      )}>Memory Controls</Text>
      
      <View className="gap-2">
        {/* Shape of AI - Memory Control */}
        <TouchableOpacity className={cn(
          "flex-row items-center justify-between p-3 rounded-xl border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <View className="flex-row items-center">
            <Text className="text-xl mr-3">🔒</Text>
            <View>
              <Text className={cn(
                "font-medium",
                isDark ? "text-white" : "text-gray-900"
              )}>Privacy Settings</Text>
              <Text className={cn(
                "text-sm",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Control what AI remembers</Text>
            </View>
          </View>
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-500"
          )}>→</Text>
        </TouchableOpacity>

        {/* Shape of AI - Data Ownership */}
        <TouchableOpacity className={cn(
          "flex-row items-center justify-between p-3 rounded-xl border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <View className="flex-row items-center">
            <Text className="text-xl mr-3">📊</Text>
            <View>
              <Text className={cn(
                "font-medium",
                isDark ? "text-white" : "text-gray-900"
              )}>Export Memory</Text>
              <Text className={cn(
                "text-sm",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Download your AI context data</Text>
            </View>
          </View>
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-500"
          )}>→</Text>
        </TouchableOpacity>

        {/* Shape of AI - Incognito Mode */}
        <TouchableOpacity className={cn(
          "flex-row items-center justify-between p-3 rounded-xl border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}>
          <View className="flex-row items-center">
            <Text className="text-xl mr-3">🕶️</Text>
            <View>
              <Text className={cn(
                "font-medium",
                isDark ? "text-white" : "text-gray-900"
              )}>Private Mode</Text>
              <Text className={cn(
                "text-sm",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Chat without storing context</Text>
            </View>
          </View>
          <View className={cn(
            "w-12 h-6 rounded-full border-2 relative",
            isDark ? "border-slate-600 bg-slate-700" : "border-gray-300 bg-gray-200"
          )}>
            <View className={cn(
              "w-4 h-4 rounded-full absolute top-0.5 left-0.5",
              isDark ? "bg-slate-500" : "bg-white"
            )} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Detailed Task Memory Component
const TaskMemoryDetails: React.FC<{ data: any }> = ({ data }) => {
  const { isDark } = useTheme();
  
  // ✅ Use real task data from tasksOverview - Show ALL tasks, not just 4
  const allTasks = React.useMemo(() => {
    if (!data?.taskLists) return [];
    
    // Get all tasks from all lists
    const allTasks = data.taskLists.flatMap((list: any) => 
      list.tasks.map((task: any) => ({
        ...task,
        listTitle: list.title
      }))
    );
    
    // Sort by priority (overdue first, then today, then by updated date)
    return allTasks
      .sort((a: any, b: any) => {
        const aDate = a.due ? new Date(a.due) : null;
        const bDate = b.due ? new Date(b.due) : null;
        const now = new Date();
        
        // Priority scoring: overdue = 3, today = 2, future = 1, no date = 0
        const getPriority = (task: any, dueDate: Date | null) => {
          if (!dueDate) return 0;
          if (dueDate < now && task.status !== 'completed') return 3; // overdue
          if (dueDate.toDateString() === now.toDateString()) return 2; // today
          return 1; // future
        };
        
        const aPriority = getPriority(a, aDate);
        const bPriority = getPriority(b, bDate);
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        // If same priority, sort by updated date
        return new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime();
      })
      .map((task: any) => {
        const dueDate = task.due ? new Date(task.due) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.status !== 'completed';
        const isToday = dueDate && dueDate.toDateString() === new Date().toDateString();
        const isTomorrow = dueDate && dueDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
        
        let dueText = 'No due date';
        if (isToday) dueText = 'Today';
        else if (isTomorrow) dueText = 'Tomorrow';
        else if (dueDate) dueText = dueDate.toLocaleDateString();
        
        return {
          title: task.title,
          due: dueText,
          status: isOverdue ? 'overdue' : task.status === 'completed' ? 'completed' : 'pending',
          priority: isOverdue ? 'high' : isToday ? 'high' : 'medium',
          listTitle: task.listTitle,
          notes: task.notes
        };
      });
  }, [data]);
  
  // Show fallback if no tasks
  if (!data?.taskLists || allTasks.length === 0) {
    return (
      <View className="mt-2">
        <Text className={cn(
          "text-sm text-center",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>No tasks found. Connect Google Tasks to see your data.</Text>
      </View>
    );
  }

  return (
    <View className="mt-2">
      {/* ✅ Scrollable container with sticky header */}
      <ScrollView 
        className="max-h-[380px]" 
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        stickyHeaderIndices={[0]}
      >
        {/* ✅ Sticky Header - First item in ScrollView */}
        <View className={cn(
          "flex-row items-center justify-between p-3 border-b",
          isDark ? "bg-slate-800 border-slate-600" : "bg-gray-50 border-gray-200"
        )}>
          <Text className={cn(
            "font-medium text-sm",
            isDark ? "text-white" : "text-gray-900"
          )}>All Tasks ({allTasks.length})</Text>
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>Scroll to see all →</Text>
        </View>
        
        {/* ✅ Task items */}
        <View className="gap-2 p-1">
          {allTasks.map((task, index) => (
            <View key={index} className={cn(
              "p-3 rounded-lg border",
              isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"
            )}>
              <View className="flex-row items-center justify-between">
                <Text className={cn(
                  "text-sm font-medium flex-1",
                  task.status === 'completed' ? (isDark ? "text-green-400" : "text-green-600") :
                  task.status === 'overdue' ? (isDark ? "text-red-400" : "text-red-600") :
                  isDark ? "text-white" : "text-gray-900"
                )} numberOfLines={2}>{task.title}</Text>
                <View className={cn(
                  "px-2 py-1 rounded ml-2",
                  task.priority === 'high' ? "bg-red-100" :
                  task.priority === 'medium' ? "bg-yellow-100" : "bg-gray-100"
                )}>
                  <Text className={cn(
                    "text-xs font-medium",
                    task.priority === 'high' ? "text-red-700" :
                    task.priority === 'medium' ? "text-yellow-700" : "text-gray-700"
                  )}>{task.priority}</Text>
                </View>
              </View>
              <Text className={cn(
                "text-xs mt-1",
                isDark ? "text-slate-400" : "text-gray-600"
              )}>Due: {task.due} • {task.status} • {task.listTitle}</Text>
              {task.notes && (
                <Text className={cn(
                  "text-xs mt-1",
                  isDark ? "text-slate-500" : "text-gray-500"
                )} numberOfLines={2}>{task.notes}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Calendar Memory Details Component
const CalendarMemoryDetails: React.FC<{ data: any }> = ({ data }) => {
  const { isDark } = useTheme();
  
  // ✅ Use real calendar data from calendarData - Show ALL events, not just 4
  const allEvents = React.useMemo(() => {
    if (!data?.events) return [];
    
    const now = new Date();
    
    // Get ALL events and sort by start time (upcoming first, then past)
    return data.events
      .sort((a: any, b: any) => {
        const aStart = new Date(a.start);
        const bStart = new Date(b.start);
        
        // Upcoming events first (sorted by closest first)
        const aUpcoming = aStart > now;
        const bUpcoming = bStart > now;
        
        if (aUpcoming && !bUpcoming) return -1;
        if (!aUpcoming && bUpcoming) return 1;
        
        // Within same category (upcoming or past), sort by time
        return aUpcoming ? aStart.getTime() - bStart.getTime() : bStart.getTime() - aStart.getTime();
      })
      .map((event: any) => {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        const isUpcoming = startDate > now;
        const isToday = startDate.toDateString() === new Date().toDateString();
        const isTomorrow = startDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
        
        let dateText = startDate.toLocaleDateString();
        if (isToday) dateText = 'Today';
        else if (isTomorrow) dateText = 'Tomorrow';
        else if (!isUpcoming) dateText = `${dateText} (Past)`;
        
        // Determine event type
        let eventType = 'meeting';
        const title = event.title.toLowerCase();
        if (title.includes('1:1') || title.includes('one-on-one')) eventType = '1on1';
        else if (title.includes('call') || title.includes('zoom') || title.includes('meet')) eventType = 'call';
        
        return {
          title: event.title,
          time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: dateText,
          attendees: event.attendees?.length || 1,
          type: eventType,
          hasLocation: !!event.location,
          hasMeetingLink: !!event.meetingLink,
          isUpcoming,
          location: event.location,
          description: event.description
        };
      });
  }, [data]);
  
  // Show fallback if no events
  if (!data?.events || allEvents.length === 0) {
    return (
      <View className="mt-2">
        <Text className={cn(
          "text-sm text-center",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>No events found. Connect Google Calendar to see your schedule.</Text>
      </View>
    );
  }
  
  const upcomingCount = allEvents.filter(e => e.isUpcoming).length;
  const pastCount = allEvents.length - upcomingCount;
  
  return (
    <View className="mt-2">
      {/* ✅ Scrollable container with sticky header */}
      <ScrollView 
        className="max-h-[380px]" 
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        stickyHeaderIndices={[0]}
      >
        {/* ✅ Sticky Header - First item in ScrollView */}
        <View className={cn(
          "flex-row items-center justify-between p-3 border-b",
          isDark ? "bg-slate-800 border-slate-600" : "bg-gray-50 border-gray-200"
        )}>
          <Text className={cn(
            "font-medium text-sm",
            isDark ? "text-white" : "text-gray-900"
          )}>All Events ({upcomingCount} upcoming • {pastCount} past)</Text>
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>Scroll to see all →</Text>
        </View>
        
        {/* ✅ Event items */}
        <View className="gap-2 p-1">
          {allEvents.map((event, index) => (
            <View key={index} className={cn(
              "p-3 rounded-lg border",
              !event.isUpcoming && "opacity-60", // Dim past events
              isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"
            )}>
              <View className="flex-row items-center justify-between">
                <Text className={cn(
                  "text-sm font-medium flex-1",
                  isDark ? "text-white" : "text-gray-900"
                )} numberOfLines={2}>{event.title}</Text>
                <View className={cn(
                  "px-2 py-1 rounded ml-2",
                  event.type === '1on1' ? "bg-blue-100" :
                  event.type === 'call' ? "bg-green-100" : "bg-purple-100"
                )}>
                  <Text className={cn(
                    "text-xs font-medium",
                    event.type === '1on1' ? "text-blue-700" :
                    event.type === 'call' ? "text-green-700" : "text-purple-700"
                  )}>{event.type}</Text>
                </View>
              </View>
              <Text className={cn(
                "text-xs mt-1",
            isDark ? "text-slate-400" : "text-gray-600"
              )}>{event.date} at {event.time} • {event.attendees} attendee{event.attendees !== 1 ? 's' : ''}</Text>
              {(event.hasLocation || event.hasMeetingLink) && (
                <Text className={cn(
                  "text-xs",
                  isDark ? "text-slate-500" : "text-gray-500"
                )}>
                  {event.hasLocation && `📍 ${event.location}`}{event.hasLocation && event.hasMeetingLink && ' • '}{event.hasMeetingLink && '🔗 Meeting link'}
                </Text>
              )}
              {event.description && (
                <Text className={cn(
                  "text-xs mt-1",
                  isDark ? "text-slate-500" : "text-gray-500"
                )} numberOfLines={2}>{event.description}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Contact Memory Details Component
const ContactMemoryDetails: React.FC<{ data: any }> = ({ data }) => {
  const { isDark } = useTheme();
  
  // ✅ Use real contact data from contactsData - Show ALL contacts, not just few
  const allContacts = React.useMemo(() => {
    if (!data?.contacts) return [];
    
    // Sort contacts by most recent interaction or alphabetically
    return data.contacts
      .sort((a: any, b: any) => {
        // If both have names, sort alphabetically
        return a.name.localeCompare(b.name);
      })
      .map((contact: any) => {
        const hasEmail = contact.emails && contact.emails.length > 0;
        const hasPhone = contact.phones && contact.phones.length > 0;
        const primaryEmail = hasEmail ? contact.emails[0].address : null;
        const primaryPhone = hasPhone ? contact.phones[0].number : null;
        
        return {
          name: contact.name,
          email: primaryEmail,
          phone: primaryPhone,
          company: contact.company,
          title: contact.title,
          hasEmail,
          hasPhone,
          contactType: contact.company ? 'work' : 'personal',
          fullContact: contact
        };
      });
  }, [data]);
  
  // Show fallback if no contacts
  if (!data?.contacts || allContacts.length === 0) {
    return (
      <View className="mt-2">
        <Text className={cn(
          "text-sm text-center",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>No contacts found. Connect Google Contacts to see your network.</Text>
      </View>
    );
  }
  
  const workContacts = allContacts.filter(c => c.contactType === 'work').length;
  const personalContacts = allContacts.length - workContacts;
  
  return (
    <View className="mt-2">
      {/* ✅ Scrollable container with sticky header */}
      <ScrollView 
        className="max-h-[380px]" 
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        stickyHeaderIndices={[0]}
      >
        {/* ✅ Sticky Header - First item in ScrollView */}
        <View className={cn(
          "flex-row items-center justify-between p-3 border-b",
          isDark ? "bg-slate-800 border-slate-600" : "bg-gray-50 border-gray-200"
        )}>
          <Text className={cn(
            "font-medium text-sm",
            isDark ? "text-white" : "text-gray-900"
          )}>All Contacts ({workContacts} work • {personalContacts} personal)</Text>
            <Text className={cn(
            "text-xs",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>Scroll to see all →</Text>
        </View>
        
        {/* ✅ Contact items */}
        <View className="gap-2 p-1">
          {allContacts.map((contact, index) => (
            <View key={index} className={cn(
              "p-3 rounded-lg border",
              isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"
            )}>
              <View className="flex-row items-center justify-between">
                <Text className={cn(
                  "text-sm font-medium flex-1",
                  isDark ? "text-white" : "text-gray-900"
                )} numberOfLines={1}>{contact.name}</Text>
                <View className={cn(
                  "px-2 py-1 rounded ml-2",
                  contact.contactType === 'work' ? "bg-blue-100" : "bg-green-100"
                )}>
                  <Text className={cn(
                    "text-xs font-medium",
                    contact.contactType === 'work' ? "text-blue-700" : "text-green-700"
                  )}>{contact.contactType}</Text>
          </View>
        </View>
              
              {contact.title && contact.company && (
                <Text className={cn(
                  "text-xs mt-1",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>{contact.title} at {contact.company}</Text>
              )}
              
              <View className="mt-2 gap-1">
                {contact.hasEmail && (
                  <Text className={cn(
                    "text-xs",
                    isDark ? "text-slate-400" : "text-gray-600"
                  )}>📧 {contact.email}</Text>
                )}
                {contact.hasPhone && (
                  <Text className={cn(
                    "text-xs",
                    isDark ? "text-slate-400" : "text-gray-600"
                  )}>📞 {contact.phone}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Email Memory Details Component  
const EmailMemoryDetails: React.FC<{ data: any }> = ({ data }) => {
  const { isDark } = useTheme();
  
  // ✅ Use real email data - Show ALL emails, not just few
  const allEmails = React.useMemo(() => {
    if (!data?.emails) return [];
    
    // Sort emails by date (newest first) and process them
    return data.emails
      .sort((a: any, b: any) => {
        const aDate = new Date(a.date || a.messageTimestamp || 0);
        const bDate = new Date(b.date || b.messageTimestamp || 0);
        return bDate.getTime() - aDate.getTime();
      })
      .map((email: any) => {
        const emailDate = new Date(email.date || email.messageTimestamp || 0);
        const isToday = emailDate.toDateString() === new Date().toDateString();
        const isYesterday = emailDate.toDateString() === new Date(Date.now() - 86400000).toDateString();
        
        let dateText = emailDate.toLocaleDateString();
        if (isToday) dateText = 'Today';
        else if (isYesterday) dateText = 'Yesterday';
        
        // Determine email priority based on content
        const subject = email.subject.toLowerCase();
        let priority = 'normal';
        if (subject.includes('urgent') || subject.includes('asap') || subject.includes('important')) {
          priority = 'high';
        } else if (subject.includes('fyi') || subject.includes('newsletter') || subject.includes('update')) {
          priority = 'low';
        }
        
        return {
          subject: email.subject,
          from: email.from,
          date: dateText,
          time: emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: email.isRead !== false, // Default to read if not specified
          hasAttachments: email.attachments && email.attachments.length > 0,
          attachmentCount: email.attachments?.length || 0,
          priority,
          preview: email.preview || email.body?.substring(0, 100) || 'No preview available'
        };
      });
  }, [data]);
  
  // Show fallback if no emails
  if (!data?.emails || allEmails.length === 0) {
    return (
      <View className="mt-2">
        <Text className={cn(
          "text-sm text-center",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>No emails found. Connect Gmail to see your messages.</Text>
      </View>
    );
  }
  
  const unreadCount = allEmails.filter(e => !e.isRead).length;
  const withAttachments = allEmails.filter(e => e.hasAttachments).length;
  
  return (
    <View className="mt-2">
      {/* ✅ Scrollable container with sticky header */}
      <ScrollView 
        className="max-h-[380px]" 
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        stickyHeaderIndices={[0]}
      >
        {/* ✅ Sticky Header - First item in ScrollView */}
        <View className={cn(
          "flex-row items-center justify-between p-3 border-b",
          isDark ? "bg-slate-800 border-slate-600" : "bg-gray-50 border-gray-200"
        )}>
          <Text className={cn(
            "font-medium text-sm",
            isDark ? "text-white" : "text-gray-900"
          )}>All Emails ({unreadCount} unread • {withAttachments} with attachments)</Text>
          <Text className={cn(
            "text-xs",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>Scroll to see all →</Text>
        </View>
        
        {/* ✅ Email items */}
        <View className="gap-2 p-1">
          {allEmails.map((email, index) => (
            <View key={index} className={cn(
              "p-3 rounded-lg border",
              !email.isRead && "border-l-4 border-l-blue-500",
              isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"
            )}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  {!email.isRead && (
                    <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                  )}
      <Text className={cn(
        "text-sm font-medium flex-1",
                    !email.isRead ? (isDark ? "text-white" : "text-gray-900") : (isDark ? "text-slate-300" : "text-gray-700")
                  )} numberOfLines={1}>{email.subject}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  {email.hasAttachments && (
                    <View className="w-4 h-4 items-center justify-center">
                      <Text className="text-xs">📎</Text>
                    </View>
                  )}
                  <View className={cn(
                    "px-2 py-1 rounded ml-1",
                    email.priority === 'high' ? "bg-red-100" :
                    email.priority === 'low' ? "bg-gray-100" : "bg-yellow-100"
                  )}>
                    <Text className={cn(
                      "text-xs font-medium",
                      email.priority === 'high' ? "text-red-700" :
                      email.priority === 'low' ? "text-gray-700" : "text-yellow-700"
                    )}>{email.priority}</Text>
                  </View>
                </View>
              </View>
              
              <Text className={cn(
                "text-xs mt-1",
        isDark ? "text-slate-400" : "text-gray-600"
              )}>From: {email.from}</Text>
              
              <Text className={cn(
                "text-xs mt-1",
                isDark ? "text-slate-500" : "text-gray-500"
              )} numberOfLines={2}>{email.preview}</Text>
              
              <View className="flex-row items-center justify-between mt-2">
                <Text className={cn(
                  "text-xs",
                  isDark ? "text-slate-500" : "text-gray-500"
                )}>{email.date} at {email.time}</Text>
                {email.hasAttachments && (
                  <Text className={cn(
                    "text-xs",
                    isDark ? "text-slate-500" : "text-gray-500"
                  )}>{email.attachmentCount} attachment{email.attachmentCount !== 1 ? 's' : ''}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
// Neo4j Memory Details Component
const BrainMemoryDetails: React.FC<{ data: any }> = ({ data }) => {
  const { isDark } = useTheme();
  const [searchInput, setSearchInput] = useState('test');
  
  if (!data?.concepts && !data?.searchResults) {
    return (
      <View className={cn(
        "rounded-xl p-4 border",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-sm",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          No Neo4j concepts loaded
        </Text>
      </View>
    );
  }
  
  const handleSearch = () => {
    if (data.searchConcepts) {
      data.searchConcepts(searchInput);
    }
  };
  
  const concepts = data.concepts?.slice(0, 5) || []; // Show first 5 concepts
  const searchResults = data.searchResults || [];
  
  return (
    <View className={cn(
      "rounded-xl p-4 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3">
        <Text className="text-xl mr-2">🧠</Text>
        <Text className={cn(
          "text-lg font-semibold",
          isDark ? "text-white" : "text-gray-900"
        )}>
          Knowledge Graph ({data.totalConcepts} concepts)
        </Text>
      </View>
  
      {data.isLoading && (
        <Text className={cn(
          "text-sm mb-2",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          Loading concepts...
        </Text>
      )}
  
      {data.error && (
        <Text className={cn(
          "text-sm mb-2 text-red-500"
        )}>
          Error: {data.error?.message || 'Failed to load concepts'}
        </Text>
      )}
      
      {/* Search Input */}
      <View className="flex-row items-center mb-3 gap-2">
        <View className={cn(
          "flex-1 px-3 py-2 rounded-lg border",
          isDark ? "bg-slate-900 border-slate-600" : "bg-gray-100 border-gray-300"
        )}>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search concepts..."
            placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
            className={cn(
              "text-sm",
              isDark ? "text-white" : "text-gray-900"
            )}
            onSubmitEditing={handleSearch}
          />
        </View>
        <TouchableOpacity 
          onPress={handleSearch}
          className={cn(
            "px-4 py-2 rounded-lg",
            isDark ? "bg-blue-600" : "bg-blue-500"
          )}
        >
          <Text className="text-white text-sm font-medium">Search</Text>
        </TouchableOpacity>
      </View>
  
      <ScrollView style={{ maxHeight: 400 }}>
        {/* Search Results Section */}
        {searchResults.length > 0 && (
          <View className="mb-4">
            <Text className={cn(
              "text-sm font-medium mb-2",
              isDark ? "text-blue-400" : "text-blue-600"
            )}>
              Search Results for "{data.currentSearch}" ({searchResults.length}):
            </Text>
            {searchResults.map((concept: any, index: number) => (
              <View key={`search-${concept.id || index}`} className={cn(
                "p-3 rounded-lg mb-2 border",
                isDark ? "bg-blue-900/20 border-blue-600/30" : "bg-blue-50 border-blue-200"
              )}>
                <Text className={cn(
                  "text-sm font-medium mb-1",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  {concept.properties?.name || `Concept ${concept.id}`}
                </Text>
                <Text className={cn(
                  "text-xs",
                  isDark ? "text-slate-400" : "text-gray-600"
                )}>
                  ID: {concept.id} | Labels: {concept.labels?.join(', ') || 'Unknown'}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Listed Concepts Section */}
        <Text className={cn(
          "text-sm font-medium mb-2",
          isDark ? "text-white" : "text-gray-900"
        )}>
          Listed Concepts ({concepts.length}):
        </Text>
        {concepts.map((concept: any, index: number) => (
          <View key={concept.id || index} className={cn(
            "p-3 rounded-lg mb-2 border",
            isDark ? "bg-slate-900 border-slate-600" : "bg-gray-50 border-gray-200"
          )}>
            <Text className={cn(
              "text-sm font-medium mb-1",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {concept.properties?.name || `Concept ${concept.id}`}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              Labels: {concept.labels?.join(', ') || 'Unknown'}
            </Text>
            {concept.properties?.description && (
              <Text className={cn(
                "text-xs mt-1",
                isDark ? "text-slate-300" : "text-gray-700"
              )} numberOfLines={2}>
                {concept.properties.description}
              </Text>
            )}
            {concept.properties?.activation_strength !== undefined && (
              <View className="flex-row items-center mt-2">
                <Text className={cn(
                  "text-xs",
                  isDark ? "text-slate-500" : "text-gray-500"
                )}>
                  Activation: {Math.round(concept.properties.activation_strength * 100)}%
                </Text>
                {concept.properties?.mention_count !== undefined && (
                  <Text className={cn(
                    "text-xs ml-3",
                    isDark ? "text-slate-500" : "text-gray-500"
                  )}>
                    Mentions: {concept.properties.mention_count}
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}
        
        {data.totalConcepts > 5 && (
          <Text className={cn(
            "text-xs text-center mt-2",
            isDark ? "text-slate-500" : "text-gray-500"
          )}>
            Showing 5 of {data.totalConcepts} concepts
          </Text>
        )}
      </ScrollView>
      
      <TouchableOpacity 
        className={cn(
          "p-2 rounded-md items-center mt-3",
          isDark ? "bg-slate-900" : "bg-gray-50"
        )}
        onPress={data.refetch}
      >
        <Text className={cn(
          "text-xs font-medium",
          isDark ? "text-blue-400" : "text-blue-600"
        )}>
          Refresh Neo4j Data
        </Text>
      </TouchableOpacity>
    </View>
  );
};