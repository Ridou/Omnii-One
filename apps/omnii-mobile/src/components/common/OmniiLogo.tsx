import React from 'react';
import { Image, View } from 'react-native';
import { cn } from '~/utils/cn';
import type { ViewStyle, ImageStyle } from 'react-native';

interface OmniiLogoProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  testID?: string;
  className?: string;
}

export const OmniiLogo: React.FC<OmniiLogoProps> = ({
  size = 'medium',
  style,
  imageStyle,
  testID = 'omnii-logo',
  className,
}) => {
  const logoSources = {
    tiny: require('~/assets/images/public/logos/omniiLogoPNG.png'),
    small: require('~/assets/images/public/logos/omniiLogoPNG.png'),
    medium: require('~/assets/images/public/logos/omniiLogoPNG.png'),
    large: require('~/assets/images/public/logos/omniiLogoPNG.png'),
    xlarge: require('~/assets/images/public/logos/omniiLogoPNG.png'),
  };

  const dimensions = {
    tiny: { width: 32, height: 32 },
    small: { width: 60, height: 60 },
    medium: { width: 120, height: 120 },
    large: { width: 200, height: 200 },
    xlarge: { width: 300, height: 300 },
  };

  return (
    <View 
      className={cn("justify-center items-center", className)} 
      style={style} 
      testID={testID}
    >
      <Image
        source={logoSources[size]}
        style={[
          {
            width: dimensions[size].width,
            height: dimensions[size].height,
          },
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

// Specialized components for common use cases
export const AppLogo: React.FC<Omit<OmniiLogoProps, 'size'>> = (props) => (
  <OmniiLogo size="medium" {...props} />
);

export const HeaderLogo: React.FC<Omit<OmniiLogoProps, 'size'>> = (props) => (
  <OmniiLogo size="small" {...props} />
);

export const SplashLogo: React.FC<Omit<OmniiLogoProps, 'size'>> = (props) => (
  <OmniiLogo size="xlarge" {...props} />
);
