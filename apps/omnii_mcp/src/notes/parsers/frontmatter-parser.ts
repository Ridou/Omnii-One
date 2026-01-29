/**
 * Frontmatter Parser
 *
 * Extracts and parses YAML frontmatter from note content.
 * Uses gray-matter for robust parsing of edge cases.
 *
 * Frontmatter format:
 * ---
 * key: value
 * nested:
 *   child: value
 * ---
 * Content starts here...
 */

import matter from 'gray-matter';

/**
 * Result from parsing frontmatter
 */
export interface FrontmatterResult {
  /** Parsed frontmatter as object */
  data: Record<string, unknown>;
  /** Content without frontmatter */
  content: string;
  /** Whether frontmatter was present */
  hasFrontmatter: boolean;
  /** Original frontmatter string (for round-tripping) */
  originalFrontmatter?: string;
}

/**
 * Parse frontmatter from note content.
 *
 * Extracts YAML frontmatter (between --- delimiters) and returns
 * both the parsed data and remaining content.
 *
 * @param noteContent - Full note content with optional frontmatter
 * @returns Parsed frontmatter and content
 *
 * @example
 * parseFrontmatter(`---
 * type: meeting-notes
 * date: 2026-01-29
 * ---
 * # Meeting Notes
 * Content here...`)
 * // Returns:
 * // {
 * //   data: { type: "meeting-notes", date: "2026-01-29" },
 * //   content: "# Meeting Notes\nContent here...",
 * //   hasFrontmatter: true
 * // }
 */
export function parseFrontmatter(noteContent: string): FrontmatterResult {
  try {
    const result = matter(noteContent);

    // Check if there was actual frontmatter
    const hasFrontmatter = Object.keys(result.data).length > 0;

    // Extract original frontmatter for round-tripping
    let originalFrontmatter: string | undefined;
    if (hasFrontmatter) {
      const match = noteContent.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        originalFrontmatter = match[1];
      }
    }

    return {
      data: result.data,
      content: result.content.trim(),
      hasFrontmatter,
      originalFrontmatter,
    };
  } catch (error) {
    // If parsing fails, return content as-is with empty data
    console.warn('Frontmatter parsing failed:', error);
    return {
      data: {},
      content: noteContent,
      hasFrontmatter: false,
    };
  }
}

/**
 * Create note content with frontmatter.
 *
 * Combines frontmatter data with content into a valid note string.
 *
 * @param data - Frontmatter object
 * @param content - Markdown content
 * @returns Combined string with YAML frontmatter
 */
export function stringifyFrontmatter(
  data: Record<string, unknown>,
  content: string
): string {
  if (Object.keys(data).length === 0) {
    return content;
  }

  return matter.stringify(content, data);
}

/**
 * Update frontmatter while preserving content.
 *
 * @param noteContent - Existing note content
 * @param updates - Fields to add/update in frontmatter
 * @returns Updated note content
 */
export function updateFrontmatter(
  noteContent: string,
  updates: Record<string, unknown>
): string {
  const parsed = parseFrontmatter(noteContent);
  const mergedData = { ...parsed.data, ...updates };
  return stringifyFrontmatter(mergedData, parsed.content);
}

/**
 * Remove frontmatter from content.
 *
 * @param noteContent - Note content with potential frontmatter
 * @returns Content without frontmatter
 */
export function removeFrontmatter(noteContent: string): string {
  const parsed = parseFrontmatter(noteContent);
  return parsed.content;
}

/**
 * Check if content has frontmatter.
 *
 * @param noteContent - Note content to check
 * @returns True if frontmatter present
 */
export function hasFrontmatter(noteContent: string): boolean {
  return noteContent.trimStart().startsWith('---');
}

/**
 * Get specific frontmatter field.
 *
 * @param noteContent - Note content
 * @param field - Field name to extract
 * @returns Field value or undefined
 */
export function getFrontmatterField<T = unknown>(
  noteContent: string,
  field: string
): T | undefined {
  const parsed = parseFrontmatter(noteContent);
  return parsed.data[field] as T | undefined;
}

/**
 * Validate frontmatter has required fields.
 *
 * @param noteContent - Note content
 * @param requiredFields - Array of required field names
 * @returns Object with valid flag and missing fields
 */
export function validateFrontmatter(
  noteContent: string,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const parsed = parseFrontmatter(noteContent);
  const missingFields = requiredFields.filter(
    (field) => !(field in parsed.data)
  );

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
