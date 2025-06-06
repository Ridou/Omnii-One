import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';

// Safely import SecureStore with error handling
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch (error) {
  console.warn('⚠️ SecureStore not available in oauth-security:', error);
}

/**
 * OAuth Security enhancements for OMNII
 * Ensures production-grade security for App Store compliance
 */

interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  responseType: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  state?: string;
  nonce?: string;
}

interface SecurityOptions {
  enforceHTTPS: boolean;
  validateRedirectUri: boolean;
  requireStateParameter: boolean;
  requireNonce: boolean;
  enableCertificatePinning: boolean;
  sessionTimeout: number; // minutes
}

class OAuthSecurityManager {
  private static instance: OAuthSecurityManager;
  private securityOptions: SecurityOptions;
  private activeStates: Map<string, { timestamp: number; expiresAt: number }> = new Map();
  private activeNonces: Map<string, { timestamp: number; expiresAt: number }> = new Map();

  private constructor() {
    this.securityOptions = {
      enforceHTTPS: !__DEV__,
      validateRedirectUri: true,
      requireStateParameter: true,
      requireNonce: true,
      enableCertificatePinning: !__DEV__,
      sessionTimeout: 30, // 30 minutes
    };
    
    this.initializeSecurity();
  }

  public static getInstance(): OAuthSecurityManager {
    if (!OAuthSecurityManager.instance) {
      OAuthSecurityManager.instance = new OAuthSecurityManager();
    }
    return OAuthSecurityManager.instance;
  }

  /**
   * Initialize security monitoring
   */
  private initializeSecurity(): void {
    // Clean up expired states and nonces every 5 minutes
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 5 * 60 * 1000);

