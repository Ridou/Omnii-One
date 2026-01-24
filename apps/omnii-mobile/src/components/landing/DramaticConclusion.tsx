import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform, Text } from 'react-native';
import { Link } from 'expo-router';
import { DisplayText, H4, BodyText, ButtonText } from '~/components/common/Typography';
import { AppColors } from '~/constants/Colors';
import { BRAND_COLORS } from '~/lib/assets';
import { useResponsiveDesign } from '~/utils/responsive';
import { MascotDisplay } from './MascotDisplay';

// Simple web version to avoid CSS conflicts
const SimpleWebVersion: React.FC = () => {
  const responsive = useResponsiveDesign();
  
  return (
    <View style={webStyles.container}>
      {/* Static mascot display */}
      <View style={webStyles.evolutionContainer}>
        <MascotDisplay
          stage="tree"
          size={responsive.isMobileXS ? 'medium' : responsive.isMobile ? 'large' : 'xlarge'}
          showLevel
          level={30}
        />
        <BodyText size={1} className="text-omnii-text-secondary" style={webStyles.evolutionHint}>
          Watch your productivity evolve
        </BodyText>
      </View>
      
      {/* Philosophy Quote */}
      <View style={webStyles.quoteContainer}>
        <View style={webStyles.quoteTextContainer}>
          <DisplayText 
            size={responsive.isMobile ? 'small' : 'medium'}
            className="text-omnii-text-primary font-extrabold"
            style={[webStyles.quote, { 
              fontSize: 36,
              lineHeight: 42,
              fontWeight: '800' 
            }]}
          >
            Reinvented
          </DisplayText>
          <DisplayText 
            size={responsive.isMobile ? 'small' : 'medium'}
            className="text-omnii-text-primary font-extrabold"
            style={[webStyles.quote, { 
              fontSize: 36,
              lineHeight: 42,
              fontWeight: '800' 
            }]}
          >
            Productivity.
          </DisplayText>
        </View>
      </View>
      
      {/* Trust Indicators */}
      <View style={[
        webStyles.trustContainer,
        responsive.isMobile && { flexDirection: 'column', gap: 24 }
      ]}>
        <View style={webStyles.trustItem}>
          <H4 className="text-omnii-primary" style={webStyles.trustNumber}>500+</H4>
          <BodyText size={2} className="text-omnii-text-secondary" style={webStyles.trustLabel}>Early users</BodyText>
        </View>
        <View style={webStyles.trustItem}>
          <H4 className="text-omnii-primary" style={webStyles.trustNumber}>10k+</H4>
          <BodyText size={2} className="text-omnii-text-secondary" style={webStyles.trustLabel}>Tasks optimized</BodyText>
        </View>
        <View style={webStyles.trustItem}>
          <H4 className="text-omnii-primary" style={webStyles.trustNumber}>2.5hrs</H4>
          <BodyText size={2} className="text-omnii-text-secondary" style={webStyles.trustLabel}>Daily time saved</BodyText>
        </View>
      </View>
      
      {/* Final CTA */}
      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={[webStyles.ctaButton, {
          paddingVertical: responsive.isMobileXS ? 14 : 16,
          paddingHorizontal: responsive.isMobileXS ? 24 : 32,
          minWidth: responsive.isMobileXS ? '90%' : 200,
          maxWidth: responsive.isMobile ? '90%' : 320,
        }]}>
          <ButtonText size="large" className="text-white" style={[webStyles.ctaText, {
            fontSize: responsive.isMobileXS ? 16 : 18,
          }]}>
            Start Your Evolution →
          </ButtonText>
        </TouchableOpacity>
      </Link>
    </View>
  );
};

