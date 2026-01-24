// Google OAuth Scopes for Omnii App
export const GOOGLE_SCOPES = {
  // Basic Identity (always required)
  IDENTITY: [
    'openid',
    'profile', 
    'email',
  ],

  // Gmail - Full access to email
  GMAIL: [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
  ],

  // Google Drive - Full file access
  DRIVE: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
  ],

  // Google Calendar - Full calendar access
  CALENDAR: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],

  // Google Contacts - Full contact access
  CONTACTS: [
    'https://www.googleapis.com/auth/contacts',
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/contacts.other.readonly',
  ],

  // Google Sheets - Full spreadsheet access
  SHEETS: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],

  // Google Tasks - Full task management
  TASKS: [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/tasks.readonly',
  ],
} as const;

// Get all scopes as a flat array
export const getAllScopes = (): string[] => {
  return Object.values(GOOGLE_SCOPES).flat();
};

// Get specific service scopes
export const getServiceScopes = (services: (keyof typeof GOOGLE_SCOPES)[]): string[] => {
  return services.flatMap(service => GOOGLE_SCOPES[service]);
}; 