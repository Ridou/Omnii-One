import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import { AppColors } from '~/constants/Colors';
import { TEST_SCENARIOS, TEST_APPROVAL_USER } from '~/constants/test-config';
import { useChat } from '~/hooks/useChat';

interface TestScenario {
  id: keyof typeof TEST_SCENARIOS;
  label: string;
  icon: string;
  description: string;
}

const testScenarios: TestScenario[] = [
  {
    id: 'event',
    label: 'Create Event',
    icon: '📅',
    description: 'Create calendar event tomorrow at 3pm'
  },
  {
    id: 'email_read',
    label: 'Read Emails',
    icon: '📧',
    description: 'Fetch your latest emails'
  },
  {
    id: 'email_send',
    label: 'Send Email',
    icon: '✉️',
    description: 'Send a test email'
  },
  {
    id: 'contact_add',
    label: 'Add Contact',
    icon: '👤',
    description: 'Add Bobby Ross to contacts'
  },
  {
    id: 'tasks',
    label: 'Create Task',
    icon: '✅',
    description: 'Create a review task'
  },
  {
    id: 'calendar_list',
    label: 'List Events',
    icon: '📋',
    description: 'Show calendar events'
  },
  {
    id: 'contact_search',
    label: 'Search Contact',
    icon: '🔍',
    description: 'Find Bobby Ross'
  },
  {
    id: 'email_draft',
    label: 'Draft Email',
    icon: '📝',
    description: 'Create email draft'
  }
];

export function ChatTestPanel() {
  const { sendMessage, isConnected, messages } = useChat();
  const [isExpanded, setIsExpanded] = useState(false);
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const [lastResponseIndex, setLastResponseIndex] = useState(0);

  // Watch for new messages
  useEffect(() => {
    if (messages.length > lastResponseIndex) {
      console.log('[TestPanel] New message detected!');
      console.log('[TestPanel] Total messages:', messages.length);
      console.log('[TestPanel] Latest message:', messages[messages.length - 1]);
    }
  }, [messages.length]);

  const handleTestScenario = async (scenarioId: keyof typeof TEST_SCENARIOS) => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for WebSocket connection');
      return;
    }

    const message = TEST_SCENARIOS[scenarioId];
    const scenario = testScenarios.find(s => s.id === scenarioId);

    setRunningTest(scenarioId);

    // Record current message count before sending
    const messageCountBefore = messages.length;
    setLastResponseIndex(messageCountBefore);

    console.log('[TestPanel] Before sending - Message count:', messageCountBefore);
    console.log('[TestPanel] Existing messages:', messages);

    try {
      // Send the test message
      await sendMessage(message);

      // The response will appear in the messages array automatically!
      console.log('[TestPanel] Message sent! Response will appear in chat UI');
      console.log('[TestPanel] Watch the messages array grow...');

      // Show confirmation
      Alert.alert(
        'Test Sent',
        `Running: ${scenario?.label}\n\nCommand: "${message}"\n\n✅ Request sent! Watch the chat conversation above to see:\n\n• Your request message\n• AI processing indicator\n• Server response with formatted data\n\nThe response will include full JSON details in the API Response section.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send test command');
    } finally {
      setTimeout(() => setRunningTest(null), 2000);
    }
  };

  const handleRunAll = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for WebSocket connection');
      return;
    }

    Alert.alert(
      'Run All Tests',
      'This will send all 8 test commands with 2-second delays. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run All',
          onPress: async () => {
            for (const scenario of testScenarios) {
              setRunningTest(scenario.id);
              await sendMessage(TEST_SCENARIOS[scenario.id]);
              // Wait 2 seconds between tests
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            setRunningTest(null);
            Alert.alert('Complete', 'All tests have been sent');
          }
        }
      ]
    );
  };

  if (!__DEV__) return null; // Only show in development

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.toggleIcon}>🧪</Text>
        <Text style={styles.toggleText}>Test Panel</Text>
        <Text style={styles.toggleArrow}>{isExpanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>WebSocket Test Scenarios</Text>
            <Text style={styles.headerSubtitle}>
              Using test user: {TEST_APPROVAL_USER.EMAIL}
            </Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.scenariosGrid}>
              {testScenarios.map((scenario) => (
                <TouchableOpacity
                  key={scenario.id}
                  style={[
                    styles.scenarioButton,
                    runningTest === scenario.id && styles.scenarioButtonActive
                  ]}
                  onPress={() => handleTestScenario(scenario.id)}
                  disabled={!isConnected || runningTest !== null}
                >
                  <Text style={styles.scenarioIcon}>{scenario.icon}</Text>
                  <Text style={styles.scenarioLabel}>{scenario.label}</Text>
                  <Text style={styles.scenarioDescription}>
                    {scenario.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.runAllButton,
                (!isConnected || runningTest !== null) && styles.runAllButtonDisabled
              ]}
              onPress={handleRunAll}
              disabled={!isConnected || runningTest !== null}
            >
              <Text style={styles.runAllIcon}>🚀</Text>
              <Text style={styles.runAllText}>Run All Tests</Text>
            </TouchableOpacity>

            <View style={styles.statusBar}>
              <View style={[
                styles.statusIndicator,
                isConnected ? styles.statusConnected : styles.statusDisconnected
              ]} />
              <Text style={styles.statusText}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
              {runningTest && (
                <Text style={styles.runningText}>
                  Running: {testScenarios.find(s => s.id === runningTest)?.label}
                </Text>
              )}
            </View>

            {/* Latest Response Preview */}
            {messages.length > 0 && (
              <View style={styles.responsePreview}>
                <Text style={styles.responseLabel}>Latest Response:</Text>
                <Text style={styles.responseText} numberOfLines={3}>
                  {messages[messages.length - 1].content}
                </Text>
                {messages[messages.length - 1].metadata?.rawResponse && (
                  <Text style={styles.responseHint}>
                    (Check chat UI for full JSON response)
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 16,
    margin: 16,
    marginBottom: 8, // Less margin at bottom since it's now at top
    ...AppColors.shadows.elevated,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  toggleIcon: {
    fontSize: 20,
  },
  toggleText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  toggleArrow: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  scrollView: {
    maxHeight: 200,
  },
  scenariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  scenarioButton: {
    width: '47%',
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  scenarioButtonActive: {
    backgroundColor: `${AppColors.aiGradientStart}15`,
    borderColor: AppColors.aiGradientStart,
  },
  scenarioIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  scenarioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  scenarioDescription: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  runAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.aiGradientStart,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  runAllButtonDisabled: {
    backgroundColor: AppColors.borderLight,
  },
  runAllIcon: {
    fontSize: 20,
  },
  runAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusConnected: {
    backgroundColor: AppColors.success,
  },
  statusDisconnected: {
    backgroundColor: AppColors.error,
  },
  statusText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  runningText: {
    fontSize: 14,
    color: AppColors.aiGradientStart,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  responsePreview: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  responseText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  responseHint: {
    fontSize: 12,
    color: AppColors.aiGradientStart,
    marginTop: 4,
    fontStyle: 'italic',
  },
});