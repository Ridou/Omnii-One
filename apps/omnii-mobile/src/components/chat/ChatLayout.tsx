import React from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '~/context/ThemeContext';
import { useResponsiveDesign } from '~/utils/responsive';
import { cn } from '~/utils/cn';
import type { ChatTab } from '~/types/chat';
import { ChatTabs } from './ChatTabs';
import { ChatInput } from './ChatInput';

interface ChatLayoutProps {
  children: React.ReactNode;
  header: React.ReactNode;
  selectedTab: ChatTab;
  onTabPress: (tab: ChatTab) => void;
  scaleAnimations: any;
  showInput?: boolean;
  inputProps?: any;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  header,
  selectedTab,
  onTabPress,
  scaleAnimations,
  showInput = false,
  inputProps
}) => {
  const { isDark } = useTheme();
  const responsive = useResponsiveDesign();

  // Desktop layout
  if (responsive.effectiveIsDesktop) {
    return (
      <View className={cn(
        "flex-1",
        isDark ? "bg-slate-900" : "bg-gray-50"
      )}>
        {/* Desktop Header */}
        <View className={cn(
          "px-8 py-6 border-b",
          isDark ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"
        )}>
          <View className="max-w-7xl mx-auto">
            {header}
          </View>
        </View>

        {/* Desktop Content Area */}
        <View className="flex-1 flex-row">
          {/* Sidebar with tabs */}
          <View className={cn(
            "w-72 border-r",
            isDark ? "border-slate-700 bg-slate-800/50" : "border-gray-200 bg-gray-50"
          )}>
            <ScrollView className="flex-1 py-6">
              <DesktopChatTabs
                selectedTab={selectedTab}
                onTabPress={onTabPress}
              />
            </ScrollView>
          </View>

          {/* Main content area */}
          <View className="flex-1 flex-col">
            <View className={cn(
              "flex-1 overflow-hidden",
              isDark ? "bg-slate-900" : "bg-white"
            )}>
              {children}
            </View>
            
            {/* Input area for desktop */}
            {showInput && inputProps && (
              <View className={cn(
                "border-t",
                isDark ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-gray-50"
              )}>
                <View className="max-w-4xl mx-auto w-full px-8 py-4">
                  <ChatInput {...inputProps} />
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Tablet layout
  if (responsive.effectiveIsTablet) {
    return (
      <SafeAreaView className={cn(
        "flex-1",
        isDark ? "bg-slate-900" : "bg-gray-50"
      )}>
        {/* Tablet Header */}
        <View className={cn(
          "px-6 py-5 border-b",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          {header}
        </View>

        {/* Horizontal scrolling tabs for tablet */}
        <View className={cn(
          "border-b",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="px-4"
          >
            <ChatTabs
              selectedTab={selectedTab}
              onTabPress={onTabPress}
              scaleAnimations={scaleAnimations}
            />
          </ScrollView>
        </View>

        {/* Content */}
        <View className="flex-1">
          {children}
        </View>

        {/* Input area for tablet */}
        {showInput && inputProps && (
          <ChatInput {...inputProps} />
        )}
      </SafeAreaView>
    );
  }

  // Mobile layout (default)
  return (
    <SafeAreaView className={cn(
      "flex-1",
      isDark ? "bg-slate-900" : "bg-gray-50"
    )}>
      {/* Mobile Header */}
      <View className={cn(
        "px-5 py-4 border-b",
        isDark ? "border-slate-700" : "border-gray-200"
      )}>
        {header}
      </View>

      {/* Mobile Tabs */}
      <ChatTabs
        selectedTab={selectedTab}
        onTabPress={onTabPress}
        scaleAnimations={scaleAnimations}
      />

      {/* Content */}
      <View className="flex-1">
        {children}
      </View>

      {/* Input area for mobile */}
      {showInput && inputProps && (
        <ChatInput {...inputProps} />
      )}
    </SafeAreaView>
  );
};

// Desktop vertical tabs component
const DesktopChatTabs: React.FC<{
  selectedTab: ChatTab;
  onTabPress: (tab: ChatTab) => void;
}> = ({ selectedTab, onTabPress }) => {
  const { isDark } = useTheme();
  
  const tabs = [
    { key: 'conversation' as const, label: 'Chat', icon: '💬' },
    { key: 'actions' as const, label: 'Actions', icon: '⚡' },
    { key: 'references' as const, label: 'References', icon: '📚' },
    { key: 'memory' as const, label: 'Memory', icon: '🧠' }
  ];

  return (
    <View className="px-4">
      <Text className={cn(
        "text-xs font-semibold uppercase tracking-wider mb-4 px-3",
        isDark ? "text-slate-500" : "text-gray-500"
      )}>Navigation</Text>
      
      <View className="space-y-1">
        {tabs.map((tab) => {
          const isActive = selectedTab === tab.key;
          
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabPress(tab.key)}
              className={cn(
                "flex-row items-center px-4 py-3 rounded-xl transition-all",
                isActive
                  ? isDark 
                    ? "bg-indigo-600" 
                    : "bg-indigo-50 border border-indigo-200"
                  : isDark
                    ? "hover:bg-slate-700/50"
                    : "hover:bg-gray-100"
              )}
              activeOpacity={0.7}
            >
              <View className={cn(
                "w-10 h-10 rounded-lg items-center justify-center mr-3",
                isActive
                  ? isDark ? "bg-indigo-700" : "bg-indigo-100"
                  : isDark ? "bg-slate-700" : "bg-gray-100"
              )}>
                <Text className="text-xl">{tab.icon}</Text>
              </View>
              <Text className={cn(
                "font-medium text-base",
                isActive 
                  ? isDark ? "text-white" : "text-indigo-700"
                  : isDark ? "text-slate-300" : "text-gray-700"
              )}>
                {tab.label}
              </Text>
              {isActive && (
                <View className="ml-auto">
                  <View className={cn(
                    "w-2 h-2 rounded-full",
                    isDark ? "bg-white" : "bg-indigo-600"
                  )} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};