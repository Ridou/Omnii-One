import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Platform } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = 150;

interface SimpleSwipeCardProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  disabled?: boolean;
}

export default function SimpleSwipeCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: SimpleSwipeCardProps) {
  const [translateX] = useState(new Animated.Value(0));
  const [isGestureActive, setIsGestureActive] = useState(false);

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
          if (Platform.OS === 'ios') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          onSwipeRight();
        } else if (translationX < -SWIPE_THRESHOLD) {
          // Swipe left - decline
          if (Platform.OS === 'ios') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          onSwipeLeft();
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
            ],
            backgroundColor: getBackgroundColor(),
          },
        ]}
      >
        {/* Approve Indicator - Shows on LEFT when swiping RIGHT */}
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
            },
          ]}
        >
          <Svg width="80" height="40" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="approveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#34C759" />
                <Stop offset="100%" stopColor="#30D158" />
              </LinearGradient>
            </Defs>
            <Rect width="80" height="40" fill="url(#approveGrad)" rx="20" />
          </Svg>
          <Text style={styles.indicatorText}>Approve</Text>
        </Animated.View>

        {/* Decline Indicator - Shows on RIGHT when swiping LEFT */}
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
            },
          ]}
        >
          <Svg width="80" height="40" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="declineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#FF3B30" />
                <Stop offset="100%" stopColor="#DC143C" />
              </LinearGradient>
            </Defs>
            <Rect width="80" height="40" fill="url(#declineGrad)" rx="20" />
          </Svg>
          <Text style={styles.indicatorText}>Decline</Text>
        </Animated.View>

        {/* Card Content */}
        <View style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    zIndex: 1,
    width: 80,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginTop: -20,
  },
  leftIndicator: {
    left: 20,
  },
  rightIndicator: {
    right: 20,
  },
  indicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
}); 