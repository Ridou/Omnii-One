import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Animated,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { useOnboardingContext } from '~/context/OnboardingContext';
import { useChat } from '~/hooks/useChat';
import { ChatMessage } from '~/components/chat/ChatMessage';
import { PendingMessage } from '~/components/chat/PendingMessage';
import { ConnectionError } from '~/components/chat/ConnectionError';
import { AppColors } from '~/constants/Colors';
import { BRAND_COLORS } from '~/lib/assets';
import { cn } from '~/utils/cn';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import type { ChatTab, ChatTabConfig, ChatMessage as ChatMessageType } from '~/types/chat';
import { UpArrowIcon, RightArrowIcon, CalendarIcon, GmailIcon, ContactsIcon, TasksIcon } from '~/components/icons/ChatIcons';

import { trpc } from '~/utils/api';
import { useQuery } from "@tanstack/react-query";


// Tab configuration following EXACT profile.tsx pattern
const chatTabs: ChatTabConfig[] = [
    {
        key: 'conversation',
        label: 'Chat',
        icon: '💬',
        gradient: ['#667eea', '#764ba2'] // Purple gradient (position 1)
    },
    {
        key: 'actions',
        label: 'Actions',
        icon: '⚡',
        gradient: ['#4ECDC4', '#44A08D'] // Teal gradient (position 2)
    },
    {
        key: 'context',
        label: 'Context',
        icon: '🧠',
        gradient: ['#FFB347', '#FFD700'] // Orange-gold gradient (position 3)
    },
    {
        key: 'progress',
        label: 'Progress',
        icon: '🏆',
        gradient: ['#FF6B6B', '#EE5A24'] // Red-orange gradient (position 4)
    }
];


