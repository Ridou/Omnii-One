import React from 'react';
import { View, ScrollView, Platform, TouchableOpacity, Text, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveDesign } from '~/utils/responsive';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface TabConfig {
  key: string;
  label: string;
  icon: string;
  gradient: string[];
}

interface ResponsiveTabLayoutProps<T = string> {
  tabs: TabConfig[];
  selectedTab: T;
  onTabPress: (tabKey: T) => void;
  scaleAnimations: Record<string, Animated.Value>;
  header?: React.ReactNode;
  renderTabContent: () => React.ReactNode;
  inputArea?: React.ReactNode;
  className?: string;
}

export const ResponsiveTabLayout = <T = string>({
  tabs,
  selectedTab,
  onTabPress,
  scaleAnimations,
  header,
  renderTabContent,
  inputArea,
  className
}: ResponsiveTabLayoutProps<T>) => {
  const responsive = useResponsiveDesign();
  const { isDark } = useTheme();

  const handleTabPress = (tabKey: string) => {
    const scaleAnim = scaleAnimations[tabKey];

    if (scaleAnim) {
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
    }

    onTabPress(tabKey as T);
  };

  // Mobile layout (preserve existing)
  if (responsive.isMobile) {
    return (
      <SafeAreaView className={cn(
        "flex-1",
        isDark ? "bg-slate-900" : "bg-white",
        className
      )}>
        {header}
        
        {/* Mobile tabs row */}
        <View className="flex-row px-5 pb-5 pt-2 gap-3">
          {tabs.map((tab) => (
            <MobileTabButton
              key={tab.key}
              tab={tab}
              isActive={selectedTab === tab.key}
              onPress={() => handleTabPress(tab.key)}
              scaleAnimation={scaleAnimations[tab.key]}
            />
          ))}
        </View>

        <View className="flex-1">
          {renderTabContent()}
        </View>

        {inputArea}
      </SafeAreaView>
    );
  }

  // Desktop layout with sidebar
  if (responsive.isDesktop) {
    return (
      <SafeAreaView className={cn(
        "flex-1 flex-row",
        isDark ? "bg-slate-900" : "bg-white",
        className
      )}>
        {/* Desktop Sidebar */}
        <View className={cn(
          "w-80 border-r",
          isDark ? "bg-slate-800 border-slate-600" : "bg-gray-50 border-gray-200"
        )}>
          {header && (
            <View className={cn(
              "p-6 border-b",
              isDark ? "border-slate-600" : "border-gray-200"
            )}>
              {header}
            </View>
          )}
          
          {/* Desktop tab navigation */}
          <ScrollView className="flex-1 p-4">
            <View className="gap-2">
              {tabs.map((tab) => (
                <DesktopTabButton
                  key={tab.key}
                  tab={tab}
                  isActive={selectedTab === tab.key}
                  onPress={() => handleTabPress(tab.key)}
                />
              ))}
            </View>
          </ScrollView>

          {inputArea && (
            <View className={cn(
              "p-4 border-t",
              isDark ? "border-slate-600" : "border-gray-200"
            )}>
              {inputArea}
            </View>
          )}
        </View>

        {/* Desktop main content */}
        <View className="flex-1">
          <DesktopContentArea>
            {renderTabContent()}
          </DesktopContentArea>
        </View>
      </SafeAreaView>
    );
  }

  // Tablet layout (hybrid)
  return (
    <SafeAreaView className={cn(
      "flex-1",
      isDark ? "bg-slate-900" : "bg-white",
      className
    )}>
      {header}
      
      {/* Tablet tabs - larger with better spacing */}
      <View className="flex-row px-6 pb-6 pt-3 gap-4">
        {tabs.map((tab) => (
          <TabletTabButton
            key={tab.key}
            tab={tab}
            isActive={selectedTab === tab.key}
            onPress={() => handleTabPress(tab.key)}
            scaleAnimation={scaleAnimations[tab.key]}
          />
        ))}
      </View>

      <View className="flex-1 px-6">
        <TabletContentArea>
          {renderTabContent()}
        </TabletContentArea>
      </View>

      {inputArea && (
        <View className="px-6">
          {inputArea}
        </View>
      )}
    </SafeAreaView>
  );
};

