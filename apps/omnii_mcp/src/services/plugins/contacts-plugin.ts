import { OpenAI } from "openai";
import { OpenAIToolSet, type Parameters } from "composio-core";
import {
  GoogleServicePlugin,
  GoogleServiceType,
  IOAuthTokenManager
} from "../google-service-plugin";
import { z } from "zod/v4";
import { google } from "googleapis";
import { ComposioApp, GoogleContactsAction } from "../../types/composio-enums";
import { ExecutionContextType } from "../../types/action-planning.types";
import {
  ContactData, ServiceType
} from "@omnii/validators";
import { UnifiedResponseBuilder, UnifiedToolResponse } from "@omnii/validators";
import {
  GoogleContactSchema,
  ListContactsParamsSchema, transformGoogleContactToSchema, createContactSuccessResponse,
  createContactErrorResponse
} from "./contacts-plugin.types";
import { DebugLogger } from "../../utils/debug-logger";

export class ContactsPlugin implements GoogleServicePlugin {
  serviceType = GoogleServiceType.CONTACTS;
  private customActionsRegistered = false;
  private manager?: IOAuthTokenManager;

  setManager(manager: IOAuthTokenManager): void {
    this.manager = manager;
  }

  async ensureCustomActions(composio: OpenAIToolSet) {
    if (!this.customActionsRegistered) {
      try {
        await Promise.all([
          this.registerCreateContactAction(composio),
          this.registerListContactsAction(composio),
        ]);

        // Debug: Log registered custom actions
        console.log(`[ContactsPlugin] 🔍 Registered custom actions:`, {
          customActions: Array.from(composio.userActionRegistry.customActions.keys()),
          listContactsAction: GoogleContactsAction.LIST_CONTACTS,
          searchContactsAction: GoogleContactsAction.SEARCH_CONTACTS,
          createContactAction: GoogleContactsAction.CREATE_CONTACT
        });

        this.customActionsRegistered = true;
        console.log(`[ContactsPlugin] Custom actions registered successfully`);
      } catch (error) {
        console.error(`[ContactsPlugin] Error registering custom actions:`, error);
      }
    }
  }

  private async registerListContactsAction(composio: OpenAIToolSet) {
    // ✅ Use Zod schema with userId included
    console.log(`[ContactsPlugin] 🔧 Registering LIST_CONTACTS action with Zod schema`);

    await composio.createAction({
      actionName: GoogleContactsAction.LIST_CONTACTS,
      description: "Lists all contacts from Google Contacts",
      inputParams: ListContactsParamsSchema as unknown as Parameters,
      callback: async (inputParams, _authCredentials) => {
        console.log(`[ContactsPlugin] 📞 LIST_CONTACTS called with:`, inputParams);

        // ✅ Parse and validate params using Zod
        const params = ListContactsParamsSchema.parse(inputParams);
        const userId = params.userId;

        try {
          if (!this.manager) {
            throw new Error("Manager reference not available");
          }
          
          const oauthToken = await this.manager.getGoogleOAuthToken(userId);
          console.log(`[ContactsPlugin] OAuth token retrieved for user: ${userId}`);

          // Initialize Google People API client
          const clientId = process.env.GOOGLE_CLIENT_ID;
          const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
          const redirectUri = process.env.GOOGLE_REDIRECT_URI;
          const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
          oauth2Client.setCredentials({
            access_token: oauthToken.access_token,
            refresh_token: oauthToken.refresh_token,
          });

          const people = google.people({ version: "v1", auth: oauth2Client });

          // Fetch contacts with pagination
          const response = await people.people.connections.list({
            resourceName: 'people/me',
            pageSize: params.pageSize || 20,
            personFields: params.personFields || 'names,emailAddresses,phoneNumbers,organizations,photos',
            sources: ["READ_SOURCE_TYPE_CONTACT"],
          });

          const contacts = response.data.connections || [];
          console.log(`[ContactsPlugin] Found ${contacts.length} contacts`);

          // ✅ Use helper function to transform contacts
          const formattedContacts = contacts.map((contact: any) => 
            transformGoogleContactToSchema(GoogleContactSchema.parse(contact))
          );

          const result = {
            successful: true,
            actionName: GoogleContactsAction.LIST_CONTACTS, // ✅ Track action name
            data: {
              contacts: formattedContacts,
              totalCount: contacts.length,
              nextPageToken: response.data.nextPageToken
            }
          };

          // ✅ Log to file for debugging
          await DebugLogger.logToolCall({
            timestamp: new Date().toISOString(),
            userId,
            actionName: GoogleContactsAction.LIST_CONTACTS,
            inputParams: params,
            response: result,
            success: true
          });

          return result;
        } catch (error) {
          console.error(`[ContactsPlugin] Error listing contacts for user ${userId}:`, error);
          
          const errorResult = {
            successful: false,
            actionName: GoogleContactsAction.LIST_CONTACTS, // ✅ Track action name
            data: { error: String(error) },
          };

          // ✅ Log error to file
          await DebugLogger.logToolCall({
            timestamp: new Date().toISOString(),
            userId,
            actionName: GoogleContactsAction.LIST_CONTACTS,
            inputParams: params,
            response: errorResult,
            success: false,
            error: String(error)
          });

          return errorResult;
        }
      },
    });

    console.log(`[ContactsPlugin] ✅ LIST_CONTACTS action registered with userId support`);
  }

