import { OpenAI } from "openai";
import { OpenAIToolSet } from "composio-core";
import { ExecutionContextType } from "../types/action-planning.types";
import { UnifiedToolResponse } from "../types/unified-response.types";

export enum GoogleServiceType {
  CALENDAR = "CALENDAR",
  TASKS = "TASKS", 
  CONTACTS = "CONTACTS",
  EMAIL = "EMAIL",
}

export interface GoogleIntegrationConfig {
  integrationId: string;
  appName: string;
  serviceName: string;
  useCustomAuthOnly?: boolean;
}

/**
 * Interface for OAuth token manager
 * This allows plugins to access OAuth tokens without circular imports
 */
export interface IOAuthTokenManager {
  getGoogleOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }>;
}

/**
 * Enhanced interface for service plugins (supports both old and new response formats)
 */
export interface GoogleServicePlugin {
  serviceType: GoogleServiceType;

  // Service-specific message detection
  isServiceMessage(message: string): boolean;

  // NEW: Method to set the manager reference for OAuth token access
  setManager?(manager: IOAuthTokenManager): void;

  // Service-specific processing (receives active connection)
  // ENHANCED: Can return either old format or new UnifiedToolResponse
  processMessage(
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
  } | UnifiedToolResponse>;

  // Optional: Service-specific tools/actions
  getServiceActions?(): Record<string, string>;
} 