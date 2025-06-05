/**
 * SMS AI Service
 *
 * Handles AI-powered SMS interactions with Composio tools
 * Integrates OpenAI with Google Calendar and Tasks via Composio
 */

import { OpenAI } from "openai";
import { OpenAIToolSet } from "composio-core";
import { ComposioCalendarService } from "./composio-calendar.service";
import { ComposioGoogleTasksService } from "./composio-googletasks.service";
import { ComposioConnectionManager } from "./composio-connection-manager";

export interface SMSAIResponse {
  success: boolean;
  message: string;
  toolsUsed?: string[];
  error?: string;
}

export class SMSAIService {
  private openai: OpenAI;
  private toolset: OpenAIToolSet;
  private connectionManager: ComposioConnectionManager;

  constructor() {
    // Initialize OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({ apiKey: openaiKey });

    // Initialize Composio services
    this.toolset = new OpenAIToolSet();
    this.connectionManager = new ComposioConnectionManager();
  }

  /**
   * Process incoming SMS message with AI and tool calling
   */
  async processMessage(
    message: string,
    fromNumber: string,
    entityId?: string
  ): Promise<SMSAIResponse> {
    try {
      // Use phone number as entityId if not provided
      const userEntityId = entityId || this.normalizePhoneNumber(fromNumber);

      console.log(
        `[SMSAIService] Processing message from ${fromNumber} (entity: ${userEntityId})`
      );
      console.log(`[SMSAIService] Message recevied: "${message}"`);

      // Check if user has any active connections
      const connectionStatus = await this.connectionManager.getConnectionStatus(
        userEntityId
      );
      console.log("🔧 Connection status:", connectionStatus);
      if (!connectionStatus.hasConnection) {
        return {
          success: true,
          message:
            "Hi! To use AI features, you need to connect your Google account first. Please visit our app to set up OAuth authentication for Google Calendar and Tasks.",
        };
      }

      // Get available tools based on user's connections
      const tools = await this.getAvailableTools(userEntityId);
      console.log("🔧 Available tools:", tools);
      if (tools.length === 0) {
        return {
          success: true,
          message:
            "I can help you with Google Calendar and Tasks, but no tools are currently available. Please check your connections.",
        };
      }

      // Create system prompt for SMS context
      const systemPrompt = this.createSystemPrompt(connectionStatus);

      // Send to OpenAI with tools
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        tools: tools,
        tool_choice: "auto",
        max_tokens: 500, // Keep responses concise for SMS
      });

      const responseMessage = response.choices[0].message;
      const toolsUsed: string[] = [];

      // Handle tool calls if any
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        console.log(
          `[SMSAIService] LLM requested ${responseMessage.tool_calls.length} tool call(s)`
        );