// Mobile tab button (preserves existing design)
const MobileTabButton: React.FC<{
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
  scaleAnimation?: Animated.Value;
}> = ({ tab, isActive, onPress, scaleAnimation }) => {
  return (
    <TouchableOpacity
      className="flex-1 h-20 rounded-xl overflow-hidden"
      style={[
        isActive && {
          elevation: 4,
          shadowColor: tab.gradient[0],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }
      ]}
      onPress={onPress}
    >
      <Animated.View
        className="flex-1 relative overflow-hidden rounded-xl"
        style={{
          transform: scaleAnimation ? [{ scale: scaleAnimation }] : [{ scale: 1 }],
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
};

// Desktop tab button with clean, professional design
const DesktopTabButton: React.FC<{
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
}> = ({ tab, isActive, onPress }) => {
  const { isDark } = useTheme();
  
  return (
    <TouchableOpacity
      className={cn(
        "flex-row items-center p-4 rounded-xl border transition-all",
        isActive 
          ? isDark 
            ? "bg-indigo-900/30 border-indigo-600/50" 
            : "bg-indigo-50 border-indigo-200"
          : isDark
            ? "hover:bg-slate-700 border-transparent"
            : "hover:bg-gray-50 border-transparent"
      )}
      onPress={onPress}
    >
      <Text className="text-2xl mr-3">{tab.icon}</Text>
      <Text className={cn(
        "font-semibold text-base",
        isActive 
          ? isDark ? "text-indigo-300" : "text-indigo-700"
          : isDark ? "text-gray-300" : "text-gray-700"
      )}>{tab.label}</Text>
      {isActive && (
        <View className={cn(
          "ml-auto w-2 h-2 rounded-full",
          isDark ? "bg-indigo-400" : "bg-indigo-600"
        )} />
      )}
    </TouchableOpacity>
  );
};

// Tablet tab button (enhanced mobile design)
const TabletTabButton: React.FC<{
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
  scaleAnimation?: Animated.Value;
}> = ({ tab, isActive, onPress, scaleAnimation }) => {
  return (
    <TouchableOpacity
      className="flex-1 h-24 rounded-xl overflow-hidden"
      style={[
        isActive && {
          elevation: 6,
          shadowColor: tab.gradient[0],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        }
      ]}
      onPress={onPress}
    >
      <Animated.View
        className="flex-1 relative overflow-hidden rounded-xl"
        style={{
          transform: scaleAnimation ? [{ scale: scaleAnimation }] : [{ scale: 1 }],
        }}
      >
        <Svg width="100%" height="100%" className="absolute inset-0">
          <Defs>
            <LinearGradient
              id={`tablet-gradient-${tab.key}`}
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
            fill={`url(#tablet-gradient-${tab.key})`}
            rx="12"
          />
        </Svg>
        <View className="absolute inset-0 flex-1 justify-center items-center" style={{ zIndex: 20 }}>
          <Text 
            className="text-3xl font-bold mb-1"
            style={{ 
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {tab.icon}
          </Text>
          <Text 
            className="text-sm font-bold text-white text-center"
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
};

// Content area wrappers
const DesktopContentArea: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const responsive = useResponsiveDesign();
  
  return (
    <View className="flex-1 p-8">
      <View 
        className="mx-auto w-full h-full"
        style={{ maxWidth: responsive.layout.maxContentWidth }}
      >
        {children}
      </View>
    </View>
  );
};

const TabletContentArea: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View className="flex-1">
    {children}
  </View>
);

export default ResponsiveTabLayout; 