import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import type { EmailData } from "@omnii/validators";
import { EmailDataSchema } from "@omnii/validators";

import { protectedProcedure, publicProcedure } from "../trpc";

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const ListEmailsInputSchema = z.object({
  maxResults: z.number().int().min(1).max(50).optional().default(20),
  query: z.string().optional().default("newer_than:7d"), // Default to last 7 days
  labelIds: z.array(z.string()).optional(), // e.g., ["INBOX", "UNREAD"]
  includeSpamTrash: z.boolean().optional().default(false),
});

const GetEmailInputSchema = z.object({
  messageId: z.string(),
  format: z.enum(["minimal", "metadata", "full"]).optional().default("metadata"),
});

// ============================================================================
// RESPONSE TYPE DEFINITIONS
// ============================================================================

export interface GmailResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

export interface EmailsListResponse {
  emails: EmailData[];
  totalCount: number;
  unreadCount: number;
  nextPageToken?: string;
}

// ============================================================================
// OAUTH MANAGER (Reusing same pattern as contacts)
// ============================================================================

interface IOAuthTokenManager {
  getGoogleOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }>;
}

class EmailOAuthManager implements IOAuthTokenManager {
  private supabase: any;

  constructor() {
    const { createClient } = require("@supabase/supabase-js");
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async getGoogleOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }> {
    try {
      console.log(`[EmailOAuthManager] Getting OAuth token for user: ${userId}`);

      const { data: tokenData, error } = await this.supabase
        .from("oauth_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userId)
        .eq("provider", "google")
        .single();

      if (error || !tokenData) {
        throw new Error(`No OAuth token found for user ${userId}: ${error?.message ?? 'Token not found'}`);
      }

      const currentToken = {
        access_token: tokenData.access_token as string,
        refresh_token: tokenData.refresh_token as string,
        expires_at: tokenData.expires_at as string,
      };

      // Simple token expiry check
      const shouldRefresh = this.shouldRefreshToken(currentToken.expires_at);

      if (shouldRefresh && currentToken.refresh_token) {
        console.log("[EmailOAuthManager] Token needs refresh, refreshing...");
        const refreshedTokenData = await this.refreshToken(currentToken.refresh_token);
        await this.updateToken(userId, refreshedTokenData.access_token, refreshedTokenData.refresh_token ?? currentToken.refresh_token, refreshedTokenData.expires_in);
        
        // Get updated token
        const { data: updatedData } = await this.supabase
          .from("oauth_tokens")
          .select("access_token, refresh_token, expires_at")
          .eq("user_id", userId)
          .eq("provider", "google")
          .single();

        return {
          access_token: updatedData.access_token as string,
          refresh_token: updatedData.refresh_token as string,
          expires_at: updatedData.expires_at as string,
        };
      }

      return currentToken;
    } catch (error) {
      console.error(`[EmailOAuthManager] OAuth token retrieval failed:`, error);
      throw error;
    }
  }

  private shouldRefreshToken(expiresAt: string): boolean {
    const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    return expiryTime - currentTime <= REFRESH_THRESHOLD_MS;
  }

  private async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number; }> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
    }

    return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; }>;
  }

  private async updateToken(userId: string, accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error } = await this.supabase
      .from("oauth_tokens")
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "google");

    if (error) {
      throw new Error(`Failed to update token: ${error.message}`);
    }
  }
}

// ============================================================================
// EMAIL SERVICE
// ============================================================================

class EmailService {
  private oauthManager: EmailOAuthManager;

  constructor() {
    this.oauthManager = new EmailOAuthManager();
  }

