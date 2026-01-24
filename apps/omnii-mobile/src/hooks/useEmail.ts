import { trpc } from '~/utils/api';
import type { EmailData } from '@omnii/validators';
import { useQuery } from '@tanstack/react-query';
import { debugAuthStatus } from '~/utils/auth';
import { useEffect } from 'react';

/**
 * Hook for listing emails using tRPC with proper type safety
 * Simple read-only implementation following useContacts pattern
 */
export const useEmail = (maxResults: number = 20, query: string = "newer_than:7d") => {
  // Debug auth status when hook mounts
  useEffect(() => {
    const checkAuth = async () => {
      const session = await debugAuthStatus();
    };
    checkAuth();
  }, []);

  // ✅ Using tRPC hook for listing emails
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery(trpc.email.listEmails.queryOptions({
    
      maxResults,
      query,
      includeSpamTrash: false
    },  
    {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    }
  ));

  // ✅ Extract data with superjson wrapper handling
  const emails: EmailData[] = data?.json?.success ? data.json.data?.emails ?? [] : [];
  const totalEmails = data?.json?.success ? data.json.data?.totalCount ?? 0 : 0;
  const unreadCount = data?.json?.success ? data.json.data?.unreadCount ?? 0 : 0;
  const nextPageToken = data?.json?.success ? data.json.data?.nextPageToken : undefined;
  
  const hasError = !data?.json?.success || !!error;
  const errorMessage = !data?.json?.success ? data?.json?.error : error?.message;
  const hasEmails = emails.length > 0;

  // ✅ Helper functions
  const getEmailsBySubject = (searchTerm: string) => {
    return emails.filter(email => 
      email.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getEmailsBySender = (senderEmail: string) => {
    return emails.filter(email => 
      email.from.toLowerCase().includes(senderEmail.toLowerCase())
    );
  };

  const getUnreadEmails = () => {
    return emails.filter(email => !email.isRead);
  };

  const getEmailsWithAttachments = () => {
    return emails.filter(email => email.attachments && email.attachments.length > 0);
  };

  // Email hook state logged for debugging

  return {
    // ✅ Email data
    emails,
    totalEmails,
    unreadCount,
    nextPageToken,
    
    // ✅ Loading states
    isLoading,
    isRefetching,
    
    // ✅ Error handling
    hasError,
    errorMessage,
    
    // ✅ Convenience flags
    hasEmails,
    
    // ✅ Actions
    refetch,
    
    // ✅ Helper functions
    getEmailsBySubject,
    getEmailsBySender,
    getUnreadEmails,
    getEmailsWithAttachments,
  };
};

/**
 * Hook for searching emails with specific query
 */
export const useEmailSearch = (searchQuery: string, maxResults: number = 10) => {
  const {
    data,
    isLoading,
    error,
  } = trpc.email.listEmails.useQuery(
    { 
      maxResults,
      query: searchQuery,
      includeSpamTrash: false
    },
    {
      enabled: searchQuery.length >= 2, // Only search if query is at least 2 chars
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes for search results
      retry: 1,
    }
  );

  const emails: EmailData[] = data?.json?.success ? data.json.data?.emails ?? [] : [];
  const hasResults = emails.length > 0;
  const hasError = !data?.json?.success || !!error;

  return {
    emails,
    isLoading,
    hasResults,
    hasError,
    query: searchQuery,
  };
};

/**
 * Hook for getting unread email statistics
 */
export const useEmailStats = () => {
  const {
    data,
    isLoading,
    error,
  } = useQuery(trpc.email.listEmails.queryOptions(
    { 
      maxResults: 1, // We only need stats, not content
      query: "newer_than:30d",
      includeSpamTrash: false
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutes for stats
      retry: 2,
    }
  ));

  const stats = data?.json?.success ? {
    total_emails: data.json.data?.totalCount ?? 0,
    unread_emails: data.json.data?.unreadCount ?? 0,
    read_emails: (data.json.data?.totalCount ?? 0) - (data.json.data?.unreadCount ?? 0),
  } : null;

  return {
    stats,
    isLoading,
    hasError: !data?.json?.success || !!error,
  };
};

/**
 * Hook for getting a specific email by messageId
 */
export const useEmailDetail = (messageId: string, format: "minimal" | "metadata" | "full" = "metadata") => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery(trpc.email.getEmail.queryOptions(
    { 
      messageId,
      format
    },
    {
      enabled: !!messageId, // Only fetch if messageId is provided
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    }
  ));

  const email: EmailData | null = data?.json?.success ? data.json.data ?? null : null;
  const hasError = !data?.json?.success || !!error;
  const errorMessage = !data?.json?.success ? data?.json?.error : error?.message;

  return {
    email,
    isLoading,
    hasError,
    errorMessage,
    refetch,
  };
}; 