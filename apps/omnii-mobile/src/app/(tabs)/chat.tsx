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
    FlatList,
    Alert
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
import { WebSocketDebug } from '~/components/chat/WebSocketDebug';
import { AppColors } from '~/constants/Colors';
import { BRAND_COLORS } from '~/lib/assets';
import { cn } from '~/utils/cn';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import type { ChatTab, ChatTabConfig, ChatMessage as ChatMessageType } from '~/types/chat';
import { UpArrowIcon, RightArrowIcon, CalendarIcon, GmailIcon, ContactsIcon, TasksIcon } from '~/icons/ChatIcons';

import { trpc } from '~/utils/api';
import { useQuery } from "@tanstack/react-query";


// Updated tab configuration following profile.tsx pattern
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
        key: 'references',
        label: 'References',
        icon: '📚',
        gradient: ['#FF7043', '#FF5722'] // NEW: Vibrant orange gradient (position 3)
    },
    {
        key: 'memory',
        label: 'Memory',
        icon: '🧠',
        gradient: ['#FF3B30', '#DC143C'] // NEW: Clean red gradient (position 4)
    }
];


export default function ChatScreen() {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { recordFeatureVisit } = useOnboardingContext();
    const router = useRouter();

    const { data } = useQuery({
        queryKey: ['hello', 'test'],
        queryFn: () => trpc.hello.test,
        enabled: !!user // Only run when user is available
    });
    // console.log('trpc data:',JSON.stringify(data, null, 2))



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
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // Mock data for other tabs (until WebSocket provides this)
    const context = {
        todayMetrics: { tasksCompleted: 0, focusTime: 0, energy: 0 },
        userState: 'productive',
        currentProjects: []
    };

    // Updated quickActions array - removed Drive, added Tasks
    const quickActions: {
        id: string;
        icon?: string;
        iconComponent?: React.ReactNode;
        label: string;
        description: string;
        command: string;
    }[] = [
            { id: '1', iconComponent: <GmailIcon size={20} />, label: 'Gmail', description: 'Check latest emails', command: 'check my latest emails' },
            { id: '2', iconComponent: <CalendarIcon size={20} color="white" />, label: 'Calendar', description: 'View today\'s events', command: 'show my calendar for this past week and this week and next week' },
            { id: '3', iconComponent: <ContactsIcon size={20} />, label: 'Contacts', description: 'Find contacts', command: 'list all contacts' },
            { id: '4', iconComponent: <TasksIcon size={20} />, label: 'Tasks', description: 'Manage tasks', command: 'show my tasks' },
        ];

    const achievements: {
        id: string;
        title: string;
        description: string;
        progress: string;
        icon: string;
    }[] = [];

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
            if (lastMessage && lastMessage.sender === 'user' && !pendingAction) {
                setPendingAction(lastMessage.content);
            }
        }
    }, [messages, pendingAction]);

    // Clear pending action when we receive a new AI message
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.sender === 'ai' && pendingAction) {
                setPendingAction(null);
            }
        }
    }, [messages, pendingAction]);

    // Recording timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingDuration(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

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
            case 'references':
                return <ReferencesContent />;
            case 'memory':
                return <MemoryContent />;
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
                        {/* WebSocket Debug Panel */}
                        {__DEV__ && <WebSocketDebug />}

                        {/* Simple Debug List */}
                        {__DEV__ && (
                            <View className={cn(
                                "rounded-xl p-4 mb-4 border",
                                isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                            )}>
                                <Text className={cn(
                                    "text-lg font-semibold mb-2",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    🐛 DEBUG: Messages array is empty (length: {messages.length})
                                </Text>
                                <Text className={cn(
                                    "text-sm",
                                    isDark ? "text-slate-400" : "text-gray-600"
                                )}>
                                    Showing nudges instead of FlatList
                                </Text>
                            </View>
                        )}

                        {/* Wayfinders - Shape of AI Nudges Pattern */}
                        <View className="mb-6">
                            <Text className={cn(
                                "text-xl font-bold mb-4",
                                isDark ? "text-white" : "text-gray-900"
                            )}>💡 Try asking me...</Text>
                            <View className="gap-2">
                                <TouchableOpacity
                                    className={cn(
                                        "rounded-xl p-4 border",
                                        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                                    )}
                                    onPress={() => setMessageInput("What should I focus on today?")}
                                >
                                    <Text className={cn(
                                        "text-sm",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>&quot;What should I focus on today?&quot;</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={cn(
                                        "rounded-xl p-4 border",
                                        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                                    )}
                                    onPress={() => setMessageInput("Help me plan tomorrow")}
                                >
                                    <Text className={cn(
                                        "text-sm",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>&quot;Help me plan tomorrow&quot;</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={cn(
                                        "rounded-xl p-4 border",
                                        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                                    )}
                                    onPress={() => setMessageInput("list my calendar events")}
                                >
                                    <Text className={cn(
                                        "text-sm",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>&quot;List my calendar events&quot;</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={cn(
                                        "rounded-xl p-4 border",
                                        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                                    )}
                                    onPress={() => setMessageInput("fetch my latest emails")}
                                >
                                    <Text className={cn(
                                        "text-sm",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>&quot;Fetch my latest emails&quot;</Text>
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
                                                    "rounded-xl p-4 mb-4 border",
                                                    isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                                                )}>
                                                    <Text className={cn(
                                                        "text-sm",
                                                        isDark ? "text-white" : "text-gray-900"
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
            <View className="py-4">
                <Text className={cn(
                    "text-2xl font-bold mb-2",
                    isDark ? "text-white" : "text-gray-900"
                )}>⚡ Quick Actions</Text>
                <Text className={cn(
                    "text-base mb-6",
                    isDark ? "text-slate-400" : "text-gray-600"
                )}>Tap to execute common tasks</Text>
                
                <View className="gap-3">
                    {quickActions.map((action) => (
                        <TouchableOpacity
                            key={action.id}
                            className={cn(
                                "flex-row items-center p-4 rounded-xl border",
                                isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                            )}
                            onPress={() => handleActionTap(action)}
                        >
                            <View className="w-10 h-10 rounded-lg bg-indigo-600 items-center justify-center mr-3">
                                {action.iconComponent}
                            </View>
                            <View className="flex-1">
                                <Text className={cn(
                                    "font-semibold text-base mb-1",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>{action.label}</Text>
                                <Text className={cn(
                                    "text-sm",
                                    isDark ? "text-slate-400" : "text-gray-600"
                                )}>{action.description}</Text>
                            </View>
                            <View className="w-6 h-6 rounded-full bg-indigo-600 items-center justify-center">
                                <Text className="text-white text-xs">→</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );

    const ReferencesContent = () => (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            <View className="py-4">
                <Text className={cn(
                    "text-2xl font-bold mb-2",
                    isDark ? "text-white" : "text-gray-900"
                )}>📚 References</Text>
                <Text className={cn(
                    "text-base mb-6",
                    isDark ? "text-slate-400" : "text-gray-600"
                )}>Data sources the AI uses for context</Text>
                
                {/* Current Context Card */}
                <View className={cn(
                    "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-blue-500",
                    isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                )}>
                    <View className="flex-row items-center mb-4">
                        <View className={cn(
                            "w-12 h-12 rounded-xl items-center justify-center mr-4",
                            isDark ? "bg-blue-900/30" : "bg-blue-100"
                        )}>
                            <Text className="text-2xl">🎯</Text>
                        </View>
                        <View>
                            <Text className={cn(
                                "text-xl font-bold",
                                isDark ? "text-white" : "text-gray-900"
                            )}>Current Context</Text>
                            <Text className={cn(
                                "text-sm",
                                isDark ? "text-slate-400" : "text-gray-600"
                            )}>What the AI knows right now</Text>
                        </View>
                    </View>
                    
                    <View className="gap-3">
                        <View className={cn(
                            "flex-row justify-between items-center py-2 border-b",
                            isDark ? "border-slate-700" : "border-gray-100"
                        )}>
                            <Text className={cn(
                                "text-sm font-semibold",
                                isDark ? "text-slate-300" : "text-gray-700"
                            )}>Recent Emails:</Text>
                            <Text className={cn(
                                "text-sm font-medium",
                                isDark ? "text-blue-400" : "text-blue-600"
                            )}>12 unread (last 24h)</Text>
                        </View>
                        <View className={cn(
                            "flex-row justify-between items-center py-2 border-b",
                            isDark ? "border-slate-700" : "border-gray-100"
                        )}>
                            <Text className={cn(
                                "text-sm font-semibold",
                                isDark ? "text-slate-300" : "text-gray-700"
                            )}>Calendar Events:</Text>
                            <Text className={cn(
                                "text-sm font-medium",
                                isDark ? "text-green-400" : "text-green-600"
                            )}>5 events (next 7 days)</Text>
                        </View>
                        <View className={cn(
                            "flex-row justify-between items-center py-2 border-b",
                            isDark ? "border-slate-700" : "border-gray-100"
                        )}>
                            <Text className={cn(
                                "text-sm font-semibold",
                                isDark ? "text-slate-300" : "text-gray-700"
                            )}>Active Tasks:</Text>
                            <Text className={cn(
                                "text-sm font-medium",
                                isDark ? "text-purple-400" : "text-purple-600"
                            )}>8 pending</Text>
                        </View>
                        <View className="flex-row justify-between items-center py-2">
                            <Text className={cn(
                                "text-sm font-semibold",
                                isDark ? "text-slate-300" : "text-gray-700"
                            )}>Work Patterns:</Text>
                            <Text className={cn(
                                "text-sm font-medium",
                                isDark ? "text-orange-400" : "text-orange-600"
                            )}>Morning focused</Text>
                        </View>
                    </View>
                </View>

                {/* Chat History Card */}
                <View className={cn(
                    "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-green-500",
                    isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                )}>
                    <View className="flex-row items-center mb-3">
                        <View className={cn(
                            "w-10 h-10 rounded-lg items-center justify-center mr-3",
                            isDark ? "bg-green-900/30" : "bg-green-100"
                        )}>
                            <Text className="text-xl">💬</Text>
                        </View>
                        <Text className={cn(
                            "text-lg font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>Chat History</Text>
                    </View>
                    <Text className={cn(
                        "text-sm leading-6 mb-4",
                        isDark ? "text-slate-300" : "text-gray-600"
                    )}>
                        Conversation context from recent sessions to maintain continuity.
                    </Text>
                    <View className={cn(
                        "px-3 py-2 rounded-lg self-start",
                        isDark ? "bg-green-900/20" : "bg-green-100"
                    )}>
                        <Text className={cn(
                            "text-xs font-semibold",
                            isDark ? "text-green-400" : "text-green-700"
                        )}>Active</Text>
                    </View>
                </View>

                {/* Data Sources Card */}
                <View className={cn(
                    "rounded-2xl p-6 mb-6 border shadow-sm border-l-4 border-l-purple-500",
                    isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                )}>
                    <View className="flex-row items-center mb-3">
                        <View className={cn(
                            "w-10 h-10 rounded-lg items-center justify-center mr-3",
                            isDark ? "bg-purple-900/30" : "bg-purple-100"
                        )}>
                            <Text className="text-xl">🔗</Text>
                        </View>
                        <Text className={cn(
                            "text-lg font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>Connected Sources</Text>
                    </View>
                    <Text className={cn(
                        "text-sm leading-6 mb-4",
                        isDark ? "text-slate-300" : "text-gray-600"
                    )}>
                        External services providing real-time data for personalized assistance.
                    </Text>
                    <View className="gap-2">
                        <View className="flex-row items-center">
                            <View className="w-2 h-2 bg-green-500 rounded-full mr-3"></View>
                            <Text className={cn(
                                "text-sm font-medium flex-1",
                                isDark ? "text-slate-400" : "text-gray-600"
                            )}>Google Calendar - Events & scheduling</Text>
                        </View>
                        <View className="flex-row items-center">
                            <View className="w-2 h-2 bg-green-500 rounded-full mr-3"></View>
                            <Text className={cn(
                                "text-sm font-medium flex-1",
                                isDark ? "text-slate-400" : "text-gray-600"
                            )}>Gmail - Email communication</Text>
                        </View>
                        <View className="flex-row items-center">
                            <View className="w-2 h-2 bg-green-500 rounded-full mr-3"></View>
                            <Text className={cn(
                                "text-sm font-medium flex-1",
                                isDark ? "text-slate-400" : "text-gray-600"
                            )}>Google Contacts - Contact information</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );

    const MemoryContent = () => {
        const handleStartRecording = () => {
            setIsRecording(true);
            // TODO: Start actual recording with Neo4j integration
        };

        const handleStopRecording = () => {
            setIsRecording(false);
            Alert.alert(
                "Recording Saved",
                `Your ${recordingDuration}s recording has been saved to long-term memory for AI context.`,
                [{ text: "OK", style: "default" }]
            );
            // TODO: Process recording and save to Neo4j
        };

        const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        return (
            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                <View className="py-4">
                    <Text className={cn(
                        "text-2xl font-bold mb-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>🧠 Memory</Text>
                    <Text className={cn(
                        "text-base mb-6",
                        isDark ? "text-slate-400" : "text-gray-600"
                    )}>Long-term context and personal recordings</Text>
                    
                    {/* Voice Recording Card */}
                    <View className={cn(
                        "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-red-500",
                        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                    )}>
                        <View className="flex-row items-center mb-4">
                            <View className={cn(
                                "w-12 h-12 rounded-xl items-center justify-center mr-4",
                                isDark ? "bg-red-900/30" : "bg-red-100"
                            )}>
                                <Text className="text-2xl">🎤</Text>
                            </View>
                            <View>
                                <Text className={cn(
                                    "text-xl font-bold",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>Voice Recording</Text>
                                <Text className={cn(
                                    "text-sm",
                                    isDark ? "text-slate-400" : "text-gray-600"
                                )}>Record context for AI memory</Text>
                            </View>
                        </View>
                        
                        <Text className={cn(
                            "text-base leading-6 mb-5",
                            isDark ? "text-slate-300" : "text-gray-700"
                        )}>
                            Record voice notes about your work patterns, preferences, and context that the AI should remember for future conversations.
                        </Text>

                        {isRecording && (
                            <View className={cn(
                                "rounded-xl p-4 mb-4",
                                isDark ? "bg-red-900/20" : "bg-red-50"
                            )}>
                                <View className="flex-row items-center justify-center">
                                    <View className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></View>
                                    <Text className={cn(
                                        "text-sm font-semibold",
                                        isDark ? "text-red-400" : "text-red-600"
                                    )}>
                                        Recording: {formatTime(recordingDuration)}
                                    </Text>
                                </View>
                            </View>
                        )}
                        
                        <TouchableOpacity
                            className={cn(
                                "px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg",
                                isRecording 
                                    ? "bg-red-600" 
                                    : "bg-indigo-600"
                            )}
                            onPress={isRecording ? handleStopRecording : handleStartRecording}
                        >
                            <Text className="text-white text-base font-bold mr-2">
                                {isRecording ? "🛑 Stop Recording" : "🎤 Start Recording"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Memory Graph Card */}
                    <View className={cn(
                        "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-blue-500",
                        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                    )}>
                        <View className="flex-row items-center mb-3">
                            <View className={cn(
                                "w-10 h-10 rounded-lg items-center justify-center mr-3",
                                isDark ? "bg-blue-900/30" : "bg-blue-100"
                            )}>
                                <Text className="text-xl">🕸️</Text>
                            </View>
                            <Text className={cn(
                                "text-lg font-bold",
                                isDark ? "text-white" : "text-gray-900"
                            )}>Memory Graph</Text>
                        </View>
                        <Text className={cn(
                            "text-sm leading-6 mb-4",
                            isDark ? "text-slate-300" : "text-gray-600"
                        )}>
                            Knowledge graph powered by Neo4j for long-term context and relationship mapping.
                        </Text>
                        <View className="gap-2">
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 bg-blue-500 rounded-full mr-3"></View>
                                <Text className={cn(
                                    "text-sm font-medium flex-1",
                                    isDark ? "text-slate-400" : "text-gray-600"
                                )}>Work patterns and preferences</Text>
                            </View>
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 bg-green-500 rounded-full mr-3"></View>
                                <Text className={cn(
                                    "text-sm font-medium flex-1",
                                    isDark ? "text-slate-400" : "text-gray-600"
                                )}>Project relationships</Text>
                            </View>
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 bg-purple-500 rounded-full mr-3"></View>
                                <Text className={cn(
                                    "text-sm font-medium flex-1",
                                    isDark ? "text-slate-400" : "text-gray-600"
                                )}>Goal hierarchies</Text>
                            </View>
                        </View>
                        <View className={cn(
                            "px-3 py-2 rounded-lg self-start mt-4",
                            isDark ? "bg-orange-900/20" : "bg-orange-100"
                        )}>
                            <Text className={cn(
                                "text-xs font-semibold",
                                isDark ? "text-orange-400" : "text-orange-700"
                            )}>Coming Soon</Text>
                        </View>
                    </View>

                    {/* Personal Context Card */}
                    <View className={cn(
                        "rounded-2xl p-6 mb-6 border shadow-sm border-l-4 border-l-green-500",
                        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                    )}>
                        <View className="flex-row items-center mb-3">
                            <View className={cn(
                                "w-10 h-10 rounded-lg items-center justify-center mr-3",
                                isDark ? "bg-green-900/30" : "bg-green-100"
                            )}>
                                <Text className="text-xl">👤</Text>
                            </View>
                            <Text className={cn(
                                "text-lg font-bold",
                                isDark ? "text-white" : "text-gray-900"
                            )}>Personal Context</Text>
                        </View>
                        <Text className={cn(
                            "text-sm leading-6 mb-4",
                            isDark ? "text-slate-300" : "text-gray-600"
                        )}>
                            Manage what the AI remembers about your preferences and working style.
                        </Text>
                        <TouchableOpacity className={cn(
                            "px-4 py-3 rounded-lg border",
                            isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"
                        )}>
                            <Text className={cn(
                                "text-sm font-medium text-center",
                                isDark ? "text-white" : "text-gray-900"
                            )}>View & Edit Context</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        );
    };

    return (
        <SafeAreaView className={cn(
            "flex-1",
            isDark ? "bg-slate-900" : "bg-white"
        )}>
            {/* Header */}
            <View className={cn(
                "px-5 py-4 border-b",
                isDark ? "border-slate-600" : "border-gray-200"
            )}>
                <Text className={cn(
                    "text-3xl font-bold mb-1",
                    isDark ? "text-white" : "text-gray-900"
                )}>💬 Chat</Text>
                <Text className={cn(
                    "text-base",
                    isDark ? "text-slate-400" : "text-gray-600"
                )}>Your AI assistant for everything</Text>
            </View>

            {/* Tabs */}
            <ChatTabs />

            {/* Content */}
            <View className="flex-1">
                {renderTabContent()}
            </View>

            {/* Input Area - only show for conversation tab */}
            {selectedTab === 'conversation' && (
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className={cn(
                        "px-5 py-4 border-t",
                        isDark ? "border-slate-600 bg-slate-900" : "border-gray-200 bg-white"
                    )}
                >
                    <View className="flex-row items-center space-x-3">
                        <View className="flex-1">
                            <TextInput
                                className={cn(
                                    "rounded-xl px-4 py-3 text-base border",
                                    isDark 
                                        ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-400" 
                                        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-500"
                                )}
                                placeholder={getPlaceholder()}
                                value={messageInput}
                                onChangeText={setMessageInput}
                                multiline
                                maxLength={500}
                                editable={!isTyping && !pendingAction}
                                placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'}
                            />
                        </View>
                        <TouchableOpacity
                            className={cn(
                                "w-12 h-12 rounded-xl items-center justify-center",
                                getSendButtonState() === 'enabled' 
                                    ? "bg-indigo-600" 
                                    : isDark ? "bg-slate-700" : "bg-gray-200"
                            )}
                            onPress={handleSendMessage}
                            disabled={getSendButtonState() !== 'enabled'}
                        >
                            <UpArrowIcon 
                                size={20} 
                                color={getSendButtonState() === 'enabled' ? 'white' : isDark ? '#64748b' : '#9ca3af'} 
                            />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}