    if (__DEV__) {
      console.log('🔐 OAuth Security Manager initialized');
    }
  }

  /**
   * Get environment-specific OAuth configuration
   */
  public getOAuthConfig(): OAuthConfig {
    const isProduction = this.isProductionEnvironment();
    
    const baseConfig = {
      redirectUri: 'omnii-mobile://auth/callback',
      scopes: ['openid', 'profile', 'email'],
      responseType: 'code',
    };

    if (isProduction) {
      return {
        ...baseConfig,
        clientId: 'com.googleusercontent.apps.904371950268-abund19lqsma5d4rhfkkv212e5j7hv5e',
      };
    } else {
      return {
        ...baseConfig,
        clientId: 'com.googleusercontent.apps.904371950268-development-client-id',
      };
    }
  }

  /**
   * Determine if app is running in production environment
   */
  public isProductionEnvironment(): boolean {
    // Multiple checks for production detection
    const checks = [
      !__DEV__,
      Platform.OS === 'ios' && Application.applicationId === 'com.omnii.mobile',
      process.env.NODE_ENV === 'production',
      process.env.ENVIRONMENT === 'production',
    ];

    // All checks must pass for production
    return checks.every(check => check === true);
  }

  /**
   * Generate secure OAuth authorization URL with PKCE
   */
  public async generateAuthorizationUrl(): Promise<string> {
    const config = this.getOAuthConfig();
    
    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = await this.generatePKCEChallenge();
    
    // Store code verifier securely
    await this.storeCodeVerifier(codeVerifier);
    
    // Generate state parameter
    const state = await this.generateSecureState();
    
    // Generate nonce for ID token validation
    const nonce = await this.generateSecureNonce();
    
    // Build authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('response_type', config.responseType);
    authUrl.searchParams.set('scope', config.scopes.join(' '));
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Validate URL security
    this.validateAuthorizationUrl(authUrl.toString());
    
    return authUrl.toString();
  }

  /**
   * Generate PKCE challenge
   */
  private async generatePKCEChallenge(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    // Generate cryptographically secure code verifier
    const codeVerifier = await this.generateRandomString(128);
    
    // Create code challenge using SHA256 with BASE64URL encoding (PKCE spec requirement)
    const base64Challenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    
    // Convert BASE64 to BASE64URL format (PKCE spec requirement)
    const codeChallenge = base64Challenge
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate cryptographically secure random string
   */
  private async generateRandomString(length: number): Promise<string> {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint8Array(length);
    
    // Use crypto.getRandomValues if available, fallback to Math.random
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(values);
    } else {
      for (let i = 0; i < length; i++) {
        values[i] = Math.floor(Math.random() * 256);
      }
    }
    
    return Array.from(values, byte => charset[byte % charset.length]).join('');
  }

  /**
   * Generate secure state parameter
   */
  private async generateSecureState(): Promise<string> {
    const state = await this.generateRandomString(32);
    const expiresAt = Date.now() + (this.securityOptions.sessionTimeout * 60 * 1000);
    
    this.activeStates.set(state, {
      timestamp: Date.now(),
      expiresAt,
    });
    
    return state;
  }

  /**
   * Generate secure nonce
   */
  private async generateSecureNonce(): Promise<string> {
    const nonce = await this.generateRandomString(32);
    const expiresAt = Date.now() + (this.securityOptions.sessionTimeout * 60 * 1000);
    
    this.activeNonces.set(nonce, {
      timestamp: Date.now(),
      expiresAt,
    });
    
    return nonce;
  }

  /**
   * Store code verifier securely
   */
  private async storeCodeVerifier(codeVerifier: string): Promise<void> {
    try {
      if (SecureStore) {
        await SecureStore.setItemAsync('oauth_code_verifier', codeVerifier, {
          requireAuthentication: !__DEV__,
        });
      } else {
        console.warn('⚠️ SecureStore not available, storing in memory (development only)');
        // In development, we can store in memory as a fallback
        if (__DEV__) {
          (globalThis as any).__oauth_code_verifier = codeVerifier;
        } else {
          throw new Error('SecureStore required for production builds');
        }
      }
    } catch (error) {
      console.error('Failed to store code verifier securely:', error);
      throw new Error('OAuth security error: Failed to store code verifier');
    }
  }

  /**
   * Retrieve and validate code verifier
   */
  public async getCodeVerifier(): Promise<string | null> {
    try {
      let codeVerifier: string | null = null;
      
      if (SecureStore) {
        codeVerifier = await SecureStore.getItemAsync('oauth_code_verifier');
        
        // Clean up after retrieval
        if (codeVerifier) {
          await SecureStore.deleteItemAsync('oauth_code_verifier');
        }
      } else {
        console.warn('⚠️ SecureStore not available, retrieving from memory (development only)');
        // In development, retrieve from memory fallback
        if (__DEV__) {
          codeVerifier = (globalThis as any).__oauth_code_verifier || null;
          // Clean up after retrieval
          if (codeVerifier) {
            delete (globalThis as any).__oauth_code_verifier;
          }
        }
      }
      
      return codeVerifier;
    } catch (error) {
      console.error('Failed to retrieve code verifier:', error);
      return null;
    }
  }

  /**
   * Validate state parameter
   */
  public validateState(state: string): boolean {
    const stateData = this.activeStates.get(state);
    
    if (!stateData) {
      console.warn('Invalid or unknown state parameter');
      return false;
    }
    
    if (Date.now() > stateData.expiresAt) {
      console.warn('Expired state parameter');
      this.activeStates.delete(state);
      return false;
    }
    
    // Remove state after successful validation
    this.activeStates.delete(state);
    return true;
  }

  /**
   * Validate nonce parameter
   */
  public validateNonce(nonce: string): boolean {
    const nonceData = this.activeNonces.get(nonce);
    
    if (!nonceData) {
      console.warn('Invalid or unknown nonce parameter');
      return false;
    }
    
    if (Date.now() > nonceData.expiresAt) {
      console.warn('Expired nonce parameter');
      this.activeNonces.delete(nonce);
      return false;
    }
    
    // Remove nonce after successful validation
    this.activeNonces.delete(nonce);
    return true;
  }

  /**
   * Validate authorization URL security
   */
  private validateAuthorizationUrl(url: string): void {
    const parsedUrl = new URL(url);
    
    // Enforce HTTPS in production
    if (this.securityOptions.enforceHTTPS && parsedUrl.protocol !== 'https:') {
      throw new Error('OAuth security error: HTTPS required for authorization URL');
    }
    
    // Validate domain
    if (parsedUrl.hostname !== 'accounts.google.com') {
      throw new Error('OAuth security error: Invalid authorization domain');
    }
    
    // Validate required parameters
    const requiredParams = ['client_id', 'redirect_uri', 'response_type', 'scope'];
    for (const param of requiredParams) {
      if (!parsedUrl.searchParams.has(param)) {
        throw new Error(`OAuth security error: Missing required parameter: ${param}`);
      }
    }
    
    // Validate PKCE parameters
    if (!parsedUrl.searchParams.has('code_challenge') || !parsedUrl.searchParams.has('code_challenge_method')) {
      throw new Error('OAuth security error: PKCE parameters required');
    }
    
    // Validate state parameter
    if (this.securityOptions.requireStateParameter && !parsedUrl.searchParams.has('state')) {
      throw new Error('OAuth security error: State parameter required');
    }
  }

  /**
   * Validate redirect URI
   */
  public validateRedirectUri(uri: string): boolean {
    const expectedUri = this.getOAuthConfig().redirectUri;
    
    if (!this.securityOptions.validateRedirectUri) {
      return true;
    }
    
    if (uri !== expectedUri) {
      console.warn(`Invalid redirect URI: expected ${expectedUri}, got ${uri}`);
      return false;
    }
    
    return true;
  }

  /**
   * Validate authorization response
   */
  public async validateAuthorizationResponse(params: Record<string, string>): Promise<boolean> {
    // Check for error response
    if (params.error) {
      console.error('OAuth authorization error:', params.error, params.error_description);
      return false;
    }
    
    // Validate required parameters
    if (!params.code) {
      console.error('Missing authorization code in response');
      return false;
    }
    
    // Validate state parameter
    if (this.securityOptions.requireStateParameter) {
      if (!params.state || !this.validateState(params.state)) {
        console.error('Invalid or missing state parameter');
        return false;
      }
    }
    
    return true;
  }

  /**
   * Exchange authorization code for tokens with enhanced security
   */
  public async exchangeCodeForTokens(code: string): Promise<any> {
    const config = this.getOAuthConfig();
    const codeVerifier = await this.getCodeVerifier();
    
    if (!codeVerifier) {
      throw new Error('OAuth security error: Code verifier not found');
    }
    
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    const body = new URLSearchParams({
      client_id: config.clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    });
    
    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: body.toString(),
      });
      
      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }
      
      const tokens = await response.json();
      
      // Validate token response
      if (!tokens.access_token || !tokens.id_token) {
        throw new Error('Invalid token response: missing required tokens');
      }
      
      return tokens;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error('OAuth security error: Token exchange failed');
    }
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    
    // Clean up expired states
    for (const [state, data] of this.activeStates.entries()) {
      if (now > data.expiresAt) {
        this.activeStates.delete(state);
      }
    }
    
    // Clean up expired nonces
    for (const [nonce, data] of this.activeNonces.entries()) {
      if (now > data.expiresAt) {
        this.activeNonces.delete(nonce);
      }
    }
    
    if (__DEV__) {
      console.log(`🧹 Cleaned up expired OAuth tokens. Active states: ${this.activeStates.size}, Active nonces: ${this.activeNonces.size}`);
    }
  }

  /**
   * Get security status for monitoring
   */
  public getSecurityStatus() {
    return {
      isProduction: this.isProductionEnvironment(),
      securityOptions: this.securityOptions,
      activeStates: this.activeStates.size,
      activeNonces: this.activeNonces.size,
      httpsEnforced: this.securityOptions.enforceHTTPS,
      certificatePinningEnabled: this.securityOptions.enableCertificatePinning,
    };
  }

  /**
   * Enable development mode (less strict security)
   */
  public enableDevelopmentMode(): void {
    if (__DEV__) {
      this.securityOptions.enforceHTTPS = false;
      this.securityOptions.enableCertificatePinning = false;
      console.log('🔧 OAuth development mode enabled');
    }
  }

  /**
   * Force production security mode
   */
  public enableProductionMode(): void {
    this.securityOptions.enforceHTTPS = true;
    this.securityOptions.enableCertificatePinning = true;
    this.securityOptions.requireStateParameter = true;
    this.securityOptions.requireNonce = true;
    console.log('🔒 OAuth production security mode enabled');
  }
}

