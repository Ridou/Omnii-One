// ✅ PHASE 1: Import types from Zod validation schemas
import { 
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
  TaskList,
  TaskListData,
  TaskListsData,
  TaskListWithTasks,
  CompleteTaskOverview,
  ServiceType,
} from './unified-response.validation';

// Re-export the Zod-inferred types for backward compatibility
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
  TaskList,
  TaskListData,
  TaskListsData,
  TaskListWithTasks,
  CompleteTaskOverview,
};

export { ServiceType };

// Helper type for plugin responses (keep existing)
export interface PluginResponse {
  success: boolean;
  message: string;
  error?: string;
  rawData?: any;
}

// ✅ RESPONSE BUILDER: Updated to use Zod types
export class UnifiedResponseBuilder {
  private response: Partial<UnifiedToolResponse>;

  constructor(type: UnifiedToolResponse['type'], userId: string) {
    this.response = {
      type,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId,
      success: false,
      data: {
        ui: {
          title: '',
          content: '',
          icon: this.getDefaultIcon(type),
          actions: [],
          metadata: {
            category: type,
            confidence: 0,
            timestamp: new Date().toISOString(),
          }
        }
      },
      message: ''
    };
  }

  setSuccess(success: boolean): this {
    this.response.success = success;
    return this;
  }

  setTitle(title: string): this {
    this.response.data!.ui!.title = title;
    return this;
  }

  setSubtitle(subtitle: string): this {
    this.response.data!.ui!.subtitle = subtitle;
    return this;
  }

  setContent(content: string): this {
    this.response.data!.ui!.content = content;
    return this;
  }

  setMessage(message: string): this {
    this.response.message = message;
    return this;
  }

  setIcon(icon: string): this {
    this.response.data!.ui!.icon = icon;
    return this;
  }

  addAction(action: UnifiedAction): this {
    this.response.data!.ui!.actions.push(action);
    return this;
  }

  // ✅ Updated to use Zod union types
  setStructuredData(data: EmailData | EmailListData | SingleEmailData | CalendarData | CalendarListData | ContactData | ContactListData | SingleContactData | TaskData | TaskListData | TaskListsData | TaskListWithTasks | CompleteTaskOverview | GeneralData): this {
    this.response.data!.structured = data;
    return this;
  }

  setRawData(raw: any): this {
    this.response.data!.raw = raw;
    return this;
  }

  setAuth(required: boolean, url?: string): this {
    this.response.authRequired = required;
    this.response.authUrl = url;
    return this;
  }

  setMetadata(metadata: Partial<UnifiedToolResponse['data']['ui']['metadata']>): this {
    Object.assign(this.response.data!.ui!.metadata, metadata);
    return this;
  }

  build(): UnifiedToolResponse {
    // ✅ This will be validated by Zod when used
    return this.response as UnifiedToolResponse;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private getDefaultIcon(type: UnifiedToolResponse['type']): string {
    const icons = {
      email: '📧',
      calendar: '📅',
      contact: '👤',
      task: '✅',
      general: '💬'
    };
    return icons[type] || '💬';
  }
} 