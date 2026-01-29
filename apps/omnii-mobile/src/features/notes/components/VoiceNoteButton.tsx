/**
 * VoiceNoteButton
 *
 * A voice recording button with breathing pulse animation,
 * real-time transcription display, and modern microphone design.
 *
 * Design: "Soft Luminescence" - organic, fluid animations with
 * a living, breathing orb that responds to voice input.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';
import { Mic, MicOff, Square } from 'lucide-react-native';
import { useVoiceCapture } from '../hooks';

interface VoiceNoteButtonProps {
  onTranscriptionComplete?: (text: string) => void;
  onTranscriptionUpdate?: (text: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { button: 48, icon: 20, pulse: 64 },
  medium: { button: 64, icon: 28, pulse: 88 },
  large: { button: 80, icon: 36, pulse: 112 },
};

export function VoiceNoteButton({
  onTranscriptionComplete,
  onTranscriptionUpdate,
  disabled = false,
  size = 'medium',
}: VoiceNoteButtonProps) {
  const voiceCapture = useVoiceCapture({
    onResult: (result) => {
      if (result.isFinal && onTranscriptionComplete) {
        onTranscriptionComplete(result.transcript);
      } else if (!result.isFinal && onTranscriptionUpdate) {
        onTranscriptionUpdate(result.transcript);
      }
    },
  });

  // Destructure for easier access
  const {
    transcript: interimTranscript,
    isRecording,
    error,
    hasPermission,
    startRecording,
    stopRecording,
  } = voiceCapture;

  // Create a state-like object for compatibility
  const state = {
    isRecording,
    interimTranscript,
    error,
    permissionStatus: hasPermission ? 'granted' : 'undetermined',
  };

  const actions = { startRecording, stopRecording };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;

  const dimensions = SIZES[size];

  // Check if voice capture is supported
  const isAvailable = voiceCapture.isSupported;

  // Breathing pulse animation when recording
  useEffect(() => {
    if (state.isRecording) {
      const pulseSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const glowSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

      const breatheSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      pulseSequence.start();
      glowSequence.start();
      breatheSequence.start();

      return () => {
        pulseSequence.stop();
        glowSequence.stop();
        breatheSequence.stop();
        pulseAnim.setValue(1);
        glowAnim.setValue(0);
        breatheAnim.setValue(0);
      };
    }
  }, [state.isRecording, pulseAnim, glowAnim, breatheAnim]);

  const handlePress = async () => {
    if (state.isRecording) {
      actions.stopRecording();
    } else {
      await actions.startRecording();
    }
  };

  const pulseOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const innerGlowScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  if (!isAvailable) {
    return (
      <View style={styles.unavailableContainer}>
        <View
          style={[
            styles.buttonDisabled,
            { width: dimensions.button, height: dimensions.button },
          ]}
        >
          <MicOff size={dimensions.icon} color="#94a3b8" strokeWidth={1.5} />
        </View>
        <Text style={styles.unavailableText}>Voice unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Outer pulse ring */}
      {state.isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: dimensions.pulse,
              height: dimensions.pulse,
              borderRadius: dimensions.pulse / 2,
              opacity: pulseOpacity,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}

      {/* Inner glow ring */}
      {state.isRecording && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: dimensions.button + 8,
              height: dimensions.button + 8,
              borderRadius: (dimensions.button + 8) / 2,
              transform: [{ scale: innerGlowScale }],
            },
          ]}
        />
      )}

      {/* Main button */}
      <Pressable
        onPress={handlePress}
        disabled={disabled || state.permissionStatus === 'denied'}
        style={({ pressed }) => [
          styles.button,
          {
            width: dimensions.button,
            height: dimensions.button,
            borderRadius: dimensions.button / 2,
          },
          state.isRecording && styles.buttonRecording,
          disabled && styles.buttonDisabled,
          pressed && !disabled && styles.buttonPressed,
        ]}
      >
        {state.isRecording ? (
          <Square
            size={dimensions.icon * 0.6}
            color="#ffffff"
            fill="#ffffff"
            strokeWidth={0}
          />
        ) : (
          <Mic
            size={dimensions.icon}
            color={disabled ? '#94a3b8' : '#ffffff'}
            strokeWidth={1.5}
          />
        )}
      </Pressable>

      {/* Status indicator */}
      {state.isRecording && (
        <View style={styles.statusContainer}>
          <View style={styles.recordingDot} />
          <Text style={styles.statusText}>Recording...</Text>
        </View>
      )}

      {/* Real-time transcription preview */}
      {state.interimTranscript && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText} numberOfLines={2}>
            {state.interimTranscript}
          </Text>
        </View>
      )}

      {/* Error message */}
      {state.error && (
        <Text style={styles.errorText}>{state.error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableContainer: {
    alignItems: 'center',
    gap: 8,
  },
  button: {
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonRecording: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0.4,
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: '#ef4444',
  },
  glowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ef4444',
    letterSpacing: 0.3,
  },
  transcriptContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 12,
    maxWidth: 280,
  },
  transcriptText: {
    fontSize: 14,
    color: '#4f46e5',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default VoiceNoteButton;
