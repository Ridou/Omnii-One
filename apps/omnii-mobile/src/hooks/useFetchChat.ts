import { useState, useEffect, useCallback } from 'react';
import type { ChatState, ChatMessage, ChatContext } from '~/types/chat';

// Mock data following EXACT useFetchAnalytics.ts pattern
const mockChatContext: ChatContext = {
  userState: 'productive',
  recentActivity: [
    { type: 'task_completed', description: 'Finished presentation prep', timestamp: new Date() },
    { type: 'focus_session', description: '2.5h deep work completed', timestamp: new Date() }
  ],
  availableActions: [
    { id: '1', label: 'Review Analytics', icon: '📊', type: 'navigation', action: '/(tabs)/analytics' },
    { id: '2', label: 'Plan Tomorrow', icon: '📅', type: 'template', action: 'planning_template' },
    { id: '3', label: 'Voice Command', icon: '🎤', type: 'command', action: 'voice_input' }
  ],
  currentProjects: ['Quarterly Review', 'Team Onboarding', 'Process Documentation'],
  todayMetrics: { tasksCompleted: 8, focusTime: 5.2, energy: 87 }
};

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    content: 'Good morning! You\'ve completed 8 tasks and focused for 5.2 hours today. What would you like to work on next?',
    sender: 'ai',
    timestamp: new Date().toISOString(),
    confidence: 95,
    sources: [{ id: '1', name: 'Today\'s Analytics', type: 'analytics', confidence: 98 }],
    type: 'text',
    metadata: {
      reasoning: 'Based on your morning productivity pattern and current energy levels',
      alternatives: ['Review analytics', 'Plan tomorrow', 'Take a break'],
      context: ['high_energy', 'productive_morning', 'good_focus_streak']
    }
  }
];

export function useFetchChat() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    context: mockChatContext,
    isTyping: false,
    isListening: false,
    achievements: [],
    quickActions: mockChatContext.availableActions,
    isLoading: true,
    error: null
  });

  const fetchChatData = useCallback(async () => {
    setChatState(prev => ({ ...prev, isLoading: true }));
    try {
      // Simulate API call (IDENTICAL pattern to useFetchAnalytics)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setChatState(prev => ({
        ...prev,
        messages: mockMessages,
        context: mockChatContext,
        isLoading: false,
        error: null
      }));
    } catch (err) {
      setChatState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch chat data',
        isLoading: false
      }));
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true
    }));

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I understand. Let me help you with that based on your productivity patterns.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        confidence: 92,
        type: 'text',
        xpEarned: 5
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, aiResponse],
        isTyping: false
      }));
    }, 1500);
  }, []);

  useEffect(() => {
    fetchChatData();
  }, [fetchChatData]);

  return {
    ...chatState,
    sendMessage,
    refetch: fetchChatData,
  };
} 