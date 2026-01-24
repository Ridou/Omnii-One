import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Alert
} from 'react-native';
import { useProfile } from '~/context/ProfileContext';
import { useProfileXP } from '~/hooks/useProfileXP';
import { AppColors } from '~/constants/Colors';
import type { ProductivityDNA } from '~/types/profile';

interface WorkStyleAssessmentProps {
  onComplete?: (results: ProductivityDNA) => void;
}

interface Question {
  id: keyof ProductivityDNA;
  question: string;
  options: {
    value: ProductivityDNA[keyof ProductivityDNA];
    label: string;
    emoji: string;
    description: string;
  }[];
}

const ASSESSMENT_QUESTIONS: Question[] = [
  {
    id: 'workStyle',
    question: 'How do you approach complex problems?',
    options: [
      {
        value: 'analytical',
        label: 'Analytical',
        emoji: '📊',
        description: 'Break down into data and logic'
      },
      {
        value: 'creative',
        label: 'Creative',
        emoji: '🎨',
        description: 'Think outside the box'
      },
      {
        value: 'collaborative',
        label: 'Collaborative',
        emoji: '👥',
        description: 'Work with others to solve'
      },
      {
        value: 'independent',
        label: 'Independent',
        emoji: '🎯',
        description: 'Figure it out myself'
      }
    ]
  },
  {
    id: 'energyPattern',
    question: 'When are you most productive?',
    options: [
      {
        value: 'morning',
        label: 'Morning',
        emoji: '🌅',
        description: 'Early bird gets the worm'
      },
      {
        value: 'afternoon',
        label: 'Afternoon',
        emoji: '☀️',
        description: 'Peak performance midday'
      },
      {
        value: 'evening',
        label: 'Evening',
        emoji: '🌙',
        description: 'Night owl energy'
      },
      {
        value: 'flexible',
        label: 'Flexible',
        emoji: '🔄',
        description: 'Depends on the day'
      }
    ]
  },
  {
    id: 'communicationStyle',
    question: 'How do you prefer to receive information?',
    options: [
      {
        value: 'direct',
        label: 'Direct',
        emoji: '🎯',
        description: 'Bottom line up front'
      },
      {
        value: 'detailed',
        label: 'Detailed',
        emoji: '📋',
        description: 'All the context please'
      },
      {
        value: 'visual',
        label: 'Visual',
        emoji: '🖼️',
        description: 'Show me with charts'
      },
      {
        value: 'conversational',
        label: 'Conversational',
        emoji: '💬',
        description: 'Talk it through together'
      }
    ]
  },
  {
    id: 'goalOrientation',
    question: 'What drives you most?',
    options: [
      {
        value: 'achievement',
        label: 'Achievement',
        emoji: '🏆',
        description: 'Winning and results'
      },
      {
        value: 'growth',
        label: 'Growth',
        emoji: '📈',
        description: 'Learning and improving'
      },
      {
        value: 'impact',
        label: 'Impact',
        emoji: '🌟',
        description: 'Making a difference'
      },
      {
        value: 'balance',
        label: 'Balance',
        emoji: '⚖️',
        description: 'Harmony in all areas'
      }
    ]
  },
  {
    id: 'workEnvironment',
    question: 'Where do you do your best work?',
    options: [
      {
        value: 'home',
        label: 'Home',
        emoji: '🏠',
        description: 'Comfort of my space'
      },
      {
        value: 'office',
        label: 'Office',
        emoji: '🏢',
        description: 'Professional environment'
      },
      {
        value: 'hybrid',
        label: 'Hybrid',
        emoji: '🔄',
        description: 'Best of both worlds'
      },
      {
        value: 'nomadic',
        label: 'Nomadic',
        emoji: '✈️',
        description: 'Anywhere with WiFi'
      }
    ]
  },
  {
    id: 'focusPreference',
    question: 'How do you prefer to work?',
    options: [
      {
        value: 'deep_work',
        label: 'Deep Work',
        emoji: '🧘',
        description: 'Long focused sessions'
      },
      {
        value: 'multi_task',
        label: 'Multi-task',
        emoji: '🎭',
        description: 'Juggle multiple things'
      },
      {
        value: 'collaborative',
        label: 'Collaborative',
        emoji: '🤝',
        description: 'Working with others'
      },
      {
        value: 'flexible',
        label: 'Flexible',
        emoji: '🌊',
        description: 'Adapt to what\'s needed'
      }
    ]
  }
];

export default function WorkStyleAssessment({ onComplete }: WorkStyleAssessmentProps) {
  const { updateDNA } = useProfile();
  const { awardXP } = useProfileXP();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<ProductivityDNA>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnims = useRef(
    ASSESSMENT_QUESTIONS[currentQuestion]?.options.map(() => new Animated.Value(1)) || []
  ).current;

  const currentQuestionData = ASSESSMENT_QUESTIONS[currentQuestion];
  const progress = (currentQuestion + 1) / ASSESSMENT_QUESTIONS.length;

  const handleAnswer = (value: ProductivityDNA[keyof ProductivityDNA]) => {
    const newAnswers = {
      ...answers,
      [currentQuestionData.id]: value
    };
    setAnswers(newAnswers);

    // Animate transition to next question
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentQuestion < ASSESSMENT_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 200);
    } else {
      // Assessment completed
      setIsCompleted(true);
      const completedDNA = newAnswers as ProductivityDNA;
      
      // Update profile data
      updateDNA(completedDNA);
      
      // Award XP for completion
      awardXP(75, 'Completed Work Style Assessment', 'discovery');
      
      // Call completion callback
      onComplete?.(completedDNA);
    }
  };

  const handleOptionPress = (index: number, value: ProductivityDNA[keyof ProductivityDNA]) => {
    // Scale animation on press
    const scaleAnim = scaleAnims[index];
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => handleAnswer(value), 150);
  };

  if (isCompleted) {
    return (
      <View style={styles.completedContainer}>
        <Text style={styles.completedEmoji}>🎉</Text>
        <Text style={styles.completedTitle}>Assessment Complete!</Text>
        <Text style={styles.completedText}>
          Your AI assistant now understands your work style and can provide personalized recommendations.
        </Text>
        <Text style={styles.xpReward}>+75 XP Earned!</Text>
      </View>
    );
  }

  if (!currentQuestionData) {
    return null;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {currentQuestion + 1} of {ASSESSMENT_QUESTIONS.length}
        </Text>
      </View>

      {/* Question */}
      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        <Text style={styles.questionNumber}>Question {currentQuestion + 1}</Text>
        <Text style={styles.questionText}>{currentQuestionData.question}</Text>
      </Animated.View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {currentQuestionData.options.map((option, index) => (
          <Animated.View
            key={option.value}
            style={{ transform: [{ scale: scaleAnims[index] || 1 }] }}
          >
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleOptionPress(index, option.value)}
              activeOpacity={0.9}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text style={styles.optionLabel}>{option.label}</Text>
              </View>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: AppColors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  questionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  questionNumber: {
    fontSize: 14,
    color: AppColors.aiGradientStart,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.textPrimary,
    lineHeight: 32,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  optionCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: AppColors.borderLight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
  },
  optionDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: AppColors.background,
  },
  completedEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  completedText: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 300,
  },
  xpReward: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.aiGradientStart,
    backgroundColor: `${AppColors.aiGradientStart}15`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
}); 