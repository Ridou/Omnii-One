import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
}

// Task Detail Modal
interface TaskDetailModalProps extends BaseModalProps {
  task: any;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ visible, onClose, task }) => {
  const { isDark } = useTheme();

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className={cn("flex-1", isDark ? "bg-slate-900" : "bg-white")}>
        {/* Header */}
        <View className={cn(
          "flex-row items-center justify-between p-4 border-b",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          <Text className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>
            Task Details
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text className={cn("text-lg", isDark ? "text-blue-400" : "text-blue-600")}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4">
          <View className="space-y-4">
            <View>
              <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
                {task.title}
              </Text>
              <View className={cn(
                "px-3 py-1 rounded-full self-start",
                isDark ? "bg-purple-900/30" : "bg-purple-100"
              )}>
                <Text className={cn("text-sm", isDark ? "text-purple-300" : "text-purple-700")}>
                  📋 {task.listName}
                </Text>
              </View>
            </View>

            {task.due && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Due Date
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  📅 {new Date(task.due).toLocaleDateString()} at {new Date(task.due).toLocaleTimeString()}
                </Text>
              </View>
            )}

            <View>
              <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                Status
              </Text>
              <View className={cn(
                "px-3 py-1 rounded-full self-start",
                task.status === 'completed' 
                  ? (isDark ? "bg-green-900/30" : "bg-green-100")
                  : (isDark ? "bg-yellow-900/30" : "bg-yellow-100")
              )}>
                <Text className={cn(
                  "text-sm",
                  task.status === 'completed'
                    ? (isDark ? "text-green-300" : "text-green-700")
                    : (isDark ? "text-yellow-300" : "text-yellow-700")
                )}>
                  {task.status === 'completed' ? '✅ Completed' : '⏳ Pending'}
                </Text>
              </View>
            </View>

            {task.notes && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Notes
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  {task.notes}
                </Text>
              </View>
            )}

            {task.updated && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Last Updated
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  {new Date(task.updated).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Email Detail Modal
interface EmailDetailModalProps extends BaseModalProps {
  email: any;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ visible, onClose, email }) => {
  const { isDark } = useTheme();

  if (!email) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className={cn("flex-1", isDark ? "bg-slate-900" : "bg-white")}>
        {/* Header */}
        <View className={cn(
          "flex-row items-center justify-between p-4 border-b",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          <Text className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>
            Email Details
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text className={cn("text-lg", isDark ? "text-blue-400" : "text-blue-600")}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4">
          <View className="space-y-4">
            <View>
              <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
                {email.subject || 'No Subject'}
              </Text>
              {!email.isRead && (
                <View className={cn(
                  "px-3 py-1 rounded-full self-start",
                  isDark ? "bg-blue-900/30" : "bg-blue-100"
                )}>
                  <Text className={cn("text-sm", isDark ? "text-blue-300" : "text-blue-700")}>
                    📬 Unread
                  </Text>
                </View>
              )}
            </View>

            <View>
              <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                From
              </Text>
              <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                📧 {email.sender?.split('<')[0]?.trim() || email.from || 'Unknown sender'}
              </Text>
            </View>

            <View>
              <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                To
              </Text>
              <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                📧 {Array.isArray(email.to) ? email.to.join(', ') : email.to || 'Unknown'}
              </Text>
            </View>

            {email.date && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Date
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  📅 {new Date(email.date).toLocaleDateString()} at {new Date(email.date).toLocaleTimeString()}
                </Text>
              </View>
            )}

            {email.preview && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Preview
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  {email.preview}
                </Text>
              </View>
            )}

            {email.messageText && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Content
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  {email.messageText}
                </Text>
              </View>
            )}

            {email.attachments && email.attachments.length > 0 && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Attachments
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  📎 {email.attachments.length} attachment(s)
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Contact Detail Modal
interface ContactDetailModalProps extends BaseModalProps {
  contact: any;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ visible, onClose, contact }) => {
  const { isDark } = useTheme();

  if (!contact) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className={cn("flex-1", isDark ? "bg-slate-900" : "bg-white")}>
        {/* Header */}
        <View className={cn(
          "flex-row items-center justify-between p-4 border-b",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          <Text className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>
            Contact Details
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text className={cn("text-lg", isDark ? "text-blue-400" : "text-blue-600")}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4">
          <View className="space-y-4">
            <View>
              <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
                {contact.displayName || contact.name || 'Unknown Contact'}
              </Text>
              {contact.company && (
                <View className={cn(
                  "px-3 py-1 rounded-full self-start",
                  isDark ? "bg-orange-900/30" : "bg-orange-100"
                )}>
                  <Text className={cn("text-sm", isDark ? "text-orange-300" : "text-orange-700")}>
                    🏢 {contact.company}
                  </Text>
                </View>
              )}
            </View>

            {contact.emails && contact.emails.length > 0 && (
              <View>
                <Text className={cn("text-sm font-medium mb-2", isDark ? "text-slate-300" : "text-gray-700")}>
                  Email Addresses
                </Text>
                {contact.emails.map((email: any, index: number) => (
                  <View key={index} className="mb-1">
                    <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                      📧 {email.address || email} {email.type && `(${email.type})`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {contact.phones && contact.phones.length > 0 && (
              <View>
                <Text className={cn("text-sm font-medium mb-2", isDark ? "text-slate-300" : "text-gray-700")}>
                  Phone Numbers
                </Text>
                {contact.phones.map((phone: any, index: number) => (
                  <View key={index} className="mb-1">
                    <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                      📱 {phone.number || phone} {phone.type && `(${phone.type})`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {contact.title && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Title
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  👔 {contact.title}
                </Text>
              </View>
            )}

            {contact.photoUrl && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Profile Photo
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  📷 Available
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Calendar Event Detail Modal
interface CalendarEventDetailModalProps extends BaseModalProps {
  event: any;
}

export const CalendarEventDetailModal: React.FC<CalendarEventDetailModalProps> = ({ visible, onClose, event }) => {
  const { isDark } = useTheme();

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className={cn("flex-1", isDark ? "bg-slate-900" : "bg-white")}>
        {/* Header */}
        <View className={cn(
          "flex-row items-center justify-between p-4 border-b",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          <Text className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>
            Event Details
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text className={cn("text-lg", isDark ? "text-blue-400" : "text-blue-600")}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4">
          <View className="space-y-4">
            <View>
              <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
                {event.title || event.summary || 'No Title'}
              </Text>
            </View>

            {event.start && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Start Time
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  📅 {new Date(event.start).toLocaleDateString()} at {new Date(event.start).toLocaleTimeString()}
                </Text>
              </View>
            )}

            {event.end && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  End Time
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  📅 {new Date(event.end).toLocaleDateString()} at {new Date(event.end).toLocaleTimeString()}
                </Text>
              </View>
            )}

            {event.location && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Location
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  📍 {event.location}
                </Text>
              </View>
            )}

            {event.description && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Description
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  {event.description}
                </Text>
              </View>
            )}

            {event.meetingLink && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Meeting Link
                </Text>
                <Text className={cn("text-sm", isDark ? "text-blue-400" : "text-blue-600")}>
                  🔗 Virtual meeting available
                </Text>
              </View>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Attendees
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  👥 {event.attendees.length} attendees
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Concept Detail Modal
interface ConceptDetailModalProps extends BaseModalProps {
  concept: any;
}

export const ConceptDetailModal: React.FC<ConceptDetailModalProps> = ({ visible, onClose, concept }) => {
  const { isDark } = useTheme();

  if (!concept) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className={cn("flex-1", isDark ? "bg-slate-900" : "bg-white")}>
        {/* Header */}
        <View className={cn(
          "flex-row items-center justify-between p-4 border-b",
          isDark ? "border-slate-700" : "border-gray-200"
        )}>
          <Text className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>
            Concept Details
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text className={cn("text-lg", isDark ? "text-blue-400" : "text-blue-600")}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 p-4">
          <View className="space-y-4">
            <View>
              <Text className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
                {concept.text || concept.name || concept.title || 'Unknown Concept'}
              </Text>
              {concept.labels && Array.isArray(concept.labels) && (
                <View className="flex-row flex-wrap gap-1 mt-2">
                  {concept.labels.map((label: string, idx: number) => (
                    <View key={idx} className={cn(
                      "px-2 py-1 rounded-full",
                      isDark ? "bg-blue-900/30" : "bg-blue-100"
                    )}>
                      <Text className={cn("text-xs", isDark ? "text-blue-300" : "text-blue-700")}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {concept.properties?.keywords && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Keywords
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  🏷️ {concept.properties.keywords}
                </Text>
              </View>
            )}

            {concept.properties?.context && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Context
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  {concept.properties.context}
                </Text>
              </View>
            )}

            {concept.properties?.mention_count && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Mentions
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  💬 Mentioned {concept.properties.mention_count} times
                </Text>
              </View>
            )}

            {concept.properties?.activation_strength && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Activation Strength
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  ⚡ {Math.round(concept.properties.activation_strength * 100)}%
                </Text>
              </View>
            )}

            {concept.properties?.created_at && (
              <View>
                <Text className={cn("text-sm font-medium mb-1", isDark ? "text-slate-300" : "text-gray-700")}>
                  Created
                </Text>
                <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
                  📅 {new Date(concept.properties.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}; 