import { useSharedValue, useAnimatedGestureHandler, runOnJS, withSpring, withTiming } from 'react-native-reanimated';
import type { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const APPROVE_THRESHOLD = 120; // pixels
const REJECT_THRESHOLD = -120; // pixels
const HAPTIC_THRESHOLD = 60; // pixels

interface UseSwipeGesturesProps {
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export function useSwipeGestures({ onApprove, onReject, disabled = false }: UseSwipeGesturesProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const hapticTriggered = useSharedValue(false);

  const triggerHaptic = (type: 'light' | 'medium' | 'success') => {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
    }
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      if (disabled) return;
      scale.value = withSpring(0.98);
      hapticTriggered.value = false;
    },
    
    onActive: (event) => {
      if (disabled) return;
      
      translateX.value = event.translationX;
      
      // Trigger haptic feedback at thresholds
      const absTranslation = Math.abs(event.translationX);
      if (absTranslation > HAPTIC_THRESHOLD && !hapticTriggered.value) {
        hapticTriggered.value = true;
        runOnJS(triggerHaptic)('light');
      }
      
      // Reset haptic if user goes back below threshold
      if (absTranslation < HAPTIC_THRESHOLD && hapticTriggered.value) {
        hapticTriggered.value = false;
      }
    },
    
    onEnd: (event) => {
      if (disabled) return;
      
      scale.value = withSpring(1);
      
      const shouldApprove = event.translationX > APPROVE_THRESHOLD;
      const shouldReject = event.translationX < REJECT_THRESHOLD;
      
      if (shouldApprove) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 300 });
        runOnJS(triggerHaptic)('success');
        runOnJS(onApprove)();
      } else if (shouldReject) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 });
        runOnJS(triggerHaptic)('success');
        runOnJS(onReject)();
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  return {
    gestureHandler,
    translateX,
    scale,
  };
} 