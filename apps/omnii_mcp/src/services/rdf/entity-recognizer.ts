import { OpenAI } from "openai";
import { OpenAIToolSet } from "composio-core";
import { Entity } from "../../types/action-planning.types";
import { setTyped, getTyped, deleteTyped } from "../caching/typed-redis-cache";
import {
  CachedEntity,
  CachedEntitySchema,
  EntityType,
} from "../../types/entity.types";
import unifiedGoogleManager from "../integrations/unified-google-manager";
import { SmartContactResolver } from "./smart-contact-resolver";
import {
  ActionStep,
  EmailActionType,
  ExecutionContextType,
} from "../../types/action-planning.types";

/**
 * Helper to slugify a string for use in placeholders
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Manages entity recognition, resolution, and placeholder patching
 */
export class EntityManager {
  private openai: OpenAI;
  private composio: OpenAIToolSet;
  private smartContactResolver: SmartContactResolver;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.composio = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
    });

    this.smartContactResolver = new SmartContactResolver();
    console.log('🧠 EntityManager initialized with SmartContactResolver');
  }

  /**
   * Extract entities from a message
   */
  private async extractEntities(
    message: string
  ): Promise<Array<{ type: EntityType; value: string }>> {
    try {
      // If message is already an object, return it as a single entity
      if (typeof message === "object" && message !== null) {
        console.log(
          `[EntityManager] Message is already an entity object:`,
          message
        );
        return [message as { type: EntityType; value: string }];
      }

      console.log(
        `[EntityManager] Starting entity extraction for message: "${message}"`
      );

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract ONLY the person's name from the message. Return a JSON object with a single entity. Example format: {"type": "PERSON", "value": "John Doe"}. Do not make up or guess any email addresses.`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        response_format: { type: "json_object" },
      });

      console.log(`[EntityManager] Raw API response:`, response);
      const content = response.choices[0].message.content;
      console.log(`[EntityManager] Response content:`, content);

      if (!content) {
        console.log(`[EntityManager] No content in response`);
        return [];
      }

      try {
        const parsed = JSON.parse(content);
        console.log(`[EntityManager] Parsed JSON:`, parsed);

        // Handle both single object and array responses
        let entities = [];
        if (Array.isArray(parsed)) {
          entities = parsed;
        } else if (parsed.entities) {
          entities = parsed.entities;
        } else if (parsed.type && parsed.value) {
          // Single entity object
          entities = [parsed];
        } else {
          console.log(
            `[EntityManager] No recognizable entity structure in parsed JSON:`,
            parsed
          );
          return [];
        }
        console.log(`[EntityManager] Extracted entities array:`, entities);

        const mappedEntities = entities.map((entity: any) => ({
          type: entity.type as EntityType,
          value: entity.value,
        }));
        console.log(`[EntityManager] Mapped entities:`, mappedEntities);

        // Validate that we have valid entities
        const validEntities = mappedEntities.filter(
          (entity: { type: EntityType; value: string }) =>
            entity.type &&
            entity.value &&
            Object.values(EntityType).includes(entity.type)
        );

        if (validEntities.length !== mappedEntities.length) {
          console.warn(
            `[EntityManager] Some entities were filtered out as invalid`
          );
          console.warn(`[EntityManager] Original:`, mappedEntities);
          console.warn(`[EntityManager] Valid:`, validEntities);
        }

        return validEntities;
      } catch (e) {
        console.error(`[EntityManager] Error parsing entities JSON:`, e);
        console.error(`[EntityManager] Raw content was:`, content);
        return [];
      }
    } catch (error) {
      console.error(`[EntityManager] Error in OpenAI API call:`, error);
      return [];
    }
  }

  /**
   * Get cached entity from Redis
   */
  private async getCachedEntity(
    cacheKey: string
  ): Promise<CachedEntity | null> {
    try {
      return await getTyped<CachedEntity>(cacheKey, CachedEntitySchema);
    } catch (error) {
      console.error(`[EntityManager] Error getting cached entity:`, error);
      return null;
    }
  }

  /**
   * Clear cached entity from Redis
   */
  async clearCachedEntity(
    entityType: EntityType,
    entityValue: string
  ): Promise<void> {
    try {
      const cacheKey = `${entityType}:${entityValue}`;
      await deleteTyped(cacheKey);
      console.log(`[EntityManager] Cleared cached entity: ${cacheKey}`);
    } catch (error) {
      console.error(`[EntityManager] Error clearing cached entity:`, error);
    }
  }

  /**
   * Debug method: Clear specific entity from cache (for testing)
   */
  static async clearEntityFromCache(
    entityType: EntityType,
    entityValue: string
  ): Promise<void> {
    try {
      const cacheKey = `${entityType}:${entityValue}`;
      await deleteTyped(cacheKey);
      console.log(`[EntityManager] [DEBUG] Cleared cached entity: ${cacheKey}`);
    } catch (error) {
      console.error(
        `[EntityManager] [DEBUG] Error clearing cached entity:`,
        error
      );
    }
  }

  /**
   * Debug utility: Clear Bobby Ross from cache specifically
   */
  static async clearBobbyRossFromCache(): Promise<void> {
    try {
      await EntityManager.clearEntityFromCache(EntityType.PERSON, "Bobby Ross");
      console.log(`[EntityManager] [DEBUG] Bobby Ross cleared from cache`);
    } catch (error) {
      console.error(
        `[EntityManager] [DEBUG] Error clearing Bobby Ross:`,
        error
      );
    }
  }

  /**
   * Cache entity in Redis
   */
  private async cacheEntity(
    cacheKey: string,
    entity: CachedEntity
  ): Promise<void> {
    try {
      // Clear any existing cache first if this is an updated resolution
      if (entity.type !== EntityType.UNKNOWN) {
        console.log(
          `[EntityManager] Caching resolved entity: ${cacheKey} as ${entity.type}`
        );
      }
      await setTyped<CachedEntity>(cacheKey, entity, 3600); // Cache for 1 hour
    } catch (error) {
      console.error(`[EntityManager] Error caching entity:`, error);
    }
  }

  /**
   * Resolve entities from a message
   */
  async resolveEntities(
    message: string,
    context: ExecutionContextType,
    userUUID?: string
  ): Promise<CachedEntity[]> {
    console.log(`[EntityManager] 🔍 Resolving entities from: "${message}"`);
    console.log(`[EntityManager] Context: ${context}, UserUUID: ${userUUID || 'none'}`);
    
    const entities = await this.extractEntities(message);
    console.log(`[EntityManager] 📊 Extracted ${entities.length} raw entities:`, entities.map(e => ({
      type: e.type,
      value: e.value
    })));
    
    const resolvedEntities: CachedEntity[] = [];

    for (const entity of entities) {
      console.log(`[EntityManager] 🔍 Processing entity: ${entity.type} = "${entity.value}"`);
      
      const cacheKey = `entity:${userUUID || 'default'}:${entity.type}:${entity.value}`;
      console.log(`[EntityManager] 📋 Cache key: ${cacheKey}`);

      // Check cache first
      const cachedEntity = await this.getCachedEntity(cacheKey);
      if (cachedEntity) {
        console.log(`[EntityManager] ✅ Found cached entity: ${entity.value} → ${cachedEntity.type} (${cachedEntity.email || 'no email'})`);
        resolvedEntities.push(cachedEntity);
        continue;
      }

      console.log(`[EntityManager] 🔍 No cache found, analyzing entity type: ${entity.type}`);

      // Handle different entity types
      switch (entity.type) {
        case EntityType.PERSON: {
          console.log(`[EntityManager] 👤 Processing PERSON entity: ${entity.value}`);
          
          // Look up contact
          console.log(`[EntityManager] Looking up contact: ${entity.value}`);
          
          // Skip contact lookup if no valid userUUID
          if (!userUUID || userUUID.trim() === "") {
            console.warn(`[EntityManager] No valid userUUID for contact lookup: ${entity.value}`);
            
            // Create PERSON entity that needs email resolution
            const personEntity: CachedEntity = {
              type: EntityType.PERSON,
              value: entity.value,
              needsEmailResolution: true,
              resolvedAt: Date.now(),
            };
            await this.cacheEntity(cacheKey, personEntity);
            resolvedEntities.push(personEntity);
            console.log(`[EntityManager] ✅ Created PERSON entity (needs resolution): ${entity.value}`);
            continue;
          } else {
            console.log(`[EntityManager] 📞 Calling Google Contacts for: ${entity.value} (userUUID: ${userUUID})`);
            
            const contactResult = await unifiedGoogleManager.processMessage(
              `Find contact: ${entity.value}`,
              userUUID,
              "America/Los_Angeles",
              undefined,
              context
            );

            console.log(`[EntityManager] 📊 Contact lookup result:`, {
              success: contactResult.success,
              hasRawData: !!(contactResult as any).rawData,
              message: contactResult.message
            });

            if (contactResult.success && (contactResult as any).rawData) {
              console.log(`[EntityManager] 📋 Raw contact data keys:`, Object.keys((contactResult as any).rawData));
              
              const contactData = this.extractContactFromResult(contactResult, entity.value);
              console.log(`[EntityManager] 📊 Extracted contact data:`, contactData);
              
              if (contactData) {
                const resolvedEntity: CachedEntity = {
                  type: EntityType.EMAIL,
                  value: entity.value,
                  email: contactData.email!,
                  displayName: contactData.name,
                  phoneNumber: contactData.phone,
                  resolvedAt: Date.now(),
                };
                await this.cacheEntity(cacheKey, resolvedEntity);
                resolvedEntities.push(resolvedEntity);
                console.log(`[EntityManager] ✅ Direct contact resolution: ${entity.value} → ${contactData.email} (${contactData.name})`);
                continue;
              } else {
                console.log(`[EntityManager] ⚠️ Contact lookup succeeded but no data extracted`);
              }
            } else {
              console.log(`[EntityManager] ⚠️ Contact lookup failed or returned no data`);
            }
            
            // If direct contact lookup failed, try smart contact resolution
            console.log(`[EntityManager] 🧠 Trying smart contact resolution for: ${entity.value}`);
            
            try {
              const smartResult = await this.smartContactResolver.resolveContact(
                entity.value,
                context,
                userUUID
              );
              
              console.log(`[EntityManager] 🧠 Smart resolution result:`, {
                success: smartResult.success,
                hasExactMatch: !!smartResult.exactMatch,
                hasSuggestions: !!smartResult.suggestions?.length,
                message: smartResult.message
              });

              if (smartResult.success && smartResult.exactMatch) {
                if (smartResult.exactMatch.email) {
                  // High-confidence match with email
                  const resolvedEntity: CachedEntity = {
                    type: EntityType.EMAIL,
                    value: entity.value,
                    email: smartResult.exactMatch.email,
                    displayName: smartResult.exactMatch.name,
                    phoneNumber: smartResult.exactMatch.phone,
                    resolvedAt: Date.now(),
                  };
                  await this.cacheEntity(cacheKey, resolvedEntity);
                  resolvedEntities.push(resolvedEntity);
                  console.log(`[EntityManager] ✅ Smart resolution with email: ${entity.value} → ${smartResult.exactMatch.email} (${smartResult.exactMatch.name})`);
                  continue;
                } else {
                  // High-confidence match but no email
                  const personEntity: CachedEntity = {
                    type: EntityType.PERSON,
                    value: entity.value,
                    displayName: smartResult.exactMatch.name,
                    phoneNumber: smartResult.exactMatch.phone,
                    needsEmailResolution: true,
                    resolvedAt: Date.now(),
                  };
                  await this.cacheEntity(cacheKey, personEntity);
                  resolvedEntities.push(personEntity);
                  console.log(`[EntityManager] ✅ Smart resolution without email (needs resolution): ${entity.value} → ${smartResult.exactMatch.name}`);
                  continue;
                }
              } else if (smartResult.suggestions && smartResult.suggestions.length > 0) {
                // Found suggestions - create an UNKNOWN entity with suggestions for user intervention
                console.log(`[EntityManager] 💡 Found ${smartResult.suggestions.length} suggestions for "${entity.value}"`);
                const unknownWithSuggestions: CachedEntity = {
                  type: EntityType.UNKNOWN,
                  value: entity.value,
                  smartSuggestions: smartResult.suggestions,
                  resolvedAt: Date.now(),
                };
                await this.cacheEntity(cacheKey, unknownWithSuggestions);
                resolvedEntities.push(unknownWithSuggestions);
                console.log(`[EntityManager] ✅ Created UNKNOWN entity with suggestions: ${smartResult.message}`);
                continue;
              }

              // If we get here, even smart resolution failed
              console.log(`[EntityManager] ❌ Smart resolution also failed for: ${entity.value}, creating UNKNOWN entity`);
            } catch (error) {
              console.error(`[EntityManager] Smart resolution error for "${entity.value}":`, error);
            }
          }

          // If all contact resolution methods failed, create PERSON entity that needs email resolution
          const personEntity: CachedEntity = {
            type: EntityType.PERSON,
            value: entity.value,
            needsEmailResolution: true,
            resolvedAt: Date.now(),
          };
          await this.cacheEntity(cacheKey, personEntity);
          resolvedEntities.push(personEntity);
          console.log(`[EntityManager] ✅ Fallback: Created PERSON entity needing resolution: ${entity.value}`);
          break;
        }

        case EntityType.EMAIL: {
          // Direct email - store as-is
          const emailEntity: CachedEntity = {
            type: EntityType.EMAIL,
            value: entity.value,
            email: entity.value,
            resolvedAt: Date.now(),
          };
          await this.cacheEntity(cacheKey, emailEntity);
          resolvedEntities.push(emailEntity);
          console.log(`[EntityManager] ✅ Direct email entity: ${entity.value}`);
          break;
        }

        default: {
          // Unknown entity type - create as UNKNOWN
          const unknownEntity: CachedEntity = {
            type: EntityType.UNKNOWN,
            value: entity.value,
            resolvedAt: Date.now(),
          };
          await this.cacheEntity(cacheKey, unknownEntity);
          resolvedEntities.push(unknownEntity);
          console.log(`[EntityManager] ⚠️ Created UNKNOWN entity: ${entity.value} (type: ${entity.type})`);
          break;
        }
      }
    }

    console.log(`[EntityManager] 🎯 Final resolution summary:`);
    resolvedEntities.forEach((entity, idx) => {
      console.log(`[EntityManager] ${idx + 1}. ${entity.type} = "${entity.value}" ${entity.email ? `(email: ${entity.email})` : ''} ${entity.needsEmailResolution ? '(NEEDS EMAIL RESOLUTION)' : ''}`);
    });

    return resolvedEntities;
  }

  /**
   * Patch email placeholders in action steps with resolved entity emails
   */
  patchEmailPlaceholders(
    steps: ActionStep[],
    entities: Entity[]
  ): ActionStep[] {
    if (!entities || entities.length === 0) {
      return steps;
    }

    return steps.map((step) => {
      // Only patch email steps
      if (
        step.type === "email" &&
        (step.action === EmailActionType.SEND_EMAIL ||
          step.action === EmailActionType.CREATE_DRAFT ||
          step.action === "send_email" || // Legacy support
          step.action === "create_draft") &&
        step.params &&
        step.params.recipient_email
      ) {
        const recipientEmail = step.params.recipient_email;

        // Check if it's a placeholder
        if (
          typeof recipientEmail === "string" &&
          recipientEmail.startsWith("{{ENTITY:")
        ) {
          const placeholder = recipientEmail;
          const slug = placeholder.match(/\{\{ENTITY:([a-z0-9\-]+)\}\}/i)?.[1];

          if (slug) {
            // Try to find a matching entity with email
            const match = entities.find(
              (e) => slugify(e.value) === slug && e.email
            );

            if (match && match.email) {
              console.log(
                `[EntityManager] Resolved ${placeholder} → ${match.email}`
              );
              return {
                ...step,
                params: {
                  ...step.params,
                  recipient_email: match.email,
                },
              };
            } else {
              console.warn(
                `[EntityManager] Could not resolve placeholder: ${placeholder}`
              );
            }
          }
        }
      }

      return step;
    });
  }

  /**
   * Check if any steps have unresolved email placeholders
   */
  hasUnresolvedPlaceholders(steps: ActionStep[]): boolean {
    return steps.some((step) => {
      if (
        step.type === "email" &&
        (step.action === EmailActionType.SEND_EMAIL ||
          step.action === EmailActionType.CREATE_DRAFT ||
          step.action === "send_email" ||
          step.action === "create_draft") &&
        step.params &&
        step.params.recipient_email
      ) {
        return (
          typeof step.params.recipient_email === "string" &&
          step.params.recipient_email.startsWith("{{ENTITY:")
        );
      }
      return false;
    });
  }

  /**
   * Get all unresolved placeholder entities from steps
   */
  getUnresolvedEntities(steps: ActionStep[]): string[] {
    const unresolvedSlugs: Set<string> = new Set();

    steps.forEach((step) => {
      if (
        step.type === "email" &&
        (step.action === EmailActionType.SEND_EMAIL ||
          step.action === EmailActionType.CREATE_DRAFT ||
          step.action === "send_email" ||
          step.action === "create_draft") &&
        step.params &&
        step.params.recipient_email
      ) {
        const recipientEmail = step.params.recipient_email;
        if (
          typeof recipientEmail === "string" &&
          recipientEmail.startsWith("{{ENTITY:")
        ) {
          const slug = recipientEmail.match(
            /\{\{ENTITY:([a-z0-9\-]+)\}\}/i
          )?.[1];
          if (slug) {
            unresolvedSlugs.add(slug);
          }
        }
      }
    });

    return Array.from(unresolvedSlugs);
  }

  /**
   * Extract contact data from Google API result
   */
  private extractContactFromResult(contactResult: any, entityValue: string): { name: string; email?: string; phone?: string } | null {
    try {
      // Try to extract from different possible response formats
      const rawData = (contactResult as any).rawData || contactResult.data || contactResult;
      
      if (!rawData) return null;
      
      // Handle array of contacts
      if (Array.isArray(rawData)) {
        const contact = rawData[0];
        return this.parseContactObject(contact, entityValue);
      }
      
      // Handle nested data structure
      if (rawData.data && Array.isArray(rawData.data)) {
        const contact = rawData.data[0];
        return this.parseContactObject(contact, entityValue);
      }
      
      // Handle structured response
      if (rawData.structured && rawData.structured.contacts && Array.isArray(rawData.structured.contacts)) {
        const contact = rawData.structured.contacts[0];
        return this.parseContactObject(contact, entityValue);
      }
      
      // Handle single contact object
      return this.parseContactObject(rawData, entityValue);
      
    } catch (error) {
      console.error(`[EntityManager] Error extracting contact from result:`, error);
      return null;
    }
  }

  /**
   * Parse a contact object from various API formats
   */
  private parseContactObject(contact: any, fallbackName: string): { name: string; email?: string; phone?: string } | null {
    if (!contact) return null;
    
    try {
      // Google People API format
      const names = contact.names || [];
      const emails = contact.emailAddresses || [];
      const phones = contact.phoneNumbers || [];
      
      // Extract name
      let name = fallbackName;
      if (names.length > 0 && names[0].displayName) {
        name = names[0].displayName;
      } else if (contact.name) {
        name = contact.name;
      } else if (contact.displayName) {
        name = contact.displayName;
      }
      
      // Extract email
      let email = undefined;
      if (emails.length > 0 && emails[0].value) {
        email = emails[0].value;
      } else if (contact.email) {
        email = contact.email;
      }
      
      // Extract phone
      let phone = undefined;
      if (phones.length > 0 && phones[0].value) {
        phone = phones[0].value;
      } else if (contact.phone || contact.phoneNumber) {
        phone = contact.phone || contact.phoneNumber;
      }
      
      return {
        name,
        email,
        phone
      };
    } catch (error) {
      console.error(`[EntityManager] Error parsing contact object:`, error);
      return null;
    }
  }
}
