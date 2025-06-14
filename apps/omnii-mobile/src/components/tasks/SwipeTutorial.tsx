import { useRef, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  StyleSheet 
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { AppColors } from '~/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SwipeTutorialProps {
  visible: boolean;
  onClose: () => void;
}

export function SwipeTutorial({ visible, onClose }: SwipeTutorialProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const gestureAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow animation
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      // Start gesture demonstration
      const gestureDemo = Animated.loop(
        Animated.sequence([
          Animated.timing(gestureAnim, {
            toValue: 80,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(gestureAnim, {
            toValue: -80,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(gestureAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.delay(1000),
        ])
      );
      
      glowLoop.start();
      gestureDemo.start();

      return () => {
        glowLoop.stop();
        gestureDemo.stop();
      };
    }
  }, [visible, fadeAnim, slideAnim, gestureAnim, glowAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View 
        style={[
          styles.overlay, 
          { opacity: fadeAnim }
        ]}
      >
        <Animated.View 
          style={[
            styles.container,
            {
              transform: [
                { 
                  scale: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  })
                }
              ]
            }
          ]}
        >
          {/* Background gradient */}
          <View style={styles.gradientBackground}>
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
              <Defs>
                <LinearGradient id="tutorialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={AppColors.aiGradientStart} stopOpacity="0.1" />
                  <Stop offset="100%" stopColor={AppColors.aiGradientEnd} stopOpacity="0.1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#tutorialGradient)" />
            </Svg>
          </View>

          <Animated.Text 
            style={[
              styles.title,
              {
                transform: [{ scale: glowAnim }]
              }
            ]}
          >
            Master the Swipe! 🚀
          </Animated.Text>
          
          {/* Demo Card */}
          <View style={styles.demoContainer}>
            <Animated.View 
              style={[
                styles.demoCard,
                {
                  transform: [{ translateX: gestureAnim }]
                }
              ]}
            >
              <View style={styles.demoPriority}>
                <Text style={styles.demoPriorityText}>HIGH PRIORITY</Text>
              </View>
              <Text style={styles.demoTitle}>🔥 Sample AI Task</Text>
              <Text style={styles.demoDescription}>
                This is how your AI-generated tasks will appear
              </Text>
              <View style={styles.demoHint}>
                <Text style={styles.demoHintText}>👈 Decline • 👆 Details • Approve 👉</Text>
              </View>
            </Animated.View>
            
            {/* Gesture indicators with gradients */}
            <View style={styles.gestureIndicators}>
              <View style={styles.rejectIndicator}>
                <Svg height="60" width="80" style={styles.indicatorGradient}>
                  <Defs>
                    <LinearGradient id="rejectGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor={AppColors.error} stopOpacity="0.8" />
                      <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#rejectGrad)" />
                </Svg>
                <Text style={styles.indicatorText}>← Decline</Text>
              </View>
              <View style={styles.approveIndicator}>
                <Svg height="60" width="80" style={styles.indicatorGradient}>
                  <Defs>
                    <LinearGradient id="approveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="transparent" stopOpacity="0" />
                      <Stop offset="100%" stopColor={AppColors.success} stopOpacity="0.8" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#approveGrad)" />
                </Svg>
                <Text style={styles.indicatorText}>Approve →</Text>
              </View>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <View style={styles.instruction}>
              <Text style={styles.instructionEmoji}>👆</Text>
              <Text style={styles.instructionText}>
                <Text style={styles.bold}>Tap</Text> to view task details
              </Text>
            </View>
            <View style={styles.instruction}>
              <Text style={styles.instructionEmoji}>👉</Text>
              <Text style={styles.instructionText}>
                <Text style={styles.bold}>Swipe right</Text> to approve
              </Text>
            </View>
            <View style={styles.instruction}>
              <Text style={styles.instructionEmoji}>👈</Text>
              <Text style={styles.instructionText}>
                <Text style={styles.bold}>Swipe left</Text> to decline
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <View style={styles.closeButtonGradient}>
              <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
                <Defs>
                  <LinearGradient id="buttonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={AppColors.aiGradientStart} />
                    <Stop offset="100%" stopColor={AppColors.aiGradientEnd} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#buttonGradient)" />
              </Svg>
            </View>
            <Text style={styles.closeButtonText}>Got it! Let's go 🎯</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 24,
    padding: 24,
    maxWidth: SCREEN_WIDTH - 40,
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    ...AppColors.shadows.elevated,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
    zIndex: 1,
  },
  demoContainer: {
    width: '100%',
    height: 140,
    marginBottom: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.highPriority,
    width: '80%',
    ...AppColors.shadows.card,
  },
  demoPriority: {
    backgroundColor: AppColors.highPriority,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  demoPriorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  demoDescription: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  demoHint: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  demoHintText: {
    fontSize: 10,
    color: AppColors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  gestureIndicators: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  rejectIndicator: {
    alignItems: 'flex-start',
    position: 'relative',
  },
  approveIndicator: {
    alignItems: 'flex-end',
    position: 'relative',
  },
  indicatorGradient: {
    position: 'absolute',
    top: 0,
    borderRadius: 8,
  },
  indicatorText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '600',
    zIndex: 1,
    paddingVertical: 20,
  },
  instructions: {
    width: '100%',
    marginBottom: 24,
    zIndex: 1,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionEmoji: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  instructionText: {
    fontSize: 16,
    color: AppColors.textPrimary,
    flex: 1,
  },
  bold: {
    fontWeight: '600',
    color: AppColors.aiGradientStart,
  },
  closeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1,
  },
  closeButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
}); 