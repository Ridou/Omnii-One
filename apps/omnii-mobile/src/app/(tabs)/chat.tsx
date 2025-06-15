import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { useXPContext } from '~/context/XPContext';
import { Mascot, MascotContainer, useMascotCheering } from '~/components/common/Mascot';
import { XPProgressBar } from '~/components/common/XPProgressBar';
import { MascotSize, CheeringTrigger, getMascotStageByLevel } from '~/types/mascot';
import { cn } from '~/utils/cn';
import { useResponsiveDesign } from '~/utils/responsive';
import type { ChatTab } from '~/types/chat';
import { AuthGuard } from '~/components/common/AuthGuard';

// Hooks
import { useTasks, useTaskMutations } from '~/hooks/useTasks';
import { useCalendar } from '~/hooks/useCalendar';
import { useConcepts } from '~/hooks/useNeo4j';
import { useChatState } from '~/hooks/useChatState';
import { useChatAnimations } from '~/hooks/useChatAnimations';
import { useChatActions } from '~/hooks/useChatActions';

// Components
import { ChatLayout } from '~/components/chat/ChatLayout';
import { ConversationContent } from '~/components/chat/ConversationContent';
import { ActionsContent } from '~/components/chat/ActionsContent';
import { ReferencesContent } from '~/components/chat/ReferencesContent';
import { MemoryContent } from '~/components/chat/MemoryContent';
import { ProgressIndicator } from '~/components/chat/ProgressIndicator';

// Constants
import { CHAT_TABS } from '~/constants/chat';

/**
 * Main Chat Screen Component
 * 
 * This component serves as the primary interface for AI-powered chat interactions.
 * It integrates with various data sources (tasks, calendar, email) and provides
 * a multi-tab interface for different types of interactions.
 */
export default function ChatScreen() {
    // Context hooks
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { currentLevel, currentXP } = useXPContext();
    const responsive = useResponsiveDesign();

    // Mascot hooks
    const { cheeringState, triggerCheering } = useMascotCheering();
    const mascotStage = getMascotStageByLevel(currentLevel);

    // Data hooks
    const tasksData = useTasks();
    const calendarData = useCalendar();
    const conceptsData = useConcepts();
    const taskMutations = useTaskMutations();

    // Chat state and handlers
    const chatState = useChatState();
    const { scaleAnimations, animateTabPress } = useChatAnimations();
    const { handleTaskAction, handleCalendarAction, handleContactAction, handleEmailAction } = useChatActions();

    // Handle tab press with animation
    const handleTabPress = (tabKey: ChatTab) => {
        animateTabPress(tabKey);
        chatState.setSelectedTab(tabKey);
    };

    // Render tab content based on selected tab
    const renderTabContent = () => {
        switch (chatState.selectedTab) {
            case 'conversation':
                return (
                    <ConversationContent
                        messages={chatState.messages}
                        error={chatState.error}
                        isConnected={chatState.isConnected}
                        isTyping={chatState.isTyping}
                        pendingAction={chatState.pendingAction}
                        flatListRef={chatState.flatListRef}
                        onRetry={chatState.reconnect}
                        onEmailAction={chatState.handleEmailAction || handleEmailAction}
                        onTaskAction={handleTaskAction}
                        onContactAction={handleContactAction}
                        onCalendarAction={handleCalendarAction}
                        onEditMessage={chatState.handleEditMessage}
                        onPromptSelect={chatState.setMessageInput}
                        tasksOverview={tasksData.tasksOverview}
                    />
                );
            case 'actions':
                return (
                    <ActionsContent
                        onActionTap={chatState.handleActionTap}
                    />
                );
            case 'references':
                return <ReferencesContent />;
            case 'memory':
                return (
                    <MemoryContent
                        tasksOverview={tasksData.tasksOverview}
                        calendarData={calendarData.calendarData}
                        conceptsData={conceptsData}
                        onTaskAction={handleTaskAction}
                        onCalendarAction={handleCalendarAction}
                        onContactAction={handleContactAction}
                        onEmailAction={handleEmailAction}
                    />
                );
            default:
                return null;
        }
    };

    // Desktop/Tablet responsive content renderer
    const renderResponsiveContent = () => {
        // For now, just return the tab content directly
        // In the future, we can add desktop-specific layouts here
        return renderTabContent();
    };

    // Chat header component
    const ChatHeader = () => (
        <View className="flex-row items-start justify-between">
            <View className="flex-1">
                <Text className={cn(
                    "text-3xl font-bold mb-1",
                    isDark ? "text-white" : "text-gray-900"
                )}>💬 Chat</Text>
                <XPProgressBar 
                    variant="compact"
                    size="small" 
                    showText={true} 
                    showLevel={true}
                />
            </View>
            
            {/* Shape of AI - Header Progress Indicator (Center) */}
            <View className="items-center justify-center px-4">
                <ProgressIndicator
                    isProcessing={chatState.isTyping || !!chatState.pendingAction}
                    currentStage={
                        chatState.isTyping ? {
                            stage: 'response_generation',
                            percentage: 75,
                            details: 'AI is generating response...'
                        } : chatState.pendingAction ? {
                            stage: 'context_analysis',
                            percentage: 25,
                            details: 'Processing your request...'
                        } : undefined
                    }
                    stages={[]} // TODO: Implement stage history
                    activeRequestCount={chatState.isTyping ? 1 : 0}
                    queueLength={0} // TODO: Connect to actual queue
                />
            </View>
            
            <View style={{ width: 80, alignItems: 'flex-end' }}>
                <MascotContainer position="header">
                    <Mascot
                        stage={mascotStage}
                        level={currentLevel}
                        size={MascotSize.STANDARD}
                        showLevel={true}
                        enableInteraction={true}
                        enableCheering={!responsive.effectiveIsDesktop}
                        cheeringTrigger={cheeringState.trigger}
                        onTap={() => !responsive.effectiveIsDesktop && triggerCheering(CheeringTrigger.TAP_INTERACTION)}
                    />
                </MascotContainer>
            </View>
        </View>
    );

    // Input props for conversation tab
    const inputProps = chatState.selectedTab === 'conversation' ? {
        messageInput: chatState.messageInput,
        setMessageInput: chatState.setMessageInput,
        onSend: chatState.handleSendMessage,
        getSendButtonState: chatState.getSendButtonState,
        getPlaceholder: chatState.getPlaceholder,
        isTyping: chatState.isTyping,
        pendingAction: chatState.pendingAction
    } : undefined;

    // Use unified layout with authentication guard
    return (
        <AuthGuard>
            <ChatLayout
                header={<ChatHeader />}
                selectedTab={chatState.selectedTab}
                onTabPress={handleTabPress}
                scaleAnimations={scaleAnimations}
                showInput={chatState.selectedTab === 'conversation'}
                inputProps={inputProps}
            >
                {renderTabContent()}
            </ChatLayout>
        </AuthGuard>
    );
}