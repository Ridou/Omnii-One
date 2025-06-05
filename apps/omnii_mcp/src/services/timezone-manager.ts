import { OpenAI } from "openai";
import twilioService from "./twilio-service";

export class TimezoneManager {
  private openai: OpenAI;
  private phoneToTimezoneMap: Record<string, string> = {
    "+16286885388": "America/Los_Angeles", // Pacific Time (existing)
    "+18582260766": "America/New_York", // Eastern Time (existing)
  };
  private pendingTimezoneSetup: Set<string> = new Set();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Check if user needs timezone setup
   */
  needsTimezoneSetup(phoneNumber: string): boolean {
    return (
      !this.phoneToTimezoneMap[phoneNumber] &&
      !this.pendingTimezoneSetup.has(phoneNumber)
    );
  }

  /**
   * Check if user is in timezone setup flow
   */
  isInTimezoneSetup(phoneNumber: string): boolean {
    return this.pendingTimezoneSetup.has(phoneNumber);
  }

  /**
   * Get user's timezone
   */
  getUserTimezone(phoneNumber: string): string | null {
    return this.phoneToTimezoneMap[phoneNumber] || null;
  }

  /**
   * Prompt user for their location
   */
  async promptForTimezone(phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    this.pendingTimezoneSetup.add(phoneNumber);

    const message = `👋 Welcome! To schedule events accurately, what city are you in?

Just reply with your city name, like:
• "New York"
• "Los Angeles" 
• "Chicago"
• "Miami"

I'll figure out your timezone automatically! 🌍`;

    try {
      await twilioService.sendMessage({
        to: phoneNumber,
        body: message,
      });
      console.log(`[TimezoneManager] Location prompt sent to ${phoneNumber}`);
    } catch (smsError) {
      console.error(
        `[TimezoneManager] Failed to send location prompt:`,
        smsError
      );
    }

    return {
      success: true,
      message: message,
    };
  }

  /**
   * Handle timezone setup response from user
   */
  async handleTimezoneSetup(
    phoneNumber: string,
    userInput: string
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      // Use AI to infer timezone from user's location input
      const timezone = await this.inferTimezoneFromLocation(userInput.trim());

      if (timezone) {
        // Save the timezone
        this.phoneToTimezoneMap[phoneNumber] = timezone;
        this.pendingTimezoneSetup.delete(phoneNumber);

        console.log(
          `[TimezoneManager] Timezone set for ${phoneNumber}: ${timezone}`
        );

        const confirmMessage = `✅ Perfect! I've set your timezone based on your location.

Now you can schedule calendar events by saying things like:
• "Schedule a meeting tomorrow at 3pm"
• "Create an event next Friday at 10am"
• "Book a call in 2 hours"

Try it now!`;

        return {
          success: true,
          message: confirmMessage,
        };
      } else {
        const errorMessage = `❌ I couldn't determine the timezone for "${userInput}".

Could you try with a more specific city name? For example:
• "New York"
• "Los Angeles"
• "Chicago"
• "Houston"

What city are you in?`;

        return {
          success: true,
          message: errorMessage,
        };
      }
    } catch (error) {
      console.error(`[TimezoneManager] Error inferring timezone:`, error);

      const fallbackMessage = `❌ I had trouble processing that. Could you try again with your city name?

Examples: "New York", "Los Angeles", "Chicago"`;

      return {
        success: true,
        message: fallbackMessage,
      };
    }
  }

  /**
   * Use AI to infer timezone from location input
   */
  private async inferTimezoneFromLocation(
    locationInput: string
  ): Promise<string | null> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Given the location "${locationInput}", what is the IANA timezone identifier?

Return ONLY the timezone identifier (like "America/New_York", "America/Los_Angeles", etc.) or "UNKNOWN" if you can't determine it.

Examples:
- "New York" → "America/New_York"
- "Los Angeles" → "America/Los_Angeles"
- "Chicago" → "America/Chicago"
- "Denver" → "America/Denver"
- "Miami" → "America/New_York"
- "Seattle" → "America/Los_Angeles"
- "Houston" → "America/Chicago"
- "Phoenix" → "America/Phoenix"

Location: "${locationInput}"
Timezone:`,
          },
        ],
        max_tokens: 50,
        temperature: 0,
      });

      const timezone = response.choices[0].message.content?.trim();

      if (timezone && timezone !== "UNKNOWN" && timezone.includes("/")) {
        console.log(
          `[TimezoneManager] AI inferred timezone: ${timezone} for location: ${locationInput}`
        );
        return timezone;
      }

      console.log(
        `[TimezoneManager] AI could not infer timezone for: ${locationInput}`
      );
      return null;
    } catch (error) {
      console.error(
        `[TimezoneManager] Error calling OpenAI for timezone inference:`,
        error
      );
      return null;
    }
  }
}
