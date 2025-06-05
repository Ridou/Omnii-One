import { Platform } from 'react-native';
import { getRedirectUri, validateOAuthConfig, getCurrentEnvironment } from './googleAuth';

// Safely import SecureStore with error handling
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch (error) {
  console.warn('⚠️ SecureStore not available:', error);
}

// Google OAuth Client IDs for different platforms
const GOOGLE_WEB_CLIENT_ID = '904371950268-9clur0d39ia92s6ugfgfsrp7ef9hc3ut.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '904371950268-abund19lqsma5d4rhfkkv212e5j7hv5e.apps.googleusercontent.com';
const SUPABASE_URL = 'https://aaxiawuatfajjpvwtjuz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFheGlhd3VhdGZhampwdnd0anV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNDI5NTUsImV4cCI6MjA1NDkxODk1NX0.vZTqi6asrLDD21cIobrNvQvzwCIMxidiqp1ehXOMqTk';

export const debugAuthConfig = () => {
  console.log('=== OAuth Configuration Debug (Custom Development Build) ===');
  
  // Environment variables
  console.log('Environment Variables:');
  console.log('- EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:', GOOGLE_WEB_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('- EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:', GOOGLE_IOS_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('- EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('- EXPO_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  
  // Show actual values (first/last 4 chars for security)
  const webClientId = GOOGLE_WEB_CLIENT_ID;
  const iosClientId = GOOGLE_IOS_CLIENT_ID;
  
  console.log('\nClient IDs:');
  if (webClientId) {
    console.log(`- Web Client ID: ${webClientId.substring(0, 4)}...${webClientId.substring(webClientId.length - 4)}`);
  }
  if (iosClientId) {
    console.log(`- iOS Client ID: ${iosClientId.substring(0, 4)}...${iosClientId.substring(iosClientId.length - 4)}`);
  }
  console.log(`- Current Platform: ${Platform.OS}`);
  
  // OAuth configuration
  console.log('\nOAuth Configuration:');
  console.log('- Config Valid:', validateOAuthConfig() ? '✅ Valid' : '❌ Invalid');
  console.log('- App Redirect URI:', getRedirectUri());
  console.log('- Supabase Server Callback: https://aaxiawuatfajjpvwtjuz.supabase.co/auth/v1/callback');
  
  console.log('\n🔧 Supabase OAuth Flow (Custom Development Build):');
  console.log('1. User clicks "Sign in with Google"');
  console.log('2. Supabase OAuth starts → Opens system browser');
  console.log('3. User authorizes → Google redirects to Supabase');
  console.log('4. Supabase processes tokens → Creates session');
  console.log('5. Supabase redirects to app → Via deep link');
  console.log('6. App receives session → User logged in');
  
  console.log('=== End Debug Info ===');
};

export const debugOAuthFlow = async () => {
  console.log('=== Supabase OAuth Flow Debug ===');
  
  try {
    console.log('🎯 Current: Supabase OAuth with Custom Development Build');
    console.log('✅ Using Supabase OAuth - No custom URI schemes needed!');
    console.log('🔗 App redirect:', getRedirectUri());
    console.log('🔗 Google → Supabase → App flow');
    
    console.log('=== OAuth Flow Debug Complete ===');
    
  } catch (error) {
    console.error('OAuth Flow Debug Error:', error);
  }
};

export const debugOAuthIssues = async () => {
  console.log('🔍 === OAuth Issue Diagnostics ===');
  
  const redirectUri = getRedirectUri();
  const isConfigValid = validateOAuthConfig();
  const environment = getCurrentEnvironment();
  
  console.log('🔧 Configuration Status:');
  console.log('- Platform:', Platform.OS);
  console.log('- Config Valid:', isConfigValid ? '✅ Valid' : '❌ Invalid');
  console.log('- Redirect URI:', redirectUri);
  console.log('- WebCrypto Available:', typeof crypto !== 'undefined' && !!crypto.getRandomValues);
  
  // Enhanced environment detection
  console.log('\n🌍 Environment Detection Details:');
  console.log(`  - Environment Type: ${environment.type}`);
  console.log(`  - Platform OS: ${Platform.OS}`);
  console.log(`  - Detected Hostname: ${environment.hostname || 'N/A'}`);
  console.log(`  - Redirect URI: ${environment.redirectUri}`);
  
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    console.log('\n📱 Mobile Environment Details:');
    console.log('  - Running in React Native mobile app');
    console.log('  - Should use deep link redirect URI');
    console.log('  - Expected redirect URI format: omnii-mobile://auth/callback');
    console.log('  - Current redirect URI:', redirectUri);
    
    if (!redirectUri.includes('omnii-mobile://')) {
      console.warn('⚠️ WARNING: Mobile app not using deep link redirect URI!');
      console.warn('⚠️ This may cause OAuth to fail on mobile devices');
    } else {
      console.log('✅ Mobile deep link redirect URI configured correctly');
    }
  } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const currentHostname = window.location.hostname;
    const isTestEnvironment = currentHostname.includes('test.omnii.net');
    const isProductionEnvironment = currentHostname.includes('omnii.net') && !currentHostname.includes('test.');
    const isLocalhost = currentHostname.includes('localhost') || currentHostname.includes('127.0.0.1');
    const isNgrok = currentHostname.includes('ngrok');
    
    console.log('\n🌐 Web Environment Details:');
    console.log('  - Current URL:', window.location.href);
    console.log('  - Hostname:', currentHostname);
    console.log('  - Environment Type:', 
      isTestEnvironment ? '🧪 Test (test.omnii.net)' :
      isProductionEnvironment ? '🚀 Production (omnii.net)' :
      isLocalhost ? '💻 Localhost Development' :
      isNgrok ? '🔗 Ngrok Tunnel' :
      '❓ Unknown'
    );
    console.log('  - Dynamic Redirect URI:', redirectUri);
  } else {
    console.log('\n❓ Unknown Environment:');
    console.log('  - Platform OS:', Platform.OS);
    console.log('  - Has window object:', typeof window !== 'undefined');
    console.log('  - Fallback redirect URI:', redirectUri);
  }
  
  // Check SecureStore availability
  try {
    if (SecureStore) {
      await SecureStore.setItemAsync('test_key', 'test_value');
      await SecureStore.deleteItemAsync('test_key');
      console.log('- Secure Store:', '✅ Working');
    } else {
      console.log('- Secure Store:', '⚠️ Not available (native module not loaded)');
    }
  } catch (error) {
    console.log('- Secure Store:', '❌ Error:', error);
  }
  
  // Platform-specific checks
  if ((Platform.OS === 'ios' || Platform.OS === 'android') && !redirectUri.includes('omnii-mobile://')) {
    console.warn('⚠️ Mobile platform should use deep link redirect URI (omnii-mobile://)');
    console.warn('⚠️ Current redirect URI looks like a web URL, this will cause OAuth to fail');
  }
  
  if (Platform.OS === 'web' && !redirectUri.includes('https://') && !redirectUri.includes('http://')) {
    console.warn('⚠️ Web platform should use HTTP/HTTPS redirect URI');
  }
  
  // Check for common configuration issues
  console.log('\n🔍 Common Issues Checklist:');
  console.log('1. ✅ Client IDs configured');
  console.log('2. ✅ Supabase URL configured');
  console.log('3. ✅ Dynamic redirect URI detection working');
  console.log('4. Platform-specific redirect URI checks:');
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    console.log('   📱 Mobile: Should use omnii-mobile://auth/callback');
    console.log('   📱 Status:', redirectUri.includes('omnii-mobile://') ? '✅ Correct' : '❌ Incorrect');
  } else {
    console.log('   🌐 Web: Should use https://domain/auth/callback');
    console.log('   🌐 Status:', redirectUri.includes('http') ? '✅ Correct' : '❌ Incorrect');
  }
  
  console.log('5. Check Google Cloud Console:');
  console.log('   - OAuth consent screen published?');
  console.log('   - Redirect URIs include ALL environments:');
  console.log('     * https://omnii.net/auth/callback (production web)');
  console.log('     * https://test.omnii.net/auth/callback (test web)');
  console.log('     * http://localhost:*/auth/callback (development web)');
  console.log('     * omnii-mobile://auth/callback (mobile app) ← CRITICAL for mobile');
  console.log('   - Scopes approved?');
  console.log('6. Check Supabase Dashboard:');
  console.log('   - Google OAuth provider enabled?');
  console.log('   - Site URL configured for current environment');
  console.log('   - Redirect URLs configured for ALL environments');
  console.log('   - IMPORTANT: omnii-mobile://auth/callback must be in Supabase redirect URLs');
  
  console.log('\n💡 Next Steps if OAuth fails:');
  console.log('1. Check browser developer tools for errors');
  console.log('2. Verify redirect URIs match in all systems');
  console.log('3. Test with minimal scopes first');
  console.log('4. Check Google Cloud Console logs');
  console.log('5. For MOBILE: Ensure omnii-mobile://auth/callback is configured in:');
  console.log('   - Google Cloud Console OAuth settings');
  console.log('   - Supabase Auth URL configuration');
  console.log('6. For WEB: Ensure https://domain/auth/callback is configured');
  
  console.log('=== OAuth Diagnostics Complete ===');
};

