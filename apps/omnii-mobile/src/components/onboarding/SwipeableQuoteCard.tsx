import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import OnboardingQuoteCard from './OnboardingQuoteCard';
import type { OnboardingQuote } from '~/types/onboarding';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = 150;

interface SwipeableQuoteCardProps {
  quote: OnboardingQuote;
  onSwipeApprove: (timeSpent: number) => void;
  onSwipeDecline: (timeSpent: number) => void;
  disabled?: boolean;
}

export default function SwipeableQuoteCard({
  quote,
  onSwipeApprove,
  onSwipeDecline,
  disabled = false,
}: SwipeableQuoteCardProps) {
  const [translateX] = useState(new Animated.Value(0));
  const [isGestureActive, setIsGestureActive] = useState(false);
  const displayStartTime = useRef(Date.now());

  const getTimeSpent = () => {
    return Date.now() - displayStartTime.current;
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const handleStateChange = async (event: PanGestureHandlerStateChangeEvent) => {
    if (disabled) return;

    const { state, translationX } = event.nativeEvent;

    switch (state) {
      case State.BEGAN:
        setIsGestureActive(true);
        break;

      case State.ACTIVE:
        // Provide haptic feedback at threshold
        if (Math.abs(translationX) > SWIPE_THRESHOLD) {
          await Haptics.selectionAsync();
        }
        break;

      case State.END:
        setIsGestureActive(false);
        
        if (translationX > SWIPE_THRESHOLD) {
          // Swipe right - approve
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSwipeApprove(getTimeSpent());
        } else if (translationX < -SWIPE_THRESHOLD) {
          // Swipe left - decline
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onSwipeDecline(getTimeSpent());
        }
        
        // Reset position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        break;

      case State.CANCELLED:
      case State.FAILED:
        setIsGestureActive(false);
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        break;
    }
  };

  const getBackgroundColor = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      outputRange: ['rgba(255, 59, 48, 0.1)', 'transparent', 'rgba(52, 199, 89, 0.1)'],
      extrapolate: 'clamp',
    });
  };

  const getScale = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      outputRange: [0.98, 1, 0.98],
      extrapolate: 'clamp',
    });
  };

  const getRotation = () => {
    return translateX.interpolate({
      inputRange: [-screenWidth, 0, screenWidth],
      outputRange: ['-5deg', '0deg', '5deg'],
      extrapolate: 'clamp',
    });
  };

  return (
    <PanGestureHandler
      onGestureEvent={handleGestureEvent}
      onHandlerStateChange={handleStateChange}
      activeOffsetX={[-10, 10]}
      enabled={!disabled}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateX },
              { scale: getScale() },
              { rotate: getRotation() },
            ],
            backgroundColor: getBackgroundColor(),
          },
        ]}
      >
        {/* Approve Indicator */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.leftIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [10, SWIPE_THRESHOLD],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
              transform: [{
                scale: translateX.interpolate({
                  inputRange: [10, SWIPE_THRESHOLD],
                  outputRange: [0.8, 1.2],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        >
          <View style={[styles.indicatorBadge, { backgroundColor: '#34C759' }]}>
            <View style={styles.indicatorContent}>
              <View style={styles.iconContainer}>
                <View style={styles.icon}>
                  <View style={styles.checkmark} />
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Decline Indicator */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.rightIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [-SWIPE_THRESHOLD, -10],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
              transform: [{
                scale: translateX.interpolate({
                  inputRange: [-SWIPE_THRESHOLD, -10],
                  outputRange: [1.2, 0.8],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        >
          <View style={[styles.indicatorBadge, { backgroundColor: '#FF453A' }]}>
            <View style={styles.indicatorContent}>
              <View style={styles.iconContainer}>
                <View style={styles.icon}>
                  <View style={styles.cross} />
                  <View style={[styles.cross, { transform: [{ rotate: '90deg' }] }]} />
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Quote Card Content */}
        <View style={styles.content}>
          <OnboardingQuoteCard quote={quote} />
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'visible',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    zIndex: 1000,
    marginTop: -40,
  },
  leftIndicator: {
    left: -60,
  },
  rightIndicator: {
    right: -60,
  },
  indicatorBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  indicatorContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  checkmark: {
    width: 12,
    height: 6,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: 'white',
    transform: [{ rotate: '-45deg' }],
    position: 'absolute',
    top: 6,
    left: 4,
  },
  cross: {
    width: 16,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
    position: 'absolute',
  },
}); 