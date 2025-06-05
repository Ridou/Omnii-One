import { OpenAI } from "openai";
import { OpenAIToolSet } from "composio-core";
import { Entity } from "../types/action-planning.types";
import { setTyped, getTyped, deleteTyped } from "./typed-redis-cache";
import {
  CachedEntity,
  CachedEntitySchema,
  EntityType,
} from "../types/entity.types";
import unifiedGoogleManager from "./unified-google-manager";
import {
  ActionStep,
  EmailActionType,
  ExecutionContextType,
} from "../types/action-planning.types";

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

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.composio = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
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
    context: ExecutionContextType
  ): Promise<CachedEntity[]> {
    try {
      console.log(`[EntityManager] ===== STARTING ENTITY RESOLUTION =====`);
      console.log(`[EntityManager] Input message: "${message}"`);
      console.log(`[EntityManager] Context: ${context}`);

      // Extract entities from message
      const extractedEntities = await this.extractEntities(message);
      console.log(
        `[EntityManager] Extracted ${extractedEntities.length} entities:`,
        extractedEntities
      );

      if (extractedEntities.length === 0) {
        console.log(
          `[EntityManager] No entities extracted, returning empty array`
        );
        return [];
      }

      // Resolve each entity
      const resolvedEntities: CachedEntity[] = [];
      for (const entity of extractedEntities) {
        console.log(
          `[EntityManager] Processing entity: ${entity.type} = "${entity.value}"`
        );

        // Check cache first
        const cacheKey = `${entity.type}:${entity.value}`;
        const cachedEntity = await this.getCachedEntity(cacheKey);

        // For UNKNOWN entities, retry contact lookup if cache is older than 2 minutes
        // This ensures we don't get stuck with stale UNKNOWN entities when contacts exist
        const shouldRetryUnknown =
          cachedEntity &&
          cachedEntity.type === EntityType.UNKNOWN &&
          Date.now() - cachedEntity.resolvedAt > 2 * 60 * 1000; // 2 minutes

        if (cachedEntity && !shouldRetryUnknown) {
          console.log(
            `[EntityManager] Cache hit for ${cacheKey} (type: ${cachedEntity.type})`
          );
          resolvedEntities.push(cachedEntity);
          continue;
        }

        if (shouldRetryUnknown) {
          console.log(
            `[EntityManager] Cached UNKNOWN entity is stale (${Math.round(
              (Date.now() - cachedEntity!.resolvedAt) / 60000
            )}min old), retrying contact lookup`
          );
          // Clear the stale cache entry so fresh lookup can be cached
          await this.clearCachedEntity(entity.type, entity.value);
        } else {
          console.log(`[EntityManager] Cache miss for ${cacheKey}`);
        }

        // Handle different entity types
        switch (entity.type) {
          case EntityType.PERSON: {
            // Look up contact
            console.log(`[EntityManager] Looking up contact: ${entity.value}`);
            const contactResult = await unifiedGoogleManager.processMessage(
              `Find contact: ${entity.value}`,
              context === ExecutionContextType.WEBSOCKET ? entity.value : "",
              "America/Los_Angeles",
              undefined,
              context
            );

            console.log(
              `[EntityManager] Contact lookup result:`,
              contactResult
            );
            console.log(
              `[EntityManager] Contact lookup success: ${contactResult.success}`
            );
            console.log(
              `[EntityManager] Contact lookup rawData:`,
              JSON.stringify(contactResult.rawData, null, 2)
            );

            if (contactResult.success && contactResult.rawData) {
              // Check if we got contact data
              const data = contactResult.rawData.data || contactResult.rawData;
              console.log(
                `[EntityManager] Parsed data:`,
                JSON.stringify(data, null, 2)
              );

              const results = data.response_data?.results || data.results || [];
              console.log(
                `[EntityManager] Found ${results.length} contact results`
              );

              if (results.length > 0 && results[0].person) {
                const person = results[0].person;
                const email = person.emailAddresses?.[0]?.value;
                const phoneNumber = person.phoneNumbers?.[0]?.value;
                const displayName =
                  person.names?.[0]?.displayName || entity.value;

                console.log(
                  `[EntityManager] Found contact: ${displayName}, email: ${
                    email || "none"
                  }, phone: ${phoneNumber || "none"}`
                );

                if (email) {
                  // Contact has email - create EMAIL entity
                  const resolvedEntity: CachedEntity = {
                    type: EntityType.EMAIL,
                    value: entity.value,
                    email,
                    resolvedAt: Date.now(),
                  };
                  await this.cacheEntity(cacheKey, resolvedEntity);
                  resolvedEntities.push(resolvedEntity);
                  console.log(
                    `[EntityManager] Created EMAIL entity for ${entity.value} -> ${email}`
                  );
                  continue;
                } else {
                  // Contact found but no email - create PERSON entity that needs email resolution
                  console.log(
                    `[EntityManager] Contact "${displayName}" found but has no email address`
                  );
                  const personEntity: CachedEntity = {
                    type: EntityType.PERSON,
                    value: entity.value,
                    displayName,
                    phoneNumber,
                    needsEmailResolution: true,
                    resolvedAt: Date.now(),
                  };
                  await this.cacheEntity(cacheKey, personEntity);
                  resolvedEntities.push(personEntity);
                  continue;
                }
              } else {
                console.log(
                  `[EntityManager] No person data found in contact results`
                );
              }
            } else {
              console.log(
                `[EntityManager] Contact lookup failed or no rawData`
              );
            }

            // If we get here, contact lookup failed or no contact found
            console.log(
              `[EntityManager] No contact found for: ${entity.value}, creating UNKNOWN entity`
            );
            break;
          }
          case EntityType.EMAIL: {
            // Email is already resolved
            const resolvedEntity: CachedEntity = {
              type: EntityType.EMAIL,
              value: entity.value,
              email: entity.value,
              resolvedAt: Date.now(),
            };
            await this.cacheEntity(cacheKey, resolvedEntity);
            resolvedEntities.push(resolvedEntity);
            continue;
          }
        }

        // If we get here, entity couldn't be resolved
        const unknownEntity: CachedEntity = {
          type: EntityType.UNKNOWN,
          value: entity.value,
          resolvedAt: Date.now(),
        };
        await this.cacheEntity(cacheKey, unknownEntity);
        resolvedEntities.push(unknownEntity);
        console.log(
          `[EntityManager] Created UNKNOWN entity for: ${entity.value}`
        );
      }

      console.log(`[EntityManager] ===== ENTITY RESOLUTION COMPLETE =====`);
      console.log(
        `[EntityManager] Final resolved entities (${resolvedEntities.length}):`,
        resolvedEntities
      );
      return resolvedEntities;
    } catch (error) {
      console.error(`[EntityManager] Error resolving entities:`, error);
      return [];
    }
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
}
