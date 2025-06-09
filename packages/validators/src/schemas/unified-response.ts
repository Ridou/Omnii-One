import { z } from 'zod/v4';
import { ServiceType } from './task';
import { EmailListDataSchema, EmailDataSchema, SingleEmailDataSchema } from './email';
import { CalendarListDataSchema, CalendarDataSchema } from './calendar';
import { ContactListDataSchema, ContactDataSchema, SingleContactDataSchema } from './contact';
import { TaskListsDataSchema, TaskListDataSchema, TaskDataSchema, TaskListWithTasksSchema, CompleteTaskOverviewSchema } from './task';
import { GeneralDataSchema, UIDataSchema } from './general';

// ✅ DISCRIMINATED UNION: Static type-safe response schema
export const UnifiedToolResponseSchema = z.discriminatedUnion('type', [
  // Email responses
  z.object({
    type: z.literal(ServiceType.EMAIL),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: EmailListDataSchema.or(EmailDataSchema).or(SingleEmailDataSchema).optional(),
      raw: z.any().optional(),
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
      raw: z.any().optional(),
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
      structured: ContactListDataSchema.or(ContactDataSchema).or(SingleContactDataSchema).optional(),
      raw: z.any().optional(),
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
      structured: TaskListsDataSchema.or(TaskListDataSchema).or(TaskDataSchema).or(TaskListWithTasksSchema).or(CompleteTaskOverviewSchema).optional(),
      raw: z.any().optional(),
    }),
    message: z.string(),
    authRequired: z.boolean().optional(),
    authUrl: z.string().optional(),
    timestamp: z.string(),
    id: z.string(),
    userId: z.string(),
  }),
  
  // General responses
  z.object({
    type: z.literal(ServiceType.GENERAL),
    success: z.boolean(),
    data: z.object({
      ui: UIDataSchema,
      structured: GeneralDataSchema.optional(),
      raw: z.any().optional(),
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
export function isValidUnifiedToolResponse(data: any): data is z.infer<typeof UnifiedToolResponseSchema> {
  const result = UnifiedToolResponseSchema.safeParse(data);
  if (result.success) {
    console.log('[UnifiedValidation] ✅ Valid UnifiedToolResponse detected');
    return true;
  }
  console.log('[UnifiedValidation] ❌ Invalid UnifiedToolResponse:', result.error.message);
  return false;
}

export function validateUnifiedToolResponse(data: any): z.infer<typeof UnifiedToolResponseSchema> {
  console.log('[UnifiedValidation] 🔍 Validating UnifiedToolResponse with Zod...');
  
  try {
    const validated = UnifiedToolResponseSchema.parse(data);
    console.log('[UnifiedValidation] ✅ Validation successful');
    
    // Log email-specific validation details
    if (validated.type === 'email' && validated.data.structured) {
      if ('emails' in validated.data.structured) {
        console.log('[UnifiedValidation] 📧 EmailListData validated:', validated.data.structured.emails.length, 'emails');
      } else {
        console.log('[UnifiedValidation] 📧 EmailData validated');
      }
    }
    
    return validated;
  } catch (error) {
    console.error('[UnifiedValidation] ❌ Validation failed:', error);
    throw error;
  }
}

// ✅ SAFE PARSE HELPER: Non-throwing validation
export function safeParseUnifiedToolResponse(data: any): { 
  success: true; 
  data: z.infer<typeof UnifiedToolResponseSchema>; 
} | { 
  success: false; 
  error: string; 
} {
  const result = UnifiedToolResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { 
      success: false, 
      error: result.error.message 
    };
  }
} 