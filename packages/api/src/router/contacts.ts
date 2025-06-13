import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import type { ContactData } from "@omnii/validators";
import { ContactDataSchema } from "@omnii/validators";

import { protectedProcedure, publicProcedure } from "../trpc";

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const SearchContactsInputSchema = z.object({
  query: z.string().optional().default(""), // Empty string for warmup
  pageSize: z.number().int().min(1).max(1000).optional().default(10),
  readMask: z.string().optional().default("names,emailAddresses,phoneNumbers"),
});

// ============================================================================
// RESPONSE TYPE DEFINITIONS
// ============================================================================

export interface GoogleContactsResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

export interface ContactsListResponse {
  contacts: ContactData[];
  totalCount: number;
}

// ============================================================================
// OAUTH MANAGER (Reusing from tasks.ts pattern)
// ============================================================================

interface IOAuthTokenManager {
  getGoogleOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }>;
}

class ContactsOAuthManager implements IOAuthTokenManager {
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
      console.log(`[ContactsOAuthManager] Getting OAuth token for user: ${userId}`);

      const { data: tokenData, error } = await this.supabase
        .from("oauth_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userId)
        .eq("provider", "google")
        .single();

      if (error || !tokenData) {
        throw new Error(`No OAuth token found for user ${userId}: ${error?.message || 'Token not found'}`);
      }

      const currentToken = {
        access_token: tokenData.access_token as string,
        refresh_token: tokenData.refresh_token as string,
        expires_at: tokenData.expires_at as string,
      };

      // Simple token expiry check
      const shouldRefresh = this.shouldRefreshToken(currentToken.expires_at);

      if (shouldRefresh && currentToken.refresh_token) {
        console.log("[ContactsOAuthManager] Token needs refresh, refreshing...");
        const refreshedTokenData = await this.refreshToken(currentToken.refresh_token);
        await this.updateToken(userId, refreshedTokenData.access_token, refreshedTokenData.refresh_token || currentToken.refresh_token, refreshedTokenData.expires_in);
        
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
      console.error(`[ContactsOAuthManager] OAuth token retrieval failed:`, error);
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

    return response.json();
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
// CONTACTS SERVICE
// ============================================================================

class ContactsService {
  private oauthManager: ContactsOAuthManager;

  constructor() {
    this.oauthManager = new ContactsOAuthManager();
  }

  /**
   * List all contacts using Google People API
   */
  async listContacts(
    userId: string,
    pageSize: number = 20
  ): Promise<ContactsListResponse> {
    console.log(`[ContactsService] 📋 Listing all contacts for user: ${userId}`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    
    const response = await this.listContactsApiCall(
      oauthToken.access_token,
      pageSize
    );

    const connections = response?.connections || [];
    console.log(`[ContactsService] 📞 Found ${connections.length} contacts`);

    // Transform to our contact schema
    const formattedContacts = connections
      .map((person: any) => this.transformGoogleContactToSchema(person))
      .filter(Boolean) as ContactData[];

    return {
      contacts: formattedContacts,
      totalCount: response?.totalPeople || connections.length,
    };
  }

  /**
   * Search contacts using Google People API
   * Implements warmup + search pattern as documented
   */
  async searchContacts(
    userId: string,
    params: z.infer<typeof SearchContactsInputSchema>
  ): Promise<ContactsListResponse> {
    console.log(`[ContactsService] 🔍 Searching contacts for user: ${userId}, query: "${params.query}"`);
    
    const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
    
    // Step 1: Warmup request (if this is a real search, send warmup first)
    if (params.query && params.query.length > 0) {
      console.log(`[ContactsService] 🔥 Sending warmup request`);
      await this.makeSearchApiCall("", oauthToken.access_token, params.readMask, 1);
      // Small delay as recommended
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 2: Actual search request
    const response = await this.makeSearchApiCall(
      params.query || "",
      oauthToken.access_token,
      params.readMask,
      params.pageSize
    );

    const contacts = response?.results || [];
    console.log(`[ContactsService] 📞 Found ${contacts.length} contacts`);

    // Transform to our contact schema
    const formattedContacts = contacts
      .map((result: any) => this.transformGoogleContactToSchema(result.person))
      .filter(Boolean) as ContactData[];

    return {
      contacts: formattedContacts,
      totalCount: contacts.length,
    };
  }

  private async listContactsApiCall(
    accessToken: string,
    pageSize: number = 20
  ): Promise<any> {
    const personFields = "names,emailAddresses,phoneNumbers,photos,organizations";
    const url = `https://people.googleapis.com/v1/people/me/connections?personFields=${personFields}&pageSize=${pageSize}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google People API connections list failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  private async makeSearchApiCall(
    query: string,
    accessToken: string,
    readMask: string = "names,emailAddresses,phoneNumbers",
    pageSize: number = 10
  ): Promise<any> {
    const queryParams = new URLSearchParams({
      query,
      readMask,
      pageSize: pageSize.toString(),
    });

    const url = `https://people.googleapis.com/v1/people:searchContacts?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google People API search failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  private transformGoogleContactToSchema(person: any): ContactData | null {
    try {
      // Extract contact ID from resourceName
      const contactId = person.resourceName?.split('/').pop() || `contact_${Date.now()}`;
      
      // Extract primary name
      const primaryName = person.names?.find((n: any) => n.metadata?.primary) || person.names?.[0];
      const displayName = primaryName?.displayName || 
                         `${primaryName?.givenName || ''} ${primaryName?.familyName || ''}`.trim() || 
                         'Unknown';

      // Extract emails with proper type mapping
      const emails = (person.emailAddresses || []).map((email: any) => ({
        address: email.value,
        type: this.mapEmailType(email.type),
        verified: email.metadata?.verified || false,
      }));
      
      // Extract phones with proper type mapping
      const phones = (person.phoneNumbers || []).map((phone: any) => ({
        number: phone.value,
        type: this.mapPhoneType(phone.type),
      }));

      // Extract organization info
      const primaryOrg = person.organizations?.find((o: any) => o.metadata?.primary) || person.organizations?.[0];

      // Extract photo URL
      const primaryPhoto = person.photos?.find((p: any) => p.metadata?.primary) || person.photos?.[0];

      const contactData: ContactData = {
        contactId,
        name: displayName,
        firstName: primaryName?.givenName || undefined,
        lastName: primaryName?.familyName || undefined,
        emails,
        phones,
        company: primaryOrg?.name || undefined,
        title: primaryOrg?.title || undefined,
        photoUrl: primaryPhoto?.url || undefined,
        etag: person.etag || undefined,
      };

      return ContactDataSchema.parse(contactData);
    } catch (error) {
      console.warn(`[ContactsService] Failed to transform contact:`, error);
      return null;
    }
  }

  private mapEmailType(googleType?: string): "work" | "personal" | "other" {
    const lowerType = googleType?.toLowerCase();
    if (lowerType === "work") return "work";
    if (lowerType === "home" || lowerType === "personal") return "personal";
    return "other";
  }

  private mapPhoneType(googleType?: string): "work" | "mobile" | "home" | "other" {
    const lowerType = googleType?.toLowerCase();
    if (lowerType === "work") return "work";
    if (lowerType === "mobile") return "mobile";
    if (lowerType === "home") return "home";
    return "other";
  }
}

// Create singleton instance
const contactsService = new ContactsService();

// ============================================================================
// TRPC ROUTER
// ============================================================================

export const contactsRouter = {
  test: publicProcedure.query(() => {
    return {
      success: true,
      data: "Contacts router is working!",
      message: "Test successful",
    };
  }),

  searchContacts: protectedProcedure
    .input(SearchContactsInputSchema)
    .query(async ({ ctx, input }): Promise<GoogleContactsResponse<ContactsListResponse>> => {
      try {
        const userId = ctx.session.user.id;
        console.log(`[ContactsRouter] Searching contacts for user: ${userId}`);

        const result = await contactsService.searchContacts(userId, input);

        return {
          success: true,
          data: result,
          message: `Found ${result.contacts.length} contacts`,
        };
      } catch (error) {
        console.error(`[ContactsRouter] Error searching contacts:`, error);

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to search contacts",
        };
      }
    }),

  // Endpoint for listing all contacts using connections API
  listContacts: protectedProcedure
    .input(z.object({
      pageSize: z.number().int().min(1).max(1000).optional().default(20),
    }))
    .query(async ({ ctx, input }): Promise<GoogleContactsResponse<ContactsListResponse>> => {
      try {
        const userId = ctx.session.user.id;
        console.log(`[ContactsRouter] Listing all contacts for user: ${userId}`);

        const result = await contactsService.listContacts(userId, input.pageSize);

        return {
          success: true,
          data: result,
          message: `Listed ${result.contacts.length} contacts`,
        };
      } catch (error) {
        console.error(`[ContactsRouter] Error listing contacts:`, error);

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to list contacts",
        };
      }
    }),

} satisfies TRPCRouterRecord; 