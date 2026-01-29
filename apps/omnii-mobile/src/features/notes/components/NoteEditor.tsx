/**
 * NoteEditor
 *
 * A full-featured note editor with toolbar, voice input integration,
 * backlinks panel, and wiki-link highlighting support.
 *
 * Design: "Soft Luminescence" - clean writing surface with subtle
 * depth, floating toolbar, and gentle visual feedback for wikilinks.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Heading1,
  Mic,
  Save,
  X,
  ChevronDown,
  Hash,
} from 'lucide-react-native';
import { VoiceNoteButton } from './VoiceNoteButton';
import { BacklinksPanel } from './BacklinksPanel';
import type { Note, BacklinkItem } from '../api/notesApi';

interface NoteEditorProps {
  initialNote?: Partial<Note>;
  backlinks?: BacklinkItem[];
  backlinkCount?: number;
  onSave?: (title: string, content: string) => void;
  onCancel?: () => void;
  onBacklinkPress?: (noteId: string) => void;
  isLoading?: boolean;
}

export function NoteEditor({
  initialNote,
  backlinks = [],
  backlinkCount = 0,
  onSave,
  onCancel,
  onBacklinkPress,
  isLoading = false,
}: NoteEditorProps) {
  const [title, setTitle] = useState<string>(initialNote?.title ?? '');
  const [content, setContent] = useState<string>(initialNote?.content ?? '');
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const contentInputRef = useRef<TextInput>(null);
  const voiceButtonScale = useRef(new Animated.Value(1)).current;

  // Extract wikilinks from content for preview
  const wikilinks = useMemo(() => {
    const matches: { target: string; display: string }[] = [];
    // Reset regex state for each execution
    const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const target = match[1] ?? '';
      const display = match[2] ?? target;
      matches.push({ target, display });
    }
    return matches;
  }, [content]);

  const handleSave = useCallback(() => {
    if (title.trim() && !isLoading) {
      onSave?.(title.trim(), content);
    }
  }, [title, content, isLoading, onSave]);

  const insertAtCursor = useCallback(
    (text: string) => {
      const before = content.slice(0, cursorPosition);
      const after = content.slice(cursorPosition);
      setContent(before + text + after);
      setCursorPosition(cursorPosition + text.length);
    },
    [content, cursorPosition]
  );

  const insertWikilink = useCallback(() => {
    insertAtCursor('[[]]');
    // Move cursor inside the brackets
    setTimeout(() => {
      setCursorPosition(cursorPosition + 2);
      contentInputRef.current?.setNativeProps({
        selection: { start: cursorPosition + 2, end: cursorPosition + 2 },
      });
    }, 0);
  }, [insertAtCursor, cursorPosition]);

  const insertHeading = useCallback(() => {
    insertAtCursor('\n## ');
  }, [insertAtCursor]);

  const insertBulletList = useCallback(() => {
    insertAtCursor('\n- ');
  }, [insertAtCursor]);

  const insertNumberedList = useCallback(() => {
    insertAtCursor('\n1. ');
  }, [insertAtCursor]);

  const wrapSelection = useCallback(
    (wrapper: string) => {
      // For now, just insert at cursor
      insertAtCursor(`${wrapper}${wrapper}`);
    },
    [insertAtCursor]
  );

  const handleVoiceTranscription = useCallback(
    (transcription: string) => {
      if (transcription) {
        insertAtCursor(transcription + ' ');
      }
      setShowVoiceInput(false);
    },
    [insertAtCursor]
  );

  const toggleVoiceInput = useCallback(() => {
    Animated.sequence([
      Animated.timing(voiceButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(voiceButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    setShowVoiceInput(!showVoiceInput);
  }, [showVoiceInput, voiceButtonScale]);

  const ToolbarButton = ({
    icon: Icon,
    onPress,
    isActive = false,
  }: {
    icon: typeof Bold;
    onPress: () => void;
    isActive?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolbarButton,
        isActive && styles.toolbarButtonActive,
        pressed && styles.toolbarButtonPressed,
      ]}
    >
      <Icon
        size={18}
        color={isActive ? '#6366f1' : '#64748b'}
        strokeWidth={2}
      />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
        >
          <X size={22} color="#64748b" strokeWidth={2} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {initialNote?.id ? 'Edit Note' : 'New Note'}
          </Text>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={!title.trim() || isLoading}
          style={({ pressed }) => [
            styles.saveButton,
            (!title.trim() || isLoading) && styles.saveButtonDisabled,
            pressed && title.trim() && !isLoading && styles.saveButtonPressed,
          ]}
        >
          <Save size={18} color="#ffffff" strokeWidth={2} />
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Note title..."
          placeholderTextColor="#94a3b8"
          autoFocus={!initialNote?.id}
          maxLength={500}
        />

        {/* Content Input */}
        <TextInput
          ref={contentInputRef}
          style={styles.contentInput}
          value={content}
          onChangeText={setContent}
          onSelectionChange={(e) =>
            setCursorPosition(e.nativeEvent.selection.start)
          }
          placeholder="Start writing... Use [[wikilinks]] to connect notes"
          placeholderTextColor="#94a3b8"
          multiline
          textAlignVertical="top"
        />

        {/* Wikilinks preview */}
        {wikilinks.length > 0 && (
          <View style={styles.wikilinksPreview}>
            <View style={styles.wikilinksHeader}>
              <Hash size={14} color="#6366f1" strokeWidth={2} />
              <Text style={styles.wikilinksTitle}>Links in this note</Text>
            </View>
            <View style={styles.wikilinksContainer}>
              {wikilinks.map((link, index) => (
                <View key={`${link.target}-${index}`} style={styles.wikilinkChip}>
                  <Text style={styles.wikilinkText}>{link.display}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Voice input panel */}
        {showVoiceInput && (
          <View style={styles.voiceInputPanel}>
            <VoiceNoteButton
              onTranscriptionComplete={handleVoiceTranscription}
              size="large"
            />
            <Pressable
              onPress={() => setShowVoiceInput(false)}
              style={styles.voiceCloseButton}
            >
              <ChevronDown size={20} color="#64748b" strokeWidth={2} />
              <Text style={styles.voiceCloseText}>Hide voice input</Text>
            </Pressable>
          </View>
        )}

        {/* Backlinks panel */}
        {(backlinks.length > 0 || backlinkCount > 0) && (
          <View style={styles.backlinksSection}>
            <BacklinksPanel
              backlinks={backlinks}
              totalCount={backlinkCount}
              onBacklinkPress={onBacklinkPress}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarGroup}>
          <ToolbarButton icon={Bold} onPress={() => wrapSelection('**')} />
          <ToolbarButton icon={Italic} onPress={() => wrapSelection('_')} />
          <ToolbarButton icon={Heading1} onPress={insertHeading} />
        </View>

        <View style={styles.toolbarDivider} />

        <View style={styles.toolbarGroup}>
          <ToolbarButton icon={List} onPress={insertBulletList} />
          <ToolbarButton icon={ListOrdered} onPress={insertNumberedList} />
          <ToolbarButton icon={Link} onPress={insertWikilink} />
        </View>

        <View style={styles.toolbarDivider} />

        <Animated.View style={{ transform: [{ scale: voiceButtonScale }] }}>
          <Pressable
            onPress={toggleVoiceInput}
            style={({ pressed }) => [
              styles.voiceToolbarButton,
              showVoiceInput && styles.voiceToolbarButtonActive,
              pressed && styles.voiceToolbarButtonPressed,
            ]}
          >
            <Mic
              size={20}
              color={showVoiceInput ? '#ffffff' : '#6366f1'}
              strokeWidth={2}
            />
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPressed: {
    backgroundColor: '#f1f5f9',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
  },
  saveButtonPressed: {
    backgroundColor: '#4f46e5',
    transform: [{ scale: 0.97 }],
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 8,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  contentInput: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 26,
    minHeight: 200,
    paddingVertical: 8,
  },
  wikilinksPreview: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  wikilinksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  wikilinksTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  wikilinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wikilinkChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  wikilinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6366f1',
  },
  voiceInputPanel: {
    marginTop: 24,
    padding: 24,
    backgroundColor: '#fafbfc',
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  voiceCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  voiceCloseText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  backlinksSection: {
    marginTop: 32,
  },
  toolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  toolbarGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  toolbarButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  toolbarButtonPressed: {
    backgroundColor: '#f1f5f9',
    transform: [{ scale: 0.95 }],
  },
  voiceToolbarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  voiceToolbarButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  voiceToolbarButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
});

export default NoteEditor;
