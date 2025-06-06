import type React from 'react';
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import {
  Download,
  Trash2,
  Shield,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  X,
  type LucideIcon,
  Eye,
  Mail,
  Clock,
  Database,
  RefreshCw,
} from 'lucide-react-native';
import { AppColors } from '~/constants/Colors';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { supabase } from '~/lib/supabase';
import PrivacyPolicyModal from '../legal/PrivacyPolicyModal';
import TermsOfServiceModal from '../legal/TermsOfServiceModal';

interface ConsentSettings {
  analytics: boolean;
  aiImprovement: boolean;
  communications: boolean;
  personalization: boolean;
}

interface PrivacySettings {
  dataRetentionPeriod: number;
  anonymizeData: boolean;
  thirdPartySharing: boolean;
}

interface DataExportResponse {
  exportId: string;
  downloadUrl?: string;
  estimatedSize: number;
  expiresAt: string;
  dataCategories: string[];
}

interface DeleteAccountResponse {
  success: boolean;
  deletionId: string;
  gracePeriodEnds?: string;
  exportId?: string;
  recoveryToken?: string;
  errors?: string[];
}

interface DataManagementProps {
  onExportData?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  onManageConsent?: (consents: ConsentSettings) => void;
  onUpdatePrivacySettings?: (settings: PrivacySettings) => void;
  userEmail?: string;
}

