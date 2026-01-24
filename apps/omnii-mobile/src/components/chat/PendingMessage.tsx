import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { AppColors } from '~/constants/Colors';

interface PendingMessageProps {
  action: string;
}

export function PendingMessage({ action }: PendingMessageProps) {
  const { isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Pulsing animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Dot animation
    const dotSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim1, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim2, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim3, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(dotAnim1, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim2, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim3, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    
    pulse.start();
    dotSequence.start();
    
    return () => {
      pulse.stop();
      dotSequence.stop();
    };
  }, [pulseAnim, dotAnim1, dotAnim2, dotAnim3]);
  
  const getActionDescription = (action: string) => {
    const lowerAction = action.toLowerCase();
    
    if (lowerAction.includes('event') || lowerAction.includes('calendar')) {
      return 'Creating calendar event';
    } else if (lowerAction.includes('email')) {
      if (lowerAction.includes('send')) {
        return 'Sending email';
      } else if (lowerAction.includes('draft')) {
        return 'Creating email draft';
      } else {
        return 'Fetching emails';
      }
    } else if (lowerAction.includes('contact')) {
      if (lowerAction.includes('add')) {
        return 'Adding contact';
      } else {
        return 'Searching contacts';
      }
    } else if (lowerAction.includes('task')) {
      return 'Creating task';
    } else {
      return 'Processing request';
    }
  };
  
  return (
    <View className="my-1 mx-4 items-start">
      <Animated.View 
        className={cn(
          "max-w-[80%] rounded-2xl rounded-bl-sm p-4 shadow-sm border",
          isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
        )}
        style={{
          transform: [{ scale: pulseAnim }]
        }}
      >
        <View className="flex-row items-center mb-3">
          <View 
            className="w-8 h-8 rounded-2xl justify-center items-center mr-3"
            style={{ backgroundColor: `${AppColors.aiGradientStart}20` }}
          >
            <Text className="text-base">⚡</Text>
          </View>
          <Text className={cn(
            "text-base font-semibold flex-1",
            isDark ? "text-white" : "text-gray-900"
          )}>
            {getActionDescription(action)}
          </Text>
          <View className="flex-row ml-2">
            <Animated.Text 
              className="text-base text-indigo-600 mx-0.5"
              style={{ opacity: dotAnim1 }}
            >
              •
            </Animated.Text>
            <Animated.Text 
              className="text-base text-indigo-600 mx-0.5"
              style={{ opacity: dotAnim2 }}
            >
              •
            </Animated.Text>
            <Animated.Text 
              className="text-base text-indigo-600 mx-0.5"
              style={{ opacity: dotAnim3 }}
            >
              •
            </Animated.Text>
          </View>
        </View>
        
        <View className={cn(
          "h-0.5 rounded-sm overflow-hidden mb-2",
          isDark ? "bg-slate-600" : "bg-gray-200"
        )}>
          <Animated.View 
            className="h-full bg-indigo-600 rounded-sm"
            style={{ width: '60%' }} // This could be dynamic based on actual progress
          />
        </View>
        
        <Text className={cn(
          "text-sm italic",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          Connecting to Google APIs...
        </Text>
      </Animated.View>
      
      <Text className={cn(
        "text-xs mt-1 mx-1",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>
        {new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );
}