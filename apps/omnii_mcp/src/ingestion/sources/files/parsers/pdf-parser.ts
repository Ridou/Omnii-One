/**
 * PDF Parser
 *
 * Extracts text from PDF documents using unpdf (PDF.js-based).
 * Includes confidence scoring for extraction quality.
 */

import { extractText, getDocumentProxy } from 'unpdf';
import type { ParseResult } from '../types';

/**
 * Parse PDF file and extract text content.
 *
 * @param buffer - PDF file content as ArrayBuffer
 * @returns ParseResult with extracted text and confidence score
 */
export async function parsePDF(buffer: ArrayBuffer): Promise<ParseResult> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    // Calculate confidence based on extraction quality heuristics
    const confidence = calculatePDFConfidence(text, totalPages);

    return {
      text: text.trim(),
      metadata: {
        totalPages,
        format: 'pdf',
      },
      confidence,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`PDF parsing failed: ${message}`);
  }
}

/**
 * Calculate confidence score for PDF extraction.
 *
 * Heuristics:
 * - Very low char/page ratio suggests scanned/image PDF (OCR not supported)
 * - Replacement characters suggest encoding issues
 * - Sparse content may indicate partial extraction
 */
function calculatePDFConfidence(text: string, totalPages: number): number {
  if (totalPages === 0) {
    return 0;
  }

  const avgCharsPerPage = text.length / totalPages;

  // Red flags that reduce confidence
  let confidence = 0.95;

  // Very low character count - likely scanned/image PDF
  if (avgCharsPerPage < 50) {
    confidence = 0.3; // Likely needs OCR (not supported)
  } else if (avgCharsPerPage < 200) {
    confidence = 0.7; // Sparse content, may be incomplete
  }

  // Replacement character (U+FFFD) indicates encoding issues
  const replacementCount = (text.match(/\ufffd/g) || []).length;
  if (replacementCount > 0) {
    const replacementRatio = replacementCount / text.length;
    confidence *= (1 - Math.min(0.5, replacementRatio * 10));
  }

  // Excessive whitespace ratio suggests layout extraction issues
  const whitespaceRatio = (text.match(/\s/g) || []).length / text.length;
  if (whitespaceRatio > 0.5) {
    confidence *= 0.9;
  }

  return Math.max(0.1, Math.min(1, confidence));
}
