# OAuth Redirect URL Configuration

This system manages OAuth redirect URLs for all environments and platforms in the Omnii app.

## Quick Start

### 1. Supabase Configuration

Add these URLs to your Supabase project:

**Dashboard → Authentication → URL Configuration → Redirect URLs:**

```
https://omnii.net/auth/callback
https://omnii.net/auth/callback  
http://localhost:3000/auth/callback
http://localhost:8081/auth/callback
omnii-mobile://auth/callback
```

### 2. Usage in Code

```typescript
import { getOAuthRedirectUrl, handlePostOAuthNavigation } from './redirectConfig';

// Get the correct redirect URL for current environment
const redirectUrl = getOAuthRedirectUrl();

// After OAuth completes, navigate to final destination
await handlePostOAuthNavigation();
```

## How It Works

### OAuth Flow
1. **User clicks "Sign in with Google"**
2. **Supabase OAuth starts** → Opens system browser  
3. **User authorizes** → Google redirects to Supabase
4. **Supabase processes tokens** → Creates session
5. **Supabase redirects to app** → Via configured redirect URL
6. **App handles final navigation** → Web goes to `/approvals`, mobile handles internally

### Environment Detection

The system automatically detects:

- **Production Web**: `omnii.net` → redirects to `/approvals`
- **Staging Web**: `omnii.net` → redirects to `/approvals`  
- **Local Web**: `localhost:*` → redirects to `/approvals`
- **Mobile**: `omnii-mobile://` → handles internal routing

### URL Structure

```
OAuth Redirect URL: Where Supabase sends the user after OAuth
Final Destination: Where the user ultimately lands in your app

Web Example:
├── OAuth Redirect: https://omnii.net/auth/callback
└── Final Destination: https://omnii.net/approvals

Mobile Example:  
├── OAuth Redirect: omnii-mobile://auth/callback
└── Final Destination: (handled by app routing)
```

## Configuration Constants

### Environments
```typescript
export enum OAuthEnvironment {
  PRODUCTION = 'production',
  STAGING = 'staging', 
  LOCAL = 'local',
  MOBILE = 'mobile',
  UNKNOWN = 'unknown'
}
```

### Hosts
```typescript
export const OAUTH_HOSTS = {
  PRODUCTION: 'omnii.net',
  STAGING: 'omnii.net', 
  LOCAL: 'localhost',
  MOBILE_SCHEME: 'omnii-mobile'
} as const;
```

### Paths
```typescript
// OAuth callback paths (what Supabase expects)
export const OAUTH_CALLBACK_PATHS = {
  WEB: '/auth/callback',
  MOBILE: 'auth/callback'
} as const;

// Final destination paths (where users go after OAuth completes)
export const OAUTH_DESTINATION_PATHS = {
  WEB: '/approvals',
  MOBILE: '/' // Mobile handles routing internally
} as const;
```

## API Reference

### `getOAuthRedirectUrl(): string`
Returns the correct OAuth redirect URL for the current environment.

### `getFinalDestinationUrl(): string`
Returns where the user should be redirected after OAuth completes.

### `handlePostOAuthNavigation(): Promise<void>`
Automatically handles navigation to the final destination after OAuth.

### `getEnvironmentConfig(): EnvironmentConfig`
Returns detailed configuration for the current environment.

### `getSupabaseRedirectUrlsForConfig(): string[]`
Returns all URLs that should be added to Supabase configuration.

### `logSupabaseSetupInstructions(): void`
Logs setup instructions to the console (useful in development).

## Troubleshooting

### "Redirect URL not allowed" Error
- Check that all URLs are added to Supabase Dashboard
- Verify the URL matches exactly (including protocol and path)
- Clear browser cache and try again

### Mobile Deep Link Not Working
- Ensure `omnii-mobile://auth/callback` is in Supabase config
- Check that the mobile app is properly registered for the deep link scheme
- Test the deep link independently: `omnii-mobile://auth/callback`

### Wrong Environment Detected
- Check the `getEnvironmentConfig()` output in console
- Verify hostname/URL matches expected patterns
- Add custom environment detection if needed 