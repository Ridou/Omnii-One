import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Image, Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { AppColors } from '~/constants/Colors';

interface AIInsightsBannerProps {
  onPress: () => void;
}

export default function AIInsightsBanner({ onPress }: AIInsightsBannerProps) {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const logoGlowAnim = useRef(new Animated.Value(1)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  
  const [currentInsight, setCurrentInsight] = useState(0);
  const { width: screenWidth } = Dimensions.get('window');
  
  const insights = [
    "You've completed 80% of today's priorities - amazing!",
    "🔥 High Priority: Follow up with Sarah about Q2 planning",
    "3 emails need responses - shall I draft replies?",
    "Your next meeting starts in 15 minutes",
    "Time for a 5-minute break - you've been focused for 90 minutes"
  ];

  useEffect(() => {
    // Shimmer animation
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Logo glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlowAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoGlowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Logo rotation animation
    Animated.loop(
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();

    // Rotate insights every 5 seconds
    const interval = setInterval(() => {
      setCurrentInsight((prev) => (prev + 1) % insights.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [shimmerAnim, logoGlowAnim, logoRotateAnim]);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  const logoRotation = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Dynamic height based on screen size
  const bannerHeight = Math.max(100, screenWidth * 0.25);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View
        style={{
          width: screenWidth,
          height: bannerHeight,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* SVG Gradient Background */}
        <Svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          width="100%"
          height="100%"
        >
          <Defs>
            <LinearGradient id="bannerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={AppColors.aiGradientStart} />
              <Stop offset="100%" stopColor={AppColors.aiGradientEnd} />
            </LinearGradient>
            <LinearGradient id="shimmerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="transparent" />
              <Stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
              <Stop offset="100%" stopColor="transparent" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bannerGradient)" />
        </Svg>

        {/* Shimmer overlay */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateX: shimmerTranslateX }],
          }}
        >
          <Svg
            style={{
              flex: 1,
            }}
            width="100%"
            height="100%"
          >
            <Rect width="100%" height="100%" fill="url(#shimmerGradient)" />
          </Svg>
        </Animated.View>

        {/* Content - positioned absolutely within the gradient */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 24,
            paddingVertical: 16,
            justifyContent: 'space-between',
          }}
        >
          {/* Header with Logo and Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View
              style={{
                transform: [
                  { scale: logoGlowAnim },
                  { rotate: logoRotation }
                ],
                shadowColor: AppColors.aiGradientStart,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <Image
                source={require('~/assets/images/public/logos/omniiLogoPNG.png')}
                style={{
                  width: 32,
                  height: 32,
                }}
                resizeMode="contain"
              />
            </Animated.View>
            
            <Text
              style={{
                color: 'white',
                fontSize: 18,
                fontWeight: '700',
                marginLeft: 12,
              }}
            >
              AI Insights
            </Text>
          </View>

          {/* Task Example Text */}
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 4 }}>
            <Text
              style={{
                color: 'white',
                fontSize: 15,
                opacity: 0.95,
                lineHeight: 20,
                textAlign: 'left',
              }}
              numberOfLines={2}
            >
              "{insights[currentInsight]}"
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
} 