        try {
          // Execute tool calls via Composio
          const executionResult = await this.toolset.handleToolCall(
            response,
            userEntityId
          );

          // Track which tools were used
          responseMessage.tool_calls.forEach((toolCall) => {
            toolsUsed.push(toolCall.function.name);
          });

          console.log(
            `[SMSAIService] Tool execution completed:`,
            executionResult
          );

          // Generate final response based on tool results
          const finalResponse = await this.generateFinalResponse(
            message,
            responseMessage.tool_calls,
            executionResult
          );

          return {
            success: true,
            message: finalResponse,
            toolsUsed,
          };
        } catch (toolError) {
          console.error(`[SMSAIService] Tool execution failed:`, toolError);
          return {
            success: true,
            message:
              "I tried to help but encountered an issue with the requested action. Please try again or check your account connections.",
            toolsUsed,
            error:
              toolError instanceof Error
                ? toolError.message
                : "Tool execution failed",
          };
        }
      } else {
        // Direct response without tools
        const directMessage =
          responseMessage.content ||
          "I'm here to help with your calendar and tasks!";

        return {
          success: true,
          message: directMessage,
        };
      }
    } catch (error) {
      console.error(`[SMSAIService] Error processing message:`, error);

      return {
        success: false,
        message:
          "Sorry, I encountered an error processing your request. Please try again later.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get available Composio tools for the user
   */
  private async getAvailableTools(entityId: string): Promise<any[]> {
    console.log(
      `🛠️ [SMSAIService] Getting available tools for entity: ${entityId}`
    );

    try {
      // Get tools for calendar and tasks
      console.log(`🛠️ [SMSAIService] Fetching calendar tools...`);
      const calendarTools = await this.toolset.getTools({
        actions: [
          "GOOGLECALENDAR_LIST_EVENTS",
          "GOOGLECALENDAR_CREATE_EVENT",
          "GOOGLECALENDAR_UPDATE_EVENT",
          "GOOGLECALENDAR_DELETE_EVENT",
          "GOOGLECALENDAR_LIST_CALENDARS",
        ],
      });
      console.log(
        `🛠️ [SMSAIService] Retrieved ${calendarTools.length} calendar tools`
      );

      console.log(`🛠️ [SMSAIService] Fetching task tools...`);
      const taskTools = await this.toolset.getTools({
        actions: [
          "GOOGLETASKS_LIST_TASKS",
          "GOOGLETASKS_CREATE_TASK",
          "GOOGLETASKS_UPDATE_TASK",
          "GOOGLETASKS_DELETE_TASK",
          "GOOGLETASKS_LIST_TASKLISTS",
          "GOOGLETASKS_CREATE_TASKLIST",
        ],
      });
      console.log(`🛠️ [SMSAIService] Retrieved ${taskTools.length} task tools`);

      const allTools = [...calendarTools, ...taskTools];
      console.log(
        `🛠️ [SMSAIService] Total tools fetched: ${allTools.length} for entity ${entityId}`
      );

      // Log each tool for debugging
      allTools.forEach((tool: any, index: number) => {
        console.log(
          `🛠️ [SMSAIService] Tool ${index + 1}: ${
            tool.function?.name || tool.name || "Unknown"
          }`
        );
      });

      return allTools;
    } catch (error) {
      console.error(
        `❌ [SMSAIService] Error fetching tools for ${entityId}:`,
        error
      );
      console.error(`❌ [SMSAIService] Tool fetch error details:`, {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }

  /**
   * Create system prompt for SMS AI assistant
   */
  private createSystemPrompt(connectionStatus: any): string {
    return `You are an AI assistant that helps users manage their Google Calendar and Tasks via SMS.

IMPORTANT GUIDELINES:
- Keep responses concise and SMS-friendly (under 160 characters when possible)
- Be helpful and conversational
- Use tools when the user requests calendar or task operations
- Always confirm actions taken
- If unsure about dates/times, ask for clarification

AVAILABLE SERVICES:
${
  connectionStatus.hasConnection
    ? "✅ Google Calendar and Tasks connected"
    : "❌ No connections available"
}

CAPABILITIES:
📅 Calendar: List, create, update, delete events
✅ Tasks: List, create, update, delete tasks and task lists

EXAMPLES:
- "Add meeting tomorrow 2pm" → Create calendar event
- "What's on my calendar today?" → List today's events  
- "Add task: buy groceries" → Create new task
- "Show my tasks" → List current tasks

Respond naturally and use tools when appropriate.`;
  }

  /**
   * Generate final response after tool execution
   */
  private async generateFinalResponse(
    originalMessage: string,
    toolCalls: any[],
    executionResult: any
  ): Promise<string> {
    try {
      // Create a summary prompt
      const summaryPrompt = `The user asked: "${originalMessage}"

I executed these actions:
${toolCalls
  .map((call) => `- ${call.function.name}: ${call.function.arguments}`)
  .join("\n")}

Results: ${JSON.stringify(executionResult, null, 2)}

Please provide a concise, friendly SMS response (under 160 chars) confirming what was done.`;

      const summaryResponse = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
        max_tokens: 100,
      });

      return (
        summaryResponse.choices[0].message.content ||
        "Action completed successfully!"
      );
    } catch (error) {
      console.error(`[SMSAIService] Error generating final response:`, error);
      return "Action completed successfully!";
    }
  }

  /**
   * Normalize phone number for use as entity ID
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters and ensure it starts with country code
    const cleaned = phoneNumber.replace(/\D/g, "");

    // If it doesn't start with country code, assume US (+1)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    // If it starts with 1 and is 11 digits, add +
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    }

    // Otherwise, add + if not present
    return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
  }

  /**
   * Get connection setup instructions
   */
  async getConnectionInstructions(entityId: string): Promise<string> {
    try {
      // Generate OAuth connection URLs
      const calendarConnection =
        await this.connectionManager.initiateConnection({
          appName: "googlecalendar",
          redirectUrl: process.env.BASE_URL + "/api/composio/calendar/callback",
          entityId: entityId,
          authMode: "OAUTH2",
        });

      const tasksConnection = await this.connectionManager.initiateConnection({
        appName: "googletasks",
        redirectUrl: process.env.BASE_URL + "/api/composio/tasks/callback",
        entityId: entityId,
        authMode: "OAUTH2",
      });

      return `To enable AI features, please connect your Google accounts:

📅 Calendar: ${calendarConnection.redirectUrl}
✅ Tasks: ${tasksConnection.redirectUrl}

After connecting, text me again to start using AI features!`;
    } catch (error) {
      console.error(
        `[SMSAIService] Error generating connection instructions:`,
        error
      );
      return "Please visit our app to connect your Google accounts for AI features.";
    }
  }
}
