import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { AppColors } from '~/constants/Colors';
import { useOnboardingContext } from '~/context/OnboardingContext';
import type { AITuningPreferences, SystemPromptVariables } from '~/src/types/onboarding';

export default function WorkingAITuning() {
  const { state, updateAITuning } = useOnboardingContext();
  
  // Initialize with defaults or saved preferences
  const [preferences, setPreferences] = useState<AITuningPreferences>({
    communicationStyle: 50,
    communicationStyleLabel: 'balanced',
    responseLength: 40,
    responseLengthLabel: 'concise',
    proactivityLevel: 70,
    proactivityLabel: 'proactive',
    focusProtection: 85,
    focusProtectionLabel: 'protective',
    urgencyThreshold: 60,
    urgencyThresholdLabel: 'important',
    learningSpeed: 65,
    learningSpeedLabel: 'balanced',
    privacyLevel: 80,
    privacyLevelLabel: 'guarded',
    enthusiasm: 45,
    enthusiasmLabel: 'measured',
    motivationStyle: 55,
    motivationStyleLabel: 'balanced',
    lastUpdated: new Date().toISOString(),
  });

  // Load saved preferences
  useEffect(() => {
    if (state.onboardingData.ai_tuning) {
      setPreferences(state.onboardingData.ai_tuning);
    }
  }, [state.onboardingData.ai_tuning]);

  // Helper to get label based on value
  const getLabel = (value: number, type: string): string => {
    if (type === 'communicationStyle') {
      if (value < 20) return 'casual';
      if (value < 40) return 'friendly';
      if (value < 60) return 'balanced';
      if (value < 80) return 'professional';
      return 'formal';
    }
    if (type === 'responseLength') {
      if (value < 20) return 'brief';
      if (value < 40) return 'concise';
      if (value < 60) return 'balanced';
      if (value < 80) return 'detailed';
      return 'comprehensive';
    }
    if (type === 'proactivityLevel') {
      if (value < 20) return 'reactive';
      if (value < 40) return 'balanced';
      if (value < 60) return 'proactive';
      if (value < 80) return 'highly_proactive';
      return 'predictive';
    }
    if (type === 'focusProtection') {
      if (value < 20) return 'flexible';
      if (value < 40) return 'considerate';
      if (value < 60) return 'respectful';
      if (value < 80) return 'protective';
      return 'strict';
    }
    if (type === 'urgencyThreshold') {
      if (value < 20) return 'all';
      if (value < 40) return 'most';
      if (value < 60) return 'important';
      if (value < 80) return 'critical';
      return 'emergency_only';
    }
    if (type === 'learningSpeed') {
      if (value < 20) return 'cautious';
      if (value < 40) return 'steady';
      if (value < 60) return 'balanced';
      if (value < 80) return 'adaptive';
      return 'rapid';
    }
    if (type === 'privacyLevel') {
      if (value < 20) return 'open';
      if (value < 40) return 'selective';
      if (value < 60) return 'balanced';
      if (value < 80) return 'guarded';
      return 'maximum';
    }
    if (type === 'enthusiasm') {
      if (value < 20) return 'calm';
      if (value < 40) return 'measured';
      if (value < 60) return 'balanced';
      if (value < 80) return 'upbeat';
      return 'energetic';
    }
    if (type === 'motivationStyle') {
      if (value < 20) return 'gentle';
      if (value < 40) return 'supportive';
      if (value < 60) return 'balanced';
      if (value < 80) return 'direct';
      return 'challenging';
    }
    return 'balanced';
  };

  // Update a preference
  const updatePreference = (key: keyof AITuningPreferences, value: number) => {
    const labelKey = `${key}Label` as keyof AITuningPreferences;
    const label = getLabel(value, key);
    
    const newPreferences = {
      ...preferences,
      [key]: value,
      [labelKey]: label,
      lastUpdated: new Date().toISOString(),
    };
    
    setPreferences(newPreferences);
  };

  // Save preferences
  const savePreferences = async () => {
    updateAITuning(preferences);
    Alert.alert(
      '✅ AI Settings Saved',
      'Your AI personality preferences have been updated.',
      [{ text: 'OK' }]
    );
  };

  // Generate system prompt variables for backend
  const generateSystemPromptVariables = (): SystemPromptVariables => {
    return {
      communication_style: preferences.communicationStyleLabel,
      response_length: preferences.responseLengthLabel,
      proactivity: preferences.proactivityLabel,
      interruption_policy: preferences.focusProtectionLabel,
      urgency_filter: preferences.urgencyThresholdLabel,
      learning_rate: preferences.learningSpeedLabel,
      privacy_mode: preferences.privacyLevelLabel,
      enthusiasm_level: preferences.enthusiasmLabel,
      motivation_approach: preferences.motivationStyleLabel,
    };
  };

  // Individual tuner component
  const Tuner = ({ 
    label, 
    value, 
    onValueChange, 
    leftLabel, 
    rightLabel, 
    currentLabel,
    color = AppColors.aiGradientStart 
  }: {
    label: string;
    value: number;
    onValueChange: (value: number) => void;
    leftLabel: string;
    rightLabel: string;
    currentLabel: string;
    color?: string;
  }) => (
    <View style={styles.tunerContainer}>
      <Text style={styles.tunerLabel}>{label}</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderEndLabel}>{leftLabel}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor={color}
          maximumTrackTintColor={AppColors.borderLight}
          thumbTintColor={color}
        />
        <Text style={styles.sliderEndLabel}>{rightLabel}</Text>
      </View>
      <Text style={styles.currentValueLabel}>{currentLabel}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* AI Persona Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 AI Persona</Text>
        <Text style={styles.sectionDescription}>
          Customize how your AI assistant communicates and behaves
        </Text>
        
        <Tuner
          label="Communication Style"
          value={preferences.communicationStyle}
          onValueChange={(v) => updatePreference('communicationStyle', Math.round(v))}
          leftLabel="Casual"
          rightLabel="Professional"
          currentLabel={preferences.communicationStyleLabel.replace('_', ' ')}
        />

        <Tuner
          label="Response Length"
          value={preferences.responseLength}
          onValueChange={(v) => updatePreference('responseLength', Math.round(v))}
          leftLabel="Brief"
          rightLabel="Detailed"
          currentLabel={preferences.responseLengthLabel}
        />

        <Tuner
          label="Proactivity Level"
          value={preferences.proactivityLevel}
          onValueChange={(v) => updatePreference('proactivityLevel', Math.round(v))}
          leftLabel="Reactive"
          rightLabel="Proactive"
          currentLabel={preferences.proactivityLabel.replace('_', ' ')}
        />
      </View>

      {/* Notification Intelligence Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notification Intelligence</Text>
        <Text style={styles.sectionDescription}>
          Smart notifications based on your context and energy
        </Text>
        
        <Tuner
          label="Focus Time Respect"
          value={preferences.focusProtection}
          onValueChange={(v) => updatePreference('focusProtection', Math.round(v))}
          leftLabel="Interrupt"
          rightLabel="Respect"
          currentLabel={preferences.focusProtectionLabel}
          color="#FF7043"
        />

        <Tuner
          label="Urgency Threshold"
          value={preferences.urgencyThreshold}
          onValueChange={(v) => updatePreference('urgencyThreshold', Math.round(v))}
          leftLabel="All"
          rightLabel="Critical"
          currentLabel={preferences.urgencyThresholdLabel.replace('_', ' ')}
          color="#FF6B47"
        />
      </View>

      {/* Learning Controls Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧠 Learning Controls</Text>
        <Text style={styles.sectionDescription}>
          Control how AI learns from your behavior and preferences
        </Text>
        
        <Tuner
          label="Adaptation Speed"
          value={preferences.learningSpeed}
          onValueChange={(v) => updatePreference('learningSpeed', Math.round(v))}
          leftLabel="Cautious"
          rightLabel="Fast"
          currentLabel={preferences.learningSpeedLabel}
          color="#A6E22E"
        />

        <Tuner
          label="Data Privacy"
          value={preferences.privacyLevel}
          onValueChange={(v) => updatePreference('privacyLevel', Math.round(v))}
          leftLabel="Open"
          rightLabel="Private"
          currentLabel={preferences.privacyLevelLabel}
          color="#667eea"
        />
      </View>

      {/* Voice & Tone Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Personal Voice</Text>
        <Text style={styles.sectionDescription}>
          Ensure AI outputs match your voice, tone, and preferences
        </Text>
        
        <Tuner
          label="Enthusiasm Level"
          value={preferences.enthusiasm}
          onValueChange={(v) => updatePreference('enthusiasm', Math.round(v))}
          leftLabel="Calm"
          rightLabel="Energetic"
          currentLabel={preferences.enthusiasmLabel}
          color="#FF7043"
        />

        <Tuner
          label="Motivational Approach"
          value={preferences.motivationStyle}
          onValueChange={(v) => updatePreference('motivationStyle', Math.round(v))}
          leftLabel="Gentle"
          rightLabel="Direct"
          currentLabel={preferences.motivationStyleLabel}
          color="#E91E63"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
        <Text style={styles.saveButtonText}>Save AI Settings</Text>
      </TouchableOpacity>

      {/* Debug: Show generated prompt variables */}
      {__DEV__ && (
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>System Prompt Variables:</Text>
          <Text style={styles.debugText}>
            {JSON.stringify(generateSystemPromptVariables(), null, 2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 20,
  },
  tunerContainer: {
    marginBottom: 24,
  },
  tunerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  sliderEndLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    width: 60,
  },
  currentValueLabel: {
    fontSize: 13,
    color: AppColors.aiGradientStart,
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  saveButton: {
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  debugSection: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 8,
    padding: 16,
    margin: 20,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontFamily: 'monospace',
  },
}); 