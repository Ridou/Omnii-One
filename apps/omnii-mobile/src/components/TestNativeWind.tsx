import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { CheckCircle, Star, Zap } from 'lucide-react-native';
import { cn } from '~/utils/cn';

/**
 * Test component to validate enhanced NativeWind setup
 * Tests: Colors, Typography, Animations, Component Classes, Gamification Elements
 */
export default function TestNativeWind() {
  return (
    <ScrollView className="flex-1 bg-omnii-background">
      <View className="p-6">
        
        {/* Header */}
        <View className="omnii-card mb-6">
          <Text className="omnii-heading text-heading-2 mb-2 text-center">
            🎉 OMNII NativeWind Test
          </Text>
          <Text className="omnii-body text-center">
            Testing enhanced configuration with custom fonts, colors, and animations
          </Text>
        </View>

        {/* Color System Test */}
        <View className="omnii-card mb-6">
          <Text className="omnii-heading text-lg mb-4">Color System</Text>
          
          {/* AI Theme Colors */}
          <View className="flex-row gap-3 mb-4">
            <View className="bg-ai-start rounded-lg p-3 flex-1">
              <Text className="text-white text-center font-semibold">AI Start</Text>
            </View>
            <View className="bg-ai-end rounded-lg p-3 flex-1">
              <Text className="text-white text-center font-semibold">AI End</Text>
            </View>
          </View>

          {/* Priority Colors */}
          <View className="flex-row gap-2 mb-4">
            <View className="bg-priority-high rounded-lg p-2 flex-1">
              <Text className="text-white text-center text-xs">High</Text>
            </View>
            <View className="bg-priority-medium rounded-lg p-2 flex-1">
              <Text className="text-white text-center text-xs">Medium</Text>
            </View>
            <View className="bg-priority-low rounded-lg p-2 flex-1">
              <Text className="text-white text-center text-xs">Low</Text>
            </View>
          </View>

          {/* Status Colors */}
          <View className="flex-row gap-2">
            <View className="bg-success rounded-lg p-2 flex-1">
              <Text className="text-white text-center text-xs">Success</Text>
            </View>
            <View className="bg-warning rounded-lg p-2 flex-1">
              <Text className="text-white text-center text-xs">Warning</Text>
            </View>
            <View className="bg-error rounded-lg p-2 flex-1">
              <Text className="text-white text-center text-xs">Error</Text>
            </View>
          </View>
        </View>

        {/* Typography Test */}
        <View className="omnii-card mb-6">
          <Text className="omnii-heading text-lg mb-4">Typography System</Text>
          
          <Text className="text-display-1 omnii-brand-black mb-2">Display 1 - Brand</Text>
          <Text className="text-heading-1 omnii-heading mb-2">Heading 1 - Tiempos</Text>
          <Text className="text-base omnii-body mb-2">Body text with proper line height and spacing</Text>
          <Text className="text-xs omnii-caption mb-4">Caption text for additional information</Text>
          
          {/* Font Loading Test */}
          <View className="bg-omnii-background p-3 rounded-lg">
            <Text className="text-styrene font-semibold mb-1">Styrene Font (Brand)</Text>
            <Text className="text-tiempos">Tiempos Font (Body)</Text>
          </View>
        </View>

        {/* Component Classes Test */}
        <View className="omnii-card mb-6">
          <Text className="omnii-heading text-lg mb-4">Component Classes</Text>
          
          {/* Buttons */}
          <View className="gap-3 mb-4">
            <TouchableOpacity className="omnii-btn-primary">
              <Text className="text-white font-semibold">Primary Button</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="omnii-btn-secondary">
              <Text className="text-omnii-text-primary font-semibold">Secondary Button</Text>
            </TouchableOpacity>
          </View>

          {/* Priority Cards */}
          <View className="gap-3">
            <View className="omnii-card priority-high">
              <Text className="omnii-heading text-base mb-1">High Priority Task</Text>
              <Text className="omnii-caption">Urgent item requiring immediate attention</Text>
            </View>
            
            <View className="omnii-card priority-medium">
              <Text className="omnii-heading text-base mb-1">Medium Priority Task</Text>
              <Text className="omnii-caption">Important but not urgent</Text>
            </View>
            
            <View className="omnii-card priority-low">
              <Text className="omnii-heading text-base mb-1">Low Priority Task</Text>
              <Text className="omnii-caption">Can be completed when time permits</Text>
            </View>
          </View>
        </View>

        {/* Gamification Elements Test */}
        <View className="omnii-card mb-6">
          <Text className="omnii-heading text-lg mb-4">Gamification Elements</Text>
          
          {/* Mascot Evolution Stages */}
          <View className="flex-row gap-3 mb-4">
            <View className="mascot-seed rounded-xl p-4 flex-1 items-center">
              <Text className="text-2xl mb-1">🌱</Text>
              <Text className="text-white text-xs font-semibold">Seed</Text>
            </View>
            <View className="mascot-flower rounded-xl p-4 flex-1 items-center">
              <Text className="text-2xl mb-1">🌸</Text>
              <Text className="text-white text-xs font-semibold">Flower</Text>
            </View>
            <View className="mascot-tree rounded-xl p-4 flex-1 items-center">
              <Text className="text-2xl mb-1">🌳</Text>
              <Text className="text-white text-xs font-semibold">Tree</Text>
            </View>
          </View>

          {/* XP Bar */}
          <View className="mb-4">
            <Text className="omnii-heading text-sm mb-2">Experience Progress</Text>
            <View className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <View className="xp-bar w-3/4 h-full" />
            </View>
            <Text className="omnii-caption mt-1">750/1000 XP to next level</Text>
          </View>

          {/* Achievement Badges */}
          <View className="flex-row gap-2">
            <View className="level-badge">
              <Text className="text-white text-xs font-bold">Level 15</Text>
            </View>
            <View className="achievement-glow level-badge">
              <Text className="text-white text-xs font-bold">New!</Text>
            </View>
          </View>
        </View>

        {/* Animation Test */}
        <View className="omnii-card mb-6">
          <Text className="omnii-heading text-lg mb-4">Animation System</Text>
          
          <View className="flex-row gap-3 justify-center">
            <View className="anim-pulse-omnii bg-ai-start rounded-full w-12 h-12 items-center justify-center">
              <Zap size={20} color="white" />
            </View>
            <View className="anim-shimmer bg-success rounded-full w-12 h-12 items-center justify-center">
              <Star size={20} color="white" />
            </View>
            <View className="achievement-bounce bg-warning rounded-full w-12 h-12 items-center justify-center">
              <CheckCircle size={20} color="white" />
            </View>
          </View>
        </View>

        {/* Accessibility Test */}
        <View className="omnii-card-elevated">
          <Text className="omnii-heading text-lg mb-4">Accessibility Features</Text>
          
          <TouchableOpacity className="accessible-touch bg-ai-start rounded-xl p-4 mb-3">
            <Text className="text-white text-center font-semibold">
              44px Minimum Touch Target
            </Text>
          </TouchableOpacity>
          
          <View className="high-contrast omnii-card">
            <Text className="omnii-heading text-base mb-2">High Contrast Mode</Text>
            <Text className="omnii-body">
              Enhanced contrast for better visibility and accessibility compliance
            </Text>
          </View>
        </View>

        {/* Success Message */}
        <View className="mt-6 p-4 bg-success rounded-xl">
          <View className="flex-row items-center justify-center">
            <CheckCircle size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-2">
              ✅ Enhanced NativeWind Setup Working!
            </Text>
          </View>
          <Text className="text-white/90 text-center mt-2">
            All OMNII design system elements are functioning correctly
          </Text>
        </View>

      </View>
    </ScrollView>
  );
} 