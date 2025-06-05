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

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

export default function TermsOfServiceModal({ visible, onClose }: TermsOfServiceModalProps) {
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
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close terms of service"
            accessibilityHint="Closes the terms of service modal and returns to the previous screen"
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
            <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
            <Text style={styles.bodyText}>
              By accessing or using the OMNII mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
            </Text>
            <Text style={styles.bodyText}>
              These Terms constitute a legally binding agreement between you and OMNII ("we," "us," or "our") regarding your use of the App and related services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            
            <Text style={styles.subsectionTitle}>2.1 OMNII App</Text>
            <Text style={styles.bodyText}>
              OMNII is an AI-powered productivity assistant that provides:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Task Management</Text>: AI-generated task suggestions and approval workflows</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Analytics</Text>: Productivity insights and performance tracking</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Gamification</Text>: Achievement system and progress tracking</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>AI Chat</Text>: Natural language interaction with AI assistant</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}><Text style={styles.bold}>Profile Management</Text>: Personalized settings and preferences</Text>
            </View>

            <Text style={styles.subsectionTitle}>2.2 AI Services</Text>
            <Text style={styles.bodyText}>
              The App uses artificial intelligence to analyze your productivity patterns and provide personalized recommendations. All AI suggestions require your explicit approval before implementation.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Accounts and Registration</Text>
            
            <Text style={styles.subsectionTitle}>3.1 Account Creation</Text>
            <Text style={styles.bodyText}>
              To use the App, you must:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Create an account using a valid email address</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Provide accurate and complete information</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Maintain the security of your account credentials</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Be at least 13 years of age</Text>
            </View>

            <Text style={styles.subsectionTitle}>3.2 Account Responsibility</Text>
            <Text style={styles.bodyText}>
              You are responsible for all activities that occur under your account and for maintaining the confidentiality of your login information.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Acceptable Use Policy</Text>
            
            <Text style={styles.subsectionTitle}>4.1 Permitted Uses</Text>
            <Text style={styles.bodyText}>
              You may use the App for personal productivity, professional work organization, and legitimate business purposes.
            </Text>

            <Text style={styles.subsectionTitle}>4.2 Prohibited Uses</Text>
            <Text style={styles.bodyText}>
              You agree NOT to:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Use the App for any illegal or unauthorized purpose</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Interfere with or disrupt the App's functionality</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Attempt to gain unauthorized access to our systems</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Harass, abuse, or harm other users</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Reverse engineer, decompile, or disassemble the App</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. AI and Automated Services</Text>
            
            <Text style={styles.subsectionTitle}>5.1 AI Functionality</Text>
            <Text style={styles.bodyText}>
              The App uses artificial intelligence to analyze your productivity patterns, generate task suggestions, provide personalized insights, and facilitate natural language interactions.
            </Text>

            <Text style={styles.subsectionTitle}>5.2 AI Limitations</Text>
            <Text style={styles.bodyText}>
              You acknowledge that AI suggestions are recommendations, not guarantees, and that human oversight and judgment remain essential.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Privacy and Data Protection</Text>
            <Text style={styles.bodyText}>
              Your privacy is important to us. Please review our Privacy Policy, which explains how we collect, use, and protect your information. You retain ownership of your data and may exercise rights including access, correction, deletion, and portability.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Subscription and Payment Terms</Text>
            
            <Text style={styles.subsectionTitle}>7.1 Free Service</Text>
            <Text style={styles.bodyText}>
              The App is currently provided free of charge. We reserve the right to introduce paid features or subscriptions in the future with advance notice.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Disclaimers and Limitations</Text>
            
            <Text style={styles.subsectionTitle}>8.1 Service Disclaimer</Text>
            <Text style={styles.bodyText}>
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
            </Text>

            <Text style={styles.subsectionTitle}>8.2 Limitation of Liability</Text>
            <Text style={styles.bodyText}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Termination</Text>
            <Text style={styles.bodyText}>
              You may terminate your account at any time through the App settings. We may terminate your access if you violate these Terms. Upon termination, your right to use the App will cease and we may delete your account and data.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
            <Text style={styles.bodyText}>
              We may modify these Terms at any time. Material changes will be communicated through in-app notifications and email. Continued use of the App after changes become effective constitutes acceptance of the modified Terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contact Information</Text>
            <Text style={styles.bodyText}>
              For questions about these Terms or the App, contact us at:
            </Text>
            <Text style={styles.contactInfo}><Text style={styles.bold}>Email</Text>: support@omnii.live</Text>
            <Text style={styles.contactInfo}><Text style={styles.bold}>Website</Text>: https://omnii.live/support</Text>
            <Text style={styles.contactInfo}><Text style={styles.bold}>Legal Matters</Text>: legal@omnii.live</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By using OMNII, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
            </Text>
            <Text style={styles.footerText}>
              For the complete Terms of Service, please visit: https://omnii.live/terms
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
    marginBottom: 8,
  },
}); 