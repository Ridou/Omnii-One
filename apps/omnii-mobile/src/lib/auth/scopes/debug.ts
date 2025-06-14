import { GOOGLE_SCOPES, getAllScopes } from './googleScopes';


export const debugScopes = () => {
  
  // Log each service and its scopes
  for (const [service, scopes] of Object.entries(GOOGLE_SCOPES)) {
    for (const scope of scopes) {
    }
  }
  
}; 