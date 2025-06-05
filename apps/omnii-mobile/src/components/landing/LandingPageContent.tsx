import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, Animated, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '~/context/AuthContext';
import { SplashLogo } from '~/components/common/OmniiLogo';
import { BRAND_COLORS } from '~/lib/assets';
import { 
  BrandText, 
  DisplayText, 
  BodyText, 
  ButtonText,
  CaptionText
} from '~/components/common/Typography';
import { FeatureShowcase } from './FeatureShowcase';
import { DramaticConclusion } from './DramaticConclusion';
import { useResponsiveDesign } from '~/utils/responsive';
import React, { useEffect, useRef } from 'react';
import { MascotDisplay } from './MascotDisplay';

// Completely standalone web landing page with no problematic components
const StandaloneWebLandingPage: React.FC = () => {
  const router = useRouter();
  const responsive = useResponsiveDesign();

  // Dynamic quote styling based on screen size
  const dynamicQuoteStyle = {
    fontSize: responsive.isMobileXS ? 14 : responsive.isMobile ? 16 : 18,
    lineHeight: responsive.isMobileXS ? 20 : responsive.isMobile ? 24 : 26,
    paddingHorizontal: responsive.isMobileXS ? 4 : responsive.isMobile ? 8 : 12,
  };

  // Dynamic section styling
  const dynamicSectionStyle = {
    paddingHorizontal: responsive.isMobileXS ? 8 : responsive.isMobile ? 12 : 16,
    paddingVertical: responsive.isMobileXS ? 32 : 48,
  };

  return (
    <SafeAreaView style={webStyles.container}>
      <ScrollView 
        style={webStyles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={webStyles.hero}>
          <View style={webStyles.logoContainer}>
            <TouchableOpacity 
              onPress={() => router.push('/(auth)/login')}
              style={webStyles.logoOnly}
            >
              <SplashLogo />
            </TouchableOpacity>
            <Text style={webStyles.brandName}>OMNII</Text>
          </View>
          
          <View style={webStyles.textContainer}>
            <Text style={webStyles.mainTitle}>
              Reclaim your humanity.{'\n'}Let AI handle the rest.
            </Text>
            <Text style={webStyles.subtitle}>
              Transform chaos into clarity, insights into action, potential into progress.
            </Text>
          </View>
          
          <View style={webStyles.ctaContainer}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={webStyles.primaryButton}>
                <Text style={webStyles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>
            </Link>
            <TouchableOpacity style={webStyles.secondaryButton}>
              <Text style={webStyles.secondaryButtonText}>See Demo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Simple Feature Preview - No Complex Components */}
        <View style={webStyles.featuresSection}>
          <Text style={webStyles.featuresTitle}>What makes OMNII different</Text>
          <Text style={webStyles.featuresSubtitle}>
            Not just another productivity app. A true AI partnership.
          </Text>
          
          <View style={webStyles.featureGrid}>
            <View style={webStyles.featureCard}>
              <Text style={webStyles.featureIcon}>🧠</Text>
              <Text style={webStyles.featureCardTitle}>AI Intelligence</Text>
              <Text style={webStyles.featureCardDesc}>
                Smart task suggestions that learn from your work patterns
              </Text>
            </View>
            
            <View style={webStyles.featureCard}>
              <Text style={webStyles.featureIcon}>🌱</Text>
              <Text style={webStyles.featureCardTitle}>Growth Evolution</Text>
              <Text style={webStyles.featureCardDesc}>
                Watch your productivity evolve from seed to tree
              </Text>
            </View>
            
            <View style={webStyles.featureCard}>
              <Text style={webStyles.featureIcon}>💡</Text>
              <Text style={webStyles.featureCardTitle}>Smart Insights</Text>
              <Text style={webStyles.featureCardDesc}>
                Discover patterns and optimize your workflow automatically
              </Text>
            </View>
          </View>
        </View>

        {/* Simple Conclusion Section */}
        <View style={[webStyles.conclusionSection, dynamicSectionStyle]}>
          {/* Add Mascot Display */}
          <View style={webStyles.mascotSection}>
            <MascotDisplay
              stage="tree"
              size="large"
              showLevel
              level={30}
            />
          </View>
          
          <View style={webStyles.quoteContainer}>
            <View style={webStyles.quoteTextContainer}>
              <Text style={[webStyles.conclusionQuote, dynamicQuoteStyle, { 
                fontSize: responsive.isMobileXS ? 24 : responsive.isMobile ? 30 : 36,
                lineHeight: responsive.isMobileXS ? 30 : responsive.isMobile ? 36 : 42,
                fontWeight: '800' 
              }]}>
                Reinvented
              </Text>
              <Text style={[webStyles.conclusionQuote, dynamicQuoteStyle, { 
                fontSize: responsive.isMobileXS ? 24 : responsive.isMobile ? 30 : 36,
                lineHeight: responsive.isMobileXS ? 30 : responsive.isMobile ? 36 : 42,
                fontWeight: '800' 
              }]}>
                Productivity.
              </Text>
            </View>
          </View>
          
          <View style={webStyles.statsContainer}>
            <View style={webStyles.statItem}>
              <Text style={webStyles.statNumber}>500+</Text>
              <Text style={webStyles.statLabel}>Early users</Text>
            </View>
            <View style={webStyles.statItem}>
              <Text style={webStyles.statNumber}>10k+</Text>
              <Text style={webStyles.statLabel}>Tasks optimized</Text>
            </View>
            <View style={webStyles.statItem}>
              <Text style={webStyles.statNumber}>2.5hrs</Text>
              <Text style={webStyles.statLabel}>Daily time saved</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={webStyles.finalCtaButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={webStyles.finalCtaText}>Start Your Evolution →</Text>
          </TouchableOpacity>
        </View>

        {/* Simple Footer */}
        <View style={webStyles.footer}>
          <View style={webStyles.footerContent}>
            <Text style={webStyles.footerTitle}>
              Let AI{'\n'}manage your life{'\n'}so you can start{'\n'}living it.
            </Text>
            <TouchableOpacity 
              style={webStyles.primaryButton}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={webStyles.primaryButtonText}>Get Started →</Text>
            </TouchableOpacity>
            
            <View style={webStyles.footerLinks}>
              <TouchableOpacity 
                style={webStyles.footerLink}
                onPress={() => router.push('/about')}
              >
                <Text style={webStyles.footerLinkText}>About</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={webStyles.footerLink}
                onPress={() => router.push('/privacy-policy')}
              >
                <Text style={webStyles.footerLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={webStyles.footerLink}
                onPress={() => router.push('/terms-of-service')}
              >
                <Text style={webStyles.footerLinkText}>Terms of Service</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={webStyles.footerLink}
                onPress={() => router.push('/sms-consent')}
              >
                <Text style={webStyles.footerLinkText}>SMS Consent</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={webStyles.footerLink}
                onPress={() => router.push('/support')}
              >
                <Text style={webStyles.footerLinkText}>Support</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={webStyles.copyrightText}>
              © 2025 Omnii. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default function LandingPageContent() {
  // Use standalone web version on web platforms to completely avoid CSS conflicts
  if (Platform.OS === 'web') {
    return <StandaloneWebLandingPage />;
  }

  // Full mobile version with all animations and responsive features
  const { user, session, isInitialized } = useAuth();
  const router = useRouter();
  const responsive = useResponsiveDesign();
  
  // Enhanced animations for the logo
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const startBounceAnimation = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -15, // Slightly reduced bounce for better combination with rotation
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Repeat the animation after a delay
        setTimeout(startBounceAnimation, 3000);
      });
    };

    // Logo rotation animation (continuous, like AI insights banner)
    Animated.loop(
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();

    // Logo scale/glow animation (continuous, like AI insights banner)
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScaleAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoScaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Start the bounce animation after a short delay
    setTimeout(startBounceAnimation, 1000);
  }, [bounceAnim, logoRotateAnim, logoScaleAnim]);

  // Handle logo press - navigate to login if not authenticated
  const handleLogoPress = () => {
    if (!user && !session) {
      router.push('/(auth)/login');
    }
  };

  // Check if user is authenticated (using both user and session for reliability)
  const isAuthenticated = !!(user && session);

  // Debug authentication state in development
  useEffect(() => {
    if (__DEV__) {
      console.log('🏠 Landing Page Auth State:', {
        user: user ? `${user.email} (${user.id})` : 'null',
        session: session ? 'exists' : 'null',
        isAuthenticated,
        isInitialized
      });
    }
  }, [user, session, isAuthenticated, isInitialized]);
  
  // Interpolate rotation value
  const logoRotation = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  // Sacred Geometry Constants
  const GOLDEN_RATIO = 1.618;
  const BASE_UNIT = 8; // Base spacing unit
  const SACRED_SPACING = {
    xs: BASE_UNIT, // 8px
    sm: BASE_UNIT * 1.5, // 12px
    md: BASE_UNIT * 2, // 16px
    lg: BASE_UNIT * 3, // 24px
    xl: BASE_UNIT * 4, // 32px
    xxl: BASE_UNIT * 6, // 48px
    golden: BASE_UNIT * GOLDEN_RATIO, // ~13px
    goldenLg: BASE_UNIT * 2 * GOLDEN_RATIO, // ~26px
    goldenXl: BASE_UNIT * 3 * GOLDEN_RATIO, // ~39px
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    scrollView: {
      flex: 1,
    },
    hero: {
      paddingHorizontal: responsive.spacing.horizontal,
      paddingTop: responsive.spacing.vertical,
      paddingBottom: SACRED_SPACING.xxl,
      alignItems: 'center',
      justifyContent: 'flex-start',
      minHeight: responsive.isDesktop ? responsive.windowHeight * 0.8 : 'auto',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: SACRED_SPACING.xs,
    },
    logoOnly: {
      alignItems: 'center',
    },
    brandName: {
      fontSize: 28,
      fontWeight: '700',
      color: BRAND_COLORS.secondary,
      marginTop: 12,
      letterSpacing: 3,
      textAlign: 'center',
    },
    // Web-optimized text containers
    textContainer: {
      width: '100%',
      maxWidth: responsive.isMobileXS ? '100%' : 500,
    },
    mainTitle: {
      fontSize: Math.round(36 * responsive.typography.titleScale),
      fontWeight: '800',
      color: '#000000',
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: Math.round(42 * responsive.typography.lineHeightScale),
      marginTop: 20,
      paddingHorizontal: responsive.spacing.horizontal,
    },
    subtitle: {
      fontSize: Math.round(18 * responsive.typography.bodyScale),
      color: '#666666',
      textAlign: 'center',
      maxWidth: responsive.isMobileXS ? '100%' : 500,
      lineHeight: Math.round(26 * responsive.typography.lineHeightScale),
      marginBottom: 32,
      paddingHorizontal: responsive.spacing.horizontal,
    },
    ctaContainer: {
      flexDirection: responsive.isMobileXS ? 'column' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: responsive.isMobileXS ? 12 : SACRED_SPACING.md,
      marginTop: SACRED_SPACING.xs,
      width: '100%',
      maxWidth: responsive.isMobile ? '100%' : 600,
      paddingHorizontal: responsive.spacing.horizontal,
    },
    primaryButton: {
      backgroundColor: '#007AFF',
      paddingVertical: responsive.isMobileXS ? 14 : 16,
      paddingHorizontal: responsive.isMobileXS ? 20 : 32,
      borderRadius: 12,
      minWidth: responsive.isMobileXS ? '100%' : 160,
      maxWidth: responsive.isMobile ? '100%' : 280,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: responsive.isMobileXS ? 
        Math.round(16 * responsive.typography.bodyScale) : 
        Math.round(18 * responsive.typography.bodyScale),
      fontWeight: '600',
      textAlign: 'center',
    },
    secondaryButton: {
      backgroundColor: '#F5F5F7',
      paddingVertical: responsive.isMobileXS ? 14 : 16,
      paddingHorizontal: responsive.isMobileXS ? 20 : 32,
      borderRadius: 12,
      minWidth: responsive.isMobileXS ? '100%' : 160,
      maxWidth: responsive.isMobile ? '100%' : 280,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: '#000000',
      fontSize: responsive.isMobileXS ? 
        Math.round(16 * responsive.typography.bodyScale) : 
        Math.round(18 * responsive.typography.bodyScale),
      fontWeight: '600',
      textAlign: 'center',
    },
    // Simplified footer styles - no authentication logic
    footer: {
      backgroundColor: '#F5F5F7',
      padding: responsive.spacing.horizontal,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: responsive.windowHeight * 0.6,
    },
    footerContent: {
      alignItems: 'center',
      maxWidth: 600,
      width: '100%',
    },
    footerTitle: {
      fontSize: 36,
      fontWeight: '800',
      color: '#000000',
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 42,
    },
    footerLinks: {
      flexDirection: responsive.isMobile ? 'column' : 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: responsive.isMobile ? SACRED_SPACING.sm : SACRED_SPACING.lg,
      marginTop: SACRED_SPACING.lg,
      marginBottom: SACRED_SPACING.md,
    },
    footerLink: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    footerLinkText: {
      fontSize: 14,
      color: '#666666',
      textDecorationLine: 'underline',
      textAlign: 'center',
    },
    copyrightText: {
      fontSize: 12,
      color: '#999999',
      textAlign: 'center',
      marginTop: SACRED_SPACING.md,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <TouchableOpacity 
              onPress={handleLogoPress}
              disabled={isAuthenticated}
              style={styles.logoOnly}
            >
              <Animated.View 
                style={[
                  styles.logoOnly,
                  {
                    transform: [
                      { translateY: bounceAnim },
                      { rotate: logoRotation },
                      { scale: logoScaleAnim }
                    ],
                  }
                ]}
              >
                <SplashLogo />
              </Animated.View>
            </TouchableOpacity>
            <BrandText size="medium" color={BRAND_COLORS.secondary} style={{ 
              marginTop: SACRED_SPACING.xs,
              textAlign: 'center' 
            }}>
              OMNII
            </BrandText>
          </View>
          
          <View style={styles.textContainer}>
            <DisplayText size="medium" color="#000000" style={styles.mainTitle}>
              Reclaim your humanity.{'\n'}Let AI handle the rest.
            </DisplayText>
            
            <BodyText size={1} color="#666666" style={styles.subtitle}>
              Transform chaos into clarity, insights into action, potential into progress.
            </BodyText>
          </View>
          
          <View style={styles.ctaContainer}>
            {!isAuthenticated ? (
              <>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Get Started</Text>
                  </TouchableOpacity>
                </Link>
                <TouchableOpacity style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>See Demo</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Link href="/(tabs)/approvals" asChild>
                <TouchableOpacity style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>View Dashboard</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        </View>

        {/* Enhanced Interactive Feature Showcase */}
        <FeatureShowcase />

        {/* Dramatic Conclusion with Evolution */}
        <DramaticConclusion />

        {/* Simplified Footer - Always visible, no authentication logic */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <DisplayText size="large" color="#000000" style={styles.footerTitle}>
              Let AI{'\n'}manage your life{'\n'}so you can start{'\n'}living it.
            </DisplayText>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.primaryButtonText}>Get Started →</Text>
            </TouchableOpacity>
            
            {/* Footer Links - Always visible */}
            <View style={styles.footerLinks}>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/about')}
              >
                <Text style={styles.footerLinkText}>About</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/privacy-policy')}
              >
                <Text style={styles.footerLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/terms-of-service')}
              >
                <Text style={styles.footerLinkText}>Terms of Service</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/sms-consent')}
              >
                <Text style={styles.footerLinkText}>SMS Consent</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/support')}
              >
                <Text style={styles.footerLinkText}>Support</Text>
              </TouchableOpacity>
            </View>
            
            {/* Copyright - Always visible */}
            <CaptionText color="#999999" style={styles.copyrightText}>
              © 2025 Omnii. All rights reserved.
            </CaptionText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Clean web styles without ANY problematic CSS properties
const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoOnly: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: BRAND_COLORS.secondary,
    marginTop: 12,
    letterSpacing: 3,
    textAlign: 'center',
  },
  textContainer: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 42,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  ctaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    width: '100%',
    maxWidth: 600,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F5F5F7',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Features Section
  featuresSection: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 64,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  featuresSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 48,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
    maxWidth: 900,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: 280,
    minHeight: 200,
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  featureCardDesc: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Conclusion Section
  conclusionSection: {
    backgroundColor: '#F0F2F5',
    paddingVertical: 64,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  mascotSection: {
    marginBottom: 48,
  },
  quoteContainer: {
    marginBottom: 48,
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    alignSelf: 'center',
    minHeight: 120,
  },
  quoteTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  conclusionQuote: {
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    fontStyle: 'italic',
    width: '100%',
    textAlignVertical: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 48,
    marginBottom: 48,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  finalCtaButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  finalCtaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Footer
  footer: {
    backgroundColor: '#F5F5F7',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  footerContent: {
    alignItems: 'center',
    maxWidth: 600,
    width: '100%',
  },
  footerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 42,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 24,
    marginBottom: 16,
  },
  footerLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#666666',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: 16,
  },
}); 