export default function ChatScreen() {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { recordFeatureVisit } = useOnboardingContext();
    const router = useRouter();

    const { data } = useQuery(trpc.hello.test);
    console.log('trpc data:',data)



    // Record feature visit for exploration tracking
    useEffect(() => {
        recordFeatureVisit('chat');
    }, []);

    // Use WebSocket chat hook instead of mock data
    const {
        messages,
        isConnected,
        isTyping,
        error,
        sendMessage,
        clearError,
        clearMessages,
        handleEmailAction,
        reconnect
    } = useChat();

    const [selectedTab, setSelectedTab] = useState<ChatTab>('conversation');
    const [messageInput, setMessageInput] = useState('');
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [showToolDropdown, setShowToolDropdown] = useState<string | null>(null); // 'add' | 'search' | null
    const flatListRef = useRef<FlatList>(null);

    // Mock data for other tabs (until WebSocket provides this)
    const context = {
        todayMetrics: { tasksCompleted: 0, focusTime: 0, energy: 0 },
        userState: 'productive',
        currentProjects: []
    };

    // Updated quickActions array - removed Drive, added Tasks
    const quickActions: Array<{
        id: string;
        icon?: string;
        iconComponent?: React.ReactNode;
        label: string;
        description: string;
        command: string;
    }> = [
            { id: '1', iconComponent: <GmailIcon size={20} />, label: 'Gmail', description: 'Check latest emails', command: 'check my latest emails' },
            { id: '2', iconComponent: <CalendarIcon size={20} color="white" />, label: 'Calendar', description: 'View today\'s events', command: 'show my calendar for this past week and this week and next week' },
            { id: '3', iconComponent: <ContactsIcon size={20} />, label: 'Contacts', description: 'Find contacts', command: 'list all contacts' },
            { id: '4', iconComponent: <TasksIcon size={20} />, label: 'Tasks', description: 'Manage tasks', command: 'show my tasks' },
        ];

    const achievements: Array<{
        id: string;
        title: string;
        description: string;
        progress: string;
        icon: string;
    }> = [];

    // Animation refs (SIMPLIFIED - no more glow effects)
    const scaleAnimations = useRef(
        chatTabs.reduce((acc, tab) => {
            acc[tab.key] = new Animated.Value(1);
            return acc;
        }, {} as Record<ChatTab, Animated.Value>)
    ).current;

    const handleTabPress = (tabKey: ChatTab) => {
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

        setSelectedTab(tabKey);
    };

    const handleSendMessage = () => {
        if (messageInput.trim() && isConnected) {
            const message = messageInput.trim();
            sendMessage(message);
            setMessageInput('');
            // Set pending action based on message content
            setPendingAction(message);
        }
    };

    // Enhanced send button state logic
    const getSendButtonState = () => {
        if (isTyping || pendingAction) return 'loading'; // ⏳
        if (!messageInput.trim() || !isConnected) return 'disabled'; // 🔼 grayed
        return 'enabled'; // 🔼 colored
    };

    // Smart placeholder logic
    const getPlaceholder = () => {
        if (!isConnected) return "Connecting...";
        if (isTyping || pendingAction) return "Processing...";
        return "💬 Ask me anything...";
    };

    // Handle quick action tap
    const handleQuickAction = (command: string) => {
        setMessageInput(command);
        // Focus the input after setting the command
        setTimeout(() => {
            if (command.endsWith(' ')) {
                // Commands ending with space (like "find contact ") should focus for user to continue typing
                return;
            }
            // Commands that are complete can be sent immediately if connected
            if (isConnected && command.trim()) {
                sendMessage(command);
                setMessageInput('');
                setPendingAction(command);
            }
        }, 100);
    };

    // Handle tool button taps
    const handleToolButton = (tool: string) => {
        if (showToolDropdown === tool) {
            // Close dropdown if already open
            setShowToolDropdown(null);
        } else {
            // Open the selected dropdown
            setShowToolDropdown(tool);
        }
    };

    // Tool dropdown actions - removed Drive references
    const toolDropdownActions = {
        add: [
            { id: 'email', iconComponent: <GmailIcon size={18} />, label: 'Compose Email', command: 'compose a new email' },
            { id: 'calendar', iconComponent: <CalendarIcon size={18} color="white" />, label: 'Create Event', command: 'create a calendar event' },
            { id: 'contact', iconComponent: <ContactsIcon size={18} />, label: 'Add Contact', command: 'add a new contact' },
            { id: 'task', iconComponent: <TasksIcon size={18} />, label: 'Create Task', command: 'create a new task' },
        ],
        search: [
            { id: 'gmail', iconComponent: <GmailIcon size={18} />, label: 'Search Gmail', command: 'search my emails for ' },
            { id: 'calendar', iconComponent: <CalendarIcon size={18} color="white" />, label: 'Find Events', command: 'find calendar events for ' },
            { id: 'contacts', iconComponent: <ContactsIcon size={18} />, label: 'Find Contacts', command: 'find contact ' },
            { id: 'tasks', iconComponent: <TasksIcon size={18} />, label: 'Search Tasks', command: 'search my tasks for ' },
        ],
    } as const;

    // Handle dropdown action selection
    const handleDropdownAction = (action: any) => {
        handleQuickAction(action.command);
        setShowToolDropdown(null); // Close dropdown
    };

    // Handle action card tap (for Actions tab)
    const handleActionTap = (action: any) => {
        if (action.command) {
            handleQuickAction(action.command);
            // Switch to conversation tab to see the result
            setSelectedTab('conversation');
        }
    };

    // Auto-scroll to TOP on new messages (stack behavior)
    useEffect(() => {
        if (messages.length > 0 && selectedTab === 'conversation') {

            // Scroll to TOP (index 0) where newest messages are
            setTimeout(() => {
                try {
                    flatListRef.current?.scrollToIndex({ index: 0, animated: true });
                } catch (error) {
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                }
            }, 300);
        }
    }, [messages, selectedTab]);

    // Watch for new user messages to set pending state
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.sender === 'user' && !pendingAction) {
                setPendingAction(lastMessage.content);
            }
        }
    }, [messages, pendingAction]);

    // Clear pending action when we receive a new AI message
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.sender === 'ai' && pendingAction) {
                setPendingAction(null);
            }
        }
    }, [messages, pendingAction]);

    // REMOVED: Glow effects as requested - clean, professional design
    // Chat tabs component
    const ChatTabs = () => (
        <View className="flex-row px-5 pb-5 pt-2 gap-3">
            {chatTabs.map((tab) => {
                const isActive = selectedTab === tab.key;

                return (
                    <TouchableOpacity
                        key={tab.key}
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
                        onPress={() => handleTabPress(tab.key)}
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

    // Tab content implementations
    const renderTabContent = () => {
        switch (selectedTab) {
            case 'conversation':
                return <ConversationContent />;
            case 'actions':
                return <ActionsContent />;
            case 'context':
                return <ContextContent />;
            case 'progress':
                return <ProgressContent />;
            default:
                return null;
        }
    };

    const ConversationContent = () => {
        return (
            <View className="flex-1">
                {error && !isConnected ? (
                    <ConnectionError error={error} onRetry={reconnect} />
                ) : messages.length === 0 ? (
                    <ScrollView
                        className="flex-1 px-5"
                        contentContainerStyle={{ paddingVertical: 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Simple Debug List */}
                        {__DEV__ && (
                            <View className={cn(
                                "rounded-2xl p-5 mb-4",
                                "bg-omnii-card",
                                isDark && "bg-omnii-dark-card"
                            )}>
                                <Text className={cn(
                                    "omnii-heading text-lg font-semibold mb-2",
                                    isDark && "text-omnii-dark-text-primary"
                                )}>
                                    🐛 DEBUG: Messages array is empty (length: {messages.length})
                                </Text>
                                <Text className={cn(
                                    "omnii-body text-sm",
                                    isDark && "text-omnii-dark-text-secondary"
                                )}>
                                    Showing nudges instead of FlatList
                                </Text>
                            </View>
                        )}

                        {/* Wayfinders - Shape of AI Nudges Pattern */}
                        <View className="mb-6">
                            <Text className={cn(
                                "omnii-heading text-xl font-bold mb-4",
                                isDark && "text-omnii-dark-text-primary"
                            )}>💡 Try asking me...</Text>
                            <View className="gap-2">
                                <TouchableOpacity
                                    className={cn(
                                        "rounded-xl p-4",
                                        "bg-omnii-card",
                                        isDark && "bg-omnii-dark-card"
                                    )}
                                    onPress={() => setMessageInput("What should I focus on today?")}
                                >
                                    <Text className={cn(
                                        "omnii-body text-sm",
                                        isDark && "text-omnii-dark-text-primary"
                                    )}>"What should I focus on today?"</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={cn(
                                        "rounded-xl p-4",
                                        "bg-omnii-card",
                                        isDark && "bg-omnii-dark-card"
                                    )}
                                    onPress={() => setMessageInput("Help me plan tomorrow")}
                                >
                                    <Text className={cn(
                                        "omnii-body text-sm",
                                        isDark && "text-omnii-dark-text-primary"
                                    )}>"Help me plan tomorrow"</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={cn(
                                        "rounded-xl p-4",
                                        "bg-omnii-card",
                                        isDark && "bg-omnii-dark-card"
                                    )}
                                    onPress={() => setMessageInput("list my calendar events")}
                                >
                                    <Text className={cn(
                                        "omnii-body text-sm",
                                        isDark && "text-omnii-dark-text-primary"
                                    )}>"List my calendar events"</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={cn(
                                        "rounded-xl p-4",
                                        "bg-omnii-card",
                                        isDark && "bg-omnii-dark-card"
                                    )}
                                    onPress={() => setMessageInput("fetch my latest emails")}
                                >
                                    <Text className={cn(
                                        "omnii-body text-sm",
                                        isDark && "text-omnii-dark-text-primary"
                                    )}>"Fetch my latest emails"</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                ) : (
                    (() => {
                        const reversedMessages = [...messages].reverse();
                        
                        return (
                            <FlatList
                                ref={flatListRef}
                                data={reversedMessages}
                                keyExtractor={(item) => {
                                    return item.id;
                                }}
                                renderItem={({ item, index }) => {
                                    return <ChatMessage message={item} onEmailAction={handleEmailAction} />;
                                }}
                                contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, flexGrow: 1 }}
                                showsVerticalScrollIndicator={false}
                                extraData={messages.length}
                                removeClippedSubviews={false}
                                ListHeaderComponent={
                                    (() => {

                                        if (pendingAction) {
                                            return <PendingMessage action={pendingAction} />;
                                        }

                                        if (isTyping) {
                                            return (
                                                <View className={cn(
                                                    "rounded-2xl p-5 mb-4",
                                                    "bg-omnii-card",
                                                    isDark && "bg-omnii-dark-card"
                                                )}>
                                                    <Text className={cn(
                                                        "omnii-body text-sm",
                                                        isDark && "text-omnii-dark-text-primary"
                                                    )}>AI is thinking...</Text>
                                                </View>
                                            );
                                        }

                                        return null;
                                    })()
                                }
                            />
                        );
                    })()
                )}
            </View>
        );
    };

    const ActionsContent = () => (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            <Text className={cn(
                "omnii-heading text-xl font-bold mb-4",
                isDark && "text-omnii-dark-text-primary"
            )}>⚡ Quick Actions</Text>
            {quickActions.map((action) => (
                <TouchableOpacity
                    key={action.id}
                    className={cn(
                        "rounded-xl p-4 mb-3 flex-row items-center",
                        "bg-omnii-card",
                        isDark && "bg-omnii-dark-card"
                    )}
                    onPress={() => handleActionTap(action)}
                >
                    <View className="mr-4">
                        {action.iconComponent || <Text className="text-3xl">{action.icon}</Text>}
                    </View>
                    <View className="flex-1">
                        <Text className={cn(
                            "omnii-body text-base font-semibold mb-1",
                            isDark && "text-omnii-dark-text-primary"
                        )}>{action.label}</Text>
                        <Text className={cn(
                            "omnii-body text-sm",
                            isDark && "text-omnii-dark-text-secondary"
                        )}>{action.description}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const ContextContent = () => (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            <View className={cn(
                "rounded-2xl p-5 mb-4",
                "bg-omnii-card",
                isDark && "bg-omnii-dark-card"
            )}>
                <Text className={cn(
                    "omnii-heading text-lg font-semibold mb-2",
                    isDark && "text-omnii-dark-text-primary"
                )}>🧠 Current Context</Text>
                <Text className={cn(
                    "omnii-body text-sm leading-5 mb-4",
                    isDark && "text-omnii-dark-text-secondary"
                )}>
                    AI uses this information to provide personalized assistance
                </Text>
                <Text className={cn(
                    "omnii-body text-sm leading-5 mb-1",
                    isDark && "text-omnii-dark-text-primary"
                )}>• Tasks completed today: {context.todayMetrics.tasksCompleted}</Text>
                <Text className={cn(
                    "omnii-body text-sm leading-5 mb-1",
                    isDark && "text-omnii-dark-text-primary"
                )}>• Focus time: {context.todayMetrics.focusTime} minutes</Text>
                <Text className={cn(
                    "omnii-body text-sm leading-5 mb-1",
                    isDark && "text-omnii-dark-text-primary"
                )}>• Energy level: {context.todayMetrics.energy}/10</Text>
                <Text className={cn(
                    "omnii-body text-sm leading-5",
                    isDark && "text-omnii-dark-text-primary"
                )}>• Current state: {context.userState}</Text>
            </View>

            <TouchableOpacity className={cn(
                "bg-omnii-background rounded-xl p-4 mb-2 items-center border border-omnii-border",
                isDark && "bg-omnii-dark-background border-omnii-dark-border"
            )}>
                <Text className={cn(
                    "omnii-body text-sm font-semibold",
                    isDark && "text-omnii-dark-text-primary"
                )}>Clear Conversation</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const ProgressContent = () => (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            <Text className={cn(
                "omnii-heading text-xl font-bold mb-4",
                isDark && "text-omnii-dark-text-primary"
            )}>🏆 Chat Achievements</Text>
            
            {achievements.length === 0 ? (
                <View className={cn(
                    "rounded-2xl p-5 mb-4",
                    "bg-omnii-card",
                    isDark && "bg-omnii-dark-card"
                )}>
                    <Text className={cn(
                        "omnii-body text-sm text-center",
                        isDark && "text-omnii-dark-text-primary"
                    )}>
                        Start chatting to earn achievements!
                    </Text>
                </View>
            ) : (
                achievements.map((achievement) => (
                    <View key={achievement.id} className={cn(
                        "rounded-2xl p-5 mb-3 flex-row items-center",
                        "bg-omnii-card",
                        isDark && "bg-omnii-dark-card"
                    )}>
                        <Text className="text-3xl mr-4">{achievement.icon}</Text>
                        <View className="flex-1">
                            <Text className={cn(
                                "omnii-body text-base font-semibold mb-1",
                                isDark && "text-omnii-dark-text-primary"
                            )}>{achievement.title}</Text>
                            <Text className={cn(
                                "omnii-body text-sm leading-5 mb-1",
                                isDark && "text-omnii-dark-text-secondary"
                            )}>{achievement.description}</Text>
                            <Text className={cn(
                                "omnii-caption text-xs font-semibold",
                                isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
                            )}>{achievement.progress}</Text>
                        </View>
                    </View>
                ))
            )}

            <TouchableOpacity className="bg-ai-start bg-opacity-10 rounded-2xl p-5 flex-row items-center justify-center gap-3">
                <Text className="text-2xl">⭐</Text>
                <Text className="omnii-body text-base text-ai-start font-semibold">Start Chatting to Earn XP</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    if (!user) {
        return (
            <SafeAreaView className={cn(
                "flex-1 bg-omnii-background",
                isDark && "bg-omnii-dark-background"
            )}>
                <View className="flex-1 justify-center items-center px-5">
                    <MessageCircle size={64} color={isDark ? '#a8aaae' : '#8E8E93'} />
                    <Text className={cn(
                        "omnii-heading text-3xl font-bold",
                        isDark && "text-omnii-dark-text-primary"
                    )}>Chat</Text>
                    <Text className={cn(
                        "omnii-body text-base text-center mt-4",
                        isDark && "text-omnii-dark-text-secondary"
                    )}>
                        Please log in to chat with your AI assistant.
                    </Text>
                    <Link href="/(auth)/login" asChild>
                        <TouchableOpacity className="bg-ai-start py-3 px-8 rounded-xl mt-4">
                            <Text className="text-white text-base font-semibold">Login</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <SafeAreaView className={cn(
                "flex-1 bg-omnii-background",
                isDark && "bg-omnii-dark-background"
            )}>
                {/* Header */}
                <View className={cn(
                    "bg-omnii-card p-6 pt-5 border-b border-omnii-border",
                    isDark && "bg-omnii-dark-card border-omnii-dark-border"
                )}>
                    <View className="flex-row justify-between items-center mb-3 min-h-[40px]">
                        <View className="flex-row items-center gap-3 flex-1">
                            <Text className={cn(
                                "omnii-heading text-3xl font-bold",
                                isDark && "text-omnii-dark-text-primary"
                            )}>💬 Chat</Text>
                        </View>
                    </View>
                    <Text className={cn(
                        "omnii-body text-base mb-4",
                        isDark && "text-omnii-dark-text-secondary"
                    )}>
                        Your AI assistant who actually gets you
                    </Text>
                    <View className="flex-row items-center gap-2 mt-2">
                        <View 
                            className={cn(
                                "w-2 h-2 rounded-full",
                                isConnected ? "bg-green-500" : "bg-red-500"
                            )}
                        />
                        <Text className={cn(
                            "omnii-body text-sm font-medium",
                            isDark && "text-omnii-dark-text-secondary"
                        )}>
                            {isConnected ? 'Connected' : 'Connecting...'}
                        </Text>
                    </View>
                </View>

                {/* Chat Tabs */}
                <ChatTabs />

                {/* Input Section - only show on conversation tab */}
                {selectedTab === 'conversation' && (
                    <View className="px-4 pb-4 relative z-20">
                        {/* Quick Actions */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mb-3"
                        >
                            <View className="flex-row gap-2 px-2">
                                {quickActions.map((action) => (
                                    <TouchableOpacity
                                        key={action.id}
                                        className={cn(
                                            "p-3 rounded-xl items-center justify-center min-w-[80px] border",
                                            "border-omnii-border-light",
                                            "bg-omnii-card",
                                            isDark && "bg-omnii-dark-card border-omnii-dark-border-light"
                                        )}
                                        onPress={() => handleQuickAction(action.command)}
                                    >
                                        <View className="mb-1">
                                            {action.iconComponent || <Text className="text-lg">{action.icon}</Text>}
                                        </View>
                                        <Text className={cn(
                                            "omnii-caption text-xs font-semibold text-center",
                                            isDark && "text-omnii-dark-text-primary"
                                        )}>
                                            {action.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Input Container */}
                        <View className={cn(
                            "bg-omnii-card rounded-2xl border border-omnii-border-light shadow-sm overflow-hidden",
                            isDark && "bg-omnii-dark-card border-omnii-dark-border-light"
                        )}>
                            <TextInput
                                className={cn(
                                    "bg-transparent px-4 py-3.5 text-base max-h-[120px] min-h-[44px]",
                                    isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
                                )}
                                style={{ textAlignVertical: 'top' }}
                                multiline
                                placeholder={getPlaceholder()}
                                placeholderTextColor={isDark ? '#6c6e73' : AppColors.textSecondary}
                                value={messageInput}
                                onChangeText={setMessageInput}
                                editable={isConnected && !isTyping && !pendingAction}
                            />

                            {/* Input Toolbar */}
                            <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
                                <View className="flex-row items-center gap-1.5">
                                    <TouchableOpacity
                                        className={cn(
                                            "w-8 h-8 bg-transparent rounded-2xl items-center justify-center border",
                                            "border-omnii-border-light",
                                            isDark && "border-omnii-dark-border-light",
                                            showToolDropdown === 'add' && cn(
                                                "border-2",
                                                isDark ? "border-omnii-dark-text-primary" : "border-omnii-text-primary"
                                            )
                                        )}
                                        onPress={() => handleToolButton('add')}
                                    >
                                        <Text className={cn(
                                            "text-base font-semibold",
                                            isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
                                        )}>🔨</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className={cn(
                                            "w-8 h-8 bg-transparent rounded-2xl items-center justify-center border",
                                            "border-omnii-border-light",
                                            isDark && "border-omnii-dark-border-light",
                                            showToolDropdown === 'search' && cn(
                                                "border-2",
                                                isDark ? "border-omnii-dark-text-primary" : "border-omnii-text-primary"
                                            )
                                        )}
                                        onPress={() => handleToolButton('search')}
                                    >
                                        <Text className={cn(
                                            "text-base font-semibold",
                                            isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
                                        )}>🔍</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    className={cn(
                                        "w-10 h-10 rounded-2xl items-center justify-center shadow-sm mb-0.5",
                                        getSendButtonState() === 'disabled' 
                                            ? cn(
                                                "bg-omnii-border-light",
                                                isDark && "bg-omnii-dark-border-light"
                                            )
                                            : "bg-ai-start"
                                    )}
                                    onPress={handleSendMessage}
                                    disabled={getSendButtonState() === 'disabled'}
                                >
                                    {getSendButtonState() === 'loading' ? (
                                        <Text className="text-white text-lg font-semibold">⏳</Text>
                                    ) : (
                                        <UpArrowIcon size={18} color="white" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Tool Dropdowns */}
                        {showToolDropdown && (
                            <>
                                <TouchableOpacity
                                    className="absolute -top-[1000px] -left-[1000px] -right-[1000px] -bottom-[1000px] bg-transparent z-50"
                                    onPress={() => setShowToolDropdown(null)}
                                    activeOpacity={1}
                                />

                                <View className="absolute top-full left-2 right-2 z-50 mt-2">
                                    <View className={cn(
                                        "rounded-2xl p-2 border border-omnii-border-light",
                                        isDark && "bg-omnii-dark-card border-omnii-dark-border-light"
                                    )}>
                                        <Text className={cn(
                                            "omnii-body text-base font-semibold mb-2 px-2 pt-1",
                                            isDark && "text-omnii-dark-text-primary"
                                        )}>
                                            {showToolDropdown === 'add' ? '🔨 Create' : '🔍 Search'}
                                        </Text>
                                        {toolDropdownActions[showToolDropdown as keyof typeof toolDropdownActions].map((action) => (
                                            <TouchableOpacity
                                                key={action.id}
                                                className={cn(
                                                    "flex-row items-center p-3 rounded-lg mb-1 border",
                                                    "bg-omnii-background border-omnii-border-light",
                                                    isDark && "bg-omnii-dark-background border-omnii-dark-border-light"
                                                )}
                                                onPress={() => handleDropdownAction(action)}
                                            >
                                                <View className="mr-3 w-6 items-center justify-center">
                                                    {action.iconComponent}
                                                </View>
                                                <Text className={cn(
                                                    "omnii-body text-sm font-medium flex-1",
                                                    isDark && "text-omnii-dark-text-primary"
                                                )}>{action.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* Tab Content */}
                <View className="flex-1">
                    {renderTabContent()}
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}