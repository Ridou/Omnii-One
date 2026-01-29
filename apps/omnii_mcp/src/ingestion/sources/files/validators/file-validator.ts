/**
 * File Validator
 *
 * Security-critical validation using magic number detection.
 * NEVER trust file extensions - they can be spoofed.
 */

import { fileTypeFromBuffer } from 'file-type';
import { SUPPORTED_MIME_TYPES, CODE_EXTENSIONS, type SupportedFileType } from '../types';

/** Maximum file size: 50MB */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  fileType?: SupportedFileType;
  mimeType?: string;
  error?: string;
}

/**
 * Validate uploaded file using magic number detection.
 *
 * Security: Uses binary signature analysis, not file extension.
 * This prevents file type spoofing attacks (e.g., malware.pdf.exe).
 *
 * @param buffer - File content as ArrayBuffer
 * @param originalName - Original filename (used only for code file detection)
 * @param fileSize - File size in bytes
 * @returns ValidationResult with detected type or error
 */
export async function validateFile(
  buffer: ArrayBuffer,
  originalName: string,
  fileSize: number
): Promise<ValidationResult> {
  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  if (fileSize === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  // Detect MIME type from magic numbers
  const detected = await fileTypeFromBuffer(new Uint8Array(buffer));

  // Handle binary files (PDF, DOCX)
  if (detected) {
    const fileType = SUPPORTED_MIME_TYPES[detected.mime];
    if (fileType) {
      return {
        valid: true,
        fileType,
        mimeType: detected.mime,
      };
    }

    // Detected a binary file type we don't support
    return {
      valid: false,
      error: `Unsupported file type: ${detected.mime}. Supported: PDF, DOCX, TXT, MD, code files`,
    };
  }

  // No binary signature detected - could be text file
  // Validate it's actually text content (not binary garbage)
  const textValidation = validateTextContent(buffer);
  if (!textValidation.isText) {
    return {
      valid: false,
      error: 'File appears to be binary but type could not be detected. Supported: PDF, DOCX, TXT, MD, code files',
    };
  }

  // Determine if it's markdown, code, or plain text based on extension
  const ext = getExtension(originalName).toLowerCase();

  if (ext === '.md' || ext === '.markdown') {
    return {
      valid: true,
      fileType: 'md',
      mimeType: 'text/markdown',
    };
  }

  if (CODE_EXTENSIONS.includes(ext)) {
    return {
      valid: true,
      fileType: 'code',
      mimeType: 'text/plain',
    };
  }

  // Default to plain text
  return {
    valid: true,
    fileType: 'txt',
    mimeType: 'text/plain',
  };
}

/**
 * Check if buffer contains valid text content (not binary)
 */
function validateTextContent(buffer: ArrayBuffer): { isText: boolean } {
  const bytes = new Uint8Array(buffer);
  const sampleSize = Math.min(8192, bytes.length); // Check first 8KB

  let nullCount = 0;
  let controlCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    const byte = bytes[i];

    // Count null bytes (common in binary files)
    if (byte === 0) {
      nullCount++;
    }

    // Count control characters (excluding common ones like tab, newline)
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      controlCount++;
    }
  }

  // If more than 1% null bytes or 5% control chars, likely binary
  const nullRatio = nullCount / sampleSize;
  const controlRatio = controlCount / sampleSize;

  return {
    isText: nullRatio < 0.01 && controlRatio < 0.05,
  };
}

/**
 * Get file extension from filename
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDot);
}

/**
 * Calculate SHA-256 hash for deduplication
 */
export async function calculateFileHash(buffer: ArrayBuffer): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(buffer);
  return hasher.digest('hex');
}
