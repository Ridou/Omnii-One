import { OpenAI } from "openai";
import { OpenAIToolSet } from "composio-core";
import { createClient } from "@supabase/supabase-js";
import twilioService from "./twilio-service";
import { TasksPlugin } from "./plugins/tasks-plugin";
import { CalendarPlugin } from "./plugins/calendar-plugin";
import { ContactsPlugin } from "./plugins/contacts-plugin";
import { EmailPlugin } from "./plugins/email-plugin";
import { ExecutionContextType } from "../types/action-planning.types";
import { UnifiedToolResponse } from "../types/unified-response.types";
import { isValidUnifiedToolResponse, validateUnifiedToolResponse } from "@omnii/validators";
import {
  GoogleServiceType, getGoogleServiceConfig
} from "../types/composio-enums";
import { GoogleServicePlugin, IOAuthTokenManager } from "./google-service-plugin";

export class UnifiedGoogleManager implements IOAuthTokenManager {
  private openai: OpenAI;
  private composio: OpenAIToolSet;
  private plugins: Map<GoogleServiceType, GoogleServicePlugin> = new Map();
  private supabase: ReturnType<typeof createClient>;
  private readonly REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.composio = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY || "exby0bz32hpz8nmmahu3o",
    });

    // Initialize Supabase client for OAuth token management
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Register Calendar Plugin
    const calendarPlugin = new CalendarPlugin();
    this.registerPlugin(calendarPlugin);

    // Register Tasks Plugin
    const tasksPlugin = new TasksPlugin();
    this.registerPlugin(tasksPlugin);

    // Register Contacts Plugin
    const contactsPlugin = new ContactsPlugin();
    this.registerPlugin(contactsPlugin);

    // Register Email Plugin
    const emailPlugin = new EmailPlugin();
    this.registerPlugin(emailPlugin);
  }

  /**
   * Register a service plugin
   */
  registerPlugin(plugin: GoogleServicePlugin): void {
    // NEW: Provide manager reference to plugin for OAuth token access
    if (plugin.setManager) {
      plugin.setManager(this);
    }
    
    this.plugins.set(plugin.serviceType, plugin);
    console.log(
      `[UnifiedGoogleManager] Registered plugin: ${plugin.serviceType}`
    );
  }

  /**
   * Process a message - handles auth + delegates to plugins
   */
  async processMessage(
    message: string,
    userId: string,
    userTimezone: string,
    localDatetime?: string,
    context: ExecutionContextType = ExecutionContextType.SMS
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
    serviceType?: GoogleServiceType;
    rawData?: any;
    authRequired?: boolean;
    authUrl?: string | null;
  } | UnifiedToolResponse> {
    try {
      // 1. Determine which service should handle this message (now async)
      const serviceType = await this.detectServiceType(message);

      if (!serviceType) {
        return {
          success: false,
          message:
            "I'm not sure which Google service you're referring to. Try 'calendar', 'contacts', or 'tasks'.",
        };
      }

      const plugin = this.plugins.get(serviceType);
      if (!plugin) {
        return {
          success: false,
          message: `${serviceType} service plugin not registered.`,
        };
      }

      // 2. Handle auth/connection (this is what we centralize!)
      const connectionResult = await this.ensureActiveConnection(
        userId,
        serviceType,
        context
      );

      if (!connectionResult.success) {
        // Check if this is an OAuth requirement vs a real error
        if (connectionResult.authRequired && connectionResult.authUrl) {
          return {
            success: false,
            message: connectionResult.message || "Authentication required",
            error: connectionResult.error,
            serviceType,
            authRequired: true,
            authUrl: connectionResult.authUrl,
          };
        } else {
          return {
            success: false,
            message: connectionResult.message || "Authentication required",
            error: connectionResult.error,
            serviceType,
          };
        }
      }

      // 3. Delegate to service plugin with active connection
      console.log(
        `[UnifiedGoogleManager] Delegating to ${serviceType} plugin...`
      );

      const result = await plugin.processMessage(
        message,
        userId,
        context,
        connectionResult.activeConnection!,
        this.composio,
        this.openai
      );

      // NEW: Check if plugin returned UnifiedToolResponse (rich format)
      if (isValidUnifiedToolResponse(result)) {
        console.log(
          `[UnifiedGoogleManager] Plugin returned valid UnifiedToolResponse, passing through directly`
        );
        
        try {
          const validatedResponse = validateUnifiedToolResponse(result);
          console.log(`[UnifiedGoogleManager] 🎯 VALIDATED UnifiedToolResponse:`);
          console.log(`[UnifiedGoogleManager] - Type: ${validatedResponse.type}`);
          console.log(`[UnifiedGoogleManager] - Success: ${validatedResponse.success}`);
          console.log(`[UnifiedGoogleManager] - Has structured data: ${!!validatedResponse.data?.structured}`);
          
          // FIXED: Better type checking for email data
          if (validatedResponse.data?.structured && validatedResponse.type === 'email') {
            const structured = validatedResponse.data.structured;
            // Check if it's an email list structure
            if ('emails' in structured && Array.isArray(structured.emails)) {
              console.log(`[UnifiedGoogleManager] 📧 Email list with ${structured.emails.length} emails`);
              if ('unreadCount' in structured) {
                console.log(`[UnifiedGoogleManager] 📧 ${structured.unreadCount} unread emails`);
              }
            }
          }
          
          return validatedResponse; // Return validated rich response directly to client
        } catch (validationError) {
          console.error(`[UnifiedGoogleManager] ❌ UnifiedToolResponse validation failed:`, validationError);
          console.log(`[UnifiedGoogleManager] Falling back to legacy format wrapping`);
          // Fall through to legacy handling
        }
      }

      // OLD: Plugin returned legacy format, wrap it (but don't add serviceType to UnifiedToolResponse)
      console.log(
        `[UnifiedGoogleManager] Plugin returned legacy format, wrapping for backward compatibility`
      );
      
      // FIXED: Properly handle legacy response type with type guard
      const legacyResult = result as {
        success: boolean;
        message: string;
        error?: string;
        rawData?: any;
      };
      
      return {
        success: legacyResult.success,
        message: legacyResult.message,
        error: legacyResult.error,
        serviceType,
        rawData: legacyResult.rawData,
      };
    } catch (error) {
      console.error(`[UnifiedGoogleManager] Error processing message:`, error);
      return {
        success: false,
        message: "Sorry, I had trouble processing that request.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Detect which service should handle the message using AI classification
   */
  private async detectServiceType(
    message: string
  ): Promise<GoogleServiceType | null> {
    console.log(
      `[UnifiedGoogleManager] AI-detecting service type for message: "${message}"`
    );

    // Exclude system/intervention messages from service routing
    const msg = message.toLowerCase();
    if (
      msg.includes("resolve user intervention") ||
      msg.includes("user intervention") ||
      msg.startsWith("system:") ||
      msg.includes("intervention_") ||
      msg.includes("session_")
    ) {
      console.log(
        `[UnifiedGoogleManager] Excluding system/intervention message from service routing`
      );
      return null;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a service classifier. Given a user message, determine which Google service it should be routed to.

Available services:
- CALENDAR: Creating/viewing/managing calendar events, meetings, schedules, appointments, free time analysis
- CONTACTS: Finding/searching/creating/managing contacts, looking up people, getting contact information
- TASKS: Creating/viewing/managing tasks, to-dos, task lists
- EMAIL: Sending/creating/drafting/reading emails, managing Gmail, email operations

IMPORTANT RULES:
1. Contact lookup/search (like "find contact John" or "look up Sarah") should go to CONTACTS
2. Email operations (send, draft, read, manage) should go to EMAIL  
3. If the message involves finding someone to email them, classify as CONTACTS first (they need contact lookup)
4. Calendar events, meetings, scheduling goes to CALENDAR
5. Tasks, to-dos, reminders go to TASKS
6. NEVER classify system messages, interventions, or error messages - return NONE for these

Return ONLY the service name (CALENDAR, CONTACTS, TASKS, EMAIL) or "NONE" if unclear.`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.1, // Low temperature for consistent classification
      });

      const classification = response.choices[0].message.content
        ?.trim()
        .toUpperCase();
      console.log(
        `[UnifiedGoogleManager] AI classification result: "${classification}"`
      );

      if (classification && classification in GoogleServiceType) {
        const serviceType = classification as GoogleServiceType;
        console.log(
          `[UnifiedGoogleManager] Selected service type: ${serviceType}`
        );
        return serviceType;
      }

      if (classification === "NONE") {
        console.log(`[UnifiedGoogleManager] AI determined no service matches`);
        return null;
      }

      // Fallback to keyword-based detection if AI classification is unclear
      console.log(
        `[UnifiedGoogleManager] AI classification unclear, falling back to keyword detection`
      );
      return this.detectServiceTypeKeyword(message);
    } catch (error) {
      console.error(
        `[UnifiedGoogleManager] Error in AI classification:`,
        error
      );
      // Fallback to keyword-based detection on error
      return this.detectServiceTypeKeyword(message);
    }
  }

  /**
   * Fallback keyword-based service detection (more conservative)
   */
  private detectServiceTypeKeyword(message: string): GoogleServiceType | null {
    console.log(
      `[UnifiedGoogleManager] Fallback keyword detection for: "${message}"`
    );

    // Check each registered plugin as fallback
    for (const [serviceType, plugin] of this.plugins) {
      const matches = plugin.isServiceMessage(message);
      console.log(
        `[UnifiedGoogleManager] ${serviceType} plugin matches: ${matches}`
      );
      if (matches) {
        console.log(
          `[UnifiedGoogleManager] Selected service type: ${serviceType}`
        );
        return serviceType;
      }
    }

    console.log(`[UnifiedGoogleManager] No service type matched`);
    return null;
  }

  /**
   * Ensure active connection exists for service (centralized auth logic)
   */
  async ensureActiveConnection(
    userId: string,
    serviceType: GoogleServiceType,
    context: ExecutionContextType = ExecutionContextType.SMS
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    activeConnection?: any;
    authRequired?: boolean;
    authUrl?: string | null;
  }> {
    const config = getGoogleServiceConfig(serviceType);

    // NEW: Bypass all Composio connection logic for services using custom auth
    if (config.useCustomAuthOnly) {
      console.log(
        `[UnifiedGoogleManager] 🔐 Service ${serviceType} uses custom OAuth tokens, bypassing Composio connections`
      );
      return {
        success: true,
        activeConnection: null, // Plugin will use custom OAuth tokens instead
        authRequired: false,
        authUrl: null,
      };
    }

    try {
      // Check for active connection (original Composio logic)
      const connections = await this.getUserConnections(userId);
      const activeConnection = this.findActiveConnection(
        connections,
        serviceType
      );

      if (activeConnection) {
        console.log(
          `[UnifiedGoogleManager] Active ${serviceType} connection found: ${activeConnection.id}`
        );
        return {
          success: true,
          activeConnection,
          authRequired: false,
          authUrl: null,
        };
      }

      // No active connection - set up OAuth
      console.log(
        `[UnifiedGoogleManager] No active ${serviceType} connection, setting up OAuth...`
      );
      const oauthResult = await this.setupOAuthConnection(
        userId,
        serviceType,
        context
      );

      return {
        success: false, // Auth needed
        message: oauthResult.message,
        error: oauthResult.error,
        authRequired: oauthResult.authRequired,
        authUrl: oauthResult.authUrl,
      };
    } catch (error) {
      console.error(`[UnifiedGoogleManager] Error ensuring connection:`, error);
      return {
        success: false,
        message: `Failed to check ${serviceType} connection.`,
        error: error instanceof Error ? error.message : "Unknown error",
        authRequired: false,
        authUrl: null,
      };
    }
  }

  /**
   * Get user connections for any Google service
   */
  async getUserConnections(userId: string): Promise<any[]> {
    try {
      const connections = await this.composio.connectedAccounts.list({
        entityId: userId,
      });

      console.log(
        `[UnifiedGoogleManager] Found ${
          connections.items?.length || 0
        } connections for ${userId}`
      );

      // Log all connections for debugging
      connections.items?.forEach((conn: any, index: number) => {
        console.log(
          `[UnifiedGoogleManager] Connection ${index + 1}: ${conn.appName} - ${
            conn.status
          } (ID: ${conn.id})`
        );
      });

      return connections.items || [];
    } catch (listError) {
      console.log(
        `[UnifiedGoogleManager] Error listing connections, assuming none exist:`,
        listError
      );
      return [];
    }
  }

  /**
   * Find active connection for specific service
   */
  findActiveConnection(
    connections: any[],
    serviceType: GoogleServiceType
  ): any | null {
    const config = getGoogleServiceConfig(serviceType);
    return connections.find(
      (conn: any) =>
        conn.appName?.toLowerCase() === config.appName.toLowerCase() &&
        conn.status?.toLowerCase() === "active"
    );
  }

  /**
   * Find pending connection for specific service
   */
  findPendingConnection(
    connections: any[],
    serviceType: GoogleServiceType
  ): any | null {
    const config = getGoogleServiceConfig(serviceType);
    return connections.find(
      (conn: any) =>
        conn.appName?.toLowerCase() === config.appName.toLowerCase() &&
        conn.status?.toLowerCase() === "initiated"
    );
  }

  /**
   * Set up new OAuth connection (centralized auth logic)
   */
  async setupOAuthConnection(
    userId: string,
    serviceType: GoogleServiceType,
    context: ExecutionContextType = ExecutionContextType.SMS
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
    authRequired: boolean;
    authUrl: string | null;
  }> {
    const config = getGoogleServiceConfig(serviceType);

    try {
      const integration = await this.composio.integrations.get({
        integrationId: config.integrationId,
      });

      console.log(
        `[UnifiedGoogleManager] Integration details for ${serviceType}:`,
        {
          id: integration.id,
          name: integration.name,
          appName: integration.appName,
        }
      );

      // Get required params
      if (integration.id) {
        const expectedInputFields =
          await this.composio.integrations.getRequiredParams({
            integrationId: integration.id,
          });
        console.log(
          `[UnifiedGoogleManager] Expected input fields for ${serviceType}:`,
          expectedInputFields
        );
      }

      const connectedAccount = await this.composio.connectedAccounts.initiate({
        integrationId: integration.id!,
        entityId: userId,
      });

      console.log(`[UnifiedGoogleManager] OAuth setup for ${serviceType}:`, {
        connectionStatus: connectedAccount.connectionStatus,
        connectedAccountId: connectedAccount.connectedAccountId,
        redirectUrl: connectedAccount.redirectUrl ? "present" : "null",
      });

      if (connectedAccount.redirectUrl) {
        const oauthMessage = `To access ${config.serviceName}, please connect your Google account: ${connectedAccount.redirectUrl}`;

        if (context === ExecutionContextType.WEBSOCKET) {
          // For WebSocket: Don't send SMS, just return the OAuth URL in the message
          console.log(
            `[UnifiedGoogleManager] ${serviceType} OAuth URL prepared for WebSocket response`
          );
          return {
            success: false, // Still false because auth is needed
            message: oauthMessage,
            authRequired: true,
            authUrl: connectedAccount.redirectUrl,
          };
        } else {
          // For SMS: Send the OAuth URL via SMS (original behavior)
          try {
            await twilioService.sendMessage({
              to: userId,
              body: oauthMessage,
            });
            console.log(
              `[UnifiedGoogleManager] ${serviceType} OAuth URL sent via SMS to ${userId}`
            );
          } catch (smsError) {
            console.error(
              `[UnifiedGoogleManager] Error sending OAuth URL via SMS:`,
              smsError
            );
          }
        }
      }

      return {
        success: true,
        message: "OAuth connection setup successful",
        authRequired: false,
        authUrl: null,
      };
    } catch (error) {
      console.error(`[UnifiedGoogleManager] Error setting up OAuth:`, error);
      return {
        success: false,
        message: "Failed to set up OAuth connection",
        error: error instanceof Error ? error.message : "Unknown error",
        authRequired: false,
        authUrl: null,
      };
    }
  }

  /**
   * Check if token needs refresh (within 5 minutes of expiry)
   */
  private shouldRefreshToken(expiresAt: string): boolean {
    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    return (expiryTime - currentTime) <= this.REFRESH_THRESHOLD_MS;
  }

  /**
   * Refresh Google OAuth token with retry logic
   */
  private async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
  }> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[UnifiedGoogleManager] 🔄 Refreshing Google OAuth token (attempt ${attempt}/${maxRetries})...`);

        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          const error = new Error(`Token refresh failed: ${response.status} ${errorData}`);
          
          // Parse error response for better handling
          let parsedError: any = {};
          try {
            parsedError = JSON.parse(errorData);
          } catch {
            // Keep as raw text if not JSON
          }
          
          // Check if this is a retryable error
          const isRetryable = this.isRetryableTokenError(response.status, parsedError);
          
          console.log(`[UnifiedGoogleManager] ❌ Token refresh failed (attempt ${attempt}/${maxRetries}):`, {
            status: response.status,
            error: parsedError.error || 'unknown',
            description: parsedError.error_description || errorData,
            retryable: isRetryable
          });
          
          // Don't retry on certain error types
          if (!isRetryable || attempt === maxRetries) {
            console.error('[UnifiedGoogleManager] 💥 Token refresh failed permanently:', error);
            throw error;
          }
          
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          console.log(`[UnifiedGoogleManager] ⏰ Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        const tokenData = await response.json() as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
          scope?: string;
        };

        console.log(`[UnifiedGoogleManager] ✅ Token refresh successful on attempt ${attempt}`);
        
        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || refreshToken, // Use existing refresh token if new one not provided
          expires_in: tokenData.expires_in,
          scope: tokenData.scope
        };
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('[UnifiedGoogleManager] 💥 All retry attempts failed:', error);
          throw error;
        }
        
        // Only log and continue for network/timeout errors
        if (error instanceof Error && (
          error.message.includes('fetch') || 
          error.message.includes('timeout') ||
          error.message.includes('network')
        )) {
          console.log(`[UnifiedGoogleManager] 🌐 Network error on attempt ${attempt}, retrying...`);
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Re-throw non-retryable errors immediately
        throw error;
      }
    }
    
    throw new Error('Token refresh failed after all retry attempts');
  }

  /**
   * Determine if a token refresh error is retryable
   */
  private isRetryableTokenError(status: number, parsedError: any): boolean {
    // Don't retry on authentication/authorization errors
    if (status === 401) {
      const errorType = parsedError.error;
      
      // These 401 errors are typically permanent and shouldn't be retried
      if (errorType === 'invalid_grant' || 
          errorType === 'unauthorized_client' ||
          errorType === 'invalid_client') {
        console.log(`[UnifiedGoogleManager] 🚫 Non-retryable 401 error: ${errorType}`);
        return false;
      }
    }
    
    // Don't retry on bad request (malformed request)
    if (status === 400) {
      return false;
    }
    
    // Retry on server errors and rate limiting
    if (status >= 500 || status === 429) {
      return true;
    }
    
    // Default to not retrying for other 4xx errors
    if (status >= 400 && status < 500) {
      return false;
    }
    
    // Retry on network-level issues (handled separately)
    return true;
  }

  /**
   * Get token information including scopes
   */
  private async getTokenInfo(accessToken: string): Promise<{
    valid: boolean;
    scope?: string;
    email?: string;
    expires_in?: number;
  }> {
    try {
      console.log('[UnifiedGoogleManager] 🔍 Getting token information and scopes...');
      
      // Use Google's tokeninfo endpoint to get scope information
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
      
      if (!response.ok) {
        console.log('[UnifiedGoogleManager] ❌ Token info request failed:', response.status);
        return { valid: false };
      }
      
      const tokenInfo = await response.json() as {
        scope?: string;
        email?: string;
        expires_in?: number;
        error?: string;
      };
      
      if (tokenInfo.error) {
        console.log('[UnifiedGoogleManager] ❌ Token info error:', tokenInfo.error);
        return { valid: false };
      }
      
      console.log('[UnifiedGoogleManager] ✅ Token info retrieved successfully');
      console.log('[UnifiedGoogleManager] 🔍 Token scopes:', tokenInfo.scope || 'No scope information');
      console.log('[UnifiedGoogleManager] 👤 Token email:', tokenInfo.email || 'No email information');
      console.log('[UnifiedGoogleManager] ⏰ Token expires in:', tokenInfo.expires_in ? `${tokenInfo.expires_in} seconds` : 'No expiry information');
      
      return {
        valid: true,
        scope: tokenInfo.scope,
        email: tokenInfo.email,
        expires_in: tokenInfo.expires_in
      };
    } catch (error) {
      console.error('[UnifiedGoogleManager] 💥 Failed to get token info:', error);
      return { valid: false };
    }
  }

  /**
   * Validate token by making a test API call
   */
  private async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('[UnifiedGoogleManager] Token validation failed:', error);
      return false;
    }
  }

  /**
   * Update token in Supabase
   */
  private async updateToken(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
      
      const { error } = await this.supabase
        .from("oauth_tokens")
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("provider", "google");

      if (error) {
        throw new Error(`Failed to update token: ${error.message}`);
      }

      console.log('[UnifiedGoogleManager] ✅ Token updated in database');
    } catch (error) {
      console.error('[UnifiedGoogleManager] 💥 Failed to update token:', error);
      throw error;
    }
  }

  /**
   * Centralized OAuth token retrieval for all Google services
   * This method fetches Google OAuth tokens from Supabase and handles refresh if needed
   */
  async getGoogleOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }> {
    try {
      console.log(`[UnifiedGoogleManager] 🔍 Getting OAuth token for user: ${userId}`);

      // Get current token from database
      const { data: tokenData, error } = await this.supabase
        .from("oauth_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userId)
        .eq("provider", "google")
        .single();

      if (error) {
        console.error("[UnifiedGoogleManager] Error fetching OAuth token:", error);
        throw new Error(`Failed to fetch OAuth token for user ${userId}: ${error.message}`);
      }

      if (!tokenData) {
        throw new Error(`No OAuth token found for user ${userId}`);
      }

      let currentToken = {
        access_token: tokenData.access_token as string,
        refresh_token: tokenData.refresh_token as string,
        expires_at: tokenData.expires_at as string,
      };

      console.log('[UnifiedGoogleManager] 📊 Current token status:');
      console.log('[UnifiedGoogleManager] - Has access token:', !!currentToken.access_token);
      console.log('[UnifiedGoogleManager] - Has refresh token:', !!currentToken.refresh_token);
      console.log('[UnifiedGoogleManager] - Expires at:', currentToken.expires_at);
      console.log('[UnifiedGoogleManager] - Needs refresh (5min rule):', this.shouldRefreshToken(currentToken.expires_at));

      // 🚨 FORCE REFRESH: Always refresh the token to get latest scopes and ensure freshness
      console.log('[UnifiedGoogleManager] 🔄 FORCE REFRESHING TOKEN (debug mode)...');
      
      if (!currentToken.refresh_token) {
        throw new Error('No refresh token available. User needs to re-authenticate.');
      }

      // Get current token information and scopes BEFORE refresh
      console.log('[UnifiedGoogleManager] 🔍 BEFORE REFRESH - Getting current token info...');
      const currentTokenInfo = await this.getTokenInfo(currentToken.access_token);

      // Refresh the token with enhanced error handling
      let refreshedTokenData;
      try {
        refreshedTokenData = await this.refreshToken(currentToken.refresh_token);
      } catch (refreshError) {
        console.error('[UnifiedGoogleManager] 💥 Token refresh failed:', refreshError);
        
        // Handle specific error types
        if (refreshError instanceof Error) {
          const errorMessage = refreshError.message.toLowerCase();
          
          if (errorMessage.includes('unauthorized_client')) {
            console.log('[UnifiedGoogleManager] 🚫 Unauthorized client error - check OAuth credentials');
            throw new Error('OAuth client credentials are invalid. Please check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
          }
          
          if (errorMessage.includes('invalid_grant')) {
            console.log('[UnifiedGoogleManager] 🚫 Invalid grant error - refresh token expired or revoked');
            throw new Error('Refresh token is invalid or expired. User needs to re-authenticate.');
          }
          
          if (errorMessage.includes('invalid_client')) {
            console.log('[UnifiedGoogleManager] 🚫 Invalid client error - OAuth app configuration issue');
            throw new Error('OAuth client configuration is invalid. Check OAuth app settings in Google Cloud Console.');
          }
        }
        
        // Re-throw original error if not a known type
        throw refreshError;
      }
      
      // Update token in database
      await this.updateToken(
        userId,
        refreshedTokenData.access_token,
        refreshedTokenData.refresh_token || currentToken.refresh_token,
        refreshedTokenData.expires_in
      );

      // Get updated token from database
      const { data: updatedData, error: updateError } = await this.supabase
        .from("oauth_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userId)
        .eq("provider", "google")
        .single();

      if (updateError || !updatedData) {
        throw new Error('Failed to retrieve updated token');
      }

      currentToken = {
        access_token: updatedData.access_token as string,
        refresh_token: updatedData.refresh_token as string,
        expires_at: updatedData.expires_at as string,
      };

      // Get NEW token information and scopes AFTER refresh
      console.log('[UnifiedGoogleManager] 🔍 AFTER REFRESH - Getting new token info...');
      const newTokenInfo = await this.getTokenInfo(currentToken.access_token);

      // Validate the refreshed token
      const isValid = await this.validateToken(currentToken.access_token);
      if (!isValid) {
        throw new Error('Refreshed token validation failed. User needs to re-authenticate.');
      }

      // 🎯 COMPREHENSIVE SCOPE ANALYSIS
      console.log('[UnifiedGoogleManager] 🎯 COMPREHENSIVE TOKEN & SCOPE ANALYSIS:');
      console.log('[UnifiedGoogleManager] =====================================');
      console.log('[UnifiedGoogleManager] 👤 User:', userId);
      console.log('[UnifiedGoogleManager] 📧 Email:', newTokenInfo.email || 'No email info');
      console.log('[UnifiedGoogleManager] ✅ Token valid:', isValid);
      console.log('[UnifiedGoogleManager] ⏰ Token expires in:', newTokenInfo.expires_in ? `${newTokenInfo.expires_in} seconds` : 'Unknown');
      console.log('[UnifiedGoogleManager] 🔍 Current scopes:', newTokenInfo.scope || 'NO SCOPE INFORMATION');
      
      if (newTokenInfo.scope) {
        const scopes = newTokenInfo.scope.split(' ');
        console.log('[UnifiedGoogleManager] 📋 SCOPE BREAKDOWN:');
        scopes.forEach((scope, index) => {
          console.log(`[UnifiedGoogleManager]   ${index + 1}. ${scope}`);
        });
        
        // Check for specific Google Contacts scopes
        const hasContactsReadonly = scopes.includes('https://www.googleapis.com/auth/contacts.readonly');
        const hasContactsOtherReadonly = scopes.includes('https://www.googleapis.com/auth/contacts.other.readonly');
        const hasContactsReadWrite = scopes.includes('https://www.googleapis.com/auth/contacts');
        const hasUserInfoProfile = scopes.includes('https://www.googleapis.com/auth/userinfo.profile');
        const hasUserInfoEmail = scopes.includes('https://www.googleapis.com/auth/userinfo.email');
        
        console.log('[UnifiedGoogleManager] 🔍 CONTACTS-SPECIFIC SCOPE CHECK:');
        console.log('[UnifiedGoogleManager] - contacts.readonly:', hasContactsReadonly ? '✅ YES' : '❌ MISSING');
        console.log('[UnifiedGoogleManager] - contacts.other.readonly:', hasContactsOtherReadonly ? '✅ YES' : '❌ MISSING');
        console.log('[UnifiedGoogleManager] - contacts (read/write):', hasContactsReadWrite ? '✅ YES' : '❌ MISSING');
        console.log('[UnifiedGoogleManager] - userinfo.profile:', hasUserInfoProfile ? '✅ YES' : '❌ MISSING');
        console.log('[UnifiedGoogleManager] - userinfo.email:', hasUserInfoEmail ? '✅ YES' : '❌ MISSING');
        
        if (!hasContactsReadonly && !hasContactsOtherReadonly && !hasContactsReadWrite) {
          console.log('[UnifiedGoogleManager] 🚨 WARNING: NO CONTACTS SCOPES DETECTED!');
          console.log('[UnifiedGoogleManager] 🚨 This will likely cause empty contact responses!');
        }
      } else {
        console.log('[UnifiedGoogleManager] 🚨 CRITICAL: NO SCOPE INFORMATION AVAILABLE');
        console.log('[UnifiedGoogleManager] 🚨 This indicates a serious token issue!');
      }
      
      console.log('[UnifiedGoogleManager] =====================================');

      console.log(`[UnifiedGoogleManager] ✅ Successfully retrieved and refreshed OAuth token for user: ${userId}`);
      
      return currentToken;
    } catch (error) {
      console.error(`[UnifiedGoogleManager] 💥 OAuth token retrieval failed for user ${userId}:`, error);
      throw error;
    }
  }
}

// Default export for singleton pattern
const unifiedGoogleManager = new UnifiedGoogleManager();
export default unifiedGoogleManager;
