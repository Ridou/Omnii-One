import { useRef } from 'react';
import { Animated } from 'react-native';
import type { ChatTab } from '~/types/chat';
import { CHAT_TABS } from '~/constants/chat';

export const useChatAnimations = () => {
  const scaleAnimations = useRef(
    CHAT_TABS.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(1);
      return acc;
    }, {} as Record<ChatTab, Animated.Value>)
  ).current;

  const animateTabPress = (tabKey: ChatTab) => {
    const scaleAnim = scaleAnimations[tabKey];

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
  };

  return {
    scaleAnimations,
    animateTabPress
  };
};