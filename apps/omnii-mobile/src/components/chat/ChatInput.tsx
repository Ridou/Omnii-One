import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { UpArrowIcon } from '~/icons/ChatIcons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolateColor } from 'react-native-reanimated';

interface ChatInputProps {
  messageInput: string;
  setMessageInput: (value: string) => void;
  onSend: () => void;
  getSendButtonState: () => 'enabled' | 'disabled' | 'loading';
  getPlaceholder: () => string;
  isTyping: boolean;
  pendingAction: string | null;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  messageInput,
  setMessageInput,
  onSend,
  getSendButtonState,
  getPlaceholder,
  isTyping,
  pendingAction
}) => {
  const { isDark } = useTheme();
  const sendButtonState = getSendButtonState();
  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState(48);
  const [isFocused, setIsFocused] = useState(false);
  
  // Animations
  const focusAnimation = useSharedValue(0);
  const sendButtonScale = useSharedValue(1);

  // Handle key press events (Enter key support)
  const handleKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Enter') {
      if (nativeEvent.shiftKey) {
        // Shift+Enter: Add new line (default behavior)
        return;
      } else {
        // Enter: Send message (allow multiple requests)
        nativeEvent.preventDefault();
        if (messageInput.trim()) { // Allow sending even when AI is processing
          setIsFocused(false); // Hide helpers after sending
          inputRef.current?.blur(); // Remove focus from input
          onSend();
          Keyboard.dismiss();
        }
      }
    }
  };

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true);
    focusAnimation.value = withSpring(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusAnimation.value = withSpring(0);
  };

  // Handle send button press with animation
  const handleSendPress = () => {
    if (messageInput.trim()) { // Allow sending multiple requests even when AI is processing
      sendButtonScale.value = withSpring(0.95, { duration: 100 }, () => {
        sendButtonScale.value = withSpring(1);
      });
      setIsFocused(false); // Hide helpers after sending
      inputRef.current?.blur(); // Remove focus from input
      onSend();
    }
  };

  // Handle content size change for auto-expanding input
  const handleContentSizeChange = (event: any) => {
    const newHeight = Math.min(Math.max(48, event.nativeEvent.contentSize.height + 16), 120);
    setInputHeight(newHeight);
  };

  // Animated styles
  const inputContainerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      [isDark ? '#475569' : '#d1d5db', isDark ? '#6366f1' : '#6366f1']
    );
    
    return {
      borderColor,
      transform: [{ scale: withSpring(focusAnimation.value * 0.02 + 1) }],
    };
  });

  const sendButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sendButtonScale.value }],
    };
  });

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={cn(
        "px-3 py-2", // Reduced padding for sleeker design
        isDark ? "bg-slate-900" : "bg-gray-50"
      )}
    >
      {/* Shape of AI - Input Enhancement */}
      <Animated.View 
        style={inputContainerStyle}
        className={cn(
          "flex-row items-end rounded-2xl border-2 shadow-sm", // Enhanced border and shadow
          isDark ? "bg-slate-800" : "bg-white"
        )}
      >
        {/* Auto-expanding text input */}
        <View className="flex-1 px-4 py-2">
          <TextInput
            ref={inputRef}
            className={cn(
              "text-base leading-5", // Consistent line height
              isDark ? "text-white" : "text-gray-900"
            )}
            placeholder={getPlaceholder()}
            placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'}
            value={messageInput}
            onChangeText={setMessageInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyPress={handleKeyPress}
            onContentSizeChange={handleContentSizeChange}
            multiline
            maxLength={1000} // Increased limit
            editable={true} // Always allow typing
            style={{ 
              minHeight: 32,
              maxHeight: 88, // Constrained max height
              height: Math.max(32, inputHeight - 16),
              textAlignVertical: 'center'
            }}
            textBreakStrategy="balanced"
            returnKeyType="send"
            onSubmitEditing={() => {
              if (messageInput.trim()) {
                setIsFocused(false);
                inputRef.current?.blur();
                onSend();
              }
            }}
            blurOnSubmit={false}
          />
        </View>

        {/* Enhanced send button */}
        <View className="px-2 pb-2">
          <Animated.View style={sendButtonStyle}>
            <TouchableOpacity
              className={cn(
                "w-10 h-10 rounded-xl items-center justify-center shadow-md", // Slightly smaller, more elegant
                messageInput.trim()
                  ? "bg-indigo-600 active:bg-indigo-700" 
                  : (isDark ? "bg-slate-700" : "bg-gray-300"),
                "transition-colors duration-200" // Smooth color transitions
              )}
              onPress={handleSendPress}
              disabled={!messageInput.trim()} // Only disable if no input
              activeOpacity={0.8}
            >
              <UpArrowIcon 
                size={18} 
                color={messageInput.trim() ? 'white' : isDark ? '#64748b' : '#9ca3af'} 
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Shape of AI - Input Helpers */}
      {isFocused && messageInput.length === 0 && (
        <InputHelpers onPromptSelect={setMessageInput} />
      )}
    </KeyboardAvoidingView>
  );
};

// Shape of AI - Loading Indicator
const LoadingSpinner: React.FC = () => {
  const rotation = useSharedValue(0);
  
  React.useEffect(() => {
    rotation.value = withSpring(360, { duration: 1000 }, () => {
      rotation.value = 0;
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
    </Animated.View>
  );
};

// Shape of AI - Input Helpers (Templates/Suggestions)
const InputHelpers: React.FC<{ onPromptSelect: (prompt: string) => void }> = ({ 
  onPromptSelect 
}) => {
  const { isDark } = useTheme();
  
  const quickPrompts = [
    "What's my schedule today?",
    "Show my task list",
    "Check recent emails",
    "Create a new task"
  ];

  return (
    <View className="mt-2 px-1">
      <View className="flex-row flex-wrap gap-2">
        {quickPrompts.map((prompt, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onPromptSelect(prompt)}
            className={cn(
              "px-3 py-1.5 rounded-full border",
              isDark 
                ? "bg-slate-800 border-slate-600 active:bg-slate-700" 
                : "bg-white border-gray-200 active:bg-gray-50"
            )}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Text className={cn(
                "text-xs font-medium",
                isDark ? "text-slate-300" : "text-gray-700"
              )}>{prompt}</Text>
              <Text className={cn(
                "text-xs ml-1",
                isDark ? "text-slate-500" : "text-gray-400"
              )}>⏎</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      

    </View>
  );
};