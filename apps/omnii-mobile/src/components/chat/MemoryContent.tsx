import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { useAuth } from '~/context/AuthContext';
import { cn } from '~/utils/cn';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolate 
} from 'react-native-reanimated';

// Import RDF Memory Card component
import { RDFMemoryCard } from './RDFMemoryCard';
import { 
  checkGoogleTokenStatus, 
  initiateGoogleOAuth 
} from '~/services/googleIntegration';

// Import Detail Modals
import {
  TaskDetailModal,
  EmailDetailModal,
  ContactDetailModal,
  CalendarEventDetailModal,
  ConceptDetailModal
} from './DetailModals';

interface MemoryContentProps {
  tasksOverview: any;
  calendarData: any;
  conceptsData?: any;
  contactsData?: any; // 🧠 Brain Memory Cache - Contact data from useCachedContacts hook
  emailData?: any;    // 🧠 Brain Memory Cache - Email data from useCachedEmail hook
  onTaskAction: (action: string, data?: any) => void;
  onCalendarAction: (action: string, data?: any) => void;
  onContactAction?: (action: string, data?: any) => void;
  onEmailAction?: (action: string, data?: any) => void;
}

// 🆕 Google Authentication Prompt Component
const GoogleAuthPrompt: React.FC<{
  title: string;
  description: string;
  onConnect: () => void;
  isConnecting: boolean;
}> = ({ title, description, onConnect, isConnecting }) => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "p-4 rounded-lg border-2 border-dashed mt-2",
      isDark ? "border-slate-600 bg-slate-800/50" : "border-gray-300 bg-gray-50"
    )}>
      <View className="items-center">
        <Text className="text-3xl mb-2">🔐</Text>
        <Text className={cn(
          "text-sm font-medium text-center mb-1",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {title}
        </Text>
        <Text className={cn(
          "text-xs text-center mb-3",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          {description}
        </Text>
        
        <TouchableOpacity
          onPress={onConnect}
          disabled={isConnecting}
          className={cn(
            "px-4 py-2 rounded-lg flex-row items-center",
            isDark ? "bg-blue-600" : "bg-blue-500"
          )}
        >
          <Text className="text-white text-sm font-medium mr-1">
            {isConnecting ? "Connecting..." : "Connect Google"}
          </Text>
          <Text className="text-white text-xs">🔗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const MemoryContent: React.FC<MemoryContentProps> = ({
  tasksOverview,
  calendarData,
  conceptsData,
  contactsData,
  emailData,
  onTaskAction,
  onCalendarAction,
  onContactAction,
  onEmailAction
}) => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Modal state management
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);

  // Data successfully flowing to UI components!

  // 🆕 Handle Google connection
  const handleConnectGoogle = async () => {
    try {
      setIsConnectingGoogle(true);
      await initiateGoogleOAuth();
      
      // The hooks will automatically refetch once tokens are available
      console.log('[MemoryContent] ✅ Google OAuth completed - hooks will refetch automatically');
      
    } catch (error) {
      console.error('[MemoryContent] ❌ Google OAuth failed:', error);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  return (
    <>
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
            🧠 Brain-inspired memory system with smart caching. Fast responses from cached data.
          </Text>
        </View>

        <View className="mb-4">
          <View className="gap-2">
            <MemorySummaryCard
              icon="📋"
              title="Task Analytics"
              items={[
                tasksOverview?.hasError 
                  ? "⚠️ Google authentication required"
                  : `${tasksOverview?.totalTasks || 0} total tasks`,
                tasksOverview?.hasError
                  ? "Connect Google to view tasks"
                  : `${tasksOverview?.totalCompleted || 0} completed this month`,
                tasksOverview?.hasError
                  ? "Brain cache ready for data"
                  : `${tasksOverview?.totalPending || 0} pending tasks`,
                tasksOverview?.isLoading
                  ? "⏳ Loading from cache..."
                  : tasksOverview?.hasError
                  ? "🔧 Setup required"
                  : tasksOverview?.isCacheValid 
                  ? `📈 Cache hit (${tasksOverview?.cacheStats?.avg_response_time_ms || 0}ms)` 
                  : `${tasksOverview?.totalOverdue || 0} overdue items`
              ]}
              color="purple"
              data={tasksOverview}
              onExpand={() => onTaskAction('view_all')}
              expandedContent={
                tasksOverview?.hasError ? (
                  <GoogleAuthPrompt
                    title="Connect Google Tasks"
                    description="Connect your Google account to view and manage your tasks with AI insights"
                    onConnect={handleConnectGoogle}
                    isConnecting={isConnectingGoogle}
                  />
                ) : (
                  <TaskMemoryDetails data={tasksOverview} onTaskClick={setSelectedTask} />
                )
              }
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
              expandedContent={<CalendarMemoryDetails data={calendarData} onEventClick={setSelectedEvent} />}
            />

            <MemorySummaryCard
              icon="👥"
              title="Contact Statistics"
              items={[
                contactsData?.hasError 
                  ? "⚠️ Google authentication required"
                  : `${contactsData?.totalContacts || 0} total contacts`,
                contactsData?.hasError
                  ? "Connect Google to view contacts"
                  : `${contactsData?.contacts?.filter((c: any) => c.emails?.length > 0).length || 0} have email addresses`,
                contactsData?.hasError
                  ? "Brain cache ready for data"
                  : `${contactsData?.contacts?.filter((c: any) => c.phones?.length > 0).length || 0} have phone numbers`,
                contactsData?.isLoading
                  ? "⏳ Loading from cache..."
                  : contactsData?.hasError
                  ? "🔧 Setup required"
                  : contactsData?.isCacheValid 
                  ? `📈 Cache hit (${contactsData?.cacheStats?.avg_response_time_ms || 0}ms)` 
                  : `🧠 Brain memory active`
              ]}
              color="orange"
              data={contactsData}
              onExpand={() => onContactAction?.('view_network')}
              expandedContent={
                contactsData?.hasError ? (
                  <GoogleAuthPrompt
                    title="Connect Google Contacts"
                    description="Connect your Google account to analyze your professional network"
                    onConnect={handleConnectGoogle}
                    isConnecting={isConnectingGoogle}
                  />
                ) : (
                  <ContactMemoryDetails data={contactsData} onContactClick={setSelectedContact} />
                )
              }
            />

            <MemorySummaryCard
              icon="📧"
              title="Email Analytics"
              items={[
                emailData?.hasError
                  ? "⚠️ Gmail authentication required"
                  : `${emailData?.unreadCount || 0} unread emails`,
                emailData?.hasError
                  ? "Connect Gmail to view emails"
                  : `${emailData?.totalEmails || 0} total emails loaded`,
                emailData?.hasError
                  ? "Brain cache ready for data"
                  : `${emailData?.emails?.filter((e: any) => e.attachments?.length > 0).length || 0} have attachments`,
                emailData?.isLoading
                  ? "⏳ Loading from cache..."
                  : emailData?.hasError
                  ? "🔧 Setup required"
                  : emailData?.isCacheValid 
                  ? `📈 Cache hit (${emailData?.cacheStats?.avg_response_time_ms || 0}ms)` 
                  : `🧠 Brain memory active`
              ]}
              color="red"
              data={emailData}
              onExpand={() => onEmailAction?.('view_patterns')}
              expandedContent={
                emailData?.hasError ? (
                  <GoogleAuthPrompt
                    title="Connect Gmail"
                    description="Connect your Gmail to analyze email patterns and get AI insights"
                    onConnect={handleConnectGoogle}
                    isConnecting={isConnectingGoogle}
                  />
                ) : (
                  <EmailMemoryDetails data={emailData} onEmailClick={setSelectedEmail} />
                )
              }
            />

            {/* Neo4j Knowledge Graph with Brain Cache */}
            <MemorySummaryCard
              icon="🧠"
              title="Brain Memory"
              items={[
                conceptsData?.hasError
                  ? "⚠️ Neo4j connection required"
                  : `${conceptsData?.conceptCount || 0} concepts loaded`,
                conceptsData?.hasError
                  ? "Direct Neo4j connection needed"
                  : conceptsData?.source === 'cache' 
                  ? `📈 Cache hit (${conceptsData?.responseTime || 0}ms)`
                  : `🔗 Direct Neo4j (${conceptsData?.responseTime || 0}ms)`,
                conceptsData?.hasError
                  ? "Brain cache ready for data"
                  : `${conceptsData?.totalConcepts || 0} total concepts in graph`,
                conceptsData?.isLoading
                  ? "⏳ Loading from brain memory..."
                  : conceptsData?.hasError
                  ? "🔧 Connection setup required"
                  : conceptsData?.isConnected 
                  ? '✅ Connected to AuraDB' 
                  : '❌ Disconnected'
              ]}
              color="blue"
              data={conceptsData}
              onExpand={() => {}}
              expandedContent={<BrainMemoryDetails data={conceptsData} onConceptClick={setSelectedConcept} />}
            />
          </View>

          {/* RDF Semantic Analysis Card */}
          <RDFMemoryCard />

          {/* Memory Controls */}
          <MemoryControlsSection />
        </View>
      </ScrollView>

      {/* Detail Modals */}
      <TaskDetailModal
        visible={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />
      <EmailDetailModal
        visible={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        email={selectedEmail}
      />
      <ContactDetailModal
        visible={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        contact={selectedContact}
      />
      <CalendarEventDetailModal
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />
      <ConceptDetailModal
        visible={!!selectedConcept}
        onClose={() => setSelectedConcept(null)}
        concept={selectedConcept}
      />
    </>
  );
};

// Helper functions for insights with real data
const getInsightTitle = (color: string, index: number): string => {
  const insights = {
    purple: ["📈 Completion Rate", "⏰ Peak Productivity"],
    green: ["📊 Weekly Schedule", "🎯 Meeting Types"], 
    orange: ["🔥 Most Active", "📈 Network Growth"],
    red: ["⚡ Response Time", "📋 Categories"],
    blue: ["🧠 Memory Status", "🔗 Connections"]
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
        return "40% 1:1s • 35% team meetings • 25% external calls";
      }
    case 'orange': // Contacts - Use real data
      if (index === 0) {
        if (data?.contacts?.length > 0) {
          const workContacts = data.contacts.filter((c: any) => c.company || c.jobTitle).length;
          const personalContacts = data.contacts.length - workContacts;
          return `${workContacts} work • ${personalContacts} personal`;
        }
        return data?.isLoading ? "Loading contacts..." : data?.hasError ? "Authentication needed" : "No contacts found";
      } else {
        if (data?.isCacheValid) {
          return `Cache hit • ${data?.cacheStats?.avg_response_time_ms || 0}ms response`;
      }
        return data?.isLoading ? "Brain memory loading..." : data?.hasError ? "Setup required" : "Cache miss";
      }
    case 'red': // Email - Use real data
      if (index === 0) {
        if (data?.emails?.length > 0) {
          const unreadCount = data.unreadCount || 0;
          const totalEmails = data.totalEmails || 0;
          const readRate = totalEmails > 0 ? Math.round(((totalEmails - unreadCount) / totalEmails) * 100) : 0;
          return `${unreadCount} unread • ${readRate}% read rate`;
        }
        return data?.isLoading ? "Loading emails..." : data?.hasError ? "Authentication needed" : "No emails found";
      } else {
        if (data?.isCacheValid) {
          return `Cache hit • ${data?.cacheStats?.avg_response_time_ms || 0}ms response`;
        }
        return data?.isLoading ? "Brain memory loading..." : data?.hasError ? "Setup required" : "Cache miss";
      }
    case 'blue': // Neo4j Brain Memory
      if (index === 0) {
        if (data?.hasError) {
          return "Connection setup needed";
        }
        if (data?.isCacheValid && data?.source === 'cache') {
          return `Cache hit • ${data?.responseTime || 0}ms response`;
        }
        return data?.isConnected ? '✅ Connected to AuraDB' : '❌ Disconnected';
      } else {
        if (data?.hasError) {
          return "Brain cache ready for data";
        }
        const efficiency = data?.cacheStats && data.cacheStats.cache_hits > 0 ? 
          Math.round((data.cacheStats.cache_hits / (data.cacheStats.cache_hits + data.cacheStats.cache_misses)) * 100) : 0;
        return efficiency > 0 ? 
          `${data?.totalConcepts || 0} concepts • ${efficiency}% cache efficiency` :
          `${data?.totalConcepts || 0} total concepts in graph`;
      }
    default:
      return "Data insight";
  }
};

// Memory Summary Card Component - RESTORED ORIGINAL DESIGN
interface MemorySummaryCardProps {
  icon: string;
  title: string;
  items: string[];
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red';
  onExpand: () => void;
  expandedContent?: React.ReactNode;
  data?: any;
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
                "text-lg font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}>{title}</Text>
              <Text className={cn(
                "text-sm",
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

        {!isExpanded && (
          <View className="mt-3">
            <View className="flex-row gap-2 mb-2">
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
            
            <Text className={cn(
              "text-xs text-center",
              isDark ? "text-slate-500" : "text-gray-500"
            )}>Tap to view details →</Text>
          </View>
        )}
      </Pressable>

      {isExpanded && (
        <View className={cn(
          "px-4 pb-4 border-t",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          {expandedContent}
        </View>
      )}
      </View>
  );
};

// Memory Controls Section
const MemoryControlsSection: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <View className="mt-4">
      <Text className={cn(
        "text-lg font-semibold mb-2",
        isDark ? "text-white" : "text-gray-900"
      )}>Memory Controls</Text>
      
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
            )}>Control your data retention</Text>
            </View>
          </View>
          <Text className={cn(
          "text-lg",
            isDark ? "text-slate-400" : "text-gray-500"
          )}>→</Text>
        </TouchableOpacity>
    </View>
  );
};

// Detailed components showing actual data items
const TaskMemoryDetails: React.FC<{ data: any; onTaskClick: (task: any) => void }> = ({ data, onTaskClick }) => {
  const { isDark } = useTheme();
  
  if (data?.hasError) {
    return (
      <View className="mt-3">
        <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
          Tasks
        </Text>
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          ⚠️ Google authentication required to view tasks
        </Text>
      </View>
    );
  }

  // Handle new cached data structure
  const taskLists = data?.taskLists || [];
  let allTasks: any[] = [];
  
  // Extract all tasks from task lists
  taskLists.forEach((list: any) => {
    if (list.tasks && Array.isArray(list.tasks)) {
      allTasks.push(...list.tasks.map((task: any) => ({
        ...task,
        listName: list.title
      })));
    }
  });
  
  const pendingTasks = allTasks
    .filter((task: any) => task.status === 'needsAction')
    .slice(0, 4); // Limit to 4 items

  return (
    <View className="mt-3">
      <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
        Recent Tasks ({data?.totalTasks || allTasks.length} total)
      </Text>
      
      {data?.isCacheValid && (
        <Text className={cn("text-xs mb-2", isDark ? "text-blue-400" : "text-blue-600")}>
          🧠 Brain cache hit • {data?.cacheStats?.avg_response_time_ms || 0}ms response
        </Text>
      )}
      
      {taskLists.length > 0 && (
        <View className="mb-3">
          <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
            Task Lists:
          </Text>
          <View className="flex-row flex-wrap gap-1">
            {taskLists.map((list: any, index: number) => (
            <View key={index} className={cn(
                "px-2 py-1 rounded-full",
                isDark ? "bg-purple-900/30" : "bg-purple-100"
            )}>
                <Text className={cn("text-xs", isDark ? "text-purple-300" : "text-purple-700")}>
                  {list.title} ({list.tasks?.length || 0})
                </Text>
                </View>
            ))}
              </View>
        </View>
      )}
      
      {pendingTasks.length > 0 ? (
        <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
          <View className="space-y-2">
            {pendingTasks.map((task: any, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => onTaskClick(task)}
                className={cn(
                  "p-3 rounded-lg border-l-2 border-l-purple-500",
                  isDark ? "bg-slate-700" : "bg-gray-50"
                )}
              >
                <Text className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                  {task.title}
                </Text>
                <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                  📋 {task.listName}
                </Text>
                {task.due && (
                  <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                    📅 Due: {new Date(task.due).toLocaleDateString()}
                  </Text>
                )}
                {task.notes && (
                  <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                    📝 {task.notes.substring(0, 50)}...
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            {allTasks.length > 4 && (
              <View className={cn(
                "p-3 rounded-lg border-dashed border-2 mt-2",
                isDark ? "border-slate-600" : "border-gray-300"
              )}>
                <Text className={cn("text-xs text-center", isDark ? "text-slate-400" : "text-gray-600")}>
                  + {allTasks.length - 4} more tasks - tap any task for details
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          {data?.isLoading ? "🔄 Loading tasks from brain memory..." : "✅ No pending tasks found"}
        </Text>
      )}
    </View>
  );
};

const CalendarMemoryDetails: React.FC<{ data: any; onEventClick: (event: any) => void }> = ({ data, onEventClick }) => {
  const { isDark } = useTheme();
  
  if (data?.hasError) {
    return (
      <View className="mt-3">
        <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
          Calendar Events
        </Text>
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          ⚠️ Google authentication required to view calendar
        </Text>
      </View>
    );
  }
  
  const events = data?.events || [];
  const upcomingEvents = events
    .filter((event: any) => new Date(event.start) > new Date())
    .slice(0, 4); // Limit to 4 items
  
  return (
    <View className="mt-3">
      <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
        Upcoming Events ({events.length} total)
      </Text>
      {upcomingEvents.length > 0 ? (
        <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
          <View className="space-y-2">
            {upcomingEvents.map((event: any, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => onEventClick(event)}
                className={cn(
                  "p-3 rounded-lg border-l-2 border-l-green-500",
                  isDark ? "bg-slate-700" : "bg-gray-50"
                )}
              >
                <Text className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                  {event.title || event.summary}
                </Text>
                <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                  {new Date(event.start).toLocaleDateString()} at {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </TouchableOpacity>
            ))}
            {events.length > 4 && (
              <View className={cn(
                "p-3 rounded-lg border-dashed border-2 mt-2",
                isDark ? "border-slate-600" : "border-gray-300"
              )}>
                <Text className={cn("text-xs text-center", isDark ? "text-slate-400" : "text-gray-600")}>
                  + {events.length - 4} more events - tap any event for details
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          {data?.isLoading ? "Loading events..." : "No upcoming events"}
        </Text>
      )}
    </View>
  );
};

const ContactMemoryDetails: React.FC<{ data: any; onContactClick: (contact: any) => void }> = ({ data, onContactClick }) => {
  const { isDark } = useTheme();
  
  if (data?.hasError) {
    return (
      <View className="mt-3">
        <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
          Contacts
        </Text>
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          ⚠️ Google authentication required to view contacts
        </Text>
      </View>
    );
  }
  
  const contacts = data?.contacts || [];
  const displayContacts = contacts.slice(0, 4); // Limit to 4 items
  
  return (
    <View className="mt-3">
      <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
        Recent Contacts ({contacts.length} total)
      </Text>
      {displayContacts.length > 0 ? (
        <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
          <View className="space-y-2">
            {displayContacts.map((contact: any, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => onContactClick(contact)}
                className={cn(
                  "p-3 rounded-lg border-l-2 border-l-orange-500",
                  isDark ? "bg-slate-700" : "bg-gray-50"
                )}
              >
                <Text className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                  {contact.displayName || contact.name || 'Unknown'}
                </Text>
                {contact.emails?.[0] && (
                  <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                    📧 {contact.emails[0].address || contact.emails[0]}
                  </Text>
                )}
                {contact.phones?.[0] && (
                  <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                    📱 {contact.phones[0].number || contact.phones[0]}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            {contacts.length > 4 && (
              <View className={cn(
                "p-3 rounded-lg border-dashed border-2 mt-2",
                isDark ? "border-slate-600" : "border-gray-300"
              )}>
                <Text className={cn("text-xs text-center", isDark ? "text-slate-400" : "text-gray-600")}>
                  + {contacts.length - 4} more contacts - tap any contact for details
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          {data?.isLoading ? "Loading contacts..." : "No contacts found"}
        </Text>
      )}
    </View>
  );
};

const EmailMemoryDetails: React.FC<{ data: any; onEmailClick: (email: any) => void }> = ({ data, onEmailClick }) => {
  const { isDark } = useTheme();
  
  if (data?.hasError) {
    return (
      <View className="mt-3">
        <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
          Emails
        </Text>
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          ⚠️ Gmail authentication required to view emails
        </Text>
      </View>
    );
  }
  
  const emails = data?.emails || [];
  const recentEmails = emails.slice(0, 4); // Limit to 4 items
  const unreadEmails = emails.filter((e: any) => !e.isRead);
  
  return (
    <View className="mt-3">
      <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
        Recent Emails ({data?.totalEmails || emails.length} total)
      </Text>
      
      {data?.isCacheValid && (
        <Text className={cn("text-xs mb-2", isDark ? "text-blue-400" : "text-blue-600")}>
          🧠 Brain cache hit • {data?.cacheStats?.avg_response_time_ms || 0}ms response
        </Text>
      )}
      
      {data?.unreadCount > 0 && (
        <View className={cn(
          "mb-3 p-2 rounded-lg",
          isDark ? "bg-red-900/30" : "bg-red-100"
        )}>
          <Text className={cn("text-sm font-medium", isDark ? "text-red-300" : "text-red-700")}>
            📬 {data.unreadCount} unread emails
          </Text>
        </View>
      )}
      
      {recentEmails.length > 0 ? (
        <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
          <View className="space-y-2">
            {recentEmails.map((email: any, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => onEmailClick(email)}
                className={cn(
                  "p-3 rounded-lg border-l-2 border-l-red-500",
                  isDark ? "bg-slate-700" : "bg-gray-50"
                )}
              >
                <View className="flex-row items-start justify-between">
                  <Text className={cn(
                    "text-sm font-medium flex-1 mr-2",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {email.subject?.length > 40 
                      ? email.subject.substring(0, 40) + '...' 
                      : email.subject || 'No Subject'}
                  </Text>
                  {!email.isRead && (
                    <View className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </View>
                <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                  📧 {email.sender?.split('<')[0]?.trim() || email.from || 'Unknown sender'}
                </Text>
                {email.date && (
                  <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                    📅 {new Date(email.date).toLocaleDateString()}
                  </Text>
                )}
                {email.preview && (
                  <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                    {email.preview.substring(0, 80)}...
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            {emails.length > 4 && (
              <View className={cn(
                "p-3 rounded-lg border-dashed border-2 mt-2",
                isDark ? "border-slate-600" : "border-gray-300"
              )}>
                <Text className={cn("text-xs text-center", isDark ? "text-slate-400" : "text-gray-600")}>
                  + {emails.length - 4} more emails - tap any email for details
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          {data?.isLoading ? "🔄 Loading emails from brain memory..." : "📭 No emails found"}
        </Text>
      )}
    </View>
  );
};

const BrainMemoryDetails: React.FC<{ data: any; onConceptClick: (concept: any) => void }> = ({ data, onConceptClick }) => {
  const { isDark } = useTheme();
  
  if (data?.hasError) {
    return (
      <View className="mt-3">
        <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
          Brain Concepts
        </Text>
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          ⚠️ Neo4j AuraDB connection required to view concepts
        </Text>
      </View>
    );
  }
  
  const concepts = data?.concepts || [];
  const recentConcepts = concepts.slice(0, 4); // Limit to 4 items
  
  return (
    <View className="mt-3">
      <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
        Brain Concepts ({data?.totalConcepts || concepts.length} loaded)
      </Text>
      
      {(data?.source === 'cache' || data?.isCacheValid) && (
        <Text className={cn("text-xs mb-2", isDark ? "text-blue-400" : "text-blue-600")}>
          🧠 Brain cache hit • {data?.responseTime || 0}ms response
        </Text>
      )}
  
      {data?.isConnected && (
        <View className={cn(
          "mb-3 p-2 rounded-lg",
          isDark ? "bg-blue-900/30" : "bg-blue-100"
        )}>
          <Text className={cn("text-sm font-medium", isDark ? "text-blue-300" : "text-blue-700")}>
            ✅ Connected to Neo4j AuraDB
          </Text>
        </View>
      )}
      
      {recentConcepts.length > 0 ? (
        <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
          <View className="space-y-2">
            {recentConcepts.map((concept: any, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => onConceptClick(concept)}
                className={cn(
                  "p-3 rounded-lg border-l-2 border-l-blue-500",
                  isDark ? "bg-slate-700" : "bg-gray-50"
                )}
              >
                <Text className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                  {concept.text || concept.name || concept.title || 'Unknown Concept'}
                </Text>
                {concept.labels && Array.isArray(concept.labels) && (
                  <View className="flex-row flex-wrap gap-1 mt-1">
                    {concept.labels.slice(0, 3).map((label: string, idx: number) => (
                      <View key={idx} className={cn(
                        "px-1 py-0.5 rounded",
                        isDark ? "bg-blue-800/50" : "bg-blue-200"
                      )}>
                        <Text className={cn("text-xs", isDark ? "text-blue-300" : "text-blue-700")}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {concept.properties?.keywords && (
                  <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                    🏷️ {concept.properties.keywords}
                  </Text>
                )}
                {concept.properties?.context && (
                  <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                    📝 {concept.properties.context.substring(0, 60)}...
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            {concepts.length > 4 && (
              <View className={cn(
                "p-3 rounded-lg border-dashed border-2 mt-2",
                isDark ? "border-slate-600" : "border-gray-300"
              )}>
                <Text className={cn("text-xs text-center", isDark ? "text-slate-400" : "text-gray-600")}>
                  + {concepts.length - 4} more concepts - tap any concept for details
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
          {data?.isLoading ? "🔄 Loading concepts from brain memory..." : "🧠 No concepts found"}
        </Text>
      )}
    </View>
  );
};