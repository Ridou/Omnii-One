import { GOOGLE_SCOPES, getAllScopes } from './googleScopes';


export const debugScopes = () => {
  console.log('🔍 Google OAuth Scopes Debug');
  console.log('📋 Available Services:', Object.keys(GOOGLE_SCOPES));
  console.log('📝 Total Scopes:', getAllScopes().length);
  
  // Log each service and its scopes
  for (const [service, scopes] of Object.entries(GOOGLE_SCOPES)) {
    console.log(`\n${service}:`);
    for (const scope of scopes) {
      console.log(`  - ${scope}`);
    }
  }
  
  console.log('\n✅ Scope debugging complete');
}; 