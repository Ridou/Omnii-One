import { z } from 'zod/v4';
import { ServiceType } from './task';
import { EmailListDataSchema, EmailDataSchema, SingleEmailDataSchema } from './email';
import { CalendarListDataSchema, CalendarDataSchema } from './calendar';
import { ContactListDataSchema, ContactDataSchema, SingleContactDataSchema } from './contact';
import { TaskListsDataSchema, TaskListDataSchema, TaskDataSchema, TaskListWithTasksSchema, CompleteTaskOverviewSchema } from './task';
import { GeneralDataSchema, UIDataSchema, UnifiedActionSchema } from './general';
import { RDFDataSchema, RDFQueryListDataSchema, RDFAnalysisListDataSchema } from './rdf';

// ✅ DISCRIMINATED UNION: Static type-safe response schema
export const UnifiedToolResponseSchema = z.discriminatedUnion("type", [
  // Email responses
  z.object({
    type: z.literal(ServiceType.EMAIL),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: EmailListDataSchema.or(EmailDataSchema)
        .or(SingleEmailDataSchema)
        .optional(),
      raw: z.unknown().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),

  // Calendar responses
  z.object({
    type: z.literal(ServiceType.CALENDAR),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: CalendarListDataSchema.or(CalendarDataSchema).optional(),
      raw: z.unknown().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),

  // Contact responses
  z.object({
    type: z.literal(ServiceType.CONTACT),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: ContactListDataSchema.or(ContactDataSchema)
        .or(SingleContactDataSchema)
        .optional(),
      raw: z.unknown().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),

  // Task responses
  z.object({
    type: z.literal(ServiceType.TASK),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: TaskListsDataSchema.or(TaskListDataSchema)
        .or(TaskDataSchema)
        .or(TaskListWithTasksSchema)
        .or(CompleteTaskOverviewSchema)
        .optional(),
      raw: z.unknown().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),
  
  // RDF responses
  z.object({
    type: z.literal(ServiceType.RDF),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: RDFDataSchema.or(RDFQueryListDataSchema).or(RDFAnalysisListDataSchema).optional(),
      raw: z.any().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
    
    // RDF-specific metadata for enhanced integration
    processing_time_ms: z.number().min(0).optional(),
    reasoning_depth: z.enum(['basic', 'intermediate', 'deep']).optional(),
    brain_integration_active: z.boolean().optional(),
    cache_hit: z.boolean().optional(),
    validation_required: z.boolean().optional()
  }),
  
  // General responses
  z.object({
    type: z.literal(ServiceType.GENERAL),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: GeneralDataSchema.optional(),
      raw: z.unknown().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),
]);

// ✅ VALIDATION FUNCTIONS: Replace runtime checking
export function isValidUnifiedToolResponse(
  data: unknown,
): data is z.infer<typeof UnifiedToolResponseSchema> {
  const result = UnifiedToolResponseSchema.safeParse(data);
  if (result.success) {
    console.log("[UnifiedValidation] ✅ Valid UnifiedToolResponse detected");
    return true;
  }
  console.log(
    "[UnifiedValidation] ❌ Invalid UnifiedToolResponse:",
    result.error.message,
  );
  return false;
}

export function validateUnifiedToolResponse(
  data: unknown,
): z.infer<typeof UnifiedToolResponseSchema> {
  console.log(
    "[UnifiedValidation] 🔍 Validating UnifiedToolResponse with Zod...",
  );

  try {
    const validated = UnifiedToolResponseSchema.parse(data);
    console.log('[UnifiedValidation] ✅ Validation successful');
    
    // Log service-specific validation details
    if (validated.type === 'email' && validated.data.structured) {
      if ('emails' in validated.data.structured) {
        console.log('[UnifiedValidation] 📧 EmailListData validated:', validated.data.structured.emails.length, 'emails');
      } else {
        console.log("[UnifiedValidation] 📧 EmailData validated");
      }
    }
    
    if (validated.type === 'rdf' && validated.data.structured) {
      if ('response_type' in validated.data.structured) {
        console.log('[UnifiedValidation] 🧠 RDFData validated, type:', validated.data.structured.response_type);
        if (validated.processing_time_ms) {
          console.log('[UnifiedValidation] 🧠 Processing time:', validated.processing_time_ms, 'ms');
        }
      }
    }
    
    return validated;
  } catch (error) {
    console.error("[UnifiedValidation] ❌ Validation failed:", error);
    throw error;
  }
}

// ✅ SAFE PARSE HELPER: Non-throwing validation
export function safeParseUnifiedToolResponse(data: unknown):
  | {
      success: true;
      data: z.infer<typeof UnifiedToolResponseSchema>;
    }
  | {
      success: false;
      error: string;
    } {
  const result = UnifiedToolResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      error: result.error.message,
    };
  }
}

// ✅ RESPONSE BUILDER: Updated to use Zod types
export class UnifiedResponseBuilder {
  private response: Partial<z.infer<typeof UnifiedToolResponseSchema>>;

  constructor(type: z.infer<typeof UnifiedToolResponseSchema>['type'], userId: string) {
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

  addAction(action: z.infer<typeof UnifiedActionSchema>): this {
    this.response.data!.ui!.actions.push(action);
    return this;
  }

  // ✅ Updated to use Zod union types
  setStructuredData(data: any): this {
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

  setMetadata(metadata: any): this {
    Object.assign(this.response.data!.ui!.metadata, metadata);
    return this;
  }

  build(): z.infer<typeof UnifiedToolResponseSchema> {
    // ✅ This will be validated by Zod when used
    return this.response as z.infer<typeof UnifiedToolResponseSchema>;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private getDefaultIcon(type: z.infer<typeof UnifiedToolResponseSchema>['type']): string {
    const icons = {
      email: '📧',
      calendar: '📅',
      contact: '👤',
      task: '✅',
      rdf: '🧠',
      general: '💬'
    };
    return icons[type as keyof typeof icons] || '💬';
  }
} 