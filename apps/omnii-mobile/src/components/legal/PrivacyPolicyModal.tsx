import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { AppColors } from '~/constants/Colors';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

export default function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close privacy policy"
            accessibilityHint="Closes the privacy policy modal and returns to the previous screen"
          >
            <X size={24} color={AppColors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.effectiveDate}>
            <Text style={styles.effectiveDateText}>Effective Date: May 30, 2025</Text>
            <Text style={styles.effectiveDateText}>Last Updated: May 30, 2025</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.bodyText}>
              Welcome to OMNII ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application OMNII (the "App") and related services.
            </Text>
            <Text style={styles.bodyText}>
              We are committed to protecting your privacy and ensuring you have a positive experience on our App. This policy outlines our data practices in compliance with applicable privacy laws, including the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA).
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            
            <Text style={styles.subsectionTitle}>2.1 Personal Information You Provide</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Account Information</Text>: Email address, full name (optional)</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Profile Information</Text>: Work preferences, productivity patterns, AI persona settings</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Communication Data</Text>: Messages in chat interface, feedback submissions</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Productivity Data</Text>: Task completion patterns, usage analytics, achievement progress</Text>
            </View>

            <Text style={styles.subsectionTitle}>2.2 Information Collected Automatically</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Device Information</Text>: Device type, operating system version, unique device identifiers</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Usage Information</Text>: App usage patterns, feature interactions, session duration</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Technical Data</Text>: IP address, browser type, network information</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Location Data</Text>: General location (city/country level) for analytics purposes only</Text>
            </View>

            <Text style={styles.subsectionTitle}>2.3 Information from Third Parties</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Google OAuth</Text>: When you sign in with Google, we receive your email address, name, and profile picture</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Integration Data</Text>: Data from connected productivity tools (with your explicit consent)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
            
            <Text style={styles.subsectionTitle}>3.1 Primary Purposes</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>App Functionality</Text>: Provide core features including AI task suggestions, analytics, and achievements</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Personalization</Text>: Customize AI recommendations based on your preferences and usage patterns</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Account Management</Text>: Maintain your account, provide customer support, process authentication</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Performance Improvement</Text>: Analyze usage patterns to improve app performance and features</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Sharing and Disclosure</Text>
            
            <Text style={styles.subsectionTitle}>4.1 We Do Not Sell Your Personal Information</Text>
            <Text style={styles.bodyText}>
              We do not sell, rent, or trade your personal information to third parties for monetary consideration.
            </Text>

            <Text style={styles.subsectionTitle}>4.2 Service Providers</Text>
            <Text style={styles.bodyText}>
              We may share information with trusted service providers who assist us in operating the App:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Cloud Infrastructure</Text>: Supabase (data storage and authentication)</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Analytics</Text>: Anonymized usage data for app improvement</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Communication</Text>: SMS service providers for two-factor authentication</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Your Privacy Rights</Text>
            
            <Text style={styles.subsectionTitle}>5.1 Access and Control</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Account Access</Text>: View and update your account information in the App</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Data Export</Text>: Request a copy of your personal data in a portable format</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Data Deletion</Text>: Request deletion of your account and associated data</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Consent Management</Text>: Manage your privacy preferences and consent settings</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Contact Information</Text>
            
            <Text style={styles.subsectionTitle}>6.1 Privacy Questions</Text>
            <Text style={styles.bodyText}>
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </Text>
            <Text style={styles.contactInfo}><Text style={styles.bold}>Email</Text>: privacy@omnii.live</Text>
            <Text style={styles.contactInfo}><Text style={styles.bold}>Address</Text>: OMNII Privacy Team, [Company Address]</Text>

            <Text style={styles.subsectionTitle}>6.2 Exercise Your Rights</Text>
            <Text style={styles.bodyText}>
              To exercise your privacy rights or submit a privacy request:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>In-App</Text>: Use the Data Management section in your Profile</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Email</Text>: Send a request to privacy@omnii.live</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Online</Text>: Visit https://omnii.live/data-deletion</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              For the complete Privacy Policy, please visit: https://omnii.live/privacy
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.cardBackground,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: AppColors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  effectiveDate: {
    backgroundColor: AppColors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.aiGradientStart,
  },
  effectiveDateText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textSecondary,
    marginBottom: 12,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 15,
    color: AppColors.aiGradientStart,
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textSecondary,
    flex: 1,
  },
  bold: {
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  contactInfo: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  footer: {
    backgroundColor: AppColors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 