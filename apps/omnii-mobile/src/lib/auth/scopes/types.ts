import type { GOOGLE_SCOPES } from './googleScopes';

export type GoogleService = keyof typeof GOOGLE_SCOPES;

export type ScopeConfig = {
  services: GoogleService[];
  includeAll?: boolean;
};

export interface GoogleScopeInfo {
  service: GoogleService;
  scopes: string[];
  description: string;
  required: boolean;
} 