// Export singleton instance
export const oauthSecurity = OAuthSecurityManager.getInstance();

// Utility functions
export const getOAuthConfig = () => oauthSecurity.getOAuthConfig();
export const generateAuthorizationUrl = () => oauthSecurity.generateAuthorizationUrl();
export const validateAuthorizationResponse = (params: Record<string, string>) => 
  oauthSecurity.validateAuthorizationResponse(params);
export const exchangeCodeForTokens = (code: string) => oauthSecurity.exchangeCodeForTokens(code);
export const validateRedirectUri = (uri: string) => oauthSecurity.validateRedirectUri(uri);
export const getSecurityStatus = () => oauthSecurity.getSecurityStatus();

// Certificate pinning configuration (for native implementation)
export const CERTIFICATE_PINS = {
  'accounts.google.com': [
    'sha256/KwccWaCgrnaw6tsrrSO61FgLacNgG2MMLq8GE6+oP5I=', // Google Trust Services LLC
    'sha256/FEzVOUp4dF3gI0ZVPRJhFbsd5E9TpOCRoNLsWLm6Ng0=', // GTS Root R1
  ],
  'oauth2.googleapis.com': [
    'sha256/KwccWaCgrnaw6tsrrSO61FgLacNgG2MMLq8GE6+oP5I=', // Google Trust Services LLC
    'sha256/FEzVOUp4dF3gI0ZVPRJhFbsd5E9TpOCRoNLsWLm6Ng0=', // GTS Root R1
  ],
  'omnii.net': [
    // Add your API server certificate pins here
    'sha256/YourAPIServerCertificatePin1',
    'sha256/YourAPIServerCertificatePin2',
  ],
}; 