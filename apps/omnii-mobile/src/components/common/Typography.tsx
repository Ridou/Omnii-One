import React from 'react';
import { Text } from 'react-native';
import type { TextProps } from 'react-native';
import { cn } from '~/utils/cn';
import { getTypographyClass, TYPOGRAPHY_VARIANT_MAPPING } from '~/utils/typography';
import { useCustomFonts } from '~/hooks/useCustomFonts';
import type { TypographyVariant } from '~/constants/Typography';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  className?: string; // Added for extensibility
  children: React.ReactNode;
}

/**
 * Base Typography component that uses our NativeWind typography system
 * Leverages the comprehensive utilities in utils/typography.ts
 */
export const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  className,
  style,
  children,
  ...props
}) => {
  const { fontsLoaded, fontError } = useCustomFonts();
  
  // Use our established NativeWind typography classes
  const typographyClass = getTypographyClass(variant, !!fontError || !fontsLoaded);
  
  return (
    <Text 
      className={cn(typographyClass, className)} 
      style={style} 
      {...props}
    >
      {children}
    </Text>
  );
};

// Specialized Typography Components using NativeWind classes

/**
 * Brand text component - uses Styrene font for brand identity
 */
export const BrandText: React.FC<Omit<TypographyProps, 'variant'> & { 
  size?: 'small' | 'medium' | 'large';
  className?: string;
}> = ({ size = 'medium', className, ...props }) => {
  const variantMap = {
    small: 'brandSmall' as const,
    medium: 'brandMedium' as const,
    large: 'brandLarge' as const,
  };
  
  return <Typography variant={variantMap[size]} className={className} {...props} />;
};

/**
 * Heading components - uses Tiempos font for headlines
 */
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = ({ className, ...props }) => (
  <Typography variant="h1" className={cn("omnii-heading", className)} {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = ({ className, ...props }) => (
  <Typography variant="h2" className={cn("omnii-heading", className)} {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = ({ className, ...props }) => (
  <Typography variant="h3" className={cn("omnii-heading", className)} {...props} />
);

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = ({ className, ...props }) => (
  <Typography variant="h4" className={cn("omnii-heading", className)} {...props} />
);

export const Heading5: React.FC<Omit<TypographyProps, 'variant'>> = ({ className, ...props }) => (
  <Typography variant="h5" className={cn("omnii-heading", className)} {...props} />
);

export const Heading6: React.FC<Omit<TypographyProps, 'variant'>> = ({ className, ...props }) => (
  <Typography variant="h6" className={cn("omnii-heading", className)} {...props} />
);

/**
 * Display text components - for large headlines
 */
export const DisplayText: React.FC<Omit<TypographyProps, 'variant'> & { 
  size?: 'small' | 'medium' | 'large';
  className?: string;
}> = ({ size = 'medium', className, ...props }) => {
  const variantMap = {
    small: 'displaySmall' as const,
    medium: 'displayMedium' as const,
    large: 'displayLarge' as const,
  };
  
  return <Typography variant={variantMap[size]} className={cn("omnii-heading", className)} {...props} />;
};

/**
 * Body text components - for content
 */
export const BodyText: React.FC<Omit<TypographyProps, 'variant'> & { 
  size?: 1 | 2;
  className?: string;
}> = ({ size = 1, className, ...props }) => {
  const variant = size === 1 ? 'body1' : 'body2';
  return <Typography variant={variant} className={cn("omnii-body", className)} {...props} />;
};

/**
 * Caption text component - for small text
 */
export const CaptionText: React.FC<Omit<TypographyProps, 'variant'>> = ({ className, ...props }) => (
  <Typography variant="caption" className={cn("omnii-caption", className)} {...props} />
);

/**
 * Overline text component - for labels and categories
 */
export const OverlineText: React.FC<Omit<TypographyProps, 'variant'>> = ({ className, ...props }) => (
  <Typography variant="overline" className={cn("omnii-caption uppercase", className)} {...props} />
);

/**
 * Button text components - for buttons
 */
export const ButtonText: React.FC<Omit<TypographyProps, 'variant'> & { 
  size?: 'small' | 'medium' | 'large';
  className?: string;
}> = ({ size = 'medium', className, ...props }) => {
  const variantMap = {
    small: 'buttonSmall' as const,
    medium: 'buttonMedium' as const,
    large: 'buttonLarge' as const,
  };
  
  return <Typography variant={variantMap[size]} className={className} {...props} />;
};

// Export our typography variant mapping for direct access
export { TYPOGRAPHY_VARIANT_MAPPING } from '~/utils/typography'; 