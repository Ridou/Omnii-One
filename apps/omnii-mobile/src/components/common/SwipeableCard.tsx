import React from 'react';
import { View, Text } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { cn } from '@/utils/cn';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

interface SwipeableCardProps {
  children: React.ReactNode;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
  className?: string; // Added for extensibility
}

export function SwipeableCard({ 
  children, 
  onApprove, 
  onReject, 
  disabled = false,
  className 
}: SwipeableCardProps) {
  const { gestureHandler, translateX, scale } = useSwipeGestures({
    onApprove,
    onReject,
    disabled,
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value }
    ],
  }));

  const approveBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 120], [0, 0.95], 'clamp'),
  }));

  const rejectBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-120, 0], [0.95, 0], 'clamp'),
  }));

  const approveIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [40, 120], [0, 1], 'clamp'),
    transform: [
      { 
        scale: interpolate(translateX.value, [40, 120], [0.8, 1.2], 'clamp')
      }
    ],
  }));

  const rejectIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-120, -40], [1, 0], 'clamp'),
    transform: [
      { 
        scale: interpolate(translateX.value, [-120, -40], [1.2, 0.8], 'clamp')
      }
    ],
  }));

  return (
    <View className={cn("relative mb-3", className)}>
      {/* Approve background gradient (right side) */}
      <Animated.View 
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={approveBackgroundStyle}
      >
        <Svg height="100%" width="100%" className="absolute inset-0">
          <Defs>
            <LinearGradient id="approveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#00b894" stopOpacity="1" />
              <Stop offset="50%" stopColor="#55efc4" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#00b894" stopOpacity="0.8" />
            </LinearGradient>
            <LinearGradient id="approveShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <Stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#approveGradient)" />
          <Rect width="100%" height="100%" fill="url(#approveShimmer)" />
        </Svg>
      </Animated.View>

      {/* Reject background gradient (left side) */}
      <Animated.View 
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={rejectBackgroundStyle}
      >
        <Svg height="100%" width="100%" className="absolute inset-0">
          <Defs>
            <LinearGradient id="rejectGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#e17055" stopOpacity="1" />
              <Stop offset="50%" stopColor="#fd79a8" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#e17055" stopOpacity="0.8" />
            </LinearGradient>
            <LinearGradient id="rejectShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <Stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#rejectGradient)" />
          <Rect width="100%" height="100%" fill="url(#rejectShimmer)" />
        </Svg>
      </Animated.View>
      
      {/* Approve indicator (right side) */}
      <Animated.View 
        className="absolute right-5 top-0 bottom-0 justify-center items-center z-20"
        style={approveIndicatorStyle}
      >
        <View className="items-center">
          <View 
            className="w-12 h-12 rounded-full justify-center items-center mb-1.5"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text className="text-white text-2xl font-bold">✓</Text>
          </View>
          <Text 
            className="text-white text-xs font-bold uppercase tracking-wider"
            style={{
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            Approve
          </Text>
        </View>
      </Animated.View>
      
      {/* Reject indicator (left side) */}
      <Animated.View 
        className="absolute left-5 top-0 bottom-0 justify-center items-center z-20"
        style={rejectIndicatorStyle}
      >
        <View className="items-center">
          <View 
            className="w-12 h-12 rounded-full justify-center items-center mb-1.5"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text className="text-white text-xl font-bold">✕</Text>
          </View>
          <Text 
            className="text-white text-xs font-bold uppercase tracking-wider"
            style={{
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            Decline
          </Text>
        </View>
      </Animated.View>

      {/* Main card content */}
      <PanGestureHandler onGestureEvent={gestureHandler} enabled={!disabled}>
        <Animated.View style={cardAnimatedStyle}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
} 