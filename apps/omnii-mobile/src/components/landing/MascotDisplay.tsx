import React, { useRef, useEffect } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { BodyText, CaptionText } from '~/components/common/Typography';
import { AppColors } from '~/constants/Colors';
import { useResponsiveDesign } from '~/utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

interface MascotDisplayProps {
  stage: 'seed' | 'flower' | 'tree';
  size: 'small' | 'medium' | 'large' | 'xlarge';
  showLevel?: boolean;
  level?: number;
  style?: any;
}

export const MascotDisplay: React.FC<MascotDisplayProps> = ({
  stage,
  size,
  showLevel = false,
  level = 1,
  style
}) => {
  const responsive = useResponsiveDesign();
  
  // Animation setup following profile.tsx pattern
  const breathingAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  
  // Dynamic size configurations based on screen width and responsive design
  const getDynamicSize = () => {
    const baseSize = responsive.isMobileXS ? screenWidth * 0.25 : 
                     responsive.isMobileSmall ? screenWidth * 0.28 :
                     responsive.isMobile ? screenWidth * 0.32 :
                     responsive.isTablet ? screenWidth * 0.2 : 
                     screenWidth * 0.15;

    const sizeMultipliers = {
      small: 0.5,
      medium: 0.8,
      large: 1.0,
      xlarge: 1.4,
    };

    const finalSize = Math.round(baseSize * sizeMultipliers[size]);
    
    // Ensure minimum and maximum sizes
    const minSize = 48;
    const maxSize = responsive.isDesktop ? 400 : 300;
    
    return {
      width: Math.max(minSize, Math.min(maxSize, finalSize)),
      height: Math.max(minSize, Math.min(maxSize, finalSize)),
    };
  };
  
  // Asset mapping - using actual mascot evolution images
  const mascotAssets = {
    seed: {
      small: require('~/assets/images/mascot/animations/idle/Seed of LIfe No Background.png'),
      medium: require('~/assets/images/mascot/animations/idle/Seed of LIfe No Background.png'),
      large: require('~/assets/images/mascot/animations/idle/Seed of LIfe No Background.png'),
      xlarge: require('~/assets/images/mascot/animations/idle/Seed of LIfe No Background.png'),
    },
    flower: {
      small: require('~/assets/images/mascot/animations/idle/Flower Of LIfe No Background.png'),
      medium: require('~/assets/images/mascot/animations/idle/Flower Of LIfe No Background.png'),
      large: require('~/assets/images/mascot/animations/idle/Flower Of LIfe No Background.png'),
      xlarge: require('~/assets/images/mascot/animations/idle/Flower Of LIfe No Background.png'),
    },
    tree: {
      small: require('~/assets/images/mascot/animations/idle/Tree of Life No Background.png'),
      medium: require('~/assets/images/mascot/animations/idle/Tree of Life No Background.png'),
      large: require('~/assets/images/mascot/animations/idle/Tree of Life No Background.png'),
      xlarge: require('~/assets/images/mascot/animations/idle/Tree of Life No Background.png'),
    }
  };
  
  useEffect(() => {
    // Breathing animation - gentle scale
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnim, {
          toValue: 1.03,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(breathingAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Floating animation - subtle vertical movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: -8,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  const dynamicSize = getDynamicSize();
  
  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.mascotContainer,
          {
            transform: [
              { scale: breathingAnim },
              { translateY: floatingAnim }
            ],
          }
        ]}
      >
        <Image
          source={mascotAssets[stage][size]}
          style={[styles.mascotImage, dynamicSize]}
          resizeMode="contain"
        />
        
        {showLevel && (
          <View style={[styles.levelBadge, {
            // Scale badge size with mascot size
            minWidth: Math.max(20, dynamicSize.width * 0.15),
            paddingHorizontal: responsive.isMobileXS ? 6 : 8,
            paddingVertical: responsive.isMobileXS ? 2 : 4,
          }]}>
            <CaptionText color="#FFFFFF" style={[styles.levelText, {
              fontSize: responsive.isMobileXS ? 9 : 10,
            }]}>
              Lv. {level}
            </CaptionText>
          </View>
        )}
      </Animated.View>
      
      <BodyText 
        size={2} 
        color={AppColors.textSecondary} 
        style={[styles.stageText, {
          fontSize: responsive.isMobileXS ? 12 : 14,
        }]}
      >
        {stage === 'seed' ? '🌱 Seed of Life' : stage === 'flower' ? '🌸 Flower of Life' : '🌳 Tree of Life'}
      </BodyText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    borderRadius: 8,
  },
  levelBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: AppColors.aiGradientStart,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  stageText: {
    marginTop: 8,
    textAlign: 'center',
  },
}); 