  private async registerCreateContactAction(composio: OpenAIToolSet) {
    const createContactSchema = z.object({
      firstName: z.string().optional().describe("First name"),
      lastName: z.string().optional().describe("Last name"),
      email: z.string().optional().describe("Email address"),
      phone: z.string().optional().describe("Phone number"),
      userId: z.string().describe("User ID for authentication"),
    });

    await composio.createAction({
      actionName: GoogleContactsAction.CREATE_CONTACT,
      description: "Creates a new contact in Google Contacts",
      inputParams: createContactSchema as unknown as Parameters,
      callback: async (inputParams, _authCredentials) => {
        console.log(`[ContactsPlugin] 📞 CREATE_CONTACT called with:`, inputParams);

        const params = inputParams as {
          firstName?: string;
          lastName?: string;
          email?: string;
          phone?: string;
          userId: string;
        };

        const userId = params.userId;
        if (!userId) {
          throw new Error("User ID is required for authentication");
        }

        try {
          if (!this.manager) {
            throw new Error("Manager reference not available");
          }

          const oauthToken = await this.manager.getGoogleOAuthToken(userId);
          console.log(`[ContactsPlugin] OAuth token retrieved for user: ${userId}`);

          // Initialize Google People API client
          const clientId = process.env.GOOGLE_CLIENT_ID;
          const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
          const redirectUri = process.env.GOOGLE_REDIRECT_URI;
          const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
          oauth2Client.setCredentials({
            access_token: oauthToken.access_token,
            refresh_token: oauthToken.refresh_token,
          });

          const people = google.people({ version: "v1", auth: oauth2Client });

          // Prepare contact data
          const contact = {
            names: params.firstName || params.lastName ? [{
              givenName: params.firstName || "",
              familyName: params.lastName || "",
              displayName: `${params.firstName || ""} ${params.lastName || ""}`.trim(),
            }] : undefined,
            emailAddresses: params.email ? [{ value: params.email, type: "other" }] : undefined,
            phoneNumbers: params.phone ? [{ value: params.phone, type: "other" }] : undefined,
          };

          const response = await people.people.createContact({ requestBody: contact });

          const result = {
            successful: true,
            actionName: GoogleContactsAction.CREATE_CONTACT, // ✅ Track action name
            data: {
              result: "Contact created successfully",
              contactData: response.data,
            },
          };

          // ✅ Log to file
          await DebugLogger.logToolCall({
            timestamp: new Date().toISOString(),
            userId,
            actionName: GoogleContactsAction.CREATE_CONTACT,
            inputParams: params,
            response: result,
            success: true
          });

          return result;
        } catch (error) {
          console.error(`[ContactsPlugin] Error creating contact for user ${userId}:`, error);
          
          const errorResult = {
            successful: false,
            actionName: GoogleContactsAction.CREATE_CONTACT, // ✅ Track action name
            data: { error: String(error) },
          };

          // ✅ Log error to file
          await DebugLogger.logToolCall({
            timestamp: new Date().toISOString(),
            userId,
            actionName: GoogleContactsAction.CREATE_CONTACT,
            inputParams: params,
            response: errorResult,
            success: false,
            error: String(error)
          });

          return errorResult;
        }
      },
    });
  }

