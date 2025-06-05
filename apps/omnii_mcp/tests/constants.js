/**
 * Shared constants for tests
 * Supports dynamic environment switching for localhost and production
 */

// API endpoints configuration
export const API_ENDPOINTS = {
  // Production URL
  PROD: "https://omniimcp-production.up.railway.app",
  // Local development URL  
  LOCAL: "http://localhost:8000",
};

// Environment detection and selection
// Set via environment variable: OMNII_TEST_ENV=PROD or OMNII_TEST_ENV=LOCAL
// Default to LOCAL for development
const TEST_ENV = process.env.OMNII_TEST_ENV || 'LOCAL';

export const API_BASE_URL = API_ENDPOINTS[TEST_ENV];
export const API_NEO4J_URL = `${API_BASE_URL}/api/neo4j`;
export const API_MCP_URL = `${API_BASE_URL}/mcp`;
export const API_N8N_MEMORY_URL = `${API_BASE_URL}/api/n8n-memory`;

// Test user ID (Supabase UUID format)
export const USER_ID = "cd9bdc60-35af-4bb6-b87e-1932e96fb354";

// n8n-specific test constants
export const N8N_TEST_CONFIG = {
  WORKFLOW_IDS: {
    CUSTOMER_SUPPORT: 'customer_support_test',
    BILLING_WORKFLOW: 'billing_automation',
    TECHNICAL_SUPPORT: 'tech_support_workflow',
    GENERAL_INQUIRY: 'general_inquiry_handler'
  },
  EXECUTION_TIMEOUT: 30000, // 30 seconds
  MEMORY_RETENTION_DAYS: 30,
  MAX_CONCEPTS_PER_SEARCH: 10
};

// Test queries for MCP and Neo4j tests
export const TEST_QUERIES = [
  "Tell me about artificial intelligence",
  "What is machine learning?", 
  "How does natural language processing work?",
  "Tell me about knowledge graphs",
  "Explain n8n workflow automation",
  "How does memory persistence work?"
];

// n8n workflow test scenarios
export const N8N_TEST_SCENARIOS = {
  CUSTOMER_SUPPORT: {
    type: 'customer_support',
    inquiries: [
      'I need help with my billing account',
      'My password is not working',
      'How do I cancel my subscription?',
      'Can you help me upgrade my plan?'
    ],
    expected_concepts: ['billing', 'authentication', 'subscription', 'upgrade'],
    min_satisfaction: 8.0
  },
  TECHNICAL_ISSUES: {
    type: 'technical_support',
    inquiries: [
      'The application is not loading',
      'I am getting an error message',
      'My data is not syncing properly',
      'The API is returning 500 errors'
    ],
    expected_concepts: ['troubleshooting', 'errors', 'sync', 'api_issues'],
    min_satisfaction: 7.5
  }
};

// Helper for colored console output
export const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bright: "\x1b[1m"
};

// Enhanced logging helper function
export function log(type, message) {
  const timestamp = new Date().toISOString().slice(11, 19);
  const env = TEST_ENV === 'PROD' ? '🌐 PROD' : '💻 LOCAL';

  switch (type) {
    case "info":
      console.log(
        `${colors.blue}[${timestamp}] [INFO] ${env}${colors.reset} ${message}`
      );
      break;
    case "success":
      console.log(
        `${colors.green}[${timestamp}] [SUCCESS] ${env}${colors.reset} ${message}`
      );
      break;
    case "error":
      console.error(
        `${colors.red}[${timestamp}] [ERROR] ${env}${colors.reset} ${message}`
      );
      break;
    case "context":
      console.log(
        `${colors.yellow}[${timestamp}] [CONTEXT] ${env}${colors.reset} ${message}`
      );
      break;
    case "mcp":
      console.log(
        `${colors.magenta}[${timestamp}] [MCP] ${env}${colors.reset} ${message}`
      );
      break;
    case "n8n":
      console.log(
        `${colors.cyan}[${timestamp}] [N8N] ${env}${colors.reset} ${message}`
      );
      break;
    case "result":
      console.log(
        `${colors.cyan}[${timestamp}] [RESULT] ${env}${colors.reset} ${message}`
      );
      break;
    case "warning":
      console.log(
        `${colors.yellow}[${timestamp}] [WARNING] ${env}${colors.reset} ${message}`
      );
      break;
    default:
      console.log(`${colors.gray}[${timestamp}] ${env}${colors.reset} ${message}`);
  }
}

// Environment info helper
export function logEnvironmentInfo() {
  log('info', '🔧 Test Environment Configuration');
  log('info', `   - Environment: ${TEST_ENV} (${TEST_ENV === 'PROD' ? 'Production' : 'Local Development'})`);
  log('info', `   - API Base URL: ${API_BASE_URL}`);
  log('info', `   - Neo4j API: ${API_NEO4J_URL}`);
  log('info', `   - n8n Memory API: ${API_N8N_MEMORY_URL}`);
  log('info', `   - Test User ID: ${USER_ID}`);
  log('info', `   - Switch environment with: OMNII_TEST_ENV=PROD or OMNII_TEST_ENV=LOCAL`);
}

// Validation helpers
export function validateTestEnvironment() {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL is not configured');
  }
  
  if (!USER_ID || USER_ID.length !== 36) {
    throw new Error('USER_ID must be a valid UUID');
  }
  
  log('success', `✅ Test environment validated: ${TEST_ENV}`);
}

// Export environment type for conditional logic
export const IS_PRODUCTION = TEST_ENV === 'PROD';
export const IS_LOCAL = TEST_ENV === 'LOCAL'; 