export default function DataManagement({
  userEmail,
}: DataManagementProps) {
  const { user, session } = useAuth();
  const { isDark } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [exportData, setExportData] = useState<DataExportResponse | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const [consents, setConsents] = useState<ConsentSettings>({
    analytics: true,
    aiImprovement: true,
    communications: false,
    personalization: true,
  });

  // Local consent management function
  const handleConsentChange = (newConsents: ConsentSettings) => {
    console.log('Consent settings updated:', newConsents);
    // Here you could save to user preferences or send to backend
    // For now, we'll just update local state
    setConsents(newConsents);
  };

  // Real GDPR function calls
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      
      // Debug: Log session details
      console.log('🔍 Debug - Session details:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        hasUser: !!user,
        userId: user?.id,
        sessionKeys: session ? Object.keys(session) : [],
      });

      if (!session?.access_token) {
        throw new Error('No valid session token available');
      }

      if (!user?.id) {
        throw new Error('No user ID available');
      }
      
      console.log('🚀 Making export request via Supabase client...');
      
      const { data: exportResult, error } = await supabase.functions.invoke('export-user-data', {
        body: {
          userId: user.id,
          format: 'json',
        },
      });

      if (error) {
        console.error('❌ Export function error:', error);
        throw new Error(`Failed to initiate data export: ${error.message}`);
      }

      if (!exportResult) {
        throw new Error('No response from export service');
      }

      setExportData(exportResult);

      console.log('✅ Export result:', exportResult);

      Alert.alert(
        'Data Export Started',
        `Your data export has been initiated. You'll receive an email with a download link within 24 hours. The link will be valid for 7 days.\n\nExport ID: ${exportResult.exportId}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Data export failed:', error);
      Alert.alert(
        'Export Failed',
        `Failed to initiate data export: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support if the issue persists.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewData = async () => {
    try {
      setLoadingPreview(true);
      
      // Debug: Log session details
      console.log('🔍 Debug - Preview session details:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        hasUser: !!user,
        userId: user?.id,
      });

      if (!session?.access_token) {
        throw new Error('No valid session token available');
      }

      if (!user?.id) {
        throw new Error('No user ID available');
      }
      
      console.log('🚀 Making preview request via Supabase client...');
      
      const { data: preview, error } = await supabase.functions.invoke('deletion-preview', {
        body: {
          userId: user.id,
        },
      });

      if (error) {
        console.error('❌ Preview function error:', error);
        throw new Error(`Failed to load data preview: ${error.message}`);
      }

      if (!preview) {
        throw new Error('No response from preview service');
      }

      console.log('✅ Preview result:', preview);
      setPreviewData(preview);
      setShowDataPreview(true);

    } catch (error) {
      console.error('Data preview failed:', error);
      Alert.alert(
        'Preview Failed',
        `Failed to load data preview: ${error instanceof Error ? error.message : 'Unknown error'}. You can still proceed with deletion if needed.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirmationText.toLowerCase() !== 'delete my account') {
      Alert.alert('Confirmation Required', 'Please type &quot;delete my account&quot; exactly as shown.');
      return;
    }
    
    try {
      setIsDeleting(true);
      
      // Debug: Log session details
      console.log('🔍 Debug - Delete session details:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        hasUser: !!user,
        userId: user?.id,
      });

      if (!session?.access_token) {
        throw new Error('No valid session token available');
      }

      if (!user?.id) {
        throw new Error('No user ID available');
      }
      
      console.log('🚀 Making delete request via Supabase client...');
      
      const { data: deleteResult, error } = await supabase.functions.invoke('delete-account', {
        body: {
          userId: user.id,
          reason: 'user_request',
          exportData: true, // Always export data before deletion
          immediateDelete: false, // Use 30-day grace period
        },
      });

      if (error) {
        console.error('❌ Delete function error:', error);
        throw new Error(`Failed to process account deletion: ${error.message}`);
      }

      if (!deleteResult) {
        throw new Error('No response from deletion service');
      }

      console.log('✅ Delete result:', deleteResult);

      setShowDeleteConfirmation(false);
      setDeleteConfirmationText('');

      Alert.alert(
        'Account Deletion Initiated',
        `Your account has been scheduled for deletion with a 30-day grace period.\n\n` +
        `• Grace period ends: ${new Date(deleteResult.gracePeriodEnds || '').toLocaleDateString()}\n` +
        `• Recovery token sent to: ${userEmail}\n` +
        `• Deletion ID: ${deleteResult.deletionId}\n\n` +
        `You can recover your account anytime within 30 days using the recovery link sent to your email.`,
        [
          {
            text: 'Understand',
            onPress: () => {
              // Could navigate back or show recovery instructions
            }
          }
        ]
      );

    } catch (error) {
      console.error('Account deletion failed:', error);
      Alert.alert(
        'Deletion Failed',
        `Failed to process account deletion: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const updateConsent = (key: keyof ConsentSettings, value: boolean) => {
    const newConsents = { ...consents, [key]: value };
    setConsents(newConsents);
    handleConsentChange(newConsents);
  };

  const openPrivacyPolicy = () => {
    setShowPrivacyPolicy(true);
  };

  const contactSupport = () => {
    console.log('Contact support: email privacy@omnii.net');
  };

  const DataSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="mb-8">
      <Text className={cn(
        "text-xl font-bold mb-4",
        isDark ? "text-white" : "text-gray-900"
      )}>{title}</Text>
      {children}
    </View>
  );

  const ActionButton = ({
    title,
    subtitle,
    icon: Icon,
    onPress,
    variant = 'default',
    loading = false,
  }: {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    onPress: () => void;
    variant?: 'default' | 'danger';
    loading?: boolean;
  }) => (
    <TouchableOpacity
      className={cn(
        "rounded-xl mb-3 border p-4",
        variant === 'danger' 
          ? "border-red-500" 
          : cn(
              isDark ? "border-slate-600 bg-slate-800" : "border-gray-200 bg-white"
            )
      )}
      onPress={onPress}
      disabled={loading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View className="flex-row items-center">
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'danger' ? '#ef4444' : '#6366f1'}
          />
        ) : (
          <Icon
            size={24}
            color={variant === 'danger' ? '#ef4444' : '#6366f1'}
          />
        )}
        <View className="ml-4 flex-1">
          <Text className={cn(
            "text-base font-semibold mb-1",
            variant === 'danger' 
              ? "text-red-500" 
              : cn(
                  isDark ? "text-white" : "text-gray-900"
                )
          )}>
            {title}
          </Text>
          <Text className={cn(
            "text-sm leading-5",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ConsentItem = ({
    title,
    description,
    value,
    onValueChange,
    required = false,
  }: {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    required?: boolean;
  }) => (
    <View className={cn(
      "flex-row items-center justify-between py-4 border-b",
      isDark ? "border-slate-600" : "border-gray-200"
    )}>
      <View className="flex-1 mr-4">
        <Text className={cn(
          "text-base font-semibold mb-1",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {title}
          {required && <Text className="text-red-500"> *</Text>}
        </Text>
        <Text className={cn(
          "text-sm leading-5",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={required}
        trackColor={{
          false: isDark ? '#475569' : '#e5e7eb',
          true: '#6366f1',
        }}
        thumbColor={value ? '#ffffff' : '#9ca3af'}
        accessible={true}
        accessibilityRole="switch"
        accessibilityLabel={`${title} consent`}
        accessibilityState={{ checked: value }}
      />
    </View>
  );

  return (
    <ScrollView 
      className={cn(
        "flex-1",
        isDark ? "bg-slate-900" : "bg-white"
      )} 
      showsVerticalScrollIndicator={false}
    >
      <DataSection title="Your Privacy Rights">
        <View className={cn(
          "rounded-2xl p-5 items-center border-l-4 border-indigo-500",
          isDark ? "bg-slate-800" : "bg-white"
        )}>
          <Shield size={32} color="#6366f1" />
          <Text className={cn(
            "text-lg font-semibold mt-3 mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>Data Protection</Text>
          <Text className={cn(
            "text-sm leading-6 text-center",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            You have the right to access, correct, delete, and export your personal data. 
            You can also manage your consent preferences at any time.
          </Text>
        </View>
      </DataSection>

      <DataSection title="Data Export">
        <ActionButton
          title="Download My Data"
          subtitle="Get a copy of all your personal data in JSON format"
          icon={Download}
          onPress={handleExportData}
          loading={isExporting}
        />
        <Text className={cn(
          "text-xs leading-5 mt-2 mb-4",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>
          Includes your profile information, productivity data, achievement progress, 
          and chat history. Export will be emailed to {userEmail || user?.email || 'your registered email'}.
        </Text>
      </DataSection>

      <DataSection title="Privacy Preferences">
        <ActionButton
          title="Manage Consent"
          subtitle="Control how your data is used and processed"
          icon={Settings}
          onPress={() => setShowConsentModal(true)}
        />
        <View className={cn(
          "rounded-xl p-4 mt-3",
          isDark ? "bg-slate-800" : "bg-gray-50"
        )}>
          <Text className={cn(
            "text-sm font-medium mb-2",
            isDark ? "text-white" : "text-gray-900"
          )}>Current Settings:</Text>
          <Text className={cn(
            "text-xs leading-5",
            isDark ? "text-slate-400" : "text-gray-600"
          )}>
            Analytics: {consents.analytics ? 'Enabled' : 'Disabled'} • 
            AI Improvement: {consents.aiImprovement ? 'Enabled' : 'Disabled'} • 
            Communications: {consents.communications ? 'Enabled' : 'Disabled'} • 
            Personalization: {consents.personalization ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </DataSection>

      <DataSection title="Data Deletion">
        <View className={cn(
          "rounded-xl p-4 mb-3 border border-yellow-500",
          isDark ? "bg-yellow-900/20" : "bg-yellow-50"
        )}>
          <View className="flex-row items-center mb-2">
            <AlertTriangle size={20} color="#eab308" />
            <Text className={cn(
              "text-sm font-semibold ml-2",
              isDark ? "text-yellow-400" : "text-yellow-800"
            )}>
              Important Privacy Information
            </Text>
          </View>
          <Text className={cn(
            "text-sm leading-5",
            isDark ? "text-yellow-300" : "text-yellow-700"
          )}>
            Account deletion is permanent and cannot be undone. We recommend exporting your data first.
          </Text>
        </View>
        
        <ActionButton
          title="Preview My Data"
          subtitle="See what data will be deleted before proceeding"
          icon={Eye}
          onPress={handlePreviewData}
          loading={loadingPreview}
        />
        
        <ActionButton
          title="Delete My Account"
          subtitle="Permanently delete your account and all associated data"
          icon={Trash2}
          onPress={handleDeleteAccount}
          variant="danger"
          loading={isDeleting}
        />
      </DataSection>

      <DataSection title="Support & Legal">
        <ActionButton
          title="Privacy Policy"
          subtitle="Read our complete privacy policy and data practices"
          icon={FileText}
          onPress={openPrivacyPolicy}
        />
        
        <ActionButton
          title="Terms of Service"
          subtitle="Review our terms of service and user agreement"
          icon={FileText}
          onPress={() => setShowTermsOfService(true)}
        />
        
        <ActionButton
          title="Contact Support"
          subtitle="Get help with privacy questions or data requests"
          icon={Mail}
          onPress={contactSupport}
        />
      </DataSection>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        visible={showTermsOfService}
        onClose={() => setShowTermsOfService(false)}
      />

      {/* Data Preview Modal */}
      <Modal
        visible={showDataPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDataPreview(false)}
      >
        <View className={cn(
          "flex-1",
          isDark ? "bg-omnii-dark-background" : "bg-omnii-background"
        )}>
          <View className={cn(
            "flex-row justify-between items-center px-5 py-4 border-b",
            isDark ? "border-omnii-dark-border" : "border-omnii-border"
          )}>
            <Text className={cn(
              "text-xl font-semibold",
              isDark ? "text-omnii-dark-text-primary" : "text-omnii-text-primary"
            )}>Data Deletion Preview</Text>
            <TouchableOpacity
              className={cn(
                "p-2 rounded-lg",
                "bg-omnii-card",
                isDark && "bg-omnii-dark-card"
              )}
              onPress={() => setShowDataPreview(false)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close data preview"
            >
              <X size={24} color={isDark ? '#f0f0f3' : AppColors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              This shows what data will be affected by account deletion. Data marked for anonymization will be preserved for analytics but cannot be linked back to you.
            </Text>

            {previewData?.dataCategories?.map((category: any, index: number) => (
              <View key={index} style={styles.previewCategory}>
                <View style={styles.previewCategoryHeader}>
                  <Database size={20} color={AppColors.aiGradientStart} />
                  <Text style={styles.previewCategoryTitle}>{category.category}</Text>
                  <Text style={styles.previewCategoryCount}>{category.recordCount} records</Text>
                </View>
                <Text style={styles.previewCategoryDescription}>{category.description}</Text>
                <Text style={styles.previewRetentionPolicy}>
                  Policy: {category.retentionPolicy}
                </Text>
              </View>
            ))}

            {previewData?.externalServices?.map((service: any, index: number) => (
              <View key={index} style={styles.previewCategory}>
                <View style={styles.previewCategoryHeader}>
                  <RefreshCw size={20} color={AppColors.warning} />
                  <Text style={styles.previewCategoryTitle}>{service.service}</Text>
                  <Text style={[
                    styles.previewCategoryCount,
                    { color: service.connected ? AppColors.success : AppColors.textSecondary }
                  ]}>
                    {service.connected ? 'Connected' : 'Not Connected'}
                  </Text>
                </View>
                <Text style={styles.previewCategoryDescription}>
                  Data types: {service.dataTypes?.join(', ') || 'None'}
                </Text>
              </View>
            ))}

            <View style={styles.previewTimeline}>
              <Clock size={20} color={AppColors.aiGradientStart} />
              <Text style={styles.previewTimelineText}>
                Estimated deletion time: {previewData?.estimatedDeletionTime || '24-48 hours'}
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDataPreview(false)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close preview"
              >
                <Text style={styles.cancelButtonText}>Close Preview</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Consent Management Modal */}
      <Modal
        visible={showConsentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConsentModal(false)}
      >
        <View className={cn(
          "flex-1",
          isDark ? "bg-slate-900" : "bg-white"
        )}>
          <View className={cn(
            "flex-row justify-between items-center px-5 py-4 border-b",
            isDark ? "border-slate-600" : "border-gray-200"
          )}>
            <Text className={cn(
              "text-xl font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>Privacy Preferences</Text>
            <TouchableOpacity
              className={cn(
                "p-2 rounded-lg",
                isDark ? "bg-slate-800" : "bg-gray-100"
              )}
              onPress={() => setShowConsentModal(false)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close privacy preferences"
            >
              <X size={24} color={isDark ? '#f0f0f3' : '#374151'} />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="flex-1 px-5">
            <Text className={cn(
              "text-sm leading-6 my-5",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              Control how OMNII uses your data. You can change these settings at any time.
            </Text>

            <ConsentItem
              title="Usage Analytics"
              description="Help improve OMNII by sharing anonymized usage patterns and app performance data"
              value={consents.analytics}
              onValueChange={(value) => updateConsent('analytics', value)}
            />

            <ConsentItem
              title="AI Improvement"
              description="Allow anonymized data to improve AI recommendations and suggestions for all users"
              value={consents.aiImprovement}
              onValueChange={(value) => updateConsent('aiImprovement', value)}
              required
            />

            <ConsentItem
              title="Email Communications"
              description="Receive product updates, tips, and important security notifications via email"
              value={consents.communications}
              onValueChange={(value) => updateConsent('communications', value)}
            />

            <ConsentItem
              title="Personalization"
              description="Use your data to personalize AI suggestions, interface, and productivity insights"
              value={consents.personalization}
              onValueChange={(value) => updateConsent('personalization', value)}
            />

            <View className="p-5">
              <TouchableOpacity
                className="bg-indigo-600 rounded-xl py-4 flex-row items-center justify-center"
                onPress={() => handleConsentChange(consents)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Save privacy preferences"
              >
                <CheckCircle size={20} color="#ffffff" />
                <Text className="text-white text-base font-semibold ml-2">Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmation}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.confirmationModal}>
            <AlertTriangle size={48} color={AppColors.error} />
            <Text style={styles.confirmationTitle}>Delete Account</Text>
            <Text style={styles.confirmationMessage}>
              This action cannot be undone. All your data including tasks, achievements, 
              and chat history will be permanently deleted.
            </Text>
            <Text style={styles.confirmationInstruction}>
              Type &quot;delete my account&quot; to confirm:
            </Text>
            <TextInput
              style={styles.confirmationInput}
              value={deleteConfirmationText}
              onChangeText={setDeleteConfirmationText}
              placeholder="delete my account"
              autoCapitalize="none"
              autoCorrect={false}
              accessible={true}
              accessibilityLabel="Account deletion confirmation text"
            />
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDeleteConfirmation(false);
                  setDeleteConfirmationText('');
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Cancel account deletion"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDeleteAccount}
                disabled={isDeleting}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Confirm account deletion"
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={AppColors.background} />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  rightsCard: {
    backgroundColor: AppColors.cardBackground,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: AppColors.aiGradientStart,
  },
  rightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  rightsDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  dangerButton: {
    borderColor: AppColors.error,
    backgroundColor: `${AppColors.error}08`,
  },
  actionButtonContent: {
    padding: 16,
  },
  actionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    marginLeft: 16,
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  dangerText: {
    color: AppColors.error,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  helpText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  consentSummary: {
    backgroundColor: AppColors.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  consentSummaryText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  warningCard: {
    backgroundColor: `${AppColors.warning}15`,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${AppColors.warning}40`,
  },
  warningText: {
    fontSize: 14,
    color: AppColors.warning,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: AppColors.cardBackground,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textSecondary,
    marginVertical: 20,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  consentContent: {
    flex: 1,
    marginRight: 16,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  requiredIndicator: {
    color: AppColors.error,
  },
  consentDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.textSecondary,
  },
  modalFooter: {
    padding: 20,
  },
  saveButton: {
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.background,
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmationModal: {
    backgroundColor: AppColors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.error,
    marginTop: 16,
    marginBottom: 12,
  },
  confirmationMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmationInstruction: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  confirmationInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
    width: '100%',
    marginBottom: 24,
  },
  confirmationButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: AppColors.cardBackground,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: AppColors.error,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.background,
  },
  previewCategory: {
    marginBottom: 16,
  },
  previewCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginLeft: 8,
  },
  previewCategoryCount: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginLeft: 8,
  },
  previewCategoryDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  previewRetentionPolicy: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  previewTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  previewTimelineText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginLeft: 8,
  },
}); 