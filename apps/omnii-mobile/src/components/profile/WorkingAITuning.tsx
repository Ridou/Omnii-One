import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppColors } from '~/constants/Colors';

// Simplified AI Tuning Preferences (local only)
interface SimpleAITuningPreferences {
  communicationStyle: number;
  responseLength: number;
  proactivityLevel: number;
  focusProtection: number;
  urgencyThreshold: number;
  enthusiasm: number;
  motivationStyle: number;
}

export default function WorkingAITuning() {
  // Initialize with balanced defaults
  const [preferences, setPreferences] = useState<SimpleAITuningPreferences>({
    communicationStyle: 50,
    responseLength: 40,
    proactivityLevel: 70,
    focusProtection: 85,
    urgencyThreshold: 60,
    enthusiasm: 45,
    motivationStyle: 55,
  });

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
      if (value < 80) return 'highly proactive';
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
      return 'emergency only';
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
  const updatePreference = (key: keyof SimpleAITuningPreferences, value: number) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save preferences (simplified - just show alert)
  const savePreferences = async () => {
    Alert.alert(
      '✅ AI Settings Saved',
      'Your AI personality preferences have been updated locally.',
      [{ text: 'OK' }]
    );
  };

  // Simple slider component (since @react-native-community/slider isn't available)
  const SimpleSlider = ({ 
    value, 
    onValueChange, 
    color = AppColors.aiGradientStart 
  }: {
    value: number;
    onValueChange: (value: number) => void;
    color?: string;
  }) => {
    const handlePress = (event: any) => {
      const { locationX } = event.nativeEvent;
      const sliderWidth = 200; // Approximate width
      const percentage = Math.max(0, Math.min(100, (locationX / sliderWidth) * 100));
      onValueChange(Math.round(percentage));
    };

    return (
      <TouchableOpacity onPress={handlePress} style={styles.sliderContainer}>
        <View style={styles.sliderTrack}>
          <View 
            style={[
              styles.sliderFill, 
              { width: `${value}%`, backgroundColor: color }
            ]} 
          />
          <View 
            style={[
              styles.sliderThumb, 
              { left: `${value}%`, backgroundColor: color }
            ]} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Individual tuner component
  const Tuner = ({ 
    label, 
    value, 
    onValueChange, 
    leftLabel, 
    rightLabel, 
    color = AppColors.aiGradientStart 
  }: {
    label: string;
    value: number;
    onValueChange: (value: number) => void;
    leftLabel: string;
    rightLabel: string;
    color?: string;
  }) => (
    <View style={styles.tunerContainer}>
      <Text style={styles.tunerLabel}>{label}</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderEndLabel}>{leftLabel}</Text>
        <SimpleSlider
          value={value}
          onValueChange={onValueChange}
          color={color}
        />
        <Text style={styles.sliderEndLabel}>{rightLabel}</Text>
      </View>
      <Text style={styles.currentValueLabel}>
        {getLabel(value, label.toLowerCase().replace(/\s+/g, ''))}
      </Text>
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
          onValueChange={(v) => updatePreference('communicationStyle', v)}
          leftLabel="Casual"
          rightLabel="Professional"
        />

        <Tuner
          label="Response Length"
          value={preferences.responseLength}
          onValueChange={(v) => updatePreference('responseLength', v)}
          leftLabel="Brief"
          rightLabel="Detailed"
        />

        <Tuner
          label="Proactivity Level"
          value={preferences.proactivityLevel}
          onValueChange={(v) => updatePreference('proactivityLevel', v)}
          leftLabel="Reactive"
          rightLabel="Proactive"
        />
      </View>

      {/* Notification Intelligence Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notification Intelligence</Text>
        <Text style={styles.sectionDescription}>
          Smart notifications based on your context and energy
        </Text>
        
        <Tuner
          label="Focus Protection"
          value={preferences.focusProtection}
          onValueChange={(v) => updatePreference('focusProtection', v)}
          leftLabel="Interrupt"
          rightLabel="Respect"
          color="#FF7043"
        />

        <Tuner
          label="Urgency Threshold"
          value={preferences.urgencyThreshold}
          onValueChange={(v) => updatePreference('urgencyThreshold', v)}
          leftLabel="All"
          rightLabel="Critical"
          color="#FF6B47"
        />
      </View>

      {/* Voice & Tone Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Personal Voice</Text>
        <Text style={styles.sectionDescription}>
          Ensure AI outputs match your voice, tone, and preferences
        </Text>
        
        <Tuner
          label="Enthusiasm"
          value={preferences.enthusiasm}
          onValueChange={(v) => updatePreference('enthusiasm', v)}
          leftLabel="Calm"
          rightLabel="Energetic"
          color="#FF7043"
        />

        <Tuner
          label="Motivation Style"
          value={preferences.motivationStyle}
          onValueChange={(v) => updatePreference('motivationStyle', v)}
          leftLabel="Gentle"
          rightLabel="Direct"
          color="#E91E63"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
        <Text style={styles.saveButtonText}>Save AI Settings</Text>
      </TouchableOpacity>

      {/* Coming Soon Notice */}
      <View style={styles.comingSoonSection}>
        <Text style={styles.comingSoonTitle}>🚀 Coming Soon</Text>
        <Text style={styles.comingSoonText}>
          Full AI tuning integration with backend services and personalized responses.
        </Text>
      </View>
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
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: AppColors.borderLight,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },
  sliderThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    top: -6,
    marginLeft: -8,
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
    marginBottom: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoonSection: {
    backgroundColor: `${AppColors.aiGradientStart}15`,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginTop: 0,
    marginBottom: 40,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.aiGradientStart,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
}); 