import React, { useState } from 'react';
import { View, Text, Dimensions, Animated, Platform } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { cn } from '~/utils/cn';

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
      outputRange: ['rgba(255, 59, 48, 0.05)', 'transparent', 'rgba(52, 199, 89, 0.05)'],
      extrapolate: 'clamp',
    });
  };

  const getOverlayColor = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD * 0.7, -10, 0, 10, SWIPE_THRESHOLD * 0.7],
      outputRange: [
        'rgba(255, 59, 48, 0.4)',   // Red overlay for left swipe (decline) - increased opacity
        'rgba(255, 59, 48, 0.08)',  // Light red
        'rgba(0, 0, 0, 0)',         // Transparent at center
        'rgba(52, 199, 89, 0.08)',  // Light green  
        'rgba(52, 199, 89, 0.4)'    // Green overlay for right swipe (approve) - increased opacity
      ],
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

  const getApproveOpacity = () => {
    return translateX.interpolate({
      inputRange: [10, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  };

  const getDeclineOpacity = () => {
    return translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, -10],
      outputRange: [1, 0],
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
        className={cn(
          "rounded-2xl overflow-hidden will-change-transform",
          disabled && "opacity-50"
        )}
        style={{
          transform: [
            { translateX },
            { scale: getScale() },
          ],
          backgroundColor: getBackgroundColor(),
        }}
      >
        {/* Approve Indicator - Shows on LEFT when swiping RIGHT */}
        <Animated.View
          className="absolute top-1/2 left-5 z-10 w-20 h-10 -mt-5 will-change-transform"
          style={{
            opacity: getApproveOpacity(),
          }}
        >
          {/* SVG Background */}
          <Svg width="80" height="40" className="absolute inset-0">
            <Defs>
              <LinearGradient id="approveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#34C759" />
                <Stop offset="100%" stopColor="#30D158" />
              </LinearGradient>
            </Defs>
            <Rect width="80" height="40" fill="url(#approveGrad)" rx="20" />
          </Svg>
          {/* Text perfectly centered with exact pixel dimensions */}
          <View 
            className="absolute justify-center items-center"
            style={{
              top: 0,
              left: 0,
              width: 80,
              height: 40,
            }}
          >
            <Text className="text-white text-xs font-semibold">Approve</Text>
          </View>
        </Animated.View>

        {/* Decline Indicator - Shows on RIGHT when swiping LEFT */}
        <Animated.View
          className="absolute top-1/2 right-5 z-10 w-20 h-10 -mt-5 will-change-transform"
          style={{
            opacity: getDeclineOpacity(),
          }}
        >
          {/* SVG Background */}
          <Svg width="80" height="40" className="absolute inset-0">
            <Defs>
              <LinearGradient id="declineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#FF3B30" />
                <Stop offset="100%" stopColor="#DC143C" />
              </LinearGradient>
            </Defs>
            <Rect width="80" height="40" fill="url(#declineGrad)" rx="20" />
          </Svg>
          {/* Text perfectly centered with exact pixel dimensions */}
          <View 
            className="absolute justify-center items-center"
            style={{
              top: 0,
              left: 0,
              width: 80,
              height: 40,
            }}
          >
            <Text className="text-white text-xs font-semibold">Decline</Text>
          </View>
        </Animated.View>

        {/* Card Content */}
        <View className="flex-1 relative">
          {children}
          
          {/* Color Overlay - Shades the card content based on swipe direction */}
          <Animated.View
            className="absolute inset-0 rounded-2xl will-change-transform pointer-events-none"
            style={{
              backgroundColor: getOverlayColor(),
            }}
          />
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
} 