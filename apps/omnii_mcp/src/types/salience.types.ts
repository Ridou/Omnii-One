export enum SalienceTaskList {
  TOP_OF_MIND = "🧠 Top of Mind",
  PERSISTENT_TOPICS = "📌 Persistent",
  CONTEXT_MEMORY = "💭 Context Memory",
  TEMPORAL_PRIORITIES = "⏰ Time Sensitive",
}

export enum ContextType {
  TOPIC = "topic",
  REMINDER = "reminder",
  PREFERENCE = "preference",
  FACT = "fact",
  PROJECT = "project",
  PERSON = "person",
}

export interface SalienceMetadata {
  salienceScore: number; // 0-100 relevance score
  lastMentioned: Date; // When user last referenced
  mentionCount: number; // How often discussed
  contextType: ContextType; // Type of context
  temporalDecay: number; // How fast importance fades (0-1)
  relatedEvents: string[]; // Calendar event IDs
  relatedTasks: string[]; // Other task IDs
  keywords: string[]; // Associated keywords
  createdAt: Date; // When first created
  updatedAt: Date; // Last update
}

export interface SalienceTask {
  id: string;
  title: string;
  notes: string; // JSON stringified metadata
  due?: Date; // Temporal urgency
  status: "needsAction" | "completed";
  taskListId: string; // Which salience list

  // Parsed metadata (not stored, computed)
  metadata?: SalienceMetadata;
}

export interface SalienceContext {
  entityId: string;
  topOfMind: SalienceTask[]; // High priority, recent topics
  persistentTopics: SalienceTask[]; // Long-term important items
  contextMemory: SalienceTask[]; // LLM conversation context
  temporalPriorities: SalienceTask[]; // Urgent/deadline items

  // Computed scores
  overallSalienceScore: number; // 0-100 current context strength
  temporalUrgency: number; // 0-100 time pressure
  topKeywords: string[]; // Most relevant keywords
}

export interface TopicExtraction {
  name: string;
  importance: number; // 0-100 importance score
  contextType: ContextType;
  keywords: string[];
  relatedTo: string[]; // Related to existing topics
}

export interface ConversationContext {
  message: string;
  phoneNumber: string;
  entityId: string;
  timestamp: Date;
  previousContext?: SalienceContext;
}

export interface SalienceUpdate {
  taskId?: string; // Existing task to update
  title: string;
  contextType: ContextType;
  importance: number; // 0-100
  keywords: string[];
  relatedEvents?: string[];
  relatedTasks?: string[];
  due?: Date;
}
