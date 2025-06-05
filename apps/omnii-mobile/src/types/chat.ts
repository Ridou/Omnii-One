// Chat System Types - Following analytics.ts pattern

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  confidence?: number; // 0-100 (Shape of AI pattern)
  sources?: Citation[]; // Shape of AI Citations pattern
  xpEarned?: number;
  type?: 'text' | 'voice' | 'action' | 'suggestion' | 'unified_tool_response'; // Extended with new type
  metadata?: {
    reasoning?: string; // Shape of AI Show the Work pattern
    alternatives?: string[]; // Shape of AI Alternatives pattern
    context?: string[];
    rawResponse?: any; // Raw WebSocket response data
    category?: string; // Response category
    result?: string; // Action result
    
    // NEW: Component data for rich rendering (building off existing structure)
    componentData?: ComponentData;
    componentActions?: ComponentAction[];
    
    // NEW: Server-side unified response (complete structured data)
    unifiedResponse?: UnifiedToolResponse;
    
    // EXISTING: Keep for backward compatibility
    display?: {
      categoryIcon: string;
      categoryName: string;
      resultEmoji: string;
      resultName: string;
      hasResponse: boolean;
      // NEW: Enhanced display data from server
      title?: string;
      subtitle?: string;
      actions?: ComponentAction[];
    };
  };
}

export interface Citation {
  id: string;
  name: string;
  type: 'analytics' | 'profile' | 'approvals' | 'achievements';
  url?: string;
  confidence: number;
}

export interface Activity {
  type: string;
  description: string;
  timestamp: Date;
}

export interface ChatContext {
  userState: 'focused' | 'stressed' | 'productive' | 'overwhelmed';
  recentActivity: Activity[];
  availableActions: QuickAction[];
  currentProjects: string[];
  todayMetrics: {
    tasksCompleted: number;
    focusTime: number;
    energy: number;
  };
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  type: 'navigation' | 'command' | 'template';
  action: string;
  description?: string;
}

export interface ChatAchievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  xpReward: number;
  category: 'conversation' | 'voice' | 'integration' | 'learning';
}

export interface VoiceCommand {
  id: string;
  phrase: string;
  action: string;
  confidence: number;
  metadata?: Record<string, string | number | boolean>;
}

// Updated tab configuration following EXACT TabConfig pattern
export type ChatTab = 'conversation' | 'actions' | 'references' | 'memory';

export interface ChatTabConfig {
  key: ChatTab;
  label: string;
  icon: string;
  gradient: [string, string];
}

export interface ChatState {
  messages: ChatMessage[];
  context: ChatContext;
  isTyping: boolean;
  isListening: boolean;
  achievements: ChatAchievement[];
  quickActions: QuickAction[];
  isLoading: boolean;
  error: string | null;
}

// NEW: Component data types (aligned with MessageComponents.tsx)
export type ComponentData = 
  | SingleEmailData 
  | EmailListData 
  | CalendarEventData 
  | CalendarListData
  | ContactData 
  | TaskData 
  | GeneralData;

// NEW: Email list for multiple emails (extending existing EmailData pattern)
export interface EmailListData {
  emails: EmailData[];
  totalCount: number;
  unreadCount: number;
  query?: string;
  hasMore?: boolean;
}

// NEW: Enhanced EmailData (aligned with MessageComponents.tsx)
export interface EmailData {
  id?: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  // NEW: Enhanced fields from raw Gmail data
  messageText?: string; // Full message content from raw.data.messages[].messageText
  preview?: string;     // Email preview/snippet from raw.data.messages[].preview
  sender?: string;      // Detailed sender info from raw.data.messages[].sender
  date?: string;
  isRead?: boolean;
  isDraft?: boolean;
  threadId?: string;
  // NEW: Additional Gmail-specific fields
  messageId?: string;   // Gmail message ID from raw.data.messages[].messageId
  messageTimestamp?: string; // Timestamp from raw.data.messages[].messageTimestamp
  labelIds?: string[];  // Gmail label IDs from raw.data.messages[].labelIds
  attachments?: {
    name: string;
    type: string;
    size: number;
    downloadUrl?: string;
  }[];
}

// NEW: Single email wrapper for consistency
export interface SingleEmailData {
  email: EmailData;
}

// NEW: Calendar event data (aligned with MessageComponents.tsx)
export interface CalendarEventData {
  id?: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  attendees: {
    email: string;
    name?: string;
    status?: 'accepted' | 'declined' | 'pending';
  }[];
  location?: string;
  description?: string;
  meetingLink?: string;
}

// NEW: Calendar list for multiple events
export interface CalendarListData {
  events: CalendarEventData[];
  totalCount: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

// NEW: Enhanced ContactData (aligned with MessageComponents.tsx)
export interface ContactData {
  id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  emails: {
    address: string;
    type: 'work' | 'personal' | 'other';
  }[];
  phones: {
    number: string;
    type: 'work' | 'mobile' | 'home' | 'other';
  }[];
  company?: string;
  title?: string;
  photoUrl?: string;
}

// NEW: Enhanced TaskData (aligned with MessageComponents.tsx)
export interface TaskData {
  id?: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO string
  status: 'completed' | 'pending' | 'in_progress';
  priority?: 'high' | 'medium' | 'low';
  list: string;
  listId?: string;
  completedDate?: string;
}

// NEW: General data for non-specific responses
export interface GeneralData {
  content: string;
  summary?: string;
  suggestions?: string[];
  references?: {
    title: string;
    url?: string;
    type: string;
  }[];
}

// NEW: Component actions (aligned with server UnifiedAction)
export interface ComponentAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'destructive';
  icon?: string;
  command?: string;
}

// NEW: Server unified response interface (aligned with server types)
export interface UnifiedToolResponse {
  type: 'email' | 'calendar' | 'contact' | 'task' | 'general';
  success: boolean;
  data: {
    ui: {
      title: string;
      subtitle?: string;
      content: string;
      icon: string;
      actions: ComponentAction[];
      metadata: {
        category: string;
        confidence: number;
        timestamp: string;
        source?: string;
      };
    };
    structured?: ComponentData;
    raw?: any;
  };
  message: string;
  authRequired?: boolean;
  authUrl?: string;
  timestamp: string;
  id: string;
  userId: string;
}
