import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, MessageCircle, Clock, Users, HelpCircle, Send, ExternalLink, Book, Bug, Smartphone } from 'lucide-react-native';
import { SplashLogo } from '~/components/common/OmniiLogo';
import { BRAND_COLORS } from '~/lib/assets';
import { 
  BrandText, 
  DisplayText, 
  Heading2, 
  Heading3,
  Heading4,
  BodyText, 
  ButtonText,
  CaptionText
} from '~/components/common/Typography';
import { useSmartBack } from '~/utils/navigation';
import { AppHead } from '~/components/common/Head';

export default function SupportPage() {
  const router = useRouter();
  const smartBack = useSmartBack({ 
    authAwareFallback: true,
    webBehavior: 'history' // Ensure static-friendly behavior
  });
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  // Sacred Geometry Constants (matching other pages)
  const GOLDEN_RATIO = 1.618;
  const BASE_UNIT = 8;
  const SACRED_SPACING = {
    xs: BASE_UNIT,
    sm: BASE_UNIT * 1.5,
    md: BASE_UNIT * 2,
    lg: BASE_UNIT * 3,
    xl: BASE_UNIT * 4,
    xxl: BASE_UNIT * 6,
    golden: BASE_UNIT * GOLDEN_RATIO,
    goldenLg: BASE_UNIT * 2 * GOLDEN_RATIO,
    goldenXl: BASE_UNIT * 3 * GOLDEN_RATIO,
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    scrollView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SACRED_SPACING.lg,
      paddingTop: SACRED_SPACING.md,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
    },
    backButton: {
      padding: SACRED_SPACING.sm,
      marginRight: SACRED_SPACING.md,
    },
    headerTitle: {
      flex: 1,
    },
    hero: {
      padding: SACRED_SPACING.xl,
      paddingTop: SACRED_SPACING.xxl,
      paddingBottom: SACRED_SPACING.xxl,
      alignItems: 'center',
      backgroundColor: '#F8F9FA',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: SACRED_SPACING.lg,
    },
    section: {
      padding: SACRED_SPACING.xl,
      paddingVertical: SACRED_SPACING.xxl,
    },
    sectionWhite: {
      backgroundColor: '#FFFFFF',
    },
    sectionGray: {
      backgroundColor: '#F8F9FA',
    },
    supportCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: SACRED_SPACING.xl,
      marginVertical: SACRED_SPACING.lg,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    contactContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SACRED_SPACING.lg,
      justifyContent: 'center',
      marginTop: SACRED_SPACING.lg,
    },
    contactCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: SACRED_SPACING.lg,
      width: Math.min(windowWidth - 80, 320),
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: '#F0F0F0',
    },
    contactIcon: {
      backgroundColor: '#F0F4FF',
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SACRED_SPACING.md,
    },
    emailButton: {
      backgroundColor: BRAND_COLORS.primary,
      borderRadius: 12,
      padding: SACRED_SPACING.md,
      alignItems: 'center',
      marginTop: SACRED_SPACING.lg,
      minWidth: 200,
    },
    secondaryEmailButton: {
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      padding: SACRED_SPACING.md,
      alignItems: 'center',
      marginTop: SACRED_SPACING.lg,
      minWidth: 200,
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
    faqContainer: {
      marginTop: SACRED_SPACING.lg,
    },
    faqItem: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: SACRED_SPACING.lg,
      marginBottom: SACRED_SPACING.md,
      borderWidth: 1,
      borderColor: '#F0F0F0',
    },
    responseTime: {
      backgroundColor: '#E8F5E8',
      borderRadius: 8,
      padding: SACRED_SPACING.md,
      marginTop: SACRED_SPACING.lg,
      alignItems: 'center',
    },
  });

  const contactOptions = [
    {
      icon: <HelpCircle size={28} color={BRAND_COLORS.primary} />,
      title: "Need Help?",
      description: "Get technical support, troubleshoot issues, or ask questions about using OMNII.",
      email: "support@omnii.live",
      subject: "Support Request",
      isPrimary: true
    },
    {
      icon: <MessageCircle size={28} color={BRAND_COLORS.primary} />,
      title: "General Contact",
      description: "Business inquiries, partnerships, feedback, or anything else you'd like to discuss.",
      email: "contact@omnii.live",
      subject: "General Inquiry",
      isPrimary: false
    }
  ];

  const faqs = [
    {
      question: "How quickly will I get a response?",
      answer: "We typically respond to support requests within 24 hours during business days. For urgent issues, please mention 'URGENT' in your subject line."
    },
    {
      question: "What information should I include in my support request?",
      answer: "Please include your account email, a detailed description of the issue, any error messages you're seeing, and steps you've already tried."
    },
    {
      question: "Do you offer phone support?",
      answer: "Currently, we provide support primarily through email to ensure we can give you detailed, thoughtful responses and maintain a record of our conversation."
    }
  ];

  const handleEmailPress = (email: string, subject: string) => {
    const emailUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(emailUrl);
  };

  return (
    <>
      <AppHead
        title="Support - OMNII AI Productivity Assistant"
        description="Get help with OMNII. Contact our support team for technical assistance, questions, and feedback."
        keywords="OMNII support, customer service, help, contact, technical support, AI assistant help"
        canonical="https://omnii.live/support"
        ogTitle="Support - OMNII"
        ogDescription="We're here to help you get the most out of OMNII. Contact our support team for assistance."
        ogUrl="https://omnii.live/support"
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={smartBack}
          >
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Heading3 color="#000000">Support</Heading3>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={styles.logoContainer}>
              <SplashLogo />
              <BrandText size="large" color={BRAND_COLORS.secondary} style={{ 
                marginTop: SACRED_SPACING.md,
                textAlign: 'center' 
              }}>
                OMNII
              </BrandText>
            </View>
            <DisplayText size="medium" color="#000000" style={{ 
              textAlign: 'center', 
              marginBottom: SACRED_SPACING.md,
              paddingHorizontal: SACRED_SPACING.lg 
            }}>
              We're here to help
            </DisplayText>
            <BodyText size={1} color="#666666" style={{ 
              textAlign: 'center', 
              maxWidth: 500,
              lineHeight: 28
            }}>
              Whether you need technical support or have questions about OMNII, our team is ready to assist you.
            </BodyText>
          </View>

          {/* Contact Options */}
          <View style={[styles.section, styles.sectionWhite]}>
            <Heading2 color="#000000" style={{ textAlign: 'center', marginBottom: SACRED_SPACING.lg }}>
              Get in Touch
            </Heading2>
            
            <View style={styles.contactContainer}>
              {contactOptions.map((option, index) => (
                <View key={index} style={styles.contactCard}>
                  <View style={styles.contactIcon}>
                    {option.icon}
                  </View>
                  <Heading4 style={{ marginBottom: SACRED_SPACING.sm, textAlign: 'center' }}>
                    {option.title}
                  </Heading4>
                  <BodyText size={2} color="#666666" style={{ 
                    lineHeight: 22, 
                    textAlign: 'center',
                    marginBottom: SACRED_SPACING.md
                  }}>
                    {option.description}
                  </BodyText>
                  <TouchableOpacity 
                    style={option.isPrimary ? styles.emailButton : styles.secondaryEmailButton}
                    onPress={() => handleEmailPress(option.email, option.subject)}
                  >
                    <ButtonText 
                      size="medium" 
                      color={option.isPrimary ? "#FFFFFF" : "#000000"}
                    >
                      Email {option.email}
                    </ButtonText>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Response Time */}
          <View style={[styles.section, styles.sectionGray]}>
            <Heading2 color="#000000" style={{ textAlign: 'center', marginBottom: SACRED_SPACING.lg }}>
              What to Expect
            </Heading2>
            
            <View style={styles.supportCard}>
              <View style={styles.responseTime}>
                <Clock size={24} color="#28A745" style={{ marginBottom: SACRED_SPACING.sm }} />
                <Heading4 style={{ marginBottom: SACRED_SPACING.sm, textAlign: 'center', color: '#28A745' }}>
                  24 Hour Response Time
                </Heading4>
                <BodyText size={2} color="#555555" style={{ 
                  lineHeight: 22, 
                  textAlign: 'center'
                }}>
                  We aim to respond to all inquiries within 24 hours during business days (Monday-Friday, 9 AM - 6 PM PST).
                </BodyText>
              </View>

              <Heading4 style={{ marginBottom: SACRED_SPACING.md, marginTop: SACRED_SPACING.lg }}>
                Our Commitment
              </Heading4>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26, marginBottom: SACRED_SPACING.md }}>
                Every message you send is read by a real human who cares about your experience with OMNII. 
                We're not just here to fix problems, we're here to help you succeed.
              </BodyText>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26 }}>
                Your feedback shapes the future of OMNII. Whether it's a bug report, feature request, 
                or just thoughts on how we can improve, we want to hear from you.
              </BodyText>
            </View>
          </View>

          {/* FAQ Section */}
          <View style={[styles.section, styles.sectionWhite]}>
            <Heading2 color="#000000" style={{ textAlign: 'center', marginBottom: SACRED_SPACING.lg }}>
              Frequently Asked Questions
            </Heading2>
            
            <View style={styles.faqContainer}>
              {faqs.map((faq, index) => (
                <View key={index} style={styles.faqItem}>
                  <Heading4 style={{ marginBottom: SACRED_SPACING.sm }}>
                    {faq.question}
                  </Heading4>
                  <BodyText size={2} color="#666666" style={{ lineHeight: 24 }}>
                    {faq.answer}
                  </BodyText>
                </View>
              ))}
            </View>
          </View>

          {/* Call to Action */}
          <View style={[styles.section, styles.sectionGray]}>
            <Heading2 color="#000000" style={{ textAlign: 'center', marginBottom: SACRED_SPACING.lg }}>
              Still Have Questions?
            </Heading2>
            <BodyText size={1} color="#666666" style={{ 
              textAlign: 'center', 
              maxWidth: 500, 
              alignSelf: 'center',
              lineHeight: 28,
              marginBottom: SACRED_SPACING.lg 
            }}>
              Don't hesitate to reach out. We're here to help you get the most out of OMNII.
            </BodyText>
            
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity 
                style={styles.emailButton}
                onPress={() => handleEmailPress('support@omnii.live', 'Support Request')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Send size={20} color="#FFFFFF" style={{ marginRight: SACRED_SPACING.sm }} />
                  <ButtonText size="large" color="#FFFFFF">Contact Support</ButtonText>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={[styles.section, styles.sectionWhite, { paddingVertical: SACRED_SPACING.xl }]}>
            <BodyText size={2} color="#999999" style={{ textAlign: 'center', lineHeight: 24 }}>
              Built with ❤️ by Omnii Net LLC{'\n'}
              Your success is our mission
            </BodyText>
            <CaptionText color="#999999" style={{ textAlign: 'center', marginTop: SACRED_SPACING.md }}>
              © 2025 Omnii Net LLC. All rights reserved.
            </CaptionText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
} 