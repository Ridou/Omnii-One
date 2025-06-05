import React from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Phone, Mail } from 'lucide-react-native';
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

export default function SMSConsentScreen() {
  const router = useRouter();
  const smartBack = useSmartBack({ 
    authAwareFallback: true,
    webBehavior: 'history' // Ensure static-friendly behavior
  });

  const openEmail = () => {
    Linking.openURL('mailto:support@omnii.com?subject=SMS Consent Inquiry');
  };

  const openPhone = () => {
    Linking.openURL('tel:+81-90-4866-9859');
  };

  return (
    <>
      <AppHead
        title="SMS Consent - OMNII AI Productivity Assistant"
        description="SMS consent documentation for OMNII's two-factor authentication and security notifications."
        keywords="SMS consent, two-factor authentication, security, OMNII, text messages, TCPA compliance"
        canonical="https://omnii.live/sms-consent"
        ogTitle="SMS Consent - OMNII"
        ogDescription="Documentation of SMS consent collection for two-factor authentication and account security."
        ogUrl="https://omnii.live/sms-consent"
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
          <Heading2 style={{ color: BRAND_COLORS.text }}>SMS Consent</Heading2>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Title Section */}
          <View style={styles.section}>
            <Heading1 style={styles.title}>SMS Consent for Two-Factor Authentication</Heading1>
            <BodyText style={[styles.subtitle, { color: BRAND_COLORS.secondaryText }]}>
              This page documents our SMS consent collection process for two-factor authentication, 
              account verification, and security notifications in compliance with regulatory requirements.
            </BodyText>
          </View>

          {/* Consent Collection Method */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>Consent Collection Method</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                <BodyText style={styles.bold}>Collection Date:</BodyText> May 27, 2025
              </BodyText>
              <BodyText style={styles.cardText}>
                <BodyText style={styles.bold}>Method:</BodyText> Mobile app opt-in during account registration with explicit checkbox consent
              </BodyText>
              <BodyText style={styles.cardText}>
                <BodyText style={styles.bold}>Consent Language:</BodyText> "I agree to receive SMS notifications 
                from Omnii for two-factor authentication, account verification, automated security notifications, and login verification codes. 
                Message and data rates may apply. Reply STOP to opt out at any time."
              </BodyText>
              <BodyText style={styles.cardText}>
                <BodyText style={styles.bold}>Estimated Monthly Volume:</BodyText> Up to 1,000 messages per month
              </BodyText>
              <BodyText style={styles.cardText}>
                <BodyText style={styles.bold}>Use Case Category:</BodyText> Two-factor authentication and account verification for mobile app users
              </BodyText>
            </View>
          </View>

          {/* Opt-out Instructions */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>Opt-out Instructions</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                Users can opt out of SMS notifications through the following methods:
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  Reply "STOP" to any SMS message from Omnii
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  Disable SMS notifications in the app settings
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  Contact our support team for assistance
                </BodyText>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>Contact Information</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                For questions about SMS consent or to request opt-out assistance:
              </BodyText>
              
              <TouchableOpacity style={styles.contactButton} onPress={openEmail}>
                <Mail size={20} color={BRAND_COLORS.primary} />
                <BodyText style={[styles.contactText, { color: BRAND_COLORS.primary }]}>
                  support@omnii.com
                </BodyText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactButton} onPress={openPhone}>
                <Phone size={20} color={BRAND_COLORS.primary} />
                <BodyText style={[styles.contactText, { color: BRAND_COLORS.primary }]}>
                  +81 90 4866 9859
                </BodyText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sample Messages */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>Sample Messages</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                <BodyText style={styles.bold}>Two-Factor Authentication:</BodyText>
              </BodyText>
              <View style={styles.sampleMessage}>
                <BodyText style={styles.sampleText}>
                  "Your Omnii verification code is: 123456. This code expires in 10 minutes. Reply STOP to opt out."
                </BodyText>
              </View>
              
              <BodyText style={[styles.cardText, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>Account Security Alert:</BodyText>
              </BodyText>
              <View style={styles.sampleMessage}>
                <BodyText style={styles.sampleText}>
                  "Security alert: New login detected on your Omnii account. If this wasn't you, secure your account immediately. Reply STOP to opt out."
                </BodyText>
              </View>

              <BodyText style={[styles.cardText, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>Account Verification:</BodyText>
              </BodyText>
              <View style={styles.sampleMessage}>
                <BodyText style={styles.sampleText}>
                  "Welcome to Omnii! Please verify your account by entering this code: 789012. Reply STOP to opt out."
                </BodyText>
              </View>
            </View>
          </View>

          {/* Policy Document */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>SMS Consent Policy</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                <BodyText style={styles.bold}>Effective Date:</BodyText> May 27, 2025
              </BodyText>
              <BodyText style={styles.cardText}>
                <BodyText style={styles.bold}>Last Updated:</BodyText> May 27, 2025
              </BodyText>
              
              <BodyText style={[styles.cardText, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>Overview:</BodyText> This policy outlines Omnii's SMS consent collection and management practices in compliance with applicable regulations including the Telephone Consumer Protection Act (TCPA) and Cellular Telecommunications Industry Association (CTIA) guidelines.
            </BodyText>

            <BodyText style={[styles.cardText, { marginTop: 16 }]}>
              <BodyText style={styles.bold}>Business Information:</BodyText> Omnii is a productivity and task management platform that uses SMS exclusively for essential account security, two-factor authentication, and verification purposes. We do not send promotional or marketing messages via SMS.
            </BodyText>

            <BodyText style={[styles.cardText, { marginTop: 16 }]}>
              <BodyText style={styles.bold}>Use Case Description:</BodyText> Two-factor authentication and account verification for mobile app users. Automated security notifications and login verification codes to ensure account safety and prevent unauthorized access.
            </BodyText>

            <BodyText style={[styles.cardText, { marginTop: 16 }]}>
              <BodyText style={styles.bold}>Types of SMS Messages:</BodyText>
            </BodyText>
            <View style={styles.bulletPoint}>
              <BodyText style={styles.bullet}>•</BodyText>
              <BodyText style={styles.bulletText}>Two-factor authentication verification codes</BodyText>
            </View>
            <View style={styles.bulletPoint}>
              <BodyText style={styles.bullet}>•</BodyText>
              <BodyText style={styles.bulletText}>Account verification and login confirmation codes</BodyText>
            </View>
            <View style={styles.bulletPoint}>
              <BodyText style={styles.bullet}>•</BodyText>
              <BodyText style={styles.bulletText}>Automated security notifications and alerts</BodyText>
            </View>
            <View style={styles.bulletPoint}>
              <BodyText style={styles.bullet}>•</BodyText>
              <BodyText style={styles.bulletText}>Password reset and account recovery codes</BodyText>
            </View>
            <View style={styles.bulletPoint}>
              <BodyText style={styles.bullet}>•</BodyText>
              <BodyText style={styles.bulletText}>Critical account security updates</BodyText>
            </View>

            <BodyText style={[styles.cardText, { marginTop: 16 }]}>
              <BodyText style={styles.bold}>Data Retention:</BodyText>
            </BodyText>
            <View style={styles.bulletPoint}>
              <BodyText style={styles.bullet}>•</BodyText>
              <BodyText style={styles.bulletText}>Consent records are retained for 3 years after account closure</BodyText>
            </View>
            <View style={styles.bulletPoint}>
              <BodyText style={styles.bullet}>•</BodyText>
              <BodyText style={styles.bulletText}>Opt-out requests are processed immediately and records retained permanently</BodyText>
            </View>
            <View style={styles.bulletPoint}>
              <BodyText style={styles.bullet}>•</BodyText>
              <BodyText style={styles.bulletText}>Message logs are retained for 1 year for troubleshooting purposes</BodyText>
            </View>

            <BodyText style={[styles.cardText, { marginTop: 16 }]}>
              <BodyText style={styles.bold}>Compliance:</BodyText> This policy is designed to comply with the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, CTIA Messaging Principles and Best Practices, and state and local telecommunications regulations.
            </BodyText>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <CaptionText style={[styles.footerText, { color: BRAND_COLORS.secondaryText }]}>
              This documentation is maintained for regulatory compliance purposes.
              Last updated: May 27, 2025
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
  title: {
    marginBottom: 12,
  },
  subtitle: {
    lineHeight: 24,
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
  sampleMessage: {
    backgroundColor: `${BRAND_COLORS.primary}10`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sampleText: {
    lineHeight: 22,
  },
}); 