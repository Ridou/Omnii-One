/**
 * Entity Placeholder Constants
 */
export const ENTITY_PLACEHOLDER = {
  PREFIX: "{{ENTITY:",
  SUFFIX: "}}",
  PATTERN: /\{\{ENTITY:([a-z0-9\-]+)\}\}/i,
} as const;

/**
 * Helper to slugify a string for use in IDs
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Check if error is retryable (server issues, timeouts, etc.)
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const errorStr = error.toString().toLowerCase();

  // Composio server errors
  if (errorStr.includes("server unavailable")) return true;
  if (errorStr.includes("timeout")) return true;
  if (errorStr.includes("503")) return true;
  if (errorStr.includes("502")) return true;
  if (errorStr.includes("500")) return true;

  // Network errors
  if (errorStr.includes("network")) return true;
  if (errorStr.includes("connection")) return true;

  return false;
}

/**
 * Generate unique step ID
 */
export function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
