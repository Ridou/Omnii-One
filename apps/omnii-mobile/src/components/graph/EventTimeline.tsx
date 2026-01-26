/**
 * EventTimeline - Chronological display of calendar events
 *
 * Displays events from local PowerSync database with:
 * - Events grouped by date (Today, Tomorrow, or date labels)
 * - Time badges showing start/end times
 * - Location and attendee counts
 * - Visual timeline with date markers
 * - Loading, empty, and error states
 *
 * Usage:
 * ```tsx
 * <EventTimeline
 *   startDate={new Date()}
 *   endDate={twoWeeksLater}
 *   onEventPress={(id) => navigate(`/event/${id}`)}
 * />
 * ```
 */

import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useCallback, useMemo } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react-native';
import { useEvents } from '~/hooks/useGraphData';

// Format time for display (e.g., "2:30 PM")
const formatTime = (isoString: string | null): string => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date for section headers
const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

// Group events by date
type GroupedEvents = Array<{
  date: string;
  dateLabel: string;
  events: ReturnType<typeof useEvents>['events'];
}>;

interface EventTimelineProps {
  /** Start date for filtering */
  startDate?: Date;
  /** End date for filtering */
  endDate?: Date;
  /** Called when event is tapped */
  onEventPress?: (eventId: string) => void;
}

export const EventTimeline = ({
  startDate,
  endDate,
  onEventPress,
}: EventTimelineProps) => {
  // Default to 2 weeks ahead if no range specified
  const defaultStart = startDate || new Date();
  const defaultEnd = useMemo(() => {
    if (endDate) return endDate;
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d;
  }, [endDate]);

  const { events, isLoading, error, count } = useEvents(defaultStart, defaultEnd, 100);

  // Group events by date
  const groupedEvents: GroupedEvents = useMemo(() => {
    const groups: Record<string, ReturnType<typeof useEvents>['events']> = {};

    events.forEach(event => {
      if (!event.start_time) return;
      const dateKey = new Date(event.start_time).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });

    const result: GroupedEvents = [];
    for (const [date, dayEvents] of Object.entries(groups)) {
      const firstEvent = dayEvents[0];
      if (firstEvent && firstEvent.start_time) {
        result.push({
          date,
          dateLabel: formatDate(firstEvent.start_time),
          events: dayEvents,
        });
      }
    }
    return result;
  }, [events]);

  // Render event item
  const renderEvent = useCallback(
    ({ item }: { item: ReturnType<typeof useEvents>['events'][0] }) => {
      const attendeeCount = item.parsedAttendees.length;

      return (
        <Pressable
          onPress={() => onEventPress?.(item.id)}
          style={{
            marginLeft: 24,
            marginBottom: 12,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
            borderWidth: 1,
            borderColor: '#F3F4F6',
          }}
        >
          {/* Time Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: '#EEF2FF',
                borderRadius: 9999,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#4F46E5' }}>
                {formatTime(item.start_time)} - {formatTime(item.end_time)}
              </Text>
            </View>
          </View>

          {/* Event Title */}
          <Text
            numberOfLines={2}
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#111827',
              marginBottom: 4,
            }}
          >
            {item.summary || 'Untitled Event'}
          </Text>

          {/* Description */}
          {item.description && (
            <Text
              numberOfLines={2}
              style={{
                fontSize: 14,
                color: '#6B7280',
                marginBottom: 8,
              }}
            >
              {item.description}
            </Text>
          )}

          {/* Meta Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            {item.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text numberOfLines={1} style={{ fontSize: 12, color: '#6B7280' }}>
                  {item.location}
                </Text>
              </View>
            )}

            {attendeeCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Users size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [onEventPress]
  );

  // Render date section
  const renderSection = useCallback(
    ({ item }: { item: GroupedEvents[0] }) => (
      <View style={{ marginBottom: 16 }}>
        {/* Date Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16 }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#6366F1',
              marginRight: 12,
            }}
          />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{item.dateLabel}</Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', marginLeft: 8 }}>
            ({item.events.length} event{item.events.length !== 1 ? 's' : ''})
          </Text>
        </View>

        {/* Events */}
        {item.events.map(event => (
          <View key={event.id}>
            {renderEvent({ item: event })}
          </View>
        ))}
      </View>
    ),
    [renderEvent]
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ color: '#EF4444', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Calendar size={20} color="#6366F1" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Timeline</Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', marginLeft: 'auto' }}>
            {count} upcoming events
          </Text>
        </View>
      </View>

      {/* Timeline */}
      <FlatList
        data={groupedEvents}
        renderItem={renderSection}
        keyExtractor={(item) => item.date}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <Calendar size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#9CA3AF', textAlign: 'center' }}>
              No upcoming events.{'\n'}Sync your calendar to see events.
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default EventTimeline;
