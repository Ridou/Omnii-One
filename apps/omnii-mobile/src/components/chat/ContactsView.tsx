import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { useResponsiveDesign } from '~/utils/responsive';
import { useContacts, useContactsSearch, useContactStats } from '~/hooks/useContacts';
import { ContactAvatar } from '~/components/common/ContactAvatar';
import type { ContactData } from '@omnii/validators';

interface ContactsViewProps {
  onAction?: (action: string, data: any) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onAction }) => {
  const { isDark } = useTheme();
  const responsive = useResponsiveDesign();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  // Use the contacts hooks
  const {
    contacts,
    isLoading,
    hasError,
    errorMessage,
    refetch,
    isRefetching,
    totalContacts,
    hasContacts,
    getContactsByName,
  } = useContacts(1000); // Load all contacts, display less

  const {
    contacts: searchResults,
    isLoading: isSearching,
    hasResults,
    query: currentSearchQuery,
  } = useContactsSearch(searchQuery, 10);

  const { stats } = useContactStats();

  // Show search results if searching, otherwise show all contacts with pagination
  const allContacts = showSearch && searchQuery.length >= 2 ? searchResults : contacts;
  const displayContacts = allContacts.slice(0, visibleCount);
  const isLoadingDisplay = showSearch && searchQuery.length >= 2 ? isSearching : isLoading;
  const hasMoreToShow = allContacts.length > visibleCount;

  const handleContactPress = (contact: ContactData) => {
    onAction?.('contact_selected', { contact });
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    setSearchQuery('');
    setVisibleCount(20); // Reset visible count when toggling search
  };

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + 50, allContacts.length));
  };

  if (hasError) {
    return (
      <View className={cn('flex-1 justify-center items-center p-4', isDark ? 'bg-slate-900' : 'bg-gray-50')}>
        <Text className={cn('text-lg font-semibold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
          Error Loading Contacts
        </Text>
        <Text className={cn('text-sm text-center mb-4', isDark ? 'text-slate-400' : 'text-gray-600')}>
          {errorMessage || 'Failed to load contacts'}
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          className={cn('px-4 py-2 rounded-lg', isDark ? 'bg-indigo-600' : 'bg-indigo-500')}
        >
          <Text className="text-sm text-white font-medium">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className={cn('flex-1', isDark ? 'bg-slate-900' : 'bg-gray-50')}>
      {/* Header */}
      <View
        className={cn(
          'px-4 py-3 border-b',
          isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white',
        )}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text
              className={cn(
                'text-xl font-semibold',
                isDark ? 'text-white' : 'text-gray-900',
              )}
            >
              Contacts
            </Text>
            <Text
              className={cn(
                'text-sm',
                isDark ? 'text-slate-400' : 'text-gray-600',
              )}
            >
              {showSearch && currentSearchQuery 
                ? `${allContacts.length} results for "${currentSearchQuery}"`
                : `${totalContacts} total contacts`}
            </Text>
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleSearchToggle}
              className={cn(
                'px-3 py-2 rounded-lg',
                showSearch 
                  ? isDark ? 'bg-indigo-600' : 'bg-indigo-500'
                  : isDark ? 'bg-slate-700' : 'bg-gray-100',
              )}
            >
              <Text
                className={cn(
                  'text-sm',
                  showSearch 
                    ? 'text-white'
                    : isDark ? 'text-white' : 'text-gray-700',
                )}
              >
                {showSearch ? '✕ Cancel' : '🔍 Search'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRefresh}
              className={cn(
                'px-3 py-2 rounded-lg',
                isDark ? 'bg-slate-700' : 'bg-gray-100',
              )}
            >
              <Text
                className={cn(
                  'text-sm',
                  isDark ? 'text-white' : 'text-gray-700',
                )}
              >
                🔄 Refresh
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        {showSearch && (
          <View className="mt-3">
            <TextInput
              placeholder="Search contacts by name, email, or phone..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className={cn(
                'px-3 py-2 rounded-lg border',
                isDark
                  ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500',
              )}
              placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
              autoFocus
            />
          </View>
        )}
      </View>

      {/* Stats */}
      {stats && !showSearch && (
        <View
          className={cn(
            'px-4 py-3 border-b',
            isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50',
          )}
        >
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                {stats.contacts_with_email}
              </Text>
              <Text className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-600')}>
                With Email
              </Text>
            </View>
            <View className="items-center">
              <Text className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                {stats.contacts_with_phone}
              </Text>
              <Text className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-600')}>
                With Phone
              </Text>
            </View>
            <View className="items-center">
              <Text className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                {stats.contacts_with_both}
              </Text>
              <Text className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-600')}>
                Complete
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Contacts List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={isDark ? '#6366f1' : '#4f46e5'}
          />
        }
      >
        {isLoadingDisplay ? (
          <View className="p-4">
            <Text className={cn('text-center', isDark ? 'text-slate-400' : 'text-gray-600')}>
              {showSearch ? 'Searching contacts...' : 'Loading contacts...'}
            </Text>
          </View>
        ) : displayContacts.length === 0 ? (
          <View className="p-4">
            <Text className={cn('text-center', isDark ? 'text-slate-400' : 'text-gray-600')}>
              {showSearch && searchQuery.length >= 2 
                ? 'No contacts found for your search'
                : 'No contacts available'}
            </Text>
          </View>
        ) : (
          <View className="p-4">
            {displayContacts.map((contact, index) => (
              <ContactItem
                key={contact.contactId}
                contact={contact}
                onPress={() => handleContactPress(contact)}
                isDark={isDark}
                isLast={index === displayContacts.length - 1 && !hasMoreToShow}
              />
            ))}
            
            {/* Show More Button */}
            {hasMoreToShow && (
              <View>
                <TouchableOpacity
                  onPress={handleShowMore}
                  className={cn(
                    'mt-4 py-3 rounded-lg items-center',
                    isDark ? 'bg-slate-800' : 'bg-gray-100'
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      isDark ? 'text-indigo-400' : 'text-indigo-600'
                    )}
                  >
                    Show More ({allContacts.length - visibleCount} remaining)
                  </Text>
                </TouchableOpacity>
                
                {/* Show total loaded vs total available */}
                <Text
                  className={cn(
                    'text-xs text-center mt-2',
                    isDark ? 'text-slate-500' : 'text-gray-500'
                  )}
                >
                  Showing {displayContacts.length} of {allContacts.length} loaded contacts
                  {totalContacts > allContacts.length && ` (${totalContacts} total)`}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

interface ContactItemProps {
  contact: ContactData;
  onPress: () => void;
  isDark: boolean;
  isLast: boolean;
}

const ContactItem: React.FC<ContactItemProps> = ({
  contact,
  onPress,
  isDark,
  isLast,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={cn(
        'py-3',
        !isLast && 'border-b',
        !isLast && (isDark ? 'border-slate-700' : 'border-gray-200'),
      )}
    >
      <View className="flex-row items-center">
        {/* Avatar */}
        <View className="mr-3">
          <ContactAvatar
            photoUrl={contact.photoUrl}
            name={contact.name}
            size="medium"
            isDark={isDark}
          />
        </View>

        {/* Contact Info */}
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text
              className={cn(
                'text-base font-medium flex-1',
                isDark ? 'text-white' : 'text-gray-900',
              )}
            >
              {contact.name}
            </Text>
            {contact.company && (
              <Text
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600',
                )}
              >
                {contact.company}
              </Text>
            )}
          </View>
          
          {contact.title && (
            <Text
              className={cn(
                'text-sm italic mb-1',
                isDark ? 'text-slate-500' : 'text-gray-500',
              )}
            >
              {contact.title}
            </Text>
          )}
          
          {contact.emails.length > 0 && (
            <View className="flex-row items-center">
              <Text className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-600')}>
                📧 {contact.emails[0]!.address}
              </Text>
              {contact.emails[0]!.type !== 'other' && (
                <Text
                  className={cn(
                    'text-xs ml-2 px-1.5 py-0.5 rounded',
                    isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {contact.emails[0]!.type}
                </Text>
              )}
            </View>
          )}
          
          {contact.phones.length > 0 && (
            <View className="flex-row items-center">
              <Text className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-600')}>
                📞 {contact.phones[0]!.number}
              </Text>
              {contact.phones[0]!.type !== 'other' && (
                <Text
                  className={cn(
                    'text-xs ml-2 px-1.5 py-0.5 rounded',
                    isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {contact.phones[0]!.type}
                </Text>
              )}
            </View>
          )}
          
          {/* Show count if multiple emails/phones */}
          {(contact.emails.length > 1 || contact.phones.length > 1) && (
            <Text
              className={cn(
                'text-xs mt-1',
                isDark ? 'text-slate-500' : 'text-gray-500',
              )}
            >
              {contact.emails.length > 1 && `+${contact.emails.length - 1} more email${contact.emails.length > 2 ? 's' : ''}`}
              {contact.emails.length > 1 && contact.phones.length > 1 && ' • '}
              {contact.phones.length > 1 && `+${contact.phones.length - 1} more phone${contact.phones.length > 2 ? 's' : ''}`}
            </Text>
          )}
        </View>

        {/* Chevron */}
        <Text
          className={cn(
            'text-lg',
            isDark ? 'text-slate-400' : 'text-gray-400',
          )}
        >
          ›
        </Text>
      </View>
    </TouchableOpacity>
  );
}; 