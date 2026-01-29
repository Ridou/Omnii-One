/**
 * Extraction Quality Scorer
 *
 * Calculates confidence metrics for document extraction.
 * Critical for FILE-04: Flag low-confidence extractions for review.
 *
 * Research finding: File parsing achieves only 50-70% accuracy "out of the box".
 * Quality scoring is mandatory from day one to prevent silent failures.
 *
 * Threshold: Extractions below 0.8 confidence are flagged for human review.
 */

import type { ParseResult, QualityMetrics, SupportedFileType } from './types';

/** Confidence threshold below which extraction needs human review */
export const REVIEW_THRESHOLD = 0.8;

/** Minimum expected text density (chars per KB of file) */
const MIN_TEXT_DENSITY: Record<SupportedFileType, number> = {
  pdf: 50,    // PDFs can have images, lower threshold
  docx: 100,  // Word docs should have decent text
  txt: 500,   // Text files should be very dense
  md: 300,    // Markdown has some markup overhead
  code: 200,  // Code has whitespace, comments
};

/**
 * Score extraction quality using multiple heuristics.
 *
 * Combines parser confidence with additional checks:
 * - Text density (text length vs file size)
 * - Encoding issues (replacement characters)
 * - Parser-specific warnings
 *
 * @param parsed - Parse result from file parser
 * @param fileSize - Original file size in bytes
 * @param fileType - Detected file type
 * @returns QualityMetrics with confidence and needsReview flag
 */
export function scoreExtraction(
  parsed: ParseResult,
  fileSize: number,
  fileType: SupportedFileType
): QualityMetrics {
  const warnings: string[] = [];
  let confidence = parsed.confidence;

  // Factor 1: Text density (text length relative to file size)
  const textDensity = (parsed.text.length * 1024) / fileSize; // chars per KB
  const expectedDensity = MIN_TEXT_DENSITY[fileType];

  if (textDensity < expectedDensity * 0.5) {
    warnings.push(`Low text density: ${textDensity.toFixed(0)} chars/KB (expected: ${expectedDensity}+)`);
    confidence *= 0.7;
  } else if (textDensity < expectedDensity) {
    warnings.push(`Below average text density: ${textDensity.toFixed(0)} chars/KB`);
    confidence *= 0.9;
  }

  // Factor 2: Encoding issues (replacement characters)
  const replacementCount = (parsed.text.match(/\ufffd/g) || []).length;
  if (replacementCount > 0) {
    const ratio = replacementCount / parsed.text.length;
    if (ratio > 0.01) {
      warnings.push(`Encoding issues: ${replacementCount} replacement characters found`);
      confidence *= 0.8;
    } else {
      warnings.push(`Minor encoding issues: ${replacementCount} replacement characters`);
      confidence *= 0.95;
    }
  }

  // Factor 3: Parser warnings (from metadata)
  if (parsed.metadata.warnings && parsed.metadata.warnings.length > 0) {
    warnings.push(...parsed.metadata.warnings);
    // Already factored into parser confidence, but log for visibility
  }

  // Factor 4: Very short extracted text
  if (parsed.text.length < 100) {
    warnings.push(`Very short extraction: only ${parsed.text.length} characters`);
    confidence *= 0.6;
  }

  // Factor 5: Excessive whitespace
  const whitespaceRatio = (parsed.text.match(/\s/g) || []).length / parsed.text.length;
  if (whitespaceRatio > 0.6) {
    warnings.push(`High whitespace ratio: ${(whitespaceRatio * 100).toFixed(0)}%`);
    confidence *= 0.85;
  }

  // Clamp confidence to valid range
  confidence = Math.max(0.1, Math.min(1, confidence));

  // Estimate completeness based on text density
  const completeness = Math.min(1, textDensity / (expectedDensity * 1.5));

  return {
    confidence,
    completeness,
    warnings,
    needsReview: confidence < REVIEW_THRESHOLD,
  };
}

/**
 * Format quality metrics for display.
 *
 * @param metrics - Quality metrics
 * @returns Human-readable quality assessment
 */
export function formatQualityAssessment(metrics: QualityMetrics): string {
  const level = metrics.confidence >= 0.9 ? 'high'
    : metrics.confidence >= 0.8 ? 'medium'
    : metrics.confidence >= 0.6 ? 'low'
    : 'very low';

  let assessment = `Quality: ${level} (${(metrics.confidence * 100).toFixed(0)}% confidence)`;

  if (metrics.needsReview) {
    assessment += ' - NEEDS REVIEW';
  }

  if (metrics.warnings.length > 0) {
    assessment += `\nWarnings:\n- ${metrics.warnings.join('\n- ')}`;
  }

  return assessment;
}

/**
 * Check if quality is acceptable for automatic processing.
 *
 * @param metrics - Quality metrics
 * @returns true if quality is good enough to proceed without review
 */
export function isQualityAcceptable(metrics: QualityMetrics): boolean {
  return !metrics.needsReview;
}
