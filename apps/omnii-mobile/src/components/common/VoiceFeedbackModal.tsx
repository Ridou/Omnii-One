import React, { useRef, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  Image,
  Dimensions 
} from 'react-native';
import { AppColors } from '~/constants/Colors';

interface VoiceFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  insights?: string[];
}

const { width: screenWidth } = Dimensions.get('window');

export default function VoiceFeedbackModal({ 
  visible, 
  onClose, 
  insights = [
    "🎯 Focus on Sarah's follow-up first",
    "📊 Marketing prep can wait until 4 PM", 
    "🧘 You have 30 min free at 3 PM for deep work"
  ]
}: VoiceFeedbackModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoGlowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Modal entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Logo glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoGlowAnim, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(logoGlowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Modal exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, logoGlowAnim]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeAnim,
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            backgroundColor: 'white',
            borderRadius: 24,
            padding: 40,
            maxWidth: screenWidth - 40,
            alignItems: 'center',
          }}
        >
          {/* Animated App Logo with Enhanced Glow */}
          <Animated.View
            style={{
              transform: [{ scale: logoGlowAnim }],
              shadowColor: AppColors.aiGradientStart,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 20,
              elevation: 20,
              marginBottom: 20,
            }}
          >
            <Image
              source={require('~/assets/images/public/logos/omniiLogoPNG.png')}
              style={{
                width: 80,
                height: 80,
              }}
              resizeMode="contain"
            />
          </Animated.View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: AppColors.textPrimary,
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            Your Daily Priorities
          </Text>

          <View style={{ marginBottom: 20 }}>
            {insights.map((insight, index) => (
              <Text
                key={`insight-${insight.slice(0, 10)}-${index}`}
                style={{
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  textAlign: 'center',
                  lineHeight: 20,
                  marginBottom: index < insights.length - 1 ? 8 : 0,
                }}
              >
                {insight}
              </Text>
            ))}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: AppColors.aiGradientStart,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              Got it!
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
} 