  /**
   * List emails using Gmail API
   */
  async listEmails(
    userId: string,
    params: z.infer<typeof ListEmailsInputSchema>
  ): Promise<EmailsListResponse> {
    console.log(`[EmailService] 📧 Listing emails for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    
    // Step 1: Get message list
    const messagesList = await this.getMessagesList(
      oauthToken.access_token,
      params
    );

    const messages = messagesList?.messages ?? [];
    console.log(`[EmailService] 📨 Found ${messages.length} messages`);

    // Step 2: Get message details for each message
    const emailPromises = messages.slice(0, params.maxResults).map((msg: any) =>
      this.getMessageDetails(oauthToken.access_token, msg.id, "metadata")
    );

    const messageDetails = await Promise.all(emailPromises);

    // Transform to our email schema
    const formattedEmails = messageDetails
      .map(detail => this.transformGmailMessageToSchema(detail))
      .filter(Boolean) as EmailData[];

    return {
      emails: formattedEmails,
      totalCount: messagesList?.resultSizeEstimate ?? messages.length,
      unreadCount: await this.getUnreadCount(oauthToken.access_token),
      nextPageToken: messagesList?.nextPageToken,
    };
  }

  /**
   * Get a specific email by message ID
   */
  async getEmail(
    userId: string,
    params: z.infer<typeof GetEmailInputSchema>
  ): Promise<EmailData> {
    console.log(`[EmailService] 📧 Getting email ${params.messageId} for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    
    const messageDetail = await this.getMessageDetails(
      oauthToken.access_token,
      params.messageId,
      params.format
    );

    const formattedEmail = this.transformGmailMessageToSchema(messageDetail);
    
    if (!formattedEmail) {
      throw new Error(`Failed to transform email ${params.messageId}`);
    }

    return formattedEmail;
  }

  private async getMessagesList(
    accessToken: string,
    params: z.infer<typeof ListEmailsInputSchema>
  ): Promise<any> {
    const queryParams = new URLSearchParams({
      maxResults: params.maxResults.toString(),
      q: params.query,
      includeSpamTrash: params.includeSpamTrash.toString(),
    });

    if (params.labelIds?.length) {
      params.labelIds.forEach(labelId => {
        queryParams.append('labelIds', labelId);
      });
    }

    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail messages list failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  private async getMessageDetails(
    accessToken: string,
    messageId: string,
    format: string = "metadata"
  ): Promise<any> {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=${format}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail message details failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  private async getUnreadCount(accessToken: string): Promise<number> {
    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return (data as any)?.resultSizeEstimate ?? 0;
    } catch (error) {
      console.warn('[EmailService] Failed to get unread count:', error);
      return 0;
    }
  }

  private transformGmailMessageToSchema(gmailMessage: any): EmailData | null {
    try {
      const headers = gmailMessage.payload?.headers ?? [];
      
      // Extract header values
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const to = getHeader('To');
      const date = getHeader('Date');
      
      // Parse body content
      let bodyText = '';
      let bodyHtml = '';
      
      if (gmailMessage.payload?.body?.data) {
        bodyText = this.decodeBase64Url(gmailMessage.payload.body.data);
      } else if (gmailMessage.payload?.parts) {
        const textPart = gmailMessage.payload.parts.find((p: any) => p.mimeType === 'text/plain');
        const htmlPart = gmailMessage.payload.parts.find((p: any) => p.mimeType === 'text/html');
        
        if (textPart?.body?.data) {
          bodyText = this.decodeBase64Url(textPart.body.data);
        }
        if (htmlPart?.body?.data) {
          bodyHtml = this.decodeBase64Url(htmlPart.body.data);
        }
      }

      // Extract attachments
      const attachments = gmailMessage.payload?.parts
        ?.filter((part: any) => part.filename && part.body?.attachmentId)
        ?.map((part: any) => ({
          name: part.filename,
          type: part.mimeType,
          size: part.body?.size ?? 0,
          downloadUrl: undefined, // Would need separate API call
        })) ?? [];

      const emailData: EmailData = {
        id: gmailMessage.id,
        messageId: gmailMessage.id,
        threadId: gmailMessage.threadId,
        subject: subject || '(No subject)',
        from,
        to: to ? [to] : [],
        body: bodyHtml || bodyText,
        messageText: bodyText,
        preview: gmailMessage.snippet ?? '',
        sender: from,
        date: date || new Date().toISOString(),
        messageTimestamp: new Date(parseInt(gmailMessage.internalDate ?? '0')).toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined,
        isRead: !gmailMessage.labelIds?.includes('UNREAD'),
        isDraft: gmailMessage.labelIds?.includes('DRAFT') ?? false,
        labelIds: gmailMessage.labelIds ?? [],
      };

      return EmailDataSchema.parse(emailData);
    } catch (error) {
      console.warn(`[EmailService] Failed to transform email:`, error);
      return null;
    }
  }

  private decodeBase64Url(encoded: string): string {
    try {
      // Replace URL-safe characters and add padding if needed
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '==='.slice((base64.length + 3) % 4);
      
      // Decode and convert to UTF-8
      return Buffer.from(padded, 'base64').toString('utf-8');
    } catch (error) {
      console.warn('[EmailService] Failed to decode base64 content:', error);
      return '';
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

// ============================================================================
// TRPC ROUTER
// ============================================================================

export const emailRouter = {
  test: publicProcedure.query(() => {
    return {
      success: true,
      data: "Email router is working!",
      message: "Test successful",
    };
  }),

  listEmails: publicProcedure
    .input(ListEmailsInputSchema)
    .query(async ({ ctx, input }): Promise<GmailResponse<EmailsListResponse>> => {
      console.log(`[EmailRouter] 🚨 DEBUG: listEmails called with ctx:`, {
        hasSession: !!ctx.session,
        hasUser: !!ctx.session?.user,
        userId: ctx.session?.user?.id,
      });
      
      try {
        // For now, use hardcoded user ID to test
        const userId = ctx.session?.user?.id || 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
        console.log(`[EmailRouter] Listing emails for user: ${userId}`);

        const result = await emailService.listEmails(userId, input);

        return {
          success: true,
          data: result,
          message: `Found ${result.emails.length} emails`,
        };
      } catch (error) {
        console.error(`[EmailRouter] Error listing emails:`, error);

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to list emails",
        };
      }
    }),

  getEmail: protectedProcedure
    .input(GetEmailInputSchema)
    .query(async ({ ctx, input }): Promise<GmailResponse<EmailData>> => {
      try {
        const userId = ctx.session.user.id;
        console.log(`[EmailRouter] Getting email ${input.messageId} for user: ${userId}`);

        const result = await emailService.getEmail(userId, input);

        return {
          success: true,
          data: result,
          message: `Retrieved email ${input.messageId}`,
        };
      } catch (error) {
        console.error(`[EmailRouter] Error getting email:`, error);

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to get email",
        };
      }
    }),

} satisfies TRPCRouterRecord; 