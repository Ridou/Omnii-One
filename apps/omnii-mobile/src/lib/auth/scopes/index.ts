export { GOOGLE_SCOPES, getAllScopes, getServiceScopes } from './googleScopes';

// 🍎 APPLE APP STORE CONFIGURATION + FULL GOOGLE OAUTH SCOPES
// All scopes enabled for complete Google integration functionality

// Get scopes for current deployment phase
export const getOmniiScopes = (): string[] => {
  return [
    // ✅ Identity - Always safe, no approval needed
    'openid',
    'profile', 
    'email',
    
    // ✅ Basic Gmail - Read emails only, no approval needed
    'https://www.googleapis.com/auth/gmail.readonly',
    
    // ✅ Basic Calendar - Read calendar only, no approval needed  
    'https://www.googleapis.com/auth/calendar.readonly',
    
    // 🔓 CORE PRODUCTIVITY SCOPES - ENABLED
    // Gmail, Calendar, Contacts, Tasks - essential for AI assistant
    
    // Gmail - Full access (requires Google approval)
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    
    // Calendar - Full access (requires Google approval)
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    
    // Contacts - Full access (requires Google approval)
    // Using modern People API instead of deprecated m8/feeds scope
    'https://www.googleapis.com/auth/contacts',
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/contacts.other.readonly', // Essential for other_contacts: true - accesses contacts auto-saved from Gmail interactions
    
    // Tasks - Full access (requires Google approval)
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/tasks.readonly',
    
    // 🚫 DRIVE & SHEETS SCOPES - DISABLED FOR FASTER APPROVAL
    // Uncomment these after core verification completes
    /*
    
    // Drive - File metadata only (basic)
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    
    // Drive - Full access (requires Google approval)
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    
    // Sheets - Full access (requires Google approval)
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    
    */
  ];
};

// Get scopes as a space-separated string for Supabase providerScopes
export const getOmniiScopesString = (): string => {
  return getOmniiScopes().join(' ');
};

// 📊 Current scope information
export const getCurrentScopeInfo = () => {
  const scopes = getOmniiScopes();
  console.log('🔍 Current OAuth Scope Configuration:');
  console.log(`📊 Total active scopes: ${scopes.length}`);
  console.log('🔓 Mode: Core Productivity Scopes (Gmail + Calendar + Contacts + Tasks)');
  console.log('✅ Services available:');
  console.log('  - Gmail: Full access (read, compose, send, modify, labels)');
  console.log('  - Calendar: Full access (read, create, edit events)');
  console.log('  - Contacts: Full access via People API (read, modify contacts + Other contacts)');
  console.log('  - Tasks: Full access (read, write tasks)');
  console.log('🚫 Services disabled for faster approval:');
  console.log('  - Drive: Commented out (enable after core approval)');
  console.log('  - Sheets: Commented out (enable after core approval)');
  console.log('');
  console.log('⚠️ Note: Current scopes require Google OAuth verification');
  console.log('📝 Status: Verification in progress (4-6 weeks)');
  console.log('🧪 Workaround: Add Apple reviewers as test users in Google Cloud Console');
  console.log('');
  console.log('💡 To enable Drive & Sheets later:');
  console.log('   1. Uncomment the /* DRIVE & SHEETS */ section in scopes/index.ts');
  console.log('   2. Update Supabase OAuth scopes configuration');
  console.log('   3. Request additional Google verification if needed');
  
  return {
    total: scopes.length,
    mode: 'core-productivity-scopes',
    scopes
  };
};

// Log the scope string for easy copy-paste to Supabase dashboard
export const logSupabaseScopeString = (): void => {
  const scopeString = getOmniiScopesString();
  console.log('📋 Supabase Google OAuth Scopes Configuration:');
  console.log('Use this string in your signInWithOAuth providerScopes:');
  console.log('');
  console.log(`scopes: '${scopeString}'`);
  console.log('');
  getCurrentScopeInfo();
}; 