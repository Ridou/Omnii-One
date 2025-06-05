/**
 * SMS AI Fallback Service
 *
 * Simple SMS AI without Composio dependencies for testing
 */

import { OpenAI } from "openai";

export interface SMSAIResponse {
  success: boolean;
  message: string;
  toolsUsed?: string[];
  error?: string;
}

export class SMSAIFallbackService {
  private openai: OpenAI;

  constructor() {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  /**
   * Process incoming SMS message with basic AI (no tools)
   */
  async processMessage(
    message: string,
    fromNumber: string
  ): Promise<SMSAIResponse> {
    try {
      console.log(
        `📱 [SMSAIFallback] Processing message from ${fromNumber}: "${message}"`
      );

      // Simple AI response without tools
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful SMS assistant. Keep responses under 160 characters. 
            You can help with general questions but cannot access calendar or tasks yet.
            Be friendly and concise.`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 100,
      });

      const aiMessage =
        response.choices[0].message.content ||
        "Thanks for your message! I'm a simple AI assistant via SMS.";

      console.log(`📱 [SMSAIFallback] AI Response: "${aiMessage}"`);

      return {
        success: true,
        message: aiMessage,
      };
    } catch (error) {
      console.error(`❌ [SMSAIFallback] Error processing message:`, error);

      return {
        success: false,
        message: "Sorry, I'm having trouble right now. Please try again later.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