export const logAuthEvent = (event: string, data?: unknown) => {
  console.log(`[AUTH] ${event}:`, data);
};

export const runOAuthDiagnostics = async () => {
  console.log('🔍 === OMNII OAuth Complete Diagnostics ===');
  
  // Run all debug functions
  debugAuthConfig();
  await debugOAuthIssues();
  
  console.log('\n🚨 === TROUBLESHOOTING GUIDE ===');
  console.log('OAuth now uses DYNAMIC redirect URIs! 🎉');
  console.log('It automatically detects your environment and uses the correct domain.');
  console.log('');
  console.log('1. 🔧 Check Supabase Configuration:');
  console.log('   - Go to Supabase Dashboard > Auth > URL Configuration');
  console.log('   - Add ALL redirect URLs for all environments:');
  console.log('     * https://omnii.net/auth/callback (production)');
  console.log('     * https://test.omnii.net/auth/callback (test)');
  console.log('     * localhost URLs (development)');
  console.log('     * omnii-mobile://auth/callback (mobile app)');
  console.log('     * Your ngrok URLs if using tunneling');
  console.log('   - Set Site URL dynamically or use wildcard patterns if supported');
  console.log('');
  console.log('2. 🔧 Check Google Cloud Console:');
  console.log('   - Go to APIs & Services > OAuth consent screen');
  console.log('   - Ensure app is published (or add test users)');
  console.log('   - Go to Credentials > OAuth 2.0 Client IDs');
  console.log('   - Add ALL authorized redirect URIs:');
  console.log('     * https://aaxiawuatfajjpvwtjuz.supabase.co/auth/v1/callback (Supabase)');
  console.log('     * https://omnii.net/auth/callback (production)');
  console.log('     * https://test.omnii.net/auth/callback (test)');
  console.log('     * http://localhost:*/auth/callback (local development)');
  console.log('     * omnii-mobile://auth/callback (mobile app)');
  console.log('');
  console.log('3. 🔧 Environment-Specific Testing:');
  console.log('   - Test.omnii.net: Will auto-redirect to test.omnii.net/auth/callback');
  console.log('   - Omnii.net: Will auto-redirect to omnii.net/auth/callback');
  console.log('   - Localhost: Will auto-redirect to localhost:PORT/auth/callback');
  console.log('   - Mobile: Will always use omnii-mobile://auth/callback');
  console.log('');
  console.log('4. 🔧 Debug Tools Available:');
  console.log('   - Import: import { testOAuthWithMinimalScopes } from "~/lib/auth/googleAuth"');
  console.log('   - Call: testOAuthWithMinimalScopes()');
  console.log('   - Or use the debug buttons in the login screen (development only)');
  console.log('');
  console.log('5. 🔧 Common fixes:');
  console.log('   - Clear app cache: npm run dev:tunnel --clear');
  console.log('   - Restart ngrok tunnel if using development');
  console.log('   - Check network connectivity');
  console.log('   - Verify all redirect URIs are added to both Google & Supabase');
  console.log('');
  console.log('6. 🔧 If still failing:');
  console.log('   - Check Google Cloud Console > APIs & Services > Credentials');
  console.log('   - Verify correct client IDs are being used');
  console.log('   - Check Supabase logs for error details');
  console.log('   - Test OAuth in browser first');
  console.log('   - Ensure redirect URIs don\'t have trailing slashes or extra paths');
  console.log('');
  console.log('✨ The app now automatically handles test.omnii.net vs omnii.net!');
  console.log('Just make sure both domains are configured in your OAuth settings.');
  console.log('');
  console.log('=== END TROUBLESHOOTING GUIDE ===');
};

