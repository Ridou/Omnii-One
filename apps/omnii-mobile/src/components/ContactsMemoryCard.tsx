import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { useContacts, useContactStats } from '~/hooks/useContacts';
import { ContactAvatar } from '~/components/common/ContactAvatar';
import type { ContactData } from '@omnii/validators';

interface ContactsMemoryCardProps {
  onContactAction?: (action: string, data?: any) => void;
}

export const ContactsMemoryCard: React.FC<ContactsMemoryCardProps> = ({
  onContactAction
}) => {
  const { isDark } = useTheme();
  const [displayCount, setDisplayCount] = React.useState(3);
  
  // Use contacts hooks
  const {
    contacts,
    isLoading,
    hasError,
    totalContacts,
    hasContacts,
  } = useContacts(100); // Get more contacts, display only 3 initially

  const { stats } = useContactStats();
  
  const displayedContacts = contacts.slice(0, displayCount);
  const hasMoreContacts = contacts.length > displayCount;


  const handleViewAllContacts = () => {
    onContactAction?.('view_all_contacts', null);
  };

  const handleContactPress = (contact: ContactData) => {
    onContactAction?.('contact_selected', { contact });
  };
  
  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + 3, contacts.length));
  };

  if (hasError) {
    return (
      <View className={cn(
        "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-amber-500",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <View className="flex-row items-center mb-3">
          <View className={cn(
            "w-10 h-10 rounded-lg items-center justify-center mr-3",
            isDark ? "bg-amber-900/30" : "bg-amber-100"
          )}>
            <Text className="text-xl">👥</Text>
          </View>
          <Text className={cn(
            "text-lg font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}>Contacts</Text>
        </View>
        <Text className={cn(
          "text-sm",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>Failed to load contacts</Text>
      </View>
    );
  }

  return (
    <View className={cn(
      "rounded-2xl p-6 mb-4 border shadow-sm border-l-4 border-l-green-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className={cn(
            "w-10 h-10 rounded-lg items-center justify-center mr-3",
            isDark ? "bg-green-900/30" : "bg-green-100"
          )}>
            <Text className="text-xl">👥</Text>
          </View>
          <View>
            <Text className={cn(
              "text-lg font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>Contacts</Text>
            <Text className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              {isLoading ? 'Loading...' : `${totalContacts} total contacts`}
            </Text>
          </View>
        </View>
        
        {hasContacts && (
          <TouchableOpacity
            onPress={handleViewAllContacts}
            className={cn(
              "px-3 py-1.5 rounded-lg",
              isDark ? "bg-green-600" : "bg-green-500"
            )}
          >
            <Text className="text-white text-xs font-medium">View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Row */}
      {stats && (
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className={cn(
              "text-lg font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {stats.contacts_with_email}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              With Email
            </Text>
          </View>
          <View className="items-center">
            <Text className={cn(
              "text-lg font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {stats.contacts_with_phone}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              With Phone
            </Text>
          </View>
          <View className="items-center">
            <Text className={cn(
              "text-lg font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {stats.contacts_with_both}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              Complete
            </Text>
          </View>
        </View>
      )}

      {/* Recent Contacts */}
      {hasContacts && contacts.length > 0 && (
        <View>
          <Text className={cn(
            "text-sm font-medium mb-3",
            isDark ? "text-slate-300" : "text-gray-700"
          )}>
            Recent Contacts
          </Text>
          <View className="gap-2">
            {displayedContacts.map((contact) => (
              <TouchableOpacity
                key={contact.contactId}
                onPress={() => handleContactPress(contact)}
                className={cn(
                  "flex-row items-center p-2 rounded-lg",
                  isDark ? "bg-slate-700/50" : "bg-gray-50"
                )}
              >
                <View className="mr-3">
                  <ContactAvatar
                    photoUrl={contact.photoUrl}
                    name={contact.name}
                    size="small"
                    isDark={isDark}
                  />
                </View>
                <View className="flex-1">
                  <Text className={cn(
                    "text-sm font-medium",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {contact.name}
                  </Text>
                  {contact.emails.length > 0 && (
                    <Text className={cn(
                      "text-xs",
                      isDark ? "text-slate-400" : "text-gray-600"
                    )}>
                      {contact.emails[0]!.address}
                    </Text>
                  )}
                </View>
                <Text className={cn(
                  "text-sm",
                  isDark ? "text-slate-400" : "text-gray-400"
                )}>
                  ›
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Show More Button */}
          {hasMoreContacts && (
            <TouchableOpacity
              onPress={handleShowMore}
              className={cn(
                "mt-3 py-2 rounded-lg items-center",
                isDark ? "bg-slate-700/50" : "bg-gray-100"
              )}
            >
              <Text className={cn(
                "text-xs font-medium",
                isDark ? "text-green-400" : "text-green-600"
              )}>
                Show {Math.min(3, contacts.length - displayCount)} More
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !hasContacts && (
        <View className="items-center py-4">
          <Text className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            No contacts available
          </Text>
        </View>
      )}
    </View>
  );
}; 