/**
 * Parser Factory
 *
 * Routes files to the appropriate parser based on detected type.
 */

import { parsePDF } from './pdf-parser';
import { parseDOCX } from './docx-parser';
import { parseText, parseMarkdown, parseCode } from './text-parser';
import type { ParseResult, SupportedFileType } from '../types';

/**
 * Parse a file using the appropriate parser for its type.
 *
 * @param buffer - File content as ArrayBuffer
 * @param fileType - Detected file type from validation
 * @returns ParseResult with extracted text and confidence
 */
export async function parseFile(
  buffer: ArrayBuffer,
  fileType: SupportedFileType
): Promise<ParseResult> {
  switch (fileType) {
    case 'pdf':
      return parsePDF(buffer);
    case 'docx':
      return parseDOCX(buffer);
    case 'txt':
      return parseText(buffer);
    case 'md':
      return parseMarkdown(buffer);
    case 'code':
      return parseCode(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// Re-export individual parsers for direct use
export { parsePDF } from './pdf-parser';
export { parseDOCX } from './docx-parser';
export { parseText, parseMarkdown, parseCode } from './text-parser';
