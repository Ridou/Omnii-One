import React from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Shield, Download } from 'lucide-react-native';
import { 
  Heading1, 
  Heading2, 
  Heading3,
  BodyText, 
  CaptionText,
  ButtonText 
} from '~/components/common/Typography';
import { BRAND_COLORS } from '~/lib/assets';
import { useSmartBack } from '~/utils/navigation';
import { AppHead } from '~/components/common/Head';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const smartBack = useSmartBack({ 
    authAwareFallback: true,
    webBehavior: 'history' // Ensure static-friendly behavior
  });

  const openEmail = () => {
    Linking.openURL('mailto:privacy@omnii.live?subject=Privacy Policy Inquiry');
  };

  const openDataDeletion = () => {
    Linking.openURL('https://omnii.live/data-deletion');
  };

  return (
    <>
      <AppHead
        title="Privacy Policy - OMNII AI Productivity Assistant"
        description="OMNII Privacy Policy - Learn how we collect, use, and protect your information when you use our AI productivity assistant."
        keywords="privacy policy, data protection, OMNII, AI assistant, productivity app, GDPR, CCPA, data privacy"
        canonical="https://omnii.live/privacy-policy"
        ogTitle="Privacy Policy - OMNII"
        ogDescription="Your privacy is important to us. Learn how OMNII protects and manages your data."
        ogUrl="https://omnii.live/privacy-policy"
      />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={smartBack}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={BRAND_COLORS.primary} />
          </TouchableOpacity>
          <Heading2 style={{ color: BRAND_COLORS.text }}>Privacy Policy</Heading2>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Title Section */}
          <View style={styles.section}>
            <View style={styles.titleHeader}>
              <Shield size={32} color={BRAND_COLORS.primary} />
              <Heading1 style={styles.title}>OMNII Privacy Policy</Heading1>
            </View>
            <BodyText style={[styles.subtitle, { color: BRAND_COLORS.secondaryText }]}>
              Your privacy is important to us. This policy explains how we collect, use, and protect your information when you use OMNII.
            </BodyText>
            <View style={styles.dateCard}>
              <BodyText style={styles.dateText}>
                <BodyText style={styles.bold}>Effective Date:</BodyText> May 30, 2025
              </BodyText>
              <BodyText style={styles.dateText}>
                <BodyText style={styles.bold}>Last Updated:</BodyText> May 30, 2025
              </BodyText>
            </View>
          </View>

          {/* Introduction */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>1. Introduction</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                Welcome to OMNII ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application OMNII (the "App") and related services.
              </BodyText>
              <BodyText style={styles.cardText}>
                We are committed to protecting your privacy and ensuring you have a positive experience on our App. This policy outlines our data practices in compliance with applicable privacy laws, including the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA).
              </BodyText>
            </View>
          </View>

          {/* Information We Collect */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>2. Information We Collect</Heading3>
            
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>2.1 Personal Information You Provide</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Account Information</BodyText>: Email address, full name (optional)
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Profile Information</BodyText>: Work preferences, productivity patterns, AI persona settings
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Communication Data</BodyText>: Messages in chat interface, feedback submissions
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Productivity Data</BodyText>: Task completion patterns, usage analytics, achievement progress
                </BodyText>
              </View>

              <BodyText style={[styles.cardSubtitle, { marginTop: 20 }]}>
                <BodyText style={styles.bold}>2.2 Information Collected Automatically</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Device Information</BodyText>: Device type, operating system version, unique device identifiers
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Usage Information</BodyText>: App usage patterns, feature interactions, session duration
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Technical Data</BodyText>: IP address, browser type, network information
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Location Data</BodyText>: General location (city/country level) for analytics purposes only
                </BodyText>
              </View>
            </View>
          </View>

          {/* How We Use Your Information */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>3. How We Use Your Information</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>3.1 Primary Purposes</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>App Functionality</BodyText>: Provide core features including AI task suggestions, analytics, and achievements
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Personalization</BodyText>: Customize AI recommendations based on your preferences and usage patterns
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Account Management</BodyText>: Maintain your account, provide customer support, process authentication
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Performance Improvement</BodyText>: Analyze usage patterns to improve app performance and features
                </BodyText>
              </View>

              <BodyText style={[styles.cardSubtitle, { marginTop: 20 }]}>
                <BodyText style={styles.bold}>3.2 AI Transparency</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Machine Learning</BodyText>: We use your productivity data to train our AI recommendation engine
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Automated Decision Making</BodyText>: Our AI suggests tasks and productivity insights based on your patterns
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Human Oversight</BodyText>: You maintain full control over AI suggestions through approval system
                </BodyText>
              </View>
            </View>
          </View>

          {/* Data Sharing */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>4. Data Sharing and Disclosure</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>4.1 We Do Not Sell Your Personal Information</BodyText>
              </BodyText>
              <BodyText style={styles.cardText}>
                We do not sell, rent, or trade your personal information to third parties for monetary consideration.
              </BodyText>

              <BodyText style={[styles.cardSubtitle, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>4.2 Service Providers</BodyText>
              </BodyText>
              <BodyText style={styles.cardText}>
                We may share information with trusted service providers who assist us in operating the App:
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Cloud Infrastructure</BodyText>: Supabase (data storage and authentication)
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Analytics</BodyText>: Anonymized usage data for app improvement
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Communication</BodyText>: SMS service providers for two-factor authentication
                </BodyText>
              </View>
            </View>
          </View>

          {/* Your Privacy Rights */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>5. Your Privacy Rights</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>5.1 General Rights</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Access</BodyText>: Right to access your personal information
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Correction</BodyText>: Right to correct inaccurate information
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Deletion</BodyText>: Right to delete your personal information
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Portability</BodyText>: Right to export your data in a portable format
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Objection</BodyText>: Right to object to processing of your personal information
                </BodyText>
              </View>
            </View>
          </View>

          {/* Data Security */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>6. Data Security</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                We implement industry-standard security measures to protect your personal information:
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Encryption</BodyText>: All data transmitted and stored is encrypted using industry-standard methods
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Access Controls</BodyText>: Strict access controls limit who can view your personal information
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Regular Audits</BodyText>: We conduct regular security audits and vulnerability assessments
                </BodyText>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>7. Contact Information</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </BodyText>
              
              <TouchableOpacity style={styles.contactButton} onPress={openEmail}>
                <Mail size={20} color={BRAND_COLORS.primary} />
                <BodyText style={[styles.contactText, { color: BRAND_COLORS.primary }]}>
                  privacy@omnii.live
                </BodyText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactButton} onPress={openDataDeletion}>
                <Download size={20} color={BRAND_COLORS.primary} />
                <BodyText style={[styles.contactText, { color: BRAND_COLORS.primary }]}>
                  Data Deletion Request
                </BodyText>
              </TouchableOpacity>

              <BodyText style={[styles.cardText, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>Response Times:</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>General Inquiries: We respond within 48 hours</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Rights Requests: We respond within 30 days (GDPR) or 45 days (CCPA)</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Urgent Security Issues: We respond within 24 hours</BodyText>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <CaptionText style={[styles.footerText, { color: BRAND_COLORS.secondaryText }]}>
              This Privacy Policy is effective as of the date listed above and supersedes any prior versions.
              For the complete Privacy Policy, visit: https://omnii.live/privacy
            </CaptionText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: BRAND_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    marginLeft: 12,
    flex: 1,
  },
  subtitle: {
    lineHeight: 24,
    marginBottom: 16,
  },
  dateCard: {
    backgroundColor: `${BRAND_COLORS.primary}10`,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primary,
  },
  dateText: {
    marginBottom: 4,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: BRAND_COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardText: {
    marginBottom: 12,
    lineHeight: 22,
  },
  cardSubtitle: {
    marginBottom: 12,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    marginRight: 8,
    marginTop: 2,
    color: BRAND_COLORS.primary,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: `${BRAND_COLORS.primary}10`,
    borderRadius: 8,
    marginBottom: 8,
  },
  contactText: {
    marginLeft: 12,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    lineHeight: 18,
  },
}); 