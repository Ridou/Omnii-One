import React from 'react';
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { UpArrowIcon } from '~/icons/ChatIcons';

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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={cn(
        "px-4 py-3 border-t",
        isDark ? "border-slate-700 bg-slate-850" : "border-gray-200 bg-gray-50"
      )}
    >
      <View className="flex-row items-end gap-3">
        <View className="flex-1">
          <TextInput
            className={cn(
              "rounded-2xl px-5 py-3.5 text-base border min-h-[48px] max-h-[120px]",
              isDark 
                ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400" 
                : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-500",
              "shadow-sm"
            )}
            placeholder={getPlaceholder()}
            value={messageInput}
            onChangeText={setMessageInput}
            multiline
            maxLength={500}
            editable={!isTyping && !pendingAction}
            placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'}
            style={{ 
              fontSize: 16,
              lineHeight: 22,
              textAlignVertical: 'center'
            }}
          />
        </View>
        <TouchableOpacity
          className={cn(
            "w-12 h-12 rounded-2xl items-center justify-center shadow-sm",
            sendButtonState === 'enabled' 
              ? "bg-indigo-600 active:bg-indigo-700" 
              : isDark ? "bg-slate-700" : "bg-gray-300",
            "transition-colors duration-150"
          )}
          onPress={onSend}
          disabled={sendButtonState !== 'enabled'}
        >
          <UpArrowIcon 
            size={22} 
            color={sendButtonState === 'enabled' ? 'white' : isDark ? '#64748b' : '#9ca3af'} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};