  /**
   * Detect contact-related messages (conservative - only used as AI fallback)
   */
  isServiceMessage(message: string): boolean {
    const msg = message.toLowerCase();

    // Exclude intervention and system messages
    if (
      msg.includes("resolve user intervention") ||
      msg.includes("user intervention") ||
      msg.includes("intervention_") ||
      msg.includes("session_") ||
      msg.startsWith("system:")
    ) {
      return false;
    }

    // Very specific contact operations only
    return (
      msg.startsWith("find contact") ||
      msg.startsWith("search contact") ||
      msg.startsWith("create contact") ||
      msg.startsWith("add contact") ||
      msg.startsWith("get contact") ||
      msg === "get contacts" ||
      msg === "list contacts" ||
      msg === "get all contacts"
    );
  }

  /**
   * Process contact-specific messages using OpenAI tool calling
   */
  async processMessage(
    message: string,
    userId: string,
    context: ExecutionContextType,
    activeConnection: any,
    composio: OpenAIToolSet,
    openai: OpenAI
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
    rawData?: any;
  }> {
    try {
      console.log(`[ContactsPlugin] Processing message: "${message}"`);
      console.log(`[ContactsPlugin] Using connection: ${activeConnection?.id}`);

      // ✅ CRITICAL: Ensure custom actions are registered BEFORE getting tools
      await this.ensureCustomActions(composio);

      // Get all available contact tools (including our custom actions)
      const tools = await composio.getTools({
        actions: [
          GoogleContactsAction.SEARCH_CONTACTS,
          GoogleContactsAction.LIST_CONTACTS,
          GoogleContactsAction.CREATE_CONTACT,
        ],
      });

      console.log(`[ContactsPlugin] Available tools:`, tools,  tools.map(tool => ({ 
        name: tool.function?.name, 
        description: tool.function?.description?.substring(0, 100) + '...' 
      })));

      // 🔍 CRITICAL DEBUG: Log the actual action names that Composio is providing
      console.log(`[ContactsPlugin] 🔍 ACTUAL TOOL FUNCTION NAMES PROVIDED BY COMPOSIO:`);
      tools.forEach((tool, index) => {
        console.log(`[ContactsPlugin]   ${index + 1}. "${tool.function?.name}" - ${tool.function?.description?.substring(0, 50)}...`);
      });

      // ✅ IMPROVED: More intelligent system prompt with examples
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: this.buildSystemPrompt(userId, tools),
          },
          {
            role: "user",
            content: message
          }
        ],
        tools: tools,
        tool_choice: "auto",
      });

      console.log(`[ContactsPlugin] OpenAI response:`, {
        hasToolCalls: !!response.choices[0].message.tool_calls,
        toolCallsCount: response.choices[0].message.tool_calls?.length || 0,
        toolCallNames: response.choices[0].message.tool_calls?.map(tc => tc.function?.name) || []
      });

      if (!response.choices[0].message.tool_calls) {
        return this.buildNoToolCallResponse(userId);
      }

      // Handle the tool call
      console.log(`[ContactsPlugin] Making tool call...`);
      console.log(`[ContactsPlugin] 🔧 Tool responses:`, response);

      if (response.choices[0].message.tool_calls) {
        try {
          if (this.manager) {
            console.log(`[ContactsPlugin] 🔐 Using custom OAuth tokens from Supabase for user: ${userId}`);

            // Get OAuth token from Supabase via the manager
            const oauthToken = await this.manager.getGoogleOAuthToken(userId);
            console.log(`[ContactsPlugin] ✅ OAuth token retrieved successfully`);
            console.log(`[ContactsPlugin] 🔍 OAuth token details:`, {
              hasAccessToken: !!oauthToken.access_token,
              accessTokenLength: oauthToken.access_token?.length || 0,
              hasRefreshToken: !!oauthToken.refresh_token,
              expiresAt: oauthToken.expires_at || 'no expiry info'
            });

            // Execute tool calls with custom bearer token
            const toolResponses = [];
            for (const toolCall of response.choices[0].message.tool_calls) {
              if (toolCall.function) {
                const actionName = toolCall.function.name; // Use original name, ComposioToolSet handles lowercasing
                try {
                  console.log(`[ContactsPlugin] 🔧 Executing ${actionName} with custom auth`);
                  console.log(`[ContactsPlugin] 🔍 Tool call details:`, {
                    originalName: toolCall.function.name,
                    arguments: JSON.parse(toolCall.function.arguments),
                    registeredActions: Array.from(composio.userActionRegistry.customActions.keys()),
                    isRegistered: Array.from(composio.userActionRegistry.customActions.keys()).includes(actionName)
                  });

                  const isLocal = actionName === GoogleContactsAction.LIST_CONTACTS || actionName === GoogleContactsAction.CREATE_CONTACT;
                  const isRemote = actionName === GoogleContactsAction.SEARCH_CONTACTS;
                  let result; 
                  if (isLocal) {
                    result = await composio.executeAction({
                      action: actionName, // Pass the original action name
                      params: JSON.parse(toolCall.function.arguments),
                      // For custom actions, the callback handles auth internally
                      // For built-in actions, we can pass custom auth if needed
                    });
                  } else if (isRemote) { 
                    result = await composio.client.actions.execute({
                      actionName: actionName,
                      requestBody: {
                        input: JSON.parse(toolCall.function.arguments),
                        appName: ComposioApp.GOOGLE_CONTACTS,
                        authConfig: {
                          base_url: "https://people.googleapis.com",
                          parameters: [
                            {
                              name: "Authorization",
                              value: `Bearer ${oauthToken.access_token}`,
                              in: "header"
                            }
                          ]
                        }
                      }
                    });
                  }
                  console.log(`[ContactsPlugin] 🔧  result:`, result,{ isLocal, isRemote});

                  console.log(`[ContactsPlugin] 🔧 Raw API result:`, result);
                  console.log(`[ContactsPlugin] 🔍 Result structure:`, {
                    hasData: !!result?.data,
                    dataKeys: result?.data ? Object.keys(result.data) : 'no data',
                    successful: result?.successful,
                    hasError: !!result?.error,
                    actionName: actionName,
                    registeredActions: Array.from(composio.userActionRegistry.customActions.keys())
                  });

                  // ✅ Log the tool response to file
                  await DebugLogger.logResponse(actionName, userId, result);

                  toolResponses.push(JSON.stringify(result));
                } catch (error) {
                  console.error(`[ContactsPlugin] ❌ Error executing tool call ${actionName}:`, error);
                  console.error(`[ContactsPlugin] ❌ Error details:`, {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    name: error instanceof Error ? error.name : 'Unknown',
                    stack: error instanceof Error ? error.stack : 'No stack trace',
                    actionName: actionName,
                    registeredActions: Array.from(composio.userActionRegistry.customActions.keys())
                  });
                  toolResponses.push(JSON.stringify({
                    error: error instanceof Error ? error.message : 'Unknown error'
                  }));
                }
              }
            }

            // Use the first response or combine them
            const toolResponse = toolResponses.length > 0 ? toolResponses[0] : null;

            let parsed;
            try {
              if (!toolResponse) {
                throw new Error('No tool response received');
              }
              parsed = Array.isArray(toolResponse)
                ? JSON.parse(toolResponse[0])
                : JSON.parse(toolResponse);
            } catch (e) {
              parsed = toolResponse;
            }

            console.log(`[ContactsPlugin] Parsed result:`, {
              successful: parsed.successful,
              hasData: !!parsed.data,
              action: parsed.action,
              resultKeys: Object.keys(parsed),
              dataKeys: parsed.data ? Object.keys(parsed.data) : 'no data'
            });

            // Enhanced debugging for Google Contacts API response structure
            console.log(`[ContactsPlugin] 🔍 DETAILED API RESPONSE ANALYSIS:`);
            console.log(`[ContactsPlugin] - Response successful:`, parsed?.successful);
            console.log(`[ContactsPlugin] - Has data object:`, !!parsed?.data);
            
            if (parsed?.data) {
              console.log(`[ContactsPlugin] - Data object keys:`, Object.keys(parsed.data));
              console.log(`[ContactsPlugin] - Has people_data:`, !!parsed.data.people_data);
              console.log(`[ContactsPlugin] - Has other_contacts:`, !!parsed.data.other_contacts);
              console.log(`[ContactsPlugin] - Has connections:`, !!parsed.data.connections);
              console.log(`[ContactsPlugin] - Has response_data:`, !!parsed.data.response_data);
              
              // Check various possible contact data locations
              const possibleContactArrays = [
                { name: 'people_data', data: parsed.data.people_data },
                { name: 'other_contacts', data: parsed.data.other_contacts },
                { name: 'connections', data: parsed.data.connections },
                { name: 'response_data.connections', data: parsed.data.response_data?.connections },
                { name: 'response_data.people', data: parsed.data.response_data?.people },
                { name: 'response_data.items', data: parsed.data.response_data?.items }
              ];
              
              possibleContactArrays.forEach(({ name, data }) => {
                if (data) {
                  console.log(`[ContactsPlugin] - Found ${name}:`, {
                    isArray: Array.isArray(data),
                    length: Array.isArray(data) ? data.length : 'not an array',
                    type: typeof data,
                    firstItemKeys: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : 'no items'
                  });
                }
              });
            }

            // Log the structure outline of the raw Contacts API response
            console.log(`[ContactsPlugin] 📋 RAW CONTACTS API RESPONSE STRUCTURE:`);
            const structureOutline = this.getObjectStructure(parsed);
            console.log(structureOutline);

            // ✅ Pass action name to formatter
            const actionName = response.choices[0].message.tool_calls[0].function?.name || 'unknown';
            return this.formatContactsResponse(message, parsed, new UnifiedResponseBuilder(ServiceType.CONTACT, userId), userId, actionName);
          }
        } catch (error) {
          console.error(`[ContactsPlugin] Error executing tool call:`, error);
          return createContactErrorResponse(
            new UnifiedResponseBuilder(ServiceType.CONTACT, userId),
            'unknown',
            "❌ Contact Request Failed",
            "An error occurred",
            "Error executing tool call"
          );
        }
      }

      // Handle unknown action
      console.warn(`[ContactsPlugin] Unknown action:`, response.choices[0].message.tool_calls[0].function.name);
      const unknownResponse = new UnifiedResponseBuilder(ServiceType.CONTACT, userId)
        .setSuccess(false)
        .setTitle("❓ Unknown Contact Action")
        .setSubtitle("Unexpected action type")
        .setContent("I encountered an unexpected issue. Please try searching for contacts, creating a new one, or listing all contacts.")
        .setMessage("I encountered an unexpected issue. Please try searching for contacts, creating a new one, or listing all contacts.")
        .addAction({
          id: "list_contacts",
          label: "List All Contacts",
          type: "primary",
          icon: "📱"
        })
        .addAction({
          id: "search_contacts",
          label: "Search Contacts",
          type: "secondary",
          icon: "🔍"
        })
        .setMetadata({
          category: 'contact',
          confidence: 0,
          timestamp: new Date().toISOString(),
          source: 'Google Contacts'
        })
        .build();

      return unknownResponse;

    } catch (error) {
      console.error(`[ContactsPlugin] Error:`, error);
      const errorResponse = new UnifiedResponseBuilder(ServiceType.CONTACT, userId)
        .setSuccess(false)
        .setTitle("❌ Contact Request Failed")
        .setSubtitle("An error occurred")
        .setContent("Error processing contact request")
        .setMessage("Error processing contact request")
        .setMetadata({
          category: 'contact',
          confidence: 0,
          timestamp: new Date().toISOString(),
          source: 'Google Contacts'
        })
        .build();

      return errorResponse;
    }
  }

  private buildNoToolCallResponse(userId: string) {
    return createContactErrorResponse(
      new UnifiedResponseBuilder(ServiceType.CONTACT, userId),
      'none',
      "❓ Contact Request Unclear",
      "Please clarify your request",
      "I can help you search for contacts, create new ones, or list all contacts. Please be more specific about what you'd like to do."
    );
  }

  /**
   * Get contact-specific actions with LLM-friendly descriptions
   */
  getServiceActions(): Record<string, string> {
    return {
      [GoogleContactsAction.LIST_CONTACTS]: "List all contacts in Google Contacts. Parameters: pageSize (integer, defaults to 20, max 30), page_token (string), person_fields (string, defaults to emailAddresses,names,phoneNumbers), other_contacts (boolean, defaults to true). Include userId for authentication.",
      [GoogleContactsAction.SEARCH_CONTACTS]: "Search contacts in Google Contacts. Parameters: query (string, use empty string '' for all contacts), pageSize (integer, defaults to 20, max 30), page_token (string), person_fields (string, defaults to emailAddresses,names,phoneNumbers), other_contacts (boolean, defaults to true). Include userId for authentication.",
      [GoogleContactsAction.CREATE_CONTACT]: "Create a new contact in Google Contacts. Requires userId for authentication. Optional: firstName, lastName, email, phone for contact details."
    };
  }

  private formatContactsResponse(
    message: string,
    parsed: any,
    builder: UnifiedResponseBuilder,
    userId: string,
    actionName: string
  ): UnifiedToolResponse {
    console.log(`[ContactsPlugin] 🎯 Formatting response for action: ${actionName}`);
    console.log(`[ContactsPlugin] Response data:`, parsed);

    // ✅ Now we can use the action name to determine the correct handling
    switch (actionName) {
      case GoogleContactsAction.LIST_CONTACTS:
        return this.handleListContactsResponse(parsed, builder, actionName);
      
      case GoogleContactsAction.SEARCH_CONTACTS:
        return this.handleSearchContactsResponse(parsed, builder, actionName);
      
      case GoogleContactsAction.CREATE_CONTACT:
        return this.handleCreateContactResponse(parsed, builder, actionName);
      
      default:
        console.warn(`[ContactsPlugin] Unknown action: ${actionName}`);
        return createContactErrorResponse(
          builder,
          actionName,
          "❓ Unknown Contact Action",
          "Unexpected action type",
          "I encountered an unexpected issue with the contact request."
        );
    }
  }

  private handleListContactsResponse(parsed: any, builder: UnifiedResponseBuilder, actionName: string): UnifiedToolResponse {
    console.log(`[ContactsPlugin] 📋 Handling LIST_CONTACTS response`);

    if (!parsed.successful) {
      return createContactErrorResponse(
        builder,
        actionName,
        "❌ Contact List Error",
        "Failed to retrieve contacts",
        "Sorry, I couldn't retrieve your contacts."
      );
    }

    // Handle new format: data.contacts
    if (parsed.data?.contacts) {
      console.log(`[ContactsPlugin] ✅ Found contacts in data.contacts: ${parsed.data.contacts.length}`);
      return createContactSuccessResponse(builder, parsed.data.contacts, actionName, "👥 Your Contacts");
    }

    // Handle response_data.results format
    if (parsed.data?.response_data?.results) {
      console.log(`[ContactsPlugin] ✅ Found contacts in response_data.results format`);
      const results = parsed.data.response_data.results;
      const contacts: ContactData[] = [];

      Object.values(results).forEach((result: any) => {
        if (result.person) {
          const contact = transformGoogleContactToSchema(result.person);
          contacts.push(contact);
        }
      });

      return createContactSuccessResponse(builder, contacts, actionName, "👥 Your Contacts");
    }

    return createContactSuccessResponse(builder, [], actionName, "👥 Your Contacts", "No contacts found");
  }

  private handleSearchContactsResponse(parsed: any, builder: UnifiedResponseBuilder, actionName: string): UnifiedToolResponse {
    console.log(`[ContactsPlugin] 🔍 Handling SEARCH_CONTACTS response`);

    if (!parsed.successful) {
      return createContactErrorResponse(
        builder,
        actionName,
        "❌ Search Error",
        "Failed to search contacts",
        "Sorry, I couldn't search for contacts."
      );
    }

    const contacts: ContactData[] = [];

    // Handle NEW format: response_data.results[] (this is what Google API actually returns!)
    if (parsed.data?.response_data?.results) {
      console.log(`[ContactsPlugin] ✅ Found contacts in response_data.results format: ${parsed.data.response_data.results.length} results`);
      
      parsed.data.response_data.results.forEach((result: any, index: number) => {
        if (result.person) {
          console.log(`[ContactsPlugin] 📇 Processing contact ${index + 1}: ${result.person.names?.[0]?.displayName || 'Unknown'}`);
          const contact = transformGoogleContactToSchema(result.person);
          contacts.push(contact);
        }
      });
    }

    // Handle legacy format with people_data and other_contacts (fallback)
    if (parsed.data?.people_data) {
      console.log(`[ContactsPlugin] ✅ Found contact in people_data format`);
      const contact = transformGoogleContactToSchema(parsed.data.people_data);
      contacts.push(contact);
    }

    if (parsed.data?.other_contacts) {
      console.log(`[ContactsPlugin] ✅ Found contacts in other_contacts format`);
      const otherContactsArray = Array.isArray(parsed.data.other_contacts)
        ? parsed.data.other_contacts
        : Object.values(parsed.data.other_contacts);

      otherContactsArray.forEach((contact: any) => {
        if (contact && typeof contact === 'object') {
          contacts.push(transformGoogleContactToSchema(contact));
        }
      });
    }

    console.log(`[ContactsPlugin] 🎯 Final result: ${contacts.length} contacts extracted and formatted`);
    return createContactSuccessResponse(builder, contacts, actionName, "👥 Search Results");
  }

  private handleCreateContactResponse(parsed: any, builder: UnifiedResponseBuilder, actionName: string): UnifiedToolResponse {
    console.log(`[ContactsPlugin] ➕ Handling CREATE_CONTACT response`);

    if (!parsed.successful) {
      return createContactErrorResponse(
        builder,
        actionName,
        "❌ Create Contact Error",
        "Failed to create contact",
        "Sorry, I couldn't create the contact."
      );
    }

    return builder
      .setSuccess(true)
      .setTitle("✅ Contact Created")
      .setSubtitle("Successfully created contact")
      .setContent("The contact has been created successfully.")
      .setMessage("The contact has been created successfully.")
      .setMetadata({
        category: 'contact',
        confidence: 95,
        timestamp: new Date().toISOString(),
        source: 'Google Contacts'
      })
      .build();
  }

  private getObjectStructure(obj: any): string {
    if (typeof obj === 'object' && obj !== null) {
      return Object.keys(obj).map(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          return `${key}: {\n${this.getObjectStructure(obj[key])}\n}`;
        } else {
          return `${key}: ${typeof obj[key]}\n`;
        }
      }).join('');
    } else {
      return '';
    }
  }

  private buildSystemPrompt(userId: string, tools: any[]): string {
    // Extract actual tool names from Composio
    const availableActions = tools.map(tool => tool.function?.name).filter(Boolean);
    console.log(`[ContactsPlugin] 🔍 Building system prompt with actions:`, availableActions);
    
    return `You are a contact management assistant. Analyze the user's message and choose the most appropriate action:

**Available Actions from Composio:**
${availableActions.map((action, index) => `${index + 1}. ${action}`).join('\n')}

**CRITICAL: Choose between listing all contacts or searching with a specific query:**

**For listing ALL contacts (no specific search term):**
- Use action: ${GoogleContactsAction.LIST_CONTACTS}
- Parameters: {userId: "${userId}"} (no query needed)
- Examples: "get all contacts", "list my contacts", "show contacts"

**For SEARCHING contacts (with a specific term):**
- Use action: ${GoogleContactsAction.SEARCH_CONTACTS}
- Parameters:
  - query: "your_search_term" (REQUIRED, must be a non-empty prefix, e.g., "John", "gmail")
  - userId: "${userId}" (ALWAYS include this)
  - other_contacts: true (ALWAYS set to true)
  - pageSize: 20 (or user-specified number, max 30)
  - person_fields: "emailAddresses,names,phoneNumbers" (These are the only fields available when other_contacts is true)
- Examples: "find John", "search for gmail", "contacts with phone numbers" (use query: "phone" or similar)

**IMPORTANT:** 
- NEVER use "*" or an empty string "" for the 'query' parameter in ${GoogleContactsAction.SEARCH_CONTACTS}. It must be a prefix.
- ALWAYS include userId: "${userId}" in function parameters.
- ALWAYS set other_contacts: true for comprehensive search results when using ${GoogleContactsAction.SEARCH_CONTACTS}.

Choose the action that best matches the user's intent.`;
  }
}
