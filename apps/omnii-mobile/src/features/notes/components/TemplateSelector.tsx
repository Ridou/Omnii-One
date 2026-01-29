/**
 * TemplateSelector
 *
 * A modal/sheet for selecting note templates with icon cards,
 * descriptions, and smooth slide-up animation.
 *
 * Design: "Soft Luminescence" - glass-morphism backdrop, elevated
 * cards with subtle shadows, and fluid spring animations.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  X,
  Users,
  BookOpen,
  UserCircle,
  Sparkles,
} from 'lucide-react-native';

type TemplateType = 'meeting-notes' | 'daily-journal' | 'contact-notes';

interface Template {
  type: TemplateType;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  bgColor: string;
}

const TEMPLATES: Template[] = [
  {
    type: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Capture attendees, agenda, action items, and decisions from your meetings',
    icon: <Users size={24} color="#6366f1" strokeWidth={1.5} />,
    accentColor: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.08)',
  },
  {
    type: 'daily-journal',
    title: 'Daily Journal',
    description: 'Reflect on your day with structured prompts for gratitude and goals',
    icon: <BookOpen size={24} color="#8b5cf6" strokeWidth={1.5} />,
    accentColor: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
  },
  {
    type: 'contact-notes',
    title: 'Contact Notes',
    description: 'Keep track of conversations, preferences, and important details about people',
    icon: <UserCircle size={24} color="#06b6d4" strokeWidth={1.5} />,
    accentColor: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.08)',
  },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TemplateSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (templateType: TemplateType) => void;
}

export function TemplateSelector({
  visible,
  onClose,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(TEMPLATES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      // Reset card animations
      cardAnims.forEach((anim) => anim.setValue(0));

      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Stagger card animations
        Animated.stagger(
          80,
          cardAnims.map((anim) =>
            Animated.spring(anim, {
              toValue: 1,
              damping: 15,
              stiffness: 150,
              useNativeDriver: true,
            })
          )
        ).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim, cardAnims]);

  const handleSelectTemplate = (type: TemplateType) => {
    onSelectTemplate(type);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.6],
            }),
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Sparkles size={18} color="#6366f1" strokeWidth={2} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Choose a Template</Text>
            <Text style={styles.headerSubtitle}>
              Start with a structured format
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
          >
            <X size={20} color="#64748b" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Template Cards */}
        <View style={styles.cardsContainer}>
          {TEMPLATES.map((template, index) => {
            const cardAnim = cardAnims[index];
            if (!cardAnim) return null;

            const cardScale = cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            });
            const cardOpacity = cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            });

            return (
              <Animated.View
                key={template.type}
                style={{
                  opacity: cardOpacity,
                  transform: [{ scale: cardScale }],
                }}
              >
                <Pressable
                  onPress={() => handleSelectTemplate(template.type)}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.cardIcon,
                      { backgroundColor: template.bgColor },
                    ]}
                  >
                    {template.icon}
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{template.title}</Text>
                    <Text style={styles.cardDescription}>
                      {template.description}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.cardAccent,
                      { backgroundColor: template.accentColor },
                    ]}
                  />
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Footer hint */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Templates auto-fill with smart context
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: '#e2e8f0',
    transform: [{ scale: 0.95 }],
  },
  cardsContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafbfc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: '#f1f5f9',
    transform: [{ scale: 0.98 }],
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});

export default TemplateSelector;
