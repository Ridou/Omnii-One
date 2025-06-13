import { trpc } from '~/utils/api';
import type { ContactData } from '@omnii/validators';
import { useQuery } from '@tanstack/react-query';
import { debugAuthStatus } from '~/utils/auth';
import { useEffect } from 'react';

/**
 * Hook for listing contacts using tRPC with proper type safety
 * Simple read-only implementation following useTasks pattern
 */
export const useContacts = (pageSize: number = 1000) => {
  // Debug auth status when hook mounts
  useEffect(() => {
    const checkAuth = async () => {
      const session = await debugAuthStatus();
      console.log('[useContacts] Auth check complete:', !!session);
    };
    checkAuth();
  }, []);

  // ✅ Using tRPC hook for listing contacts
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery(trpc.contacts.listContacts.queryOptions({
    pageSize,
  }));

  console.log('[useContacts] Raw tRPC response:', data);
  console.log('[useContacts] tRPC error:', error);

  // ✅ Handle the actual router return type (success/error wrapper)
  const contactsData = data?.success ? data.data : null;
  const hasError = !!error || (data && !data.success);
  const errorMessage = error?.message || 
    (data && !data.success ? data.error : null);

  // Log parsed results
  console.log('[useContacts] Parsed contactsData:', contactsData);
  console.log('[useContacts] Has error:', hasError);
  console.log('[useContacts] Error message:', errorMessage);

  return {
    // Data - all properly typed by tRPC
    contactsData,
    contacts: contactsData?.contacts ?? [],
    isLoading,
    isRefetching,
    
    // Error handling
    hasError,
    errorMessage,
    
    // Actions
    refetch,
    
    // Computed values - TypeScript knows contactsData structure
    totalContacts: contactsData?.totalCount ?? 0,
    hasContacts: (contactsData?.contacts?.length ?? 0) > 0,
    
    // Helper functions with proper typing
    getContactById: (id: string): ContactData | undefined => 
      contactsData?.contacts.find((contact: ContactData) => contact.contactId === id),
    
    getContactsByName: (searchName: string): ContactData[] =>
      contactsData?.contacts.filter((contact: ContactData) => 
        contact.name.toLowerCase().includes(searchName.toLowerCase())
      ) ?? [],
      
    getContactsByEmail: (searchEmail: string): ContactData[] =>
      contactsData?.contacts.filter((contact: ContactData) => 
        contact.emails.some(email => 
          email.address.toLowerCase().includes(searchEmail.toLowerCase())
        )
      ) ?? [],

    getContactsByPhone: (searchPhone: string): ContactData[] =>
      contactsData?.contacts.filter((contact: ContactData) => 
        contact.phones.some(phone => phone.number.includes(searchPhone))
      ) ?? [],

    // Access to full tRPC response for debugging
    fullResponse: data,
    rawError: error,
  };
};

/**
 * Hook for searching contacts with a query string
 * Separate hook for search functionality
 */
export const useContactsSearch = (query: string = "", pageSize: number = 10) => {
  // Only search if query is provided and has reasonable length
  const shouldSearch = query.length >= 2;

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery(
    trpc.contacts.searchContacts.queryOptions({
      query: shouldSearch ? query : "",
      pageSize,
      readMask: "names,emailAddresses,phoneNumbers",
    }),
  );

  console.log('[useContactsSearch] Raw tRPC response for query:', query, data);

  // Handle the tRPC response wrapper
  const searchResults = data?.success ? data.data : null;
  const hasError = !!error || (data && !data.success);
  const errorMessage = error?.message || 
    (data && !data.success ? data.error : null);

  return {
    // Search results
    searchResults,
    contacts: searchResults?.contacts ?? [],
    isLoading: isLoading && shouldSearch,
    isRefetching,
    
    // Search state
    query,
    isSearching: shouldSearch,
    hasSearched: shouldSearch && !isLoading,
    
    // Error handling
    hasError,
    errorMessage,
    
    // Actions
    refetch,
    
    // Computed values
    totalResults: searchResults?.totalCount ?? 0,
    hasResults: (searchResults?.contacts?.length ?? 0) > 0,
    
    // Access to full response
    fullResponse: data,
    rawError: error,
  };
};

/**
 * Hook for getting contact statistics with proper typing
 */
export const useContactStats = () => {
  const { contactsData, isLoading } = useContacts();
  
  return {
    isLoading,
    stats: contactsData ? {
      total_contacts: contactsData.totalCount,
      contacts_with_email: contactsData.contacts.filter(c => c.emails.length > 0).length,
      contacts_with_phone: contactsData.contacts.filter(c => c.phones.length > 0).length,
      contacts_with_both: contactsData.contacts.filter(c => c.emails.length > 0 && c.phones.length > 0).length,
      contacts_with_neither: contactsData.contacts.filter(c => c.emails.length === 0 && c.phones.length === 0).length,
      email_percentage: contactsData.totalCount > 0 
        ? Math.round((contactsData.contacts.filter(c => c.emails.length > 0).length / contactsData.totalCount) * 100)
        : 0,
      phone_percentage: contactsData.totalCount > 0
        ? Math.round((contactsData.contacts.filter(c => c.phones.length > 0).length / contactsData.totalCount) * 100)
        : 0,
    } : null
  };
}; 