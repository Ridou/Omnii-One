import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import type { ChatTab } from '~/types/chat';
import { CHAT_TABS } from '~/constants/chat';
import { cn } from '~/utils/cn';

interface ChatTabsProps {
  selectedTab: ChatTab;
  onTabPress: (tab: ChatTab) => void;
  scaleAnimations: Record<ChatTab, Animated.Value>;
}

export const ChatTabs: React.FC<ChatTabsProps> = ({
  selectedTab,
  onTabPress,
  scaleAnimations
}) => {
  return (
    <View className="flex-row px-4 pb-4 pt-2 gap-2">
      {CHAT_TABS.map((tab) => {
        const isActive = selectedTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            className="flex-1 h-[72px] rounded-2xl overflow-hidden"
            style={[
              isActive && {
                elevation: 3,
                shadowColor: tab.gradient[0],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
              }
            ]}
            onPress={() => onTabPress(tab.key)}
          >
            <Animated.View
              className="flex-1 relative overflow-hidden rounded-xl"
              style={{
                transform: [{ scale: scaleAnimations[tab.key] }],
              }}
            >
              <Svg width="100%" height="100%" className="absolute inset-0">
                <Defs>
                  <LinearGradient
                    id={`gradient-${tab.key}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={tab.gradient[0]} />
                    <Stop offset="100%" stopColor={tab.gradient[1]} />
                  </LinearGradient>
                </Defs>
                <Rect
                  width="100%"
                  height="100%"
                  fill={`url(#gradient-${tab.key})`}
                  rx="12"
                />
              </Svg>
              <View className="absolute inset-0 flex-1 justify-center items-center" style={{ zIndex: 20 }}>
                <Text 
                  className="text-2xl font-bold mb-0.5"
                  style={{ 
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  {tab.icon}
                </Text>
                <Text 
                  className="text-xs font-bold text-white text-center"
                  style={{ 
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 1,
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};