export const DramaticConclusion: React.FC = () => {
  // Always call hooks at the top level
  const [currentStage, setCurrentStage] = useState<'seed' | 'flower' | 'tree'>('seed');
  const [isMounted, setIsMounted] = useState(false);
  const responsive = useResponsiveDesign();
  
  // Animations
  const quoteOpacity = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;
  const stageTransition = useRef(new Animated.Value(1)).current;

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // Evolution sequence - only start after mounting
  useEffect(() => {
    if (!isMounted) return;

    const evolutionSequence = () => {
      const stages: ('seed' | 'flower' | 'tree')[] = ['seed', 'flower', 'tree'];
      let currentIndex = 0;
      
      const evolve = () => {
        if (!isMounted) return;
        
        // Scale down
        Animated.timing(stageTransition, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (!isMounted) return;
          
          // Change stage
          const nextStage = stages[currentIndex] || 'seed';
          setCurrentStage(nextStage);
          
          // Scale back up
          Animated.timing(stageTransition, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
          
          currentIndex = (currentIndex + 1) % stages.length;
        });
      };
      
      // Start after a short delay to ensure component is fully mounted
      const initialTimer = setTimeout(() => {
        if (!isMounted) return;
        evolve(); // Initial evolution
        const interval = setInterval(() => {
          if (!isMounted) return;
          evolve();
        }, 4000);
        
        return () => clearInterval(interval);
      }, 500);
      
      return () => clearTimeout(initialTimer);
    };
    
    const cleanupEvolution = evolutionSequence();
    
    // Quote fade in after short delay
    const quoteTimer = setTimeout(() => {
      if (!isMounted) return;
      Animated.timing(quoteOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 1500);
    
    // CTA pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    
    return () => {
      if (cleanupEvolution) cleanupEvolution();
      clearTimeout(quoteTimer);
      pulseLoop.stop();
    };
  }, [isMounted]);

  // Use simple web version on web platforms
  if (Platform.OS === 'web') {
    return <SimpleWebVersion />;
  }
  
  return (
    <View style={[styles.container, { paddingHorizontal: responsive.spacing.horizontal }]}>
      {/* Evolution Display */}
      <View style={styles.evolutionContainer}>
        <Animated.View style={{ transform: [{ scale: stageTransition }] }}>
          <MascotDisplay
            stage={currentStage}
            size={responsive.isMobileXS ? 'medium' : responsive.isMobile ? 'large' : 'xlarge'}
            showLevel
            level={currentStage === 'seed' ? 5 : currentStage === 'flower' ? 18 : 30}
          />
        </Animated.View>
        
        <BodyText size={1} className="text-omnii-text-secondary" style={styles.evolutionHint}>
          Watch your productivity evolve
        </BodyText>
      </View>
      
      {/* Philosophy Quote */}
      <Animated.View style={[styles.quoteContainer, { opacity: quoteOpacity }]}>
        <View style={styles.quoteTextContainer}>
          <DisplayText 
            size={responsive.isMobile ? 'small' : 'medium'} 
            className="text-omnii-text-primary font-extrabold"
            style={[styles.quote, {
              fontSize: Math.round(36 * responsive.typography.titleScale),
              lineHeight: Math.round(42 * responsive.typography.lineHeightScale),
              fontWeight: '800',
            }]}
          >
            Reinvented
          </DisplayText>
          <DisplayText 
            size={responsive.isMobile ? 'small' : 'medium'} 
            className="text-omnii-text-primary font-extrabold"
            style={[styles.quote, {
              fontSize: Math.round(36 * responsive.typography.titleScale),
              lineHeight: Math.round(42 * responsive.typography.lineHeightScale),
              fontWeight: '800',
            }]}
          >
            Productivity.
          </DisplayText>
        </View>
      </Animated.View>
      
      {/* Trust Indicators */}
      <View style={[
        styles.trustContainer,
        responsive.isMobile ? styles.trustMobile : styles.trustDesktop
      ]}>
        <View style={styles.trustItem}>
          <H4 className="text-omnii-primary" style={styles.trustNumber}>500+</H4>
          <BodyText size={2} className="text-omnii-text-secondary" style={styles.trustLabel}>Early users</BodyText>
        </View>
        <View style={styles.trustItem}>
          <H4 className="text-omnii-primary" style={styles.trustNumber}>10k+</H4>
          <BodyText size={2} className="text-omnii-text-secondary" style={styles.trustLabel}>Tasks optimized</BodyText>
        </View>
        <View style={styles.trustItem}>
          <H4 className="text-omnii-primary" style={styles.trustNumber}>2.5hrs</H4>
          <BodyText size={2} className="text-omnii-text-secondary" style={styles.trustLabel}>Daily time saved</BodyText>
        </View>
      </View>
      
      {/* Final CTA */}
      <Animated.View style={{ transform: [{ scale: ctaPulse }] }}>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={[styles.ctaButton, { 
            backgroundColor: BRAND_COLORS.primary,
            paddingVertical: responsive.isMobileXS ? 14 : 16,
            paddingHorizontal: responsive.isMobileXS ? 24 : 32,
            minWidth: responsive.isMobileXS ? '90%' : 200,
            maxWidth: responsive.isMobile ? '90%' : 320,
          }]}>
            <ButtonText size="large" className="text-white" style={[styles.ctaText, {
              fontSize: responsive.isMobileXS ? 16 : 18,
            }]}>
              Start Your Evolution →
            </ButtonText>
          </TouchableOpacity>
        </Link>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.cardBackground,
    paddingVertical: 64,
    alignItems: 'center',
  },
  evolutionContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  evolutionHint: {
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quoteContainer: {
    marginBottom: 48,
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxWidth: 500,
    width: '100%',
    alignItems: 'center',
    minHeight: 120,
  },
  quote: {
    textAlign: 'center',
    fontStyle: 'italic',
    width: '100%',
  },
  trustContainer: {
    marginBottom: 32,
  },
  trustMobile: {
    gap: 24,
    alignItems: 'center',
  },
  trustDesktop: {
    flexDirection: 'row',
    gap: 48,
  },
  trustItem: {
    alignItems: 'center',
  },
  trustNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  trustLabel: {
    textAlign: 'center',
  },
  ctaButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  ctaText: {
    fontWeight: '700',
  },
  quoteTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
});

// Simple web styles without complex properties
const webStyles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.cardBackground,
    paddingVertical: 64,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  evolutionContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  evolutionHint: {
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quoteContainer: {
    marginBottom: 48,
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxWidth: 500,
    width: '100%',
    alignItems: 'center',
    minHeight: 120,
  },
  quote: {
    textAlign: 'center',
    fontStyle: 'italic',
    width: '100%',
  },
  trustContainer: {
    flexDirection: 'row',
    gap: 48,
    marginBottom: 32,
  },
  trustItem: {
    alignItems: 'center',
  },
  trustNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  trustLabel: {
    textAlign: 'center',
  },
  ctaButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: BRAND_COLORS.primary,
  },
  ctaText: {
    fontWeight: '700',
  },
  quoteTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
}); 