/**
 * Notes Feature Types
 */

/**
 * Voice transcription result (matches backend type)
 */
export interface VoiceTranscriptionResult {
  /** Transcribed text */
  transcript: string;
  /** Whether this is a final result */
  isFinal: boolean;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Detected language */
  language?: string;
}

/**
 * How note was created
 */
export type CreatedVia = 'manual' | 'voice' | 'template';

/**
 * Available template types
 */
export type TemplateType = 'meeting-notes' | 'daily-journal' | 'contact-notes';

/**
 * Input for creating/updating a note
 */
export interface NoteInput {
  title: string;
  content: string;
  createdVia?: CreatedVia;
  templateType?: TemplateType;
}

/**
 * Extracted wikilink information
 */
export interface WikilinkMatch {
  /** Raw target text from [[target]] */
  target: string;
  /** Display text (from [[target|display]] or same as target) */
  display: string;
  /** Normalized version for matching */
  normalizedTarget: string;
  /** Position in source text */
  position: {
    start: number;
    end: number;
  };
}
