import type { ChatTabConfig } from '~/types/chat';
import { 
  GmailIcon, 
  CalendarIcon, 
  ContactsIcon, 
  TasksIcon 
} from '~/icons/ChatIcons';

export const CHAT_TABS: ChatTabConfig[] = [
  {
    key: 'conversation',
    label: 'Chat',
    icon: '💬',
    gradient: ['#4ECDC4', '#44A08D']
  },
  {
    key: 'actions',
    label: 'Actions',
    icon: '⚡',
    gradient: ['#667eea', '#764ba2']
  },
  {
    key: 'references',
    label: 'References',
    icon: '📚',
    gradient: ['#FF7043', '#FF5722']
  },
  {
    key: 'memory',
    label: 'Memory',
    icon: '🧠',
    gradient: ['#FF3B30', '#DC143C']
  }
];

export const QUICK_ACTIONS = [
  { 
    id: '1', 
    iconComponent: GmailIcon, 
    label: 'Gmail', 
    description: 'Check latest emails', 
    command: 'check my latest emails' 
  },
  { 
    id: '2', 
    iconComponent: CalendarIcon, 
    label: 'Calendar', 
    description: "View today's events", 
    command: 'show my calendar for this past week and this week and next week' 
  },
  { 
    id: '3', 
    iconComponent: ContactsIcon, 
    label: 'Contacts', 
    description: 'Find contacts', 
    command: 'list all contacts' 
  },
  { 
    id: '4', 
    iconComponent: TasksIcon, 
    label: 'Tasks', 
    description: 'Manage tasks', 
    command: 'show my tasks' 
  }
];

export const TOOL_DROPDOWN_ACTIONS = {
  add: [
    { 
      id: 'email', 
      iconComponent: GmailIcon, 
      label: 'Compose Email', 
      command: 'compose a new email' 
    },
    { 
      id: 'calendar', 
      iconComponent: CalendarIcon, 
      label: 'Create Event', 
      command: 'create a calendar event' 
    },
    { 
      id: 'contact', 
      iconComponent: ContactsIcon, 
      label: 'Add Contact', 
      command: 'add a new contact' 
    },
    { 
      id: 'task', 
      iconComponent: TasksIcon, 
      label: 'Create Task', 
      command: 'create a new task' 
    }
  ],
  search: [
    { 
      id: 'gmail', 
      iconComponent: GmailIcon, 
      label: 'Search Gmail', 
      command: 'search my emails for ' 
    },
    { 
      id: 'calendar', 
      iconComponent: CalendarIcon, 
      label: 'Find Events', 
      command: 'find calendar events for ' 
    },
    { 
      id: 'contacts', 
      iconComponent: ContactsIcon, 
      label: 'Find Contacts', 
      command: 'find contact ' 
    },
    { 
      id: 'tasks', 
      iconComponent: TasksIcon, 
      label: 'Search Tasks', 
      command: 'search my tasks for ' 
    }
  ]
} as const;

export const CHAT_PROMPTS = [
  "What should I focus on today?",
  "Help me plan tomorrow",
  "list my calendar events",
  "fetch my latest emails"
];