import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform, FlatList } from 'react-native';
import { useResponsiveDesign } from '~/utils/responsive';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { UpArrowIcon, GmailIcon, CalendarIcon, ContactsIcon, TasksIcon } from '~/icons/ChatIcons';

interface ResponsiveChatInputProps {
  messageInput: string;
  setMessageInput: (text: string) => void;
  onSend: () => void;
  getSendButtonState: () => 'enabled' | 'disabled' | 'loading';
  getPlaceholder: () => string;
  isTyping: boolean;
  pendingAction: string | null;
}

export const ResponsiveChatInput: React.FC<ResponsiveChatInputProps> = ({
  messageInput,
  setMessageInput,
  onSend,
  getSendButtonState,
  getPlaceholder,
  isTyping,
  pendingAction
}) => {
  const responsive = useResponsiveDesign();
  const { isDark } = useTheme();
  
  if (responsive.effectiveIsDesktop) {
    return (
      <View className={cn(
        "p-6 border-t flex justify-center",
        isDark ? "border-slate-600 bg-slate-900" : "border-gray-200 bg-white"
      )}>
        <View className="flex-row items-end space-x-4 max-w-3xl w-full">
          <View className="flex-1">
            <TextInput
              className={cn(
                "rounded-2xl px-6 py-4 text-base border min-h-[52px] max-h-32 shadow-sm",
                isDark 
                  ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-400" 
                  : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-500"
              )}
              placeholder={getPlaceholder()}
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
              maxLength={1000}
              editable={!isTyping && !pendingAction}
              style={{ fontSize: 16 }}
              placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'}
            />
          </View>
          <TouchableOpacity
            className={cn(
              "w-12 h-12 rounded-xl items-center justify-center shadow-sm",
              getSendButtonState() === 'enabled' 
                ? "bg-indigo-600 hover:bg-indigo-700" 
                : isDark ? "bg-slate-700" : "bg-gray-200"
            )}
            onPress={onSend}
            disabled={getSendButtonState() !== 'enabled'}
          >
            <UpArrowIcon 
              size={20} 
              color={getSendButtonState() === 'enabled' ? 'white' : isDark ? '#64748b' : '#9ca3af'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (responsive.effectiveIsTablet) {
    return (
      <View className={cn(
        "px-6 py-5 border-t",
        isDark ? "border-slate-600 bg-slate-900" : "border-gray-200 bg-white"
      )}>
        <View className="flex-row items-end space-x-4">
          <View className="flex-1">
            <TextInput
              className={cn(
                "rounded-xl px-5 py-4 text-base border min-h-[48px] max-h-28",
                isDark 
                  ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-400" 
                  : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-500"
              )}
              placeholder={getPlaceholder()}
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
              maxLength={750}
              editable={!isTyping && !pendingAction}
              style={{ fontSize: 16 }}
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
            onPress={onSend}
            disabled={getSendButtonState() !== 'enabled'}
          >
            <UpArrowIcon 
              size={20} 
              color={getSendButtonState() === 'enabled' ? 'white' : isDark ? '#64748b' : '#9ca3af'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Return null for mobile - handled by original implementation
  return null;
};

// Desktop Quick Actions Sidebar
export const DesktopQuickActions: React.FC = () => {
  const { isDark } = useTheme();
  
  const quickActions = [
    { id: '1', iconComponent: <GmailIcon size={20} />, label: 'Gmail', description: 'Check latest emails', command: 'check my latest emails' },
    { id: '2', iconComponent: <CalendarIcon size={20} color="white" />, label: 'Calendar', description: 'View today\'s events', command: 'show my calendar for this past week and this week and next week' },
    { id: '3', iconComponent: <ContactsIcon size={20} />, label: 'Contacts', description: 'Find contacts', command: 'list all contacts' },
    { id: '4', iconComponent: <TasksIcon size={20} />, label: 'Tasks', description: 'Manage tasks', command: 'show my tasks' },
  ];

  return (
    <View className="h-full">
      <Text className={cn(
        "text-xl font-bold mb-4",
        isDark ? "text-white" : "text-gray-900"
      )}>⚡ Quick Actions</Text>
      <Text className={cn(
        "text-sm mb-6",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>Click to execute common tasks</Text>
      
      <View className="gap-3">
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            className={cn(
              "p-4 rounded-xl border hover:shadow-md transition-all",
              isDark ? "bg-slate-800 border-slate-600 hover:bg-slate-700" : "bg-white border-gray-200 hover:bg-gray-50"
            )}
          >
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-lg bg-indigo-600 items-center justify-center mr-3">
                {action.iconComponent}
              </View>
              <Text className={cn(
                "font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}>{action.label}</Text>
            </View>
            <Text className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>{action.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Enhanced Desktop Chat Content with Centered Layout
interface DesktopChatContentProps {
  selectedTab: string;
  renderTabContent: () => React.ReactNode;
  messages: any[];
  flatListRef: any;
}

export const DesktopChatContent: React.FC<DesktopChatContentProps> = ({
  selectedTab,
  renderTabContent,
  messages,
  flatListRef
}) => {
  const responsive = useResponsiveDesign();
  const { isDark } = useTheme();
  
  if (selectedTab === 'conversation') {
    return (
      <View className="flex-row h-full">
        {/* Main chat area (center) - no unnecessary empty column */}
        <View className="flex-1 flex flex-col">
          {renderTabContent()}
        </View>
        
        {/* Right sidebar - Quick Actions */}
        <View className={cn(
          "w-80 border-l p-6",
          isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
        )}>
          <DesktopQuickActions />
        </View>
      </View>
    );
  }
  
  if (selectedTab === 'actions') {
    return (
      <View className="grid grid-cols-2 gap-6 h-full p-6">
        <View className="col-span-2">
          {renderTabContent()}
        </View>
      </View>
    );
  }
  
  return (
    <View style={{ maxWidth: 1200, width: '100%', padding: 24 }}>
      {renderTabContent()}
    </View>
  );
};



// Tablet optimized content wrapper
export const TabletChatContent: React.FC<{
  selectedTab: string;
  renderTabContent: () => React.ReactNode;
}> = ({ selectedTab, renderTabContent }) => {
  if (selectedTab === 'conversation') {
    return (
      <View className="flex-1 gap-4">
        {renderTabContent()}
      </View>
    );
  }
  
  return (
    <View className="flex-1">
      {renderTabContent()}
    </View>
  );
}; 