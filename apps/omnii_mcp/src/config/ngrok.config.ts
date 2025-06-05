/**
 * ngrok Configuration for Omnii MCP
 *
 * Handles dynamic URL configuration for OAuth flows with ngrok
 */

export interface NgrokConfig {
  publicUrl: string;
  localPort: number;
  callbackUrls: {
    oauth: string;
    success: string;
    error: string;
  };
}

export class NgrokConfigManager {
  private config: NgrokConfig;

  constructor() {
    const publicUrl =
      process.env.PUBLIC_URL || process.env.BASE_URL || "http://localhost:8081";
    const localPort = parseInt(process.env.PORT || "8081");

    this.config = {
      publicUrl: publicUrl.replace(/\/$/, ""), // Remove trailing slash
      localPort,
      callbackUrls: {
        oauth: `${publicUrl}/api/composio/calendar/callback`,
        success: `${publicUrl}/oauth/success`,
        error: `${publicUrl}/oauth/error`,
      },
    };
  }

  /**
   * Get the OAuth callback URL for Composio
   */
  getOAuthCallbackUrl(): string {
    return this.config.callbackUrls.oauth;
  }

  /**
   * Get the success redirect URL
   */
  getSuccessUrl(): string {
    return this.config.callbackUrls.success;
  }

  /**
   * Get the error redirect URL
   */
  getErrorUrl(): string {
    return this.config.callbackUrls.error;
  }

  /**
   * Get the public URL
   */
  getPublicUrl(): string {
    return this.config.publicUrl;
  }

  /**
   * Check if running with ngrok
   */
  isUsingNgrok(): boolean {
    return (
      this.config.publicUrl.includes(".ngrok") ||
      this.config.publicUrl.includes("omnii.live")
    );
  }

  /**
   * Get full configuration
   */
  getConfig(): NgrokConfig {
    return { ...this.config };
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.publicUrl.startsWith("http")) {
      errors.push("PUBLIC_URL must start with http:// or https://");
    }

    if (this.config.localPort < 1 || this.config.localPort > 65535) {
      errors.push("PORT must be between 1 and 65535");
    }

    if (this.isUsingNgrok() && !this.config.publicUrl.startsWith("https://")) {
      errors.push("ngrok URLs should use HTTPS");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
export const ngrokConfig = new NgrokConfigManager();
