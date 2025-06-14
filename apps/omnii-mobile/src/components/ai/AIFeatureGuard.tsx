import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Modal } from 'react-native';
import { 
  needsGoogleIntegrationForAI,
  getGoogleIntegrationStatus,
  connectGoogleIntegration 
} from '~/services/googleIntegration';
import { useAuth } from '~/context/AuthContext';
import { BodyText, ButtonText, CaptionText, H3 } from '~/components/common/Typography';

interface AIFeatureGuardProps {
  children: React.ReactNode;
  featureName: string;
  featureDescription: string;
  requiredServices?: string[];
  onGoogleConnected?: () => void;
}

interface AIFeaturePromptProps {
  visible: boolean;
  onClose: () => void;
  onConnect: () => void;
  featureName: string;
  featureDescription: string;
  requiredServices: string[];
  isConnecting: boolean;
}

const AIFeaturePrompt: React.FC<AIFeaturePromptProps> = ({
  visible,
  onClose,
  onConnect,
  featureName,
  featureDescription,
  requiredServices,
  isConnecting
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.promptCard}>
        {/* Header */}
        <View style={styles.promptHeader}>
          <Text style={styles.promptIcon}>🤖</Text>
          <H3 style={styles.promptTitle}>AI Feature Requires Google Access</H3>
        </View>

        {/* Content */}
        <View style={styles.promptContent}>
          <BodyText style={styles.featureName}>&ldquo;{featureName}&rdquo;</BodyText>
          <CaptionText style={styles.featureDescription}>
            {featureDescription}
          </CaptionText>

          <View style={styles.requirementsSection}>
            <CaptionText style={styles.requirementsTitle}>Required Google Services:</CaptionText>
            {requiredServices.map((service, index) => (
              <View key={service} style={styles.serviceRequirement}>
                <Text style={styles.serviceIcon}>
                  {service === 'Gmail' ? '📧' : 
                   service === 'Calendar' ? '📅' : 
                   service === 'Tasks' ? '✓' : 
                   service === 'Contacts' ? '👥' : '🔧'}
                </Text>
                <CaptionText style={styles.serviceName}>{service}</CaptionText>
              </View>
            ))}
          </View>

          <View style={styles.explanationSection}>
            <Text style={styles.shieldIcon}>🛡️</Text>
            <CaptionText style={styles.explanationText}>
              Your Apple Sign In keeps your authentication private, while Google integration enables AI features. 
              You can disconnect Google services anytime while keeping your Apple account.
            </CaptionText>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.promptActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isConnecting}
          >
            <ButtonText style={styles.cancelButtonText}>Not Now</ButtonText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.connectButton}
            onPress={onConnect}
            disabled={isConnecting}
          >
            <ButtonText style={styles.connectButtonText}>
              {isConnecting ? 'Connecting...' : '🔗 Connect Google'}
            </ButtonText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export const AIFeatureGuard: React.FC<AIFeatureGuardProps> = ({
  children,
  featureName,
  featureDescription,
  requiredServices = ['Gmail', 'Calendar', 'Tasks'],
  onGoogleConnected
}) => {
  const { user } = useAuth();
  const [needsIntegration, setNeedsIntegration] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkIntegrationStatus();
  }, [user]);

  const checkIntegrationStatus = async () => {
    try {
      setIsLoading(true);
      const needsGoogle = await needsGoogleIntegrationForAI();
      setNeedsIntegration(needsGoogle);
    } catch (error) {
      // Assume no integration needed on error to avoid blocking users
      setNeedsIntegration(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeatureAccess = () => {
    if (needsIntegration) {
      setShowPrompt(true);
    }
    // If no integration needed, children will render normally
  };

  const handleConnectGoogle = async () => {
    try {
      setIsConnecting(true);
      
      await connectGoogleIntegration();
      
      // Recheck integration status
      await checkIntegrationStatus();
      
      setShowPrompt(false);
      onGoogleConnected?.();
      
      Alert.alert(
        '✅ Google Connected',
        `${featureName} is now available! Your Google services are integrated while keeping your Apple authentication secure.`,
        [{ text: 'Continue', style: 'default' }]
      );
      
    } catch (error) {
      
      Alert.alert(
        '❌ Connection Failed',
        'Unable to connect Google services. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClosePrompt = () => {
    setShowPrompt(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <CaptionText style={styles.loadingText}>Checking permissions...</CaptionText>
      </View>
    );
  }

  // If integration is needed, wrap children with guard
  if (needsIntegration) {
    return (
      <>
        <TouchableOpacity onPress={handleFeatureAccess} activeOpacity={0.7}>
          <View style={styles.guardedFeature}>
            {children}
            <View style={styles.guardOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
              <CaptionText style={styles.guardText}>Connect Google to unlock</CaptionText>
            </View>
          </View>
        </TouchableOpacity>

        <AIFeaturePrompt
          visible={showPrompt}
          onClose={handleClosePrompt}
          onConnect={handleConnectGoogle}
          featureName={featureName}
          featureDescription={featureDescription}
          requiredServices={requiredServices}
          isConnecting={isConnecting}
        />
      </>
    );
  }

  // No integration needed - render children normally
  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666666',
  },
  guardedFeature: {
    position: 'relative',
  },
  guardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  lockIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  guardText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  promptHeader: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  promptIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  promptTitle: {
    textAlign: 'center',
    color: '#1565C0',
  },
  promptContent: {
    padding: 20,
  },
  featureName: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333333',
  },
  featureDescription: {
    textAlign: 'center',
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  requirementsSection: {
    marginBottom: 20,
  },
  requirementsTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  serviceRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  serviceName: {
    color: '#666666',
  },
  explanationSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  shieldIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  explanationText: {
    flex: 1,
    color: '#666666',
    lineHeight: 18,
  },
  promptActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666666',
  },
  connectButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 