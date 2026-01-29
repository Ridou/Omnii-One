/**
 * Voice Capture Hook
 *
 * Provides voice-to-text transcription for note capture.
 * Uses on-device speech recognition for sub-3-second latency.
 *
 * Features:
 * - Interim results for real-time feedback
 * - On-device recognition (iOS 17+, Android varies)
 * - Automatic punctuation
 * - Permission handling
 */

import { useState, useCallback, useEffect } from 'react';
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
  getSpeechRecognitionServices,
} from 'expo-speech-recognition';
import type { VoiceTranscriptionResult } from '../types';

/**
 * Voice capture state
 */
export interface VoiceCaptureState {
  /** Current transcript (interim or final) */
  transcript: string;
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether speech recognition is supported */
  isSupported: boolean;
  /** Whether on-device recognition is available */
  hasOnDeviceRecognition: boolean;
  /** Any error message */
  error: string | null;
  /** Whether permission is granted */
  hasPermission: boolean;
  /** Whether this is a final result */
  isFinal: boolean;
}

/**
 * Voice capture actions
 */
export interface VoiceCaptureActions {
  /** Start recording and transcription */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => void;
  /** Clear current transcript */
  clearTranscript: () => void;
  /** Request microphone permission */
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for voice-to-text note capture.
 *
 * @param options - Configuration options
 * @returns Voice capture state and actions
 *
 * @example
 * const { transcript, isRecording, startRecording, stopRecording } = useVoiceCapture();
 *
 * // Start recording
 * await startRecording();
 *
 * // Stop and get final transcript
 * stopRecording();
 * console.log(transcript);
 */
export function useVoiceCapture(options?: {
  language?: string;
  continuous?: boolean;
  onResult?: (result: VoiceTranscriptionResult) => void;
  onError?: (error: string) => void;
}): VoiceCaptureState & VoiceCaptureActions {
  const { language = 'en-US', continuous = false, onResult, onError } = options || {};

  // State
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [hasOnDeviceRecognition, setHasOnDeviceRecognition] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isFinal, setIsFinal] = useState(false);

  // Check support on mount
  useEffect(() => {
    async function checkSupport() {
      try {
        const services = await getSpeechRecognitionServices();
        setIsSupported(services.length > 0);

        // Check for on-device recognition
        const hasOnDevice = services.some(
          (s) => s.includes('onDevice') || s.includes('offline')
        );
        setHasOnDeviceRecognition(hasOnDevice);
      } catch {
        setIsSupported(false);
      }
    }
    checkSupport();
  }, []);

  // Listen for speech recognition results
  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      const result = event.results[0];
      if (!result) return;

      const transcriptText = result.transcript || '';

      setTranscript(transcriptText);
      setIsFinal(event.isFinal || false);

      // Callback for parent component
      if (onResult) {
        onResult({
          transcript: transcriptText,
          isFinal: event.isFinal || false,
          confidence: result.confidence,
          language,
        });
      }

      // If final result, stop recording
      if (event.isFinal && !continuous) {
        setIsRecording(false);
      }
    }
  });

  // Listen for errors
  useSpeechRecognitionEvent('error', (event) => {
    const errorMessage = event.error || 'Speech recognition error';
    setError(errorMessage);
    setIsRecording(false);

    if (onError) {
      onError(errorMessage);
    }
  });

  // Listen for end event
  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
  });

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      const granted = result.status === 'granted';
      setHasPermission(granted);

      if (!granted) {
        setError('Microphone permission denied');
      }

      return granted;
    } catch (err) {
      setError('Failed to request permission');
      return false;
    }
  }, []);

  /**
   * Start voice recording
   */
  const startRecording = useCallback(async (): Promise<void> => {
    // Clear previous state
    setError(null);
    setIsFinal(false);

    // Check permission
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    try {
      // Start recognition with optimal settings
      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true, // Show results as user speaks
        maxAlternatives: 1,
        continuous,

        // iOS-specific: prefer on-device for low latency
        requiresOnDeviceRecognition: false, // Fall back if on-device not available
        addsPunctuation: true, // Automatic punctuation

        // Android-specific
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: 'free_form',
        },
      });

      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);

      if (onError) {
        onError(message);
      }
    }
  }, [language, continuous, hasPermission, requestPermission, onError]);

  /**
   * Stop voice recording
   */
  const stopRecording = useCallback((): void => {
    try {
      ExpoSpeechRecognitionModule.stop();
      setIsRecording(false);
    } catch (err) {
      // Ignore stop errors (may already be stopped)
    }
  }, []);

  /**
   * Clear transcript
   */
  const clearTranscript = useCallback((): void => {
    setTranscript('');
    setIsFinal(false);
    setError(null);
  }, []);

  return {
    // State
    transcript,
    isRecording,
    isSupported,
    hasOnDeviceRecognition,
    error,
    hasPermission,
    isFinal,

    // Actions
    startRecording,
    stopRecording,
    clearTranscript,
    requestPermission,
  };
}

/**
 * Helper to check if voice capture is available
 */
export async function isVoiceCaptureAvailable(): Promise<boolean> {
  try {
    const services = await getSpeechRecognitionServices();
    return services.length > 0;
  } catch {
    return false;
  }
}
