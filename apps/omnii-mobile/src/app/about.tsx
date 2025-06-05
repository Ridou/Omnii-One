import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Dimensions, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, Users, Zap, Globe, ChevronRight } from 'lucide-react-native';
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


export default function AboutPage() {
  const router = useRouter();
  const smartBack = useSmartBack({ 
    authAwareFallback: true,
    webBehavior: 'history' // Ensure static-friendly behavior
  });
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  // Sacred Geometry Constants (matching landing page)
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
    storyCard: {
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
    imageContainer: {
      borderRadius: 16,
      overflow: 'hidden',
      marginVertical: SACRED_SPACING.lg,
    },
    storyImage: {
      width: '100%',
      height: 200,
    },
    valuesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SACRED_SPACING.lg,
      justifyContent: 'center',
      marginTop: SACRED_SPACING.lg,
    },
    valueCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: SACRED_SPACING.lg,
      width: Math.min(windowWidth - 80, 280),
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    valueIcon: {
      backgroundColor: '#F0F4FF',
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SACRED_SPACING.md,
    },
    quote: {
      borderLeftWidth: 4,
      borderLeftColor: BRAND_COLORS.primary,
      paddingLeft: SACRED_SPACING.lg,
      marginVertical: SACRED_SPACING.lg,
    },
    cta: {
      backgroundColor: BRAND_COLORS.primary,
      borderRadius: 12,
      padding: SACRED_SPACING.lg,
      alignItems: 'center',
      marginTop: SACRED_SPACING.xl,
    },
  });

  const values = [
    {
      icon: <Heart size={28} color={BRAND_COLORS.primary} />,
      title: "Human-Centered",
      description: "Technology should amplify human potential, not replace it. We build AI that works with you, not for you."
    },
    {
      icon: <Users size={28} color={BRAND_COLORS.primary} />,
      title: "Accessible",
      description: "Powerful productivity tools shouldn't be limited to enterprises. We're democratizing AI for everyone."
    },
    {
      icon: <Zap size={28} color={BRAND_COLORS.primary} />,
      title: "Transparent",
      description: "Every AI decision is explainable. You always know why OMNII suggests what it suggests."
    },
    {
      icon: <Globe size={28} color={BRAND_COLORS.primary} />,
      title: "Global Impact",
      description: "When people are more productive and fulfilled, the whole world benefits. Starting with one person at a time."
    }
  ];

  const openWebsite = () => {
    Linking.openURL('https://omnii.live');
  };

  return (
    <>
      <AppHead
        title="About OMNII - AI Productivity Assistant"
        description="Learn about OMNII's mission to reclaim humanity through AI-powered productivity assistance. Born in Kyoto, built for the world."
        keywords="about OMNII, AI productivity, company mission, productivity assistant, Kyoto, reclaim humanity"
        canonical="https://omnii.live/about"
        ogTitle="About OMNII - Reclaim Your Humanity"
        ogDescription="Born in the ancient temples of Kyoto, shaped by a vision of technology that serves humanity's highest potential."
        ogUrl="https://omnii.live/about"
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
            <Heading3 color="#000000">About OMNII</Heading3>
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
              Reclaiming humanity,{'\n'}one workflow at a time
            </DisplayText>
            <BodyText size={1} color="#666666" style={{ 
              textAlign: 'center', 
              maxWidth: 500,
              lineHeight: 28
            }}>
              Born in the ancient temples of Kyoto, shaped by a vision of technology that serves humanity's highest potential.
            </BodyText>
          </View>

          {/* Origin Story */}
          <View style={[styles.section, styles.sectionWhite]}>
            <Heading2 color="#000000" style={{ textAlign: 'center', marginBottom: SACRED_SPACING.lg }}>
              Our Story
            </Heading2>
            
            <View style={styles.storyCard}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: 'https://images.pexels.com/photos/161251/fushimi-inari-taisha-shrine-kyoto-japan-temple-161251.jpeg' }}
                  style={styles.storyImage}
                  resizeMode="cover"
                />
              </View>
              <Heading4 style={{ marginBottom: SACRED_SPACING.md }}>Born in Kyoto</Heading4>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26, marginBottom: SACRED_SPACING.md }}>
                In the quiet gardens of Kyoto, surrounded by centuries of wisdom and innovation, OMNII was conceived. 
                Walking the paths between ancient temples and cutting-edge research labs, we witnessed the perfect harmony 
                between tradition and progress.
              </BodyText>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26 }}>
                We realized that the future of AI shouldn't be about replacing human creativity and decision-making, 
                but about creating a symbiotic relationship where technology amplifies our uniquely human qualities: 
                intuition, creativity, empathy, and wisdom.
              </BodyText>
            </View>

            <View style={styles.quote}>
              <BodyText size={1} color="#333333" style={{ 
                fontStyle: 'italic', 
                lineHeight: 28,
                marginBottom: SACRED_SPACING.sm 
              }}>
                "What if AI could help us become more human, not less? What if technology could give us back our time 
                to think, create, and connect?"
              </BodyText>
              <CaptionText color="#999999">— The question that started it all</CaptionText>
            </View>
          </View>

          {/* Mission Section */}
          <View style={[styles.section, styles.sectionGray]}>
            <Heading2 color="#000000" style={{ textAlign: 'center', marginBottom: SACRED_SPACING.lg }}>
              Our Mission
            </Heading2>
            
            <View style={styles.storyCard}>
              <Heading4 style={{ marginBottom: SACRED_SPACING.md }}>Democratizing Productivity</Heading4>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26, marginBottom: SACRED_SPACING.lg }}>
                We believe powerful productivity tools shouldn't be locked behind enterprise paywalls or require 
                technical expertise to use. OMNII brings enterprise-level AI assistance to individuals, small teams, 
                and growing companies.
              </BodyText>
              
              <Heading4 style={{ marginBottom: SACRED_SPACING.md }}>Transparent AI Partnership</Heading4>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26, marginBottom: SACRED_SPACING.lg }}>
                Every suggestion OMNII makes comes with clear reasoning. You'll never wonder "why did it suggest this?" 
                because transparency builds trust, and trust enables true collaboration between humans and AI.
              </BodyText>
              
              <Heading4 style={{ marginBottom: SACRED_SPACING.md }}>Growing Together</Heading4>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26 }}>
                Like our mascot that evolves from seed to flower to tree, OMNII grows with you. The more you use it, 
                the better it understands your work style, priorities, and goals. But you're always in control of 
                your own growth journey.
              </BodyText>
            </View>
          </View>

          {/* Values Section */}
          <View style={[styles.section, styles.sectionWhite]}>
            <Heading2 color="#000000" style={{ textAlign: 'center', marginBottom: SACRED_SPACING.lg }}>
              Our Values
            </Heading2>
            <BodyText size={1} color="#666666" style={{ 
              textAlign: 'center', 
              maxWidth: 600, 
              alignSelf: 'center',
              lineHeight: 28,
              marginBottom: SACRED_SPACING.lg 
            }}>
              These principles guide every decision we make, from feature design to business strategy.
            </BodyText>
            
            <View style={styles.valuesContainer}>
              {values.map((value, index) => (
                <View key={index} style={styles.valueCard}>
                  <View style={styles.valueIcon}>
                    {value.icon}
                  </View>
                  <Heading4 style={{ marginBottom: SACRED_SPACING.sm, textAlign: 'center' }}>
                    {value.title}
                  </Heading4>
                  <BodyText size={2} color="#666666" style={{ 
                    lineHeight: 22, 
                    textAlign: 'center' 
                  }}>
                    {value.description}
                  </BodyText>
                </View>
              ))}
            </View>
          </View>

          {/* Impact Section */}
          <View style={[styles.section, styles.sectionGray]}>
            <Heading2 color="#000000" style={{ textAlign: 'center', marginBottom: SACRED_SPACING.lg }}>
              Impact & Vision
            </Heading2>
            
            <View style={styles.storyCard}>
              <Heading4 style={{ marginBottom: SACRED_SPACING.md }}>Time is Humanity's Most Precious Resource</Heading4>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26, marginBottom: SACRED_SPACING.lg }}>
                Every minute OMNII saves you from busywork is a minute you can spend on what matters: deep thinking, 
                creative problem-solving, meaningful relationships, or simply being present with the people you love.
              </BodyText>
              
              <Heading4 style={{ marginBottom: SACRED_SPACING.md }}>Ripple Effects</Heading4>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26, marginBottom: SACRED_SPACING.lg }}>
                When you're more organized and less stressed, you show up better for your family, your team, and your community. 
                When small businesses can access AI tools that were once reserved for Fortune 500 companies, innovation spreads 
                to every corner of the economy.
              </BodyText>
              
              <Heading4 style={{ marginBottom: SACRED_SPACING.md }}>The Future We're Building</Heading4>
              <BodyText size={2} color="#666666" style={{ lineHeight: 26 }}>
                A world where AI amplifies human creativity instead of replacing it. Where small teams can move as fast as 
                large corporations. Where technology fades into the background, leaving humans free to focus on what they 
                do best: imagine, empathize, and create.
              </BodyText>
            </View>
          </View>

          {/* Call to Action */}
          <View style={[styles.section, styles.sectionWhite]}>
            <Heading2 color="#000000" style={{ textAlign: 'center', marginBottom: SACRED_SPACING.lg }}>
              Join the Movement
            </Heading2>
            <BodyText size={1} color="#666666" style={{ 
              textAlign: 'center', 
              maxWidth: 500, 
              alignSelf: 'center',
              lineHeight: 28,
              marginBottom: SACRED_SPACING.lg 
            }}>
              OMNII isn't just a productivity app—it's a glimpse into a future where humans and AI collaborate 
              as true partners. Ready to reclaim your humanity?
            </BodyText>
            
            <TouchableOpacity 
              style={styles.cta}
              onPress={() => router.push('/(auth)/login')}
            >
              <ButtonText size="large" color="#FFFFFF">Start Your Journey</ButtonText>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={[styles.section, styles.sectionGray, { paddingVertical: SACRED_SPACING.xl }]}>
            <BodyText size={2} color="#999999" style={{ textAlign: 'center', lineHeight: 24 }}>
              Built with ❤️ by Omnii Net LLC{'\n'}
              From Kyoto to the world
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