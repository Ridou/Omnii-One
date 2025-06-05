import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSmartBack } from '@/utils/navigation';
import { BRAND_COLORS } from '~/lib/assets';

interface SmartBackButtonProps {
  style?: any;
  iconSize?: number;
  iconColor?: string;
  fallbackRoute?: string;
  authAwareFallback?: boolean;
  accessibilityLabel?: string;
}

export default function SmartBackButton({
  style,
  iconSize = 24,
  iconColor = BRAND_COLORS.primary,
  fallbackRoute,
  authAwareFallback = true,
  accessibilityLabel = "Go back"
}: SmartBackButtonProps) {
  const smartBack = useSmartBack({ 
    fallbackRoute, 
    authAwareFallback 
  });

  return (
    <TouchableOpacity 
      style={[styles.backButton, style]}
      onPress={smartBack}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <ArrowLeft size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
}); 