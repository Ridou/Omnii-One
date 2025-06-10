import React from 'react';
import { Platform, TouchableOpacity, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as AppleAuthentication from 'expo-apple-authentication';

interface AppleSignInButtonProps {
  onPress: () => Promise<void>;
  disabled?: boolean;
  style?: any;
}

// Official Apple Logo SVG Component
const AppleLogo = ({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" style={{ marginRight: 8 }}>
    <Path
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      fill={color}
    />
  </Svg>
);

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onPress,
  disabled = false,
  style
}) => {
  // Only render on iOS
  if (Platform.OS !== 'ios') {
    return null;
  }

  // Custom Apple Sign In Button with NativeWind (matching Apple's HIG)
  return (
    <View style={[style, disabled && { opacity: 0.6 }]}>
      <TouchableOpacity
        className="bg-black rounded-lg py-3 px-4 flex-row items-center justify-center w-full min-h-[50px] shadow-lg active:bg-gray-800 active:scale-[0.98]"
        onPress={disabled ? () => {} : onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={{
          // Additional shadow and styling for iOS
          shadowColor: '#000000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <AppleLogo size={20} color="#FFFFFF" />
        <Text 
          className="text-white font-semibold text-base tracking-wide"
          style={{
            fontFamily: 'SF Pro Display', // Use SF Pro if available
            letterSpacing: 0.5,
          }}
        >
          Continue with Apple
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default AppleSignInButton; 