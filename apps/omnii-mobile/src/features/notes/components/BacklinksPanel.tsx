/**
 * BacklinksPanel
 *
 * A collapsible panel showing notes that link to the current note.
 * Features smooth expand/collapse animations, card-based design,
 * and content previews.
 *
 * Design: "Soft Luminescence" - layered cards with subtle depth,
 * gentle transitions, and a cohesive indigo accent system.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  ChevronDown,
  Link2,
  FileText,
  ArrowUpRight,
} from 'lucide-react-native';
import type { BacklinkItem } from '../api/notesApi';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface BacklinksPanelProps {
  backlinks: BacklinkItem[];
  totalCount: number;
  isLoading?: boolean;
  onBacklinkPress?: (noteId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function BacklinksPanel({
  backlinks,
  totalCount,
  isLoading = false,
  onBacklinkPress,
  onLoadMore,
  hasMore = false,
}: BacklinksPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        250,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 0 : 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: isExpanded ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setIsExpanded(!isExpanded);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (totalCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Link2 size={20} color="#cbd5e1" strokeWidth={1.5} />
        <Text style={styles.emptyText}>No backlinks yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header / Toggle */}
      <Pressable
        onPress={toggleExpand}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Link2 size={16} color="#6366f1" strokeWidth={2} />
          </View>
          <Text style={styles.headerTitle}>Backlinks</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalCount}</Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={20} color="#64748b" strokeWidth={2} />
        </Animated.View>
      </Pressable>

      {/* Expandable content */}
      {isExpanded && (
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {backlinks.map((backlink, index) => (
            <Pressable
              key={backlink.noteId}
              onPress={() => onBacklinkPress?.(backlink.noteId)}
              style={({ pressed }) => [
                styles.backlinkCard,
                index === 0 && styles.backlinkCardFirst,
                index === backlinks.length - 1 && styles.backlinkCardLast,
                pressed && styles.backlinkCardPressed,
              ]}
            >
              <View style={styles.cardIcon}>
                <FileText size={14} color="#6366f1" strokeWidth={1.5} />
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {backlink.title}
                  </Text>
                  <ArrowUpRight size={14} color="#94a3b8" strokeWidth={2} />
                </View>

                <Text style={styles.cardPreview} numberOfLines={2}>
                  {backlink.preview}
                </Text>

                <Text style={styles.cardDate}>
                  {formatDate(backlink.updatedAt)}
                </Text>
              </View>
            </Pressable>
          ))}

          {/* Load more button */}
          {hasMore && (
            <Pressable
              onPress={onLoadMore}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.loadMoreButton,
                pressed && styles.loadMorePressed,
              ]}
            >
              <Text style={styles.loadMoreText}>
                {isLoading ? 'Loading...' : 'Load more'}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fafbfc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerPressed: {
    backgroundColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#6366f1',
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backlinkCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginVertical: 4,
    gap: 12,
  },
  backlinkCardFirst: {
    marginTop: 0,
  },
  backlinkCardLast: {
    marginBottom: 0,
  },
  backlinkCardPressed: {
    backgroundColor: '#f1f5f9',
    transform: [{ scale: 0.98 }],
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 8,
  },
  cardPreview: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 6,
  },
  cardDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  loadMorePressed: {
    opacity: 0.7,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
    letterSpacing: 0.3,
  },
});

export default BacklinksPanel;
