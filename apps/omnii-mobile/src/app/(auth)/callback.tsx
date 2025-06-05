import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '~/context/AuthContext';
import { supabase } from '~/lib/supabase';

export default function CallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 OAuth callback received with params:', params);
        
        // Check if we have OAuth parameters
        const error = params.error as string;
        const access_token = params.access_token as string;
        const refresh_token = params.refresh_token as string;
        const code = params.code as string;

        if (error) {
          console.error('❌ OAuth error:', error);
          router.replace('/login');
          return;
        }

        // If we have tokens, the OAuth was successful
        if (access_token || refresh_token) {
          console.log('✅ OAuth tokens received, waiting for auth state update...');
        } else if (code) {
          console.log('✅ Authorization code received, exchanging with Supabase...');
          
          // Use the imported supabase
          
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('❌ Code exchange error:', exchangeError);
              router.replace('/login');
              return;
            }
            
            if (data.session) {
              console.log('✅ Code exchange successful:', data.user?.email);
              // Auth context will automatically update
            } else {
              console.error('❌ No session from code exchange');
              router.replace('/login');
              return;
            }
          } catch (codeError) {
            console.error('❌ Code exchange failed:', codeError);
            router.replace('/login');
            return;
          }
        } else {
          console.log('⏳ No specific OAuth params, waiting for auth state update...');
        }

        // Wait for auth state to update
        let attempts = 0;
        const maxAttempts = 15; // Increased timeout
        
        const checkAuthState = () => {
          attempts++;
          console.log(`🔍 Checking auth state (attempt ${attempts}/${maxAttempts})...`);
          console.log('Current user:', user ? `✅ ${user.email}` : '❌ No user');
          
          if (user) {
            console.log('✅ User authenticated, redirecting to app...');
            router.replace('/(tabs)');
          } else if (attempts >= maxAttempts) {
            console.log('⏰ Auth check timeout, redirecting to login...');
            router.replace('/login');
          } else {
            setTimeout(checkAuthState, 500);
          }
        };
        
        // Start checking after a short delay to allow Supabase to process
        setTimeout(checkAuthState, 1000);
        
      } catch (error) {
        console.error('💥 OAuth callback error:', error);
        router.replace('/login');
      }
    };

    handleCallback();
  }, [params, router, user]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    content: {
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 16,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: '#666666',
      textAlign: 'center',
      marginBottom: 32,
    },
    debugText: {
      fontSize: 12,
      color: '#999999',
      textAlign: 'center',
      marginTop: 16,
    },
    spinner: {
      marginBottom: 16,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator 
          size="large" 
          color="#007AFF" 
          style={styles.spinner}
        />
        <Text style={styles.title}>Completing Sign In</Text>
        <Text style={styles.subtitle}>
          Please wait while we finish setting up your account...
        </Text>
        {params.access_token && (
          <Text style={styles.debugText}>
            Processing OAuth tokens...
          </Text>
        )}
        {params.code && (
          <Text style={styles.debugText}>
            Processing authorization code...
          </Text>
        )}
        {user && (
          <Text style={styles.debugText}>
            Welcome {user.email}! Redirecting...
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
} 