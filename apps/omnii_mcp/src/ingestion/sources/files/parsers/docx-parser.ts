/**
 * Word Document Parser
 *
 * Extracts text from .docx files using mammoth.
 * Includes confidence scoring based on extraction warnings.
 */

import mammoth from 'mammoth';
import type { ParseResult } from '../types';

/**
 * Parse Word document and extract text content.
 *
 * @param buffer - DOCX file content as ArrayBuffer
 * @returns ParseResult with extracted text and confidence score
 */
export async function parseDOCX(buffer: ArrayBuffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(buffer),
    });

    // Mammoth reports warnings for elements it couldn't handle
    const warnings = result.messages.map((m) => m.message);
    const hasWarnings = warnings.length > 0;

    // Base confidence on warning count
    let confidence = 0.95;
    if (hasWarnings) {
      // Reduce confidence based on warning severity
      const warningPenalty = Math.min(0.25, warnings.length * 0.05);
      confidence -= warningPenalty;
    }

    return {
      text: result.value.trim(),
      metadata: {
        warnings,
        format: 'docx',
      },
      confidence,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`DOCX parsing failed: ${message}`);
  }
}