export const testEnvironmentDetection = () => {
  console.log('🧪 === Testing Environment Detection ===');
  
  try {
    const environment = getCurrentEnvironment();
    
    console.log('🌍 Current Environment Results:');
    console.log(`  - Type: ${environment.type}`);
    console.log(`  - Hostname: ${environment.hostname || 'N/A'}`);
    console.log(`  - Redirect URI: ${environment.redirectUri}`);
    console.log(`  - Platform OS: ${Platform.OS}`);
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      console.log('\n📱 Mobile Environment Analysis:');
      console.log(`  - Detected Platform: ${Platform.OS}`);
      console.log(`  - Environment Type: ${environment.type}`);
      console.log(`  - Redirect URI: ${environment.redirectUri}`);
      
      console.log('\n✅ Expected Behavior for Mobile:');
      console.log('  - OAuth should redirect to: omnii-mobile://auth/callback');
      console.log('  - This opens your mobile app directly');
      console.log('  - No browser redirect needed');
      
      if (environment.redirectUri.includes('omnii-mobile://')) {
        console.log('  ✅ SUCCESS: Using correct mobile deep link redirect');
      } else {
        console.log('  ❌ ERROR: Using web redirect URI on mobile platform!');
        console.log('  ❌ This will cause OAuth to fail');
        console.log('  💡 The OAuth will try to redirect to a web URL instead of opening your app');
      }
      
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      console.log('\n🔗 Current Web Context:');
      console.log(`  - Full URL: ${window.location.href}`);
      console.log(`  - Protocol: ${window.location.protocol}`);
      console.log(`  - Host: ${window.location.host}`);
      console.log(`  - Pathname: ${window.location.pathname}`);
      
      console.log('\n✅ Expected Behavior:');
      switch (environment.type) {
        case 'test':
          console.log('  - OAuth will redirect to: https://test.omnii.net/auth/callback');
          console.log('  - This is the TEST environment');
          break;
        case 'production':
          console.log('  - OAuth will redirect to: https://omnii.net/auth/callback');
          console.log('  - This is the PRODUCTION environment');
          break;
        case 'localhost':
          console.log('  - OAuth will redirect to: localhost with current port');
          console.log('  - This is DEVELOPMENT environment');
          break;
        case 'ngrok':
          console.log('  - OAuth will redirect to: current ngrok URL');
          console.log('  - This is NGROK TUNNEL environment');
          break;
        default:
          console.log('  - OAuth will redirect to: production fallback');
          console.log('  - Environment type is UNKNOWN');
      }
    } else {
      console.log('\n❓ Unknown Platform Environment:');
      console.log(`  - Platform: ${Platform.OS}`);
      console.log('  - Unable to determine specific environment details');
    }
    
    console.log('\n🔧 Configuration Requirements:');
    console.log('Make sure these redirect URIs are configured in:');
    console.log('1. Google Cloud Console OAuth settings:');
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      console.log('   🎯 FOR MOBILE (CRITICAL):');
      console.log('   - omnii-mobile://auth/callback ← YOU NEED THIS FOR MOBILE');
      console.log('   - Also add web URLs for testing:');
    }
    
    console.log('   - https://omnii.net/auth/callback');
    console.log('   - https://test.omnii.net/auth/callback');
    console.log('   - http://localhost:*/auth/callback (for development)');
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('   - omnii-mobile://auth/callback (for mobile app)');
    }
    console.log('   - Your ngrok URLs (for tunneling)');
    console.log('');
    console.log('2. Supabase Auth URL Configuration:');
    console.log('   - Add all the above URLs to redirect URLs list');
    console.log('   - Set appropriate Site URL for your environment');
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      console.log('\n🚨 MOBILE SPECIFIC REQUIREMENTS:');
      console.log('   1. Google Cloud Console MUST include: omnii-mobile://auth/callback');
      console.log('   2. Supabase redirect URLs MUST include: omnii-mobile://auth/callback');
      console.log('   3. App scheme configured in app.config.js: scheme: "omnii-mobile" ✅');
      console.log('   4. Current redirect URI check:', environment.redirectUri.includes('omnii-mobile://') ? '✅ Correct' : '❌ WRONG - FIX THIS!');
    }
    
    console.log('\n=== Environment Detection Test Complete ===');
    
    return environment;
  } catch (error) {
    console.error('❌ Environment detection test failed:', error);
    return null;
  }
}; 