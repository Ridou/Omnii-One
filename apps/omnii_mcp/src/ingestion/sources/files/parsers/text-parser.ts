/**
 * Text and Markdown Parser
 *
 * Handles plain text, markdown, and code files.
 * These have simpler parsing - mainly UTF-8 decoding.
 */

import MarkdownIt from 'markdown-it';
import type { ParseResult } from '../types';

const md = new MarkdownIt();

/**
 * Parse plain text file.
 *
 * @param buffer - Text file content as ArrayBuffer
 * @returns ParseResult with text content
 */
export async function parseText(buffer: ArrayBuffer): Promise<ParseResult> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const text = decoder.decode(buffer);

  // Check for encoding issues
  const replacementCount = (text.match(/\ufffd/g) || []).length;
  const confidence = replacementCount > 0
    ? Math.max(0.5, 1 - replacementCount / text.length * 10)
    : 0.98;

  return {
    text: text.trim(),
    metadata: {
      format: 'txt',
    },
    confidence,
  };
}

/**
 * Parse markdown file.
 *
 * Renders markdown to extract plain text for indexing.
 * Preserves structure for better chunking later.
 *
 * @param buffer - Markdown file content as ArrayBuffer
 * @returns ParseResult with text content
 */
export async function parseMarkdown(buffer: ArrayBuffer): Promise<ParseResult> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(buffer);

  // For indexing, we want the raw markdown (keeps headers, lists visible)
  // rather than rendered HTML stripped of markup
  // This preserves semantic structure for chunking
  const text = rawText.trim();

  // Check for encoding issues
  const replacementCount = (text.match(/\ufffd/g) || []).length;
  const confidence = replacementCount > 0
    ? Math.max(0.5, 1 - replacementCount / text.length * 10)
    : 0.98;

  return {
    text,
    metadata: {
      format: 'md',
    },
    confidence,
  };
}

/**
 * Parse code file.
 *
 * Similar to text parsing but with code-specific handling.
 * Future: Could use tree-sitter for AST-aware parsing.
 *
 * @param buffer - Code file content as ArrayBuffer
 * @returns ParseResult with code content
 */
export async function parseCode(buffer: ArrayBuffer): Promise<ParseResult> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const text = decoder.decode(buffer);

  // Check for encoding issues
  const replacementCount = (text.match(/\ufffd/g) || []).length;
  const confidence = replacementCount > 0
    ? Math.max(0.5, 1 - replacementCount / text.length * 10)
    : 0.98;

  return {
    text: text.trim(),
    metadata: {
      format: 'code',
    },
    confidence,
  };
}
