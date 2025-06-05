import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  StyleSheet,
  Keyboard,
  Alert
} from 'react-native';
import { useChat } from '~/hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ConnectionStatus } from './ConnectionStatus';
import { AppColors } from '~/constants/Colors';
import { Send } from 'lucide-react-native';

export function ChatInterface() {
  const { 
    messages, 
    isConnected, 
    isTyping, 
    error, 
    sendMessage, 
    clearError,
    reconnect 
  } = useChat();
  
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const flatListRef = useRef<FlatList>(null);
  
  const handleSend = () => {
    if (inputText.trim() && isConnected) {
      sendMessage(inputText.trim());
      setInputText('');
      setInputHeight(40); // Reset height
      Keyboard.dismiss();
    }
  };
  
  const handleContentSizeChange = (event: any) => {
    const height = Math.min(Math.max(40, event.nativeEvent.contentSize.height), 120);
    setInputHeight(height);
  };
  
  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);
  
  useEffect(() => {
    // Handle errors silently - ConnectionStatus component will show the error state
    if (error) {
      console.log('Chat connection error:', error);
      // Auto-clear error after showing in connection status
      setTimeout(clearError, 3000);
    }
  }, [error, clearError]);
  
  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <ActivityIndicator size="small" color={AppColors.aiGradientStart} />
          <Text style={styles.typingText}>AI is typing...</Text>
        </View>
      </View>
    );
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ConnectionStatus isConnected={isConnected} />
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ChatMessage message={item} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderTypingIndicator}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />
      
      <View style={styles.inputContainer}>
        <View style={[styles.inputWrapper, { minHeight: inputHeight + 24 }]}>
          <TextInput
            style={[styles.input, { height: inputHeight }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isConnected ? "Ask me anything..." : "Connecting..."}
            placeholderTextColor={AppColors.textSecondary}
            multiline
            maxLength={500}
            editable={isConnected}
            onContentSizeChange={handleContentSizeChange}
            returnKeyType="default"
            textAlignVertical="center"
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputText.trim() || !isConnected) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || !isConnected}
          >
            <Send 
              size={20} 
              color={inputText.trim() && isConnected ? '#FFFFFF' : AppColors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  messageList: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    backgroundColor: AppColors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: AppColors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: AppColors.textPrimary,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.aiGradientStart,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: AppColors.borderLight,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '80%',
    ...AppColors.shadows.small,
  },
  typingText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginLeft: 8,
    fontStyle: 'italic',
  },
});