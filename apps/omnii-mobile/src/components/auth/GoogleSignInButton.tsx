import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Mail } from 'lucide-react-native';

interface GoogleSignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
}

export default function GoogleSignInButton({ 
  onPress, 
  isLoading = false, 
  disabled = false,
  variant = 'outline'
}: GoogleSignInButtonProps) {
  const styles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      ...(variant === 'primary' ? {
        backgroundColor: '#4285F4',
      } : {
        backgroundColor: '#fFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
      }),
      ...(disabled && {
        opacity: 0.6,
      }),
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 12,
      ...(variant === 'primary' ? {
        color: '#FFFFFF',
      } : {
        color: '#000000',
      }),
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
      ...(variant === 'primary' ? {
        color: '#FFFFFF',
      } : {
        color: '#666666',
      }),
    },
  });

  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={onPress}
      disabled={disabled || isLoading}
      accessibilityLabel="Sign in with Google"
      accessibilityRole="button"
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' ? '#FFFFFF' : '#666666'} 
          />
          <Text style={styles.loadingText}>Signing in...</Text>
        </View>
      ) : (
        <>
          <Mail 
            size={20} 
            color={variant === 'primary' ? '#FFFFFF' : '#4285F4'} 
          />
          <Text style={styles.buttonText}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
} 