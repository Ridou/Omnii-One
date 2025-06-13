import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { CalendarListData, CalendarData } from '@omnii/validators';

import { trpc } from '~/utils/api';
import { debugAuthStatus } from '~/utils/auth';

export const useCalendar = (params?: { timeMin?: string; timeMax?: string }) => {
  useEffect(() => {
    const checkAuth = async () => {
      const session = await debugAuthStatus();
      console.log('[useCalendar] Auth check complete:', !!session);
    };
    checkAuth();
  }, []);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery(trpc.calendar.getEvents.queryOptions({
    timeMin: params?.timeMin,
    timeMax: params?.timeMax,
  }));

  console.log('[useCalendar] Raw tRPC response:', data);
  console.log('[useCalendar] tRPC error:', error);

  const calendarData = data?.success ? data.data : null;
  const hasError = !!error || (data && !data.success);
  const errorMessage = error?.message || 
    (data && !data.success ? data.error : null);

  console.log('[useCalendar] Parsed calendarData:', calendarData);
  console.log('[useCalendar] Has error:', hasError);
  console.log('[useCalendar] Error message:', errorMessage);

  return {
    calendarData,
    isLoading,
    isRefetching,
    
    hasError,
    errorMessage,
    
    refetch,
    
    totalEvents: calendarData?.totalCount ?? 0,
    hasMore: calendarData?.hasMore ?? false,
    timeRange: calendarData?.timeRange,
    
    getUpcomingEvents: (): CalendarData[] => {
      if (!calendarData?.events) return [];
      const now = new Date();
      return calendarData.events.filter((event: CalendarData) => 
        new Date(event.start) > now
      );
    },
    
    getPastEvents: (): CalendarData[] => {
      if (!calendarData?.events) return [];
      const now = new Date();
      return calendarData.events.filter((event: CalendarData) => 
        new Date(event.end) < now
      );
    },
    
    getTodaysEvents: (): CalendarData[] => {
      if (!calendarData?.events) return [];
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      return calendarData.events.filter((event: CalendarData) => {
        const eventStart = new Date(event.start);
        return eventStart >= startOfDay && eventStart < endOfDay;
      });
    },
    
    getEventsWithMeetingLinks: (): CalendarData[] => 
      calendarData?.events.filter((event: CalendarData) => !!event.meetingLink) ?? [],

    fullResponse: data,
    rawError: error,
  };
};

export const useCalendarStats = () => {
  const { calendarData, isLoading } = useCalendar();
  
  return {
    isLoading,
    stats: calendarData ? {
      total_events: calendarData.totalCount,
      upcoming_count: calendarData.events.filter((event: CalendarData) => 
        new Date(event.start) > new Date()
      ).length,
      events_with_attendees: calendarData.events.filter((event: CalendarData) => 
        event.attendees && event.attendees.length > 0
      ).length,
      events_with_location: calendarData.events.filter((event: CalendarData) => 
        !!event.location
      ).length,
    } : null
  };
};
