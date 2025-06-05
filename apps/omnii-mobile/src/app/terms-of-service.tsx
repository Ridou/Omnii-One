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
import { ArrowLeft, Mail, FileText, AlertTriangle } from 'lucide-react-native';
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

// Local colors for this component
const WARNING_COLOR = '#FF9500';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const smartBack = useSmartBack({ 
    authAwareFallback: true,
    webBehavior: 'history' // Ensure static-friendly behavior
  });

  const openEmail = () => {
    Linking.openURL('mailto:legal@omnii.live?subject=Terms of Service Inquiry');
  };

  const openSupport = () => {
    Linking.openURL('mailto:support@omnii.live?subject=Support Request');
  };

  return (
    <>
      <AppHead
        title="Terms of Service - OMNII AI Productivity Assistant"
        description="OMNII Terms of Service - The terms and conditions for using our AI productivity assistant."
        keywords="terms of service, user agreement, OMNII, AI assistant, productivity app, legal terms, conditions"
        canonical="https://omnii.live/terms-of-service"
        ogTitle="Terms of Service - OMNII"
        ogDescription="Read the terms and conditions for using OMNII AI productivity assistant."
        ogUrl="https://omnii.live/terms-of-service"
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
          <Heading2 color={BRAND_COLORS.text}>Terms of Service</Heading2>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Title Section */}
          <View style={styles.section}>
            <View style={styles.titleHeader}>
              <FileText size={32} color={BRAND_COLORS.primary} />
              <Heading1 style={styles.title}>OMNII Terms of Service</Heading1>
            </View>
            <BodyText color={BRAND_COLORS.secondaryText} style={styles.subtitle}>
              These terms govern your use of OMNII and outline the rights and responsibilities of both users and our service.
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

          {/* Acceptance of Terms */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>1. Acceptance of Terms</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                By downloading, installing, or using the OMNII mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
              </BodyText>
              <BodyText style={styles.cardText}>
                These Terms constitute a legally binding agreement between you ("User" or "you") and OMNII Technologies ("Company," "we," "our," or "us").
              </BodyText>
            </View>
          </View>

          {/* Description of Service */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>2. Description of Service</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>2.1 OMNII App Features</BodyText>
              </BodyText>
              <BodyText style={styles.cardText}>
                OMNII is an AI-powered productivity assistant that provides:
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>AI Task Suggestions</BodyText>: Intelligent task recommendations based on your productivity patterns
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Approval System</BodyText>: User-controlled approval process for all AI suggestions
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Analytics Dashboard</BodyText>: Productivity insights and performance tracking
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Achievement System</BodyText>: Gamified productivity milestones and progress tracking
                </BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>
                  <BodyText style={styles.bold}>Chat Interface</BodyText>: Natural language interaction with AI assistant
                </BodyText>
              </View>

              <BodyText style={[styles.cardSubtitle, { marginTop: 20 }]}>
                <BodyText style={styles.bold}>2.2 AI Service Limitations</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>AI suggestions are automated recommendations, not guaranteed productivity solutions</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Users maintain full control and decision-making authority over all suggestions</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>AI accuracy may vary based on data quality and usage patterns</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Service functionality requires internet connectivity</BodyText>
              </View>
            </View>
          </View>

          {/* User Accounts */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>3. User Accounts and Registration</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>3.1 Account Creation</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>You must provide accurate information during registration</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>You are responsible for maintaining account security and confidentiality</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>You must be at least 13 years old to use the App</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>One account per user; shared accounts are prohibited</BodyText>
              </View>

              <BodyText style={[styles.cardSubtitle, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>3.2 Account Responsibilities</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>You are responsible for all activity under your account</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Notify us immediately of any unauthorized access</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Use strong passwords and enable available security features</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Keep your contact information current</BodyText>
              </View>
            </View>
          </View>

          {/* Acceptable Use Policy */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>4. Acceptable Use Policy</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>4.1 Permitted Uses</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Use the App for personal productivity improvement</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Share approved content through designated sharing features</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Provide feedback to improve AI recommendations</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Export your own data as permitted by privacy controls</BodyText>
              </View>

              <BodyText style={[styles.cardSubtitle, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>4.2 Prohibited Activities</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Reverse engineer, decompile, or attempt to extract source code</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Use the App for illegal, harmful, or unauthorized purposes</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Attempt to access other users' accounts or data</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Interfere with or disrupt the App's functionality</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Use automated systems to access the App without authorization</BodyText>
              </View>
            </View>
          </View>

          {/* AI Service Terms */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>5. AI Service Terms</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>5.1 AI Functionality</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>AI suggestions are based on machine learning algorithms and historical data</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>AI recommendations are suggestions only, not professional advice</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Users must evaluate and approve all AI-generated suggestions</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>AI accuracy and effectiveness may vary based on individual usage patterns</BodyText>
              </View>

              <BodyText style={[styles.cardSubtitle, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>5.2 AI Limitations and Disclaimers</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>AI suggestions are not substitutes for professional judgment</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>We do not guarantee the accuracy or effectiveness of AI recommendations</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Users are solely responsible for decisions based on AI suggestions</BodyText>
              </View>
            </View>
          </View>

          {/* Intellectual Property */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>6. Intellectual Property Rights</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>6.1 OMNII Intellectual Property</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>The App and all related technology are owned by OMNII Technologies</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>All trademarks, logos, and brand names are our exclusive property</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>AI algorithms, user interface designs, and software code are proprietary</BodyText>
              </View>

              <BodyText style={[styles.cardSubtitle, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>6.2 User Content</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>You retain ownership of content you create using the App</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>You grant us a limited license to process your content for service provision</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>You warrant that your content does not infringe third-party rights</BodyText>
              </View>
            </View>
          </View>

          {/* Disclaimers and Limitations */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>7. Disclaimers and Limitations</Heading3>
            <View style={styles.warningCard}>
              <AlertTriangle size={24} color={WARNING_COLOR} />
              <View style={styles.warningContent}>
                <BodyText style={styles.warningTitle}>
                  <BodyText style={styles.bold}>Important Legal Notice</BodyText>
                </BodyText>
                <BodyText style={styles.warningText}>
                  THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
                </BodyText>
              </View>
            </View>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>7.1 Service Disclaimer</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>We disclaim all warranties, express or implied, including merchantability and fitness for purpose</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>We do not warrant that the App will be error-free or uninterrupted</BodyText>
              </View>

              <BodyText style={[styles.cardSubtitle, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>7.2 Limitation of Liability</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Our liability is limited to the maximum extent permitted by law</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>We are not liable for indirect, incidental, or consequential damages</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Total liability shall not exceed the amount paid by you for the service</BodyText>
              </View>
            </View>
          </View>

          {/* Termination */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>8. Termination</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardSubtitle}>
                <BodyText style={styles.bold}>8.1 Termination by You</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>You may terminate your account at any time through the App settings</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Account termination will result in deletion of your data per our Privacy Policy</BodyText>
              </View>

              <BodyText style={[styles.cardSubtitle, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>8.2 Termination by Us</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>We may terminate accounts for violations of these Terms</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>We may suspend service for maintenance or security reasons</BodyText>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>9. Contact Information</Heading3>
            <View style={styles.card}>
              <BodyText style={styles.cardText}>
                For questions about these Terms or the App, contact us at:
              </BodyText>
              
              <TouchableOpacity style={styles.contactButton} onPress={openSupport}>
                <Mail size={20} color={BRAND_COLORS.primary} />
                <BodyText color={BRAND_COLORS.primary} style={styles.contactText}>
                  support@omnii.live
                </BodyText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactButton} onPress={openEmail}>
                <FileText size={20} color={BRAND_COLORS.primary} />
                <BodyText color={BRAND_COLORS.primary} style={styles.contactText}>
                  legal@omnii.live
                </BodyText>
              </TouchableOpacity>

              <BodyText style={[styles.cardText, { marginTop: 16 }]}>
                <BodyText style={styles.bold}>Response Times:</BodyText>
              </BodyText>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>General Support: Response within 48 hours</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Legal Matters: Response within 72 hours</BodyText>
              </View>
              <View style={styles.bulletPoint}>
                <BodyText style={styles.bullet}>•</BodyText>
                <BodyText style={styles.bulletText}>Security Issues: Response within 24 hours</BodyText>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <CaptionText color={BRAND_COLORS.secondaryText} style={styles.footerText}>
              By using OMNII, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
            </CaptionText>
            <CaptionText color={BRAND_COLORS.secondaryText} style={styles.footerText}>
              For the complete Terms of Service, visit: https://omnii.live/terms
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
  warningCard: {
    backgroundColor: `${WARNING_COLOR}15`,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: `${WARNING_COLOR}40`,
  },
  warningContent: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    marginBottom: 8,
  },
  warningText: {
    color: WARNING_COLOR,
    lineHeight: 20,
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
    marginBottom: 8,
  },
}); 