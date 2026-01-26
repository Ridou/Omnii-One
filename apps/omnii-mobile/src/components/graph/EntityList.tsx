/**
 * EntityList - Filterable list of synced graph entities
 *
 * Displays entities from local PowerSync database with:
 * - Search bar for filtering by name
 * - Type filter chips (All, Contacts, Tasks, Emails, Concepts)
 * - Entity cards with type-specific icons and colors
 * - Loading, empty, and error states
 *
 * Usage:
 * ```tsx
 * <EntityList
 *   initialFilter="contact"
 *   onEntityPress={(id, type) => navigate(`/entity/${id}`)}
 * />
 * ```
 */

import { View, Text, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import {
  User,
  Mail,
  CheckSquare,
  Lightbulb,
  Box,
  Search,
  ChevronRight,
} from 'lucide-react-native';
import { useEntities, type EntityType } from '~/hooks/useGraphData';

// Icon mapping for entity types
const ENTITY_ICONS: Record<string, typeof User> = {
  contact: User,
  email: Mail,
  task: CheckSquare,
  concept: Lightbulb,
  entity: Box,
};

// Default colors for unknown entity types
const DEFAULT_COLORS = { bg: '#F3F4F6', text: '#4B5563' };

// Color mapping for entity types (background, text)
const ENTITY_COLORS: Record<string, { bg: string; text: string }> = {
  contact: { bg: '#DBEAFE', text: '#2563EB' },    // blue-100, blue-600
  email: { bg: '#F3E8FF', text: '#9333EA' },      // purple-100, purple-600
  task: { bg: '#DCFCE7', text: '#16A34A' },       // green-100, green-600
  concept: { bg: '#FEF9C3', text: '#CA8A04' },    // yellow-100, yellow-600
  entity: { bg: '#F3F4F6', text: '#4B5563' },     // gray-100, gray-600
};

// Filter chips data
const ENTITY_FILTERS: { type: EntityType; label: string }[] = [
  { type: 'all', label: 'All' },
  { type: 'contact', label: 'Contacts' },
  { type: 'task', label: 'Tasks' },
  { type: 'email', label: 'Emails' },
  { type: 'concept', label: 'Concepts' },
];

interface EntityListProps {
  /** Pre-selected entity type filter */
  initialFilter?: EntityType;
  /** Called when entity is tapped */
  onEntityPress?: (entityId: string, entityType: string) => void;
  /** Max items to show */
  limit?: number;
}

export const EntityList = ({
  initialFilter = 'all',
  onEntityPress,
  limit = 100,
}: EntityListProps) => {
  const [filter, setFilter] = useState<EntityType>(initialFilter);
  const [search, setSearch] = useState('');

  const { entities, isLoading, error, count } = useEntities(filter, limit, search);

  // Render filter chip
  const renderFilterChip = useCallback(
    ({ type, label }: { type: EntityType; label: string }) => (
      <Pressable
        key={type}
        onPress={() => setFilter(type)}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 9999,
          marginRight: 8,
          backgroundColor: filter === type ? '#6366F1' : '#F3F4F6',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: filter === type ? '#FFFFFF' : '#4B5563',
          }}
        >
          {label}
        </Text>
      </Pressable>
    ),
    [filter]
  );

  // Render entity item
  const renderEntity = useCallback(
    ({ item }: { item: ReturnType<typeof useEntities>['entities'][0] }) => {
      const Icon = ENTITY_ICONS[item.entity_type] || Box;
      const colors = ENTITY_COLORS[item.entity_type] ?? DEFAULT_COLORS;

      return (
        <Pressable
          onPress={() => onEntityPress?.(item.id, item.entity_type)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
          }}
        >
          {/* Type Icon */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bg,
            }}
          >
            <Icon size={20} color={colors.text} />
          </View>

          {/* Content */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: '#111827',
              }}
            >
              {item.name}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#6B7280',
                textTransform: 'capitalize',
              }}
            >
              {item.entity_type}
              {typeof item.parsedProperties.status === 'string' && ` - ${item.parsedProperties.status}`}
            </Text>
          </View>

          {/* Chevron */}
          <ChevronRight size={20} color="#9CA3AF" />
        </Pressable>
      );
    },
    [onEntityPress]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F3F4F6',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Search size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search entities..."
            placeholderTextColor="#9CA3AF"
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 16,
              color: '#111827',
            }}
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ENTITY_FILTERS}
          renderItem={({ item }) => renderFilterChip(item)}
          keyExtractor={(item) => item.type}
        />
      </View>

      {/* Count Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: '#F9FAFB',
        }}
      >
        <Text style={{ fontSize: 14, color: '#6B7280' }}>
          {isLoading
            ? 'Loading...'
            : `${count} ${filter === 'all' ? 'entities' : filter}${count !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* Entity List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : error ? (
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
      ) : (
        <FlatList
          data={entities}
          renderItem={renderEntity}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF', textAlign: 'center' }}>
                No entities found.{'\n'}Sync data to see your graph content.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default EntityList;
