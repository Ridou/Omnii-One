import { google } from "googleapis";
import twilioService from "./twilio-service";

export interface DirectContactsResponse {
  success: boolean;
  message: string;
  contacts?: any[];
  error?: string;
}

export class GoogleContactsDirect {
  private auth: any;

  constructor() {
    // Initialize with service account or OAuth2 client
    this.setupAuth();
  }

  private async setupAuth() {
    try {
      // For service account (recommended for server-side)
      this.auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_CREDENTIALS_PATH, // Path to service account JSON
        scopes: ["https://www.googleapis.com/auth/contacts.readonly"],
      });
    } catch (error) {
      console.error("[GoogleContactsDirect] Auth setup failed:", error);
    }
  }

  /**
   * Fetch contacts directly from Google People API
   */
  async fetchContacts(
    pageSize: number = 100,
    searchQuery?: string
  ): Promise<DirectContactsResponse> {
    try {
      const people = google.people({ version: "v1", auth: this.auth });

      const response = await people.people.connections.list({
        resourceName: "people/me",
        pageSize: pageSize,
        personFields: "names,emailAddresses,phoneNumbers",
        sortOrder: "FIRST_NAME_ASCENDING",
      });

      const connections = response.data.connections || [];

      if (searchQuery) {
        const filtered = connections.filter((person: any) => {
          const name = person.names?.[0]?.displayName?.toLowerCase() || "";
          const email = person.emailAddresses?.[0]?.value?.toLowerCase() || "";
          const phone = person.phoneNumbers?.[0]?.value || "";
          
          return (
            name.includes(searchQuery.toLowerCase()) ||
            email.includes(searchQuery.toLowerCase()) ||
            phone.includes(searchQuery)
          );
        });

        return {
          success: true,
          message: `Found ${filtered.length} contacts matching "${searchQuery}"`,
          contacts: filtered,
        };
      }

      return {
        success: true,
        message: `Found ${connections.length} contacts`,
        contacts: connections,
      };
    } catch (error) {
      console.error("[GoogleContactsDirect] Error fetching contacts:", error);
      return {
        success: false,
        message: "Failed to fetch contacts",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Format contacts for SMS display
   */
  formatContactsForSMS(contacts: any[], limit: number = 10): string {
    if (!contacts || contacts.length === 0) {
      return "📱 No contacts found.";
    }

    let message = "📱 Your contacts:\n\n";
    
    contacts.slice(0, limit).forEach((contact, index) => {
      const name = contact.names?.[0]?.displayName || "Unknown";
      const phone = contact.phoneNumbers?.[0]?.value || "";
      const email = contact.emailAddresses?.[0]?.value || "";

      message += `${index + 1}. ${name}`;
      if (phone) message += `\n   📞 ${phone}`;
      if (email) message += `\n   ✉️ ${email}`;
      message += "\n\n";
    });

    if (contacts.length > limit) {
      message += `... and ${contacts.length - limit} more contacts`;
    }

    return message;
  }

  /**
   * Handle SMS request for contacts
   */
  async handleContactsRequest(
    phoneNumber: string,
    message: string
  ): Promise<DirectContactsResponse> {
    try {
      // Check if it's a search request
      const searchMatch = message.toLowerCase().match(/search|find (.+)/);
      const searchQuery = searchMatch ? searchMatch[1] : undefined;

      // Fetch contacts
      const result = await this.fetchContacts(50, searchQuery);

      if (!result.success) {
        return result;
      }

      // Format for SMS
      const smsMessage = this.formatContactsForSMS(result.contacts || []);

      // Send SMS
      try {
        await twilioService.sendMessage({
          to: phoneNumber,
          body: smsMessage,
        });
        console.log(`[GoogleContactsDirect] Contacts sent to ${phoneNumber}`);
      } catch (smsError) {
        console.error("[GoogleContactsDirect] SMS failed:", smsError);
      }

      return {
        success: true,
        message: smsMessage,
        contacts: result.contacts,
      };
    } catch (error) {
      console.error("[GoogleContactsDirect] Handle request failed:", error);
      return {
        success: false,
        message: "Sorry, I couldn't fetch your contacts right now.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if message is asking for contacts
   */
  isContactsMessage(message: string): boolean {
    const msg = message.toLowerCase();
    return (
      msg.includes("contact") ||
      msg.includes("phone") ||
      msg.includes("email") ||
      (msg.includes("list") && (msg.includes("contact") || msg.includes("people"))) ||
      (msg.includes("show") && (msg.includes("contact") || msg.includes("people"))) ||
      (msg.includes("find") && (msg.includes("contact") || msg.includes("person"))) ||
      (msg.includes("search") && (msg.includes("contact") || msg.includes("person")))
    );
  }
}

export default new GoogleContactsDirect(); 