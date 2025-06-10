import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { 
  connectGoogleIntegration, 
  disconnectGoogleIntegration,
  getGoogleIntegrationStatus,
  getAvailableGoogleServices,
  type GoogleIntegrationStatus 
} from '~/services/googleIntegration';
import { BodyText, ButtonText, CaptionText } from '~/components/common/Typography';

interface GoogleIntegrationCardProps {
  onIntegrationChange?: (connected: boolean) => void;
  showAIPrompt?: boolean;
}

export const GoogleIntegrationCard: React.FC<GoogleIntegrationCardProps> = ({
  onIntegrationChange,
  showAIPrompt = false
}) => {
  const [status, setStatus] = useState<GoogleIntegrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      setIsLoading(true);
      const integrationStatus = await getGoogleIntegrationStatus();
      setStatus(integrationStatus);
    } catch (error) {
      console.error('Failed to load integration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      await connectGoogleIntegration();
      await loadIntegrationStatus();
      
      onIntegrationChange?.(true);
      
      Alert.alert(
        '✅ Google Workspace Connected',
        'Your Google services are now integrated with OMNII. You can now use AI features with your Gmail, Calendar, and Tasks!',
        [{ text: 'Great!', style: 'default' }]
      );
      
    } catch (error) {
      console.error('Failed to connect Google integration:', error);
      
      Alert.alert(
        '❌ Connection Failed',
        'Failed to connect Google workspace. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      '🔓 Disconnect Google Workspace',
      'This will remove access to your Google services. AI features requiring Google access will be limited.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsConnecting(true);
              await disconnectGoogleIntegration();
              await loadIntegrationStatus();
              onIntegrationChange?.(false);
            } catch (error) {
              console.error('Failed to disconnect Google integration:', error);
              Alert.alert('Error', 'Failed to disconnect. Please try again.');
            } finally {
              setIsConnecting(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <BodyText style={styles.loadingText}>Loading Google integration...</BodyText>
      </View>
    );
  }

  const availableServices = getAvailableGoogleServices();

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>🔗</Text>
          <BodyText style={styles.title}>Google Workspace</BodyText>
          <View style={[styles.statusBadge, status?.isConnected ? styles.connectedBadge : styles.disconnectedBadge]}>
            <CaptionText style={[styles.statusText, status?.isConnected ? styles.connectedText : styles.disconnectedText]}>
              {status?.isConnected ? 'Connected' : 'Not Connected'}
            </CaptionText>
          </View>
        </View>
        
        {status?.isConnected && status.email && (
          <CaptionText style={styles.emailText}>Connected to: {status.email}</CaptionText>
        )}
      </View>

      {/* AI Prompt (for Apple users) */}
      {showAIPrompt && !status?.isConnected && (
        <View style={styles.aiPrompt}>
          <Text style={styles.aiIcon}>🤖</Text>
          <View style={styles.aiPromptContent}>
            <BodyText style={styles.aiPromptTitle}>Unlock AI Features</BodyText>
            <CaptionText style={styles.aiPromptText}>
              Connect your Google workspace to enable AI-powered email management, calendar scheduling, and task automation.
            </CaptionText>
          </View>
        </View>
      )}

      {/* Services List */}
      <View style={styles.servicesContainer}>
        <CaptionText style={styles.servicesTitle}>Available Services:</CaptionText>
        {availableServices.map((service, index) => (
          <View key={service.name} style={styles.serviceItem}>
            <Text style={styles.serviceIcon}>
              {service.name === 'Gmail' ? '📧' : 
               service.name === 'Calendar' ? '📅' : 
               service.name === 'Tasks' ? '✓' : 
               service.name === 'Contacts' ? '👥' : '🔧'}
            </Text>
            <View style={styles.serviceContent}>
              <CaptionText style={styles.serviceName}>{service.name}</CaptionText>
              <CaptionText style={styles.serviceDescription}>{service.description}</CaptionText>
            </View>
          </View>
        ))}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionButton, status?.isConnected ? styles.disconnectButton : styles.connectButton]}
        onPress={status?.isConnected ? handleDisconnect : handleConnect}
        disabled={isConnecting}
      >
        <ButtonText style={[styles.actionButtonText, status?.isConnected ? styles.disconnectButtonText : styles.connectButtonText]}>
          {isConnecting ? 'Processing...' : status?.isConnected ? '🔓 Disconnect' : '🔗 Connect Google Workspace'}
        </ButtonText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontWeight: '600',
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  connectedBadge: {
    backgroundColor: '#E8F5E8',
  },
  disconnectedBadge: {
    backgroundColor: '#FEF7F0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  connectedText: {
    color: '#34A853',
  },
  disconnectedText: {
    color: '#E37400',
  },
  emailText: {
    color: '#666666',
    fontSize: 12,
    marginTop: 4,
  },
  aiPrompt: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4285F4',
  },
  aiIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  aiPromptContent: {
    flex: 1,
  },
  aiPromptTitle: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#1565C0',
  },
  aiPromptText: {
    color: '#1976D2',
    lineHeight: 18,
  },
  servicesContainer: {
    marginBottom: 16,
  },
  servicesTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontWeight: '500',
    marginBottom: 2,
    color: '#333333',
  },
  serviceDescription: {
    color: '#666666',
    lineHeight: 16,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#4285F4',
  },
  disconnectButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC3545',
  },
  actionButtonText: {
    fontWeight: '600',
  },
  connectButtonText: {
    color: '#FFFFFF',
  },
  disconnectButtonText: {
    color: '#DC3545',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666666',
  },
}); 