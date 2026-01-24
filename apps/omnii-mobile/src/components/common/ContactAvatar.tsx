import React, { useState } from 'react';
import { View, Text, Image, Platform } from 'react-native';
import { cn } from '~/utils/cn';

interface ContactAvatarProps {
  photoUrl?: string;
  name: string;
  size?: 'small' | 'medium' | 'large';
  isDark: boolean;
}

export const ContactAvatar: React.FC<ContactAvatarProps> = ({
  photoUrl,
  name,
  size = 'medium',
  isDark
}) => {
  const [imageError, setImageError] = useState(false);
  
  const sizeConfig = {
    small: { container: 32, text: 14, radius: 16 },
    medium: { container: 48, text: 18, radius: 24 },
    large: { container: 64, text: 24, radius: 32 }
  };
  
  const config = sizeConfig[size];
  const initial = name.charAt(0).toUpperCase();
  
  // Always show fallback if no photo URL or if image failed to load
  if (!photoUrl || imageError) {
    return (
      <View
        className={cn(
          'rounded-full items-center justify-center',
          size === 'small' && 'w-8 h-8',
          size === 'medium' && 'w-12 h-12',
          size === 'large' && 'w-16 h-16',
          isDark ? 'bg-slate-700' : 'bg-gray-200'
        )}
        style={{
          width: config.container,
          height: config.container,
          borderRadius: config.radius
        }}
      >
        <Text
          className={cn(
            'font-semibold',
            size === 'small' && 'text-sm',
            size === 'medium' && 'text-lg',
            size === 'large' && 'text-2xl',
            isDark ? 'text-white' : 'text-gray-800'
          )}
          style={{ fontSize: config.text }}
        >
          {initial}
        </Text>
      </View>
    );
  }
  
  // Try to show image
  if (Platform.OS === 'web') {
    // Use web img tag for better CORS handling
    return (
      <div
        style={{
          width: config.container,
          height: config.container,
          borderRadius: config.radius,
          overflow: 'hidden',
          backgroundColor: isDark ? '#334155' : '#e5e7eb'
        }}
      >
        <img
          src={photoUrl}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
  
  // Native Image component
  return (
    <Image
      source={{ uri: photoUrl }}
      className={cn(
        'rounded-full',
        size === 'small' && 'w-8 h-8',
        size === 'medium' && 'w-12 h-12',
        size === 'large' && 'w-16 h-16'
      )}
      style={{
        width: config.container,
        height: config.container,
        borderRadius: config.radius,
        backgroundColor: isDark ? '#334155' : '#e5e7eb'
      }}
      resizeMode="cover"
      onError={() => setImageError(true)}
    />
  );
};