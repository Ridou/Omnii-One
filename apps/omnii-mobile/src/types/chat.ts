// Chat System Types - Using unified validators from @omnii/validators

import type {
  UnifiedToolResponse,
  EmailData,
  EmailListData,
  SingleEmailData,
  CalendarData,
  CalendarListData,
  ContactData,
  ContactListData,
  SingleContactData,
  TaskData,
  GeneralData,
  UnifiedAction,
  ServiceType
} from '@omnii/validators';

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
    
    // Component data for rich rendering (using unified types)
    componentData?: ComponentData;
    componentActions?: ComponentAction[];
    
    // Server-side unified response (using unified type)
    unifiedResponse?: UnifiedToolResponse;
    
    // EXISTING: Keep for backward compatibility
    display?: {
      categoryIcon: string;
      categoryName: string;
      resultEmoji: string;
      resultName: string;
      hasResponse: boolean;
      // Enhanced display data from server
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

// Component data types (using unified types from validators)
export type ComponentData = 
  | SingleEmailData 
  | EmailListData 
  | CalendarData 
  | CalendarListData
  | ContactData 
  | ContactListData
  | SingleContactData
  | TaskData 
  | GeneralData;

// Component actions (aligned with unified UnifiedAction)
export interface ComponentAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'destructive';
  icon?: string;
  command?: string;
}

// Re-export unified types for convenience
export type {
  UnifiedToolResponse,
  EmailData,
  EmailListData,
  SingleEmailData,
  CalendarData,
  CalendarListData,
  ContactData,
  ContactListData,
  SingleContactData,
  TaskData,
  GeneralData,
  UnifiedAction,
  ServiceType
};
