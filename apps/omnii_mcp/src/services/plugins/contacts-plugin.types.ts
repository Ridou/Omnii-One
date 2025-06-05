import { z } from "zod";
import { 
  ContactData, 
  ContactListData, 
  ContactDataSchema,
  ContactListDataSchema 
} from "../../types/unified-response.validation";
import { UnifiedResponseBuilder, UnifiedToolResponse } from "../../types/unified-response.types";

// ✅ Use Unified Schemas from Frontend (Single Source of Truth)
export const GoogleContactSchema = z.object({
  resourceName: z.string(),
  names: z.array(z.object({
    displayName: z.string().optional(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
  })).optional(),
  emailAddresses: z.array(z.object({
    value: z.string().optional(),
    type: z.string().optional(),
  })).optional(),
  phoneNumbers: z.array(z.object({
    value: z.string().optional(),
    type: z.string().optional(),
  })).optional(),
  organizations: z.array(z.object({
    name: z.string().optional(),
    title: z.string().optional(),
  })).optional(),
  photos: z.array(z.object({
    url: z.string().optional(),
  })).optional(),
});

export const ListContactsParamsSchema = z.object({
  userId: z.string().describe("User ID for authentication"),
  pageSize: z.number().optional().describe("Number of contacts to return per page"),
  pageToken: z.string().optional().describe("Token for pagination"),
  personFields: z.string().optional().describe("Fields to return"),
  sources: z.array(z.string()).optional().describe("Sources to return")
});

// ✅ Inferred Types
export type GoogleContact = z.infer<typeof GoogleContactSchema>;
export type ListContactsParams = z.infer<typeof ListContactsParamsSchema>;

// ✅ Helper Functions with Action Name Tracking
export function createContactSuccessResponse(
  builder: UnifiedResponseBuilder,
  contacts: ContactData[],
  actionName: string,
  title: string = "👥 Contacts",
  subtitle?: string
): UnifiedToolResponse {
  const finalSubtitle = subtitle || `${contacts.length} contacts found`;
  const message = contacts.length === 0 
    ? "👥 No matching contacts found."
    : `👥 Found ${contacts.length} contacts:\n\n` +
      contacts.slice(0, 5).map((contact: ContactData) =>
        `• ${contact.name}${contact.emails.length > 0 ? `\n  ✉️ ${contact.emails[0].address}` : ''}${contact.phones.length > 0 ? `\n  📞 ${contact.phones[0].number}` : ''}`
      ).join('\n\n') + (contacts.length > 5 ? `\n\n... and ${contacts.length - 5} more` : '');

  // ✅ Use Unified Schema for Structured Data
  const structuredData: ContactListData = {
    contacts,
    totalCount: contacts.length
  };

  console.log(`[ContactsHelper] ✅ Creating success response for ${actionName} with ${contacts.length} contacts`);

  return builder
    .setSuccess(true)
    .setTitle(title)
    .setSubtitle(finalSubtitle)
    .setContent(message)
    .setMessage(message)
    .setStructuredData(structuredData)
    .addAction({
      id: "view_all_contacts",
      label: "View All Contacts",
      type: "primary",
      icon: "👥"
    })
    .setMetadata({
      category: 'contact',
      confidence: 95,
      timestamp: new Date().toISOString(),
      source: 'Google Contacts'
    })
    .build();
}

export function createContactErrorResponse(
  builder: UnifiedResponseBuilder,
  actionName: string,
  title: string,
  subtitle: string,
  content: string
): UnifiedToolResponse {
  console.log(`[ContactsHelper] ❌ Creating error response for ${actionName}`);
  
  return builder
    .setSuccess(false)
    .setTitle(title)
    .setSubtitle(subtitle)
    .setContent(content)
    .setMessage(content)
    .setMetadata({
      category: 'contact',
      confidence: 0,
      timestamp: new Date().toISOString(),
      source: 'Google Contacts'
    })
    .build();
}

// ✅ Transform Function Using Unified Schema Validation
export function transformGoogleContactToSchema(contact: GoogleContact): ContactData {
  const name = contact.names?.[0];
  const emails = contact.emailAddresses?.map(email => ({
    address: email.value || '',
    type: mapEmailType(email.type)
  })) || [];
  const phones = contact.phoneNumbers?.map(phone => ({
    number: phone.value || '',
    type: mapPhoneType(phone.type)
  })) || [];

  const transformedContact: ContactData = {
    name: name?.displayName || 'Unnamed Contact',
    firstName: name?.givenName,
    lastName: name?.familyName,
    emails,
    phones,
    company: contact.organizations?.[0]?.name,
    title: contact.organizations?.[0]?.title,
    photoUrl: contact.photos?.[0]?.url,
    contactId: contact.resourceName,
  };

  // ✅ Validate against unified schema
  const validation = ContactDataSchema.safeParse(transformedContact);
  if (!validation.success) {
    console.warn(`[ContactsHelper] ⚠️ Contact failed validation:`, validation.error);
  }

  return transformedContact;
}

export function mapEmailType(googleType?: string): 'work' | 'personal' | 'other' {
  switch (googleType?.toLowerCase()) {
    case 'work': return 'work';
    case 'home':
    case 'personal': return 'personal';
    default: return 'other';
  }
}

export function mapPhoneType(googleType?: string): 'work' | 'mobile' | 'home' | 'other' {
  switch (googleType?.toLowerCase()) {
    case 'work': return 'work';
    case 'mobile': return 'mobile';
    case 'home': return 'home';
    default: return 'other';
  }
} 