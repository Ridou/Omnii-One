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
        console.log('🚨 Emergency logout initiated...');

        // 1. Sign out from Supabase
        try {
          console.log('🔄 Signing out from Supabase...');
          await supabase.auth.signOut();
          console.log('✅ Supabase sign out complete');
        } catch (supabaseError) {
          console.error('⚠️ Supabase sign out failed:', supabaseError);
        }

        // 2. Clear AsyncStorage
        try {
          console.log('🧹 Clearing AsyncStorage...');
          await AsyncStorage.clear();
          console.log('✅ AsyncStorage cleared');
        } catch (storageError) {
          console.error('⚠️ AsyncStorage clear failed:', storageError);
        }

        // 3. Clear any Supabase-specific storage keys
        try {
          console.log('🧹 Clearing Supabase storage keys...');
          const keys = await AsyncStorage.getAllKeys();
          const supabaseKeys = keys.filter(key => 
            key.includes('supabase') || 
            key.includes('auth') || 
            key.includes('session') ||
            key.includes('omnii')
          );
          if (supabaseKeys.length > 0) {
            await AsyncStorage.multiRemove(supabaseKeys);
            console.log('✅ Supabase keys cleared:', supabaseKeys);
          }
        } catch (keyError) {
          console.error('⚠️ Key clearing failed:', keyError);
        }

        console.log('✅ Emergency logout complete');

        // 4. 🔒 CONSISTENT REDIRECT: Always go to landing page after logout
        console.log('🏠 Redirecting to landing page...');
        try {
          router.replace('/');
          console.log('✅ Successfully redirected to landing page');
        } catch (navigationError) {
          console.error('❌ Navigation to landing page failed:', navigationError);
          // Fallback: try to reload the page if web
          if (typeof window !== 'undefined') {
            console.log('🔄 Fallback: Reloading page...');
            window.location.href = '/';
          }
        }

      } catch (error) {
        console.error('💥 Emergency logout failed:', error);
        
        // 🔒 FALLBACK: Still try to go to landing page
        try {
          console.log('🏠 Fallback: Trying to redirect to landing page...');
          router.replace('/');
        } catch (finalError) {
          console.error('💥 Final redirect also failed:', finalError);
          // Last resort: reload page if on web
          if (typeof window !== 'undefined') {
            console.log('🔄 Last resort: Reloading page...');
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
      console.error('Force logout failed:', error);
    }
  };

  const handleGoToLanding = () => {
    try {
      router.replace('/'); // 🔒 Go to landing page instead of random routes
    } catch (error) {
      console.error('Landing page navigation failed:', error);
    }
  };

  const handleGoToLogin = () => {
    try {
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Login navigation failed:', error);
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