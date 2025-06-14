import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '~/lib/supabase';

export default function EmergencyLogoutScreen() {
  const router = useRouter();

  // Auto-run logout on mount
  useEffect(() => {
    const performEmergencyLogout = async () => {
      try {

        // 1. Sign out from Supabase
        try {
          await supabase.auth.signOut();
        } catch (supabaseError) {
        }

        // 2. Clear AsyncStorage
        try {
          await AsyncStorage.clear();
        } catch (storageError) {
        }

        // 3. Clear any Supabase-specific storage keys
        try {
          const keys = await AsyncStorage.getAllKeys();
          const supabaseKeys = keys.filter(key => 
            key.includes('supabase') || 
            key.includes('auth') || 
            key.includes('session') ||
            key.includes('omnii')
          );
          if (supabaseKeys.length > 0) {
            await AsyncStorage.multiRemove(supabaseKeys);
          }
        } catch (keyError) {
        }


        // 4. 🔒 CONSISTENT REDIRECT: Always go to landing page after logout
        try {
          router.replace('/');
        } catch (navigationError) {
          // Fallback: try to reload the page if web
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }

      } catch (error) {
        
        // 🔒 FALLBACK: Still try to go to landing page
        try {
          router.replace('/');
        } catch (finalError) {
          // Last resort: reload page if on web
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }
      }
    };

    performEmergencyLogout();
  }, [router]);

  const handleForceLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      router.replace('/'); // 🔒 Consistent redirect to landing page
    } catch (error) {
    }
  };

  const handleGoToLanding = () => {
    try {
      router.replace('/'); // 🔒 Go to landing page instead of random routes
    } catch (error) {
    }
  };

  const handleGoToLogin = () => {
    try {
      router.replace('/(auth)/login');
    } catch (error) {
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FF4444',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    content: {
      backgroundColor: 'white',
      padding: 30,
      borderRadius: 15,
      alignItems: 'center',
      maxWidth: 300,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FF4444',
      marginBottom: 15,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: '#333333',
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 22,
    },
    button: {
      backgroundColor: '#FF4444',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 8,
      marginVertical: 5,
      minWidth: 150,
    },
    buttonSecondary: {
      backgroundColor: '#666666',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚨 Emergency Reset</Text>
        <Text style={styles.message}>
          Clearing authentication state and redirecting to the landing page...
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleForceLogout}
        >
          <Text style={styles.buttonText}>Force Logout Again</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleGoToLanding}
        >
          <Text style={styles.buttonText}>Go to Landing Page</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleGoToLogin}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 