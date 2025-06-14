import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
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
        // Safer web detection
        const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined');
        
        
        // Check if we have OAuth parameters in query params
        const error = params.error as string;
        const access_token = params.access_token as string;
        const refresh_token = params.refresh_token as string;
        const code = params.code as string;
        const state = params.state as string;

        // For web: Also check hash parameters (Supabase implicit flow)
        let hashTokens = { access_token: '', refresh_token: '', expires_at: '', token_type: '' };
        if (isWeb && typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          
          hashTokens = {
            access_token: hashParams.get('access_token') || '',
            refresh_token: hashParams.get('refresh_token') || '',
            expires_at: hashParams.get('expires_at') || '',
            token_type: hashParams.get('token_type') || ''
          };
        }


        if (error) {
          if (isWeb && typeof window !== 'undefined') {
            window.location.href = `${window.location.origin}/(auth)/login?error=${encodeURIComponent(error)}`;
          } else {
            router.replace('/(auth)/login');
          }
          return;
        }

        // Handle web OAuth callback - for web browsers only
        if (isWeb && typeof window !== 'undefined') {
          
          // Check if we have tokens in hash (Supabase implicit flow)
          if (hashTokens.access_token) {
            
            try {
              // Set the session using the tokens from hash
              const session = {
                access_token: hashTokens.access_token,
                refresh_token: hashTokens.refresh_token,
                expires_at: parseInt(hashTokens.expires_at),
                token_type: hashTokens.token_type,
                user: null // Will be populated by Supabase
              };
              
              const { data, error: sessionError } = await supabase.auth.setSession(session);
              
              if (sessionError) {
                window.location.href = `${window.location.origin}/(auth)/login?error=${encodeURIComponent(sessionError.message)}`;
                return;
              }
              
              if (data.session) {
                // Redirect to clean URL
                window.location.replace(`${window.location.origin}/tasks`);
                return;
              }
              
            } catch (tokenError) {
              window.location.href = `${window.location.origin}/(auth)/login?error=${encodeURIComponent('Token processing failed')}`;
              return;
            }
          }
          
          // Handle authorization code flow
          if (code) {
            
            try {
              
              const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              
              if (exchangeError) {
                window.location.href = `${window.location.origin}/(auth)/login?error=${encodeURIComponent(exchangeError.message)}`;
                return;
              }
              
              if (data.session) {
                // Redirect to clean URL
                window.location.replace(`${window.location.origin}/tasks`);
                return;
              }
              
              window.location.href = `${window.location.origin}/(auth)/login?error=${encodeURIComponent('No session created')}`;
              return;
              
            } catch (webError) {
              window.location.href = `${window.location.origin}/(auth)/login?error=${encodeURIComponent('Authentication failed')}`;
              return;
            }
          }
          
          // No tokens or code found
          window.location.href = `${window.location.origin}/(auth)/login?error=${encodeURIComponent('No authentication data received')}`;
          return;
        }

        // Handle mobile app callback
        
        if (access_token || refresh_token) {
        } else if (code) {
          
          try {
            
            // Note: For mobile deep links, we might need to handle PKCE differently
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              
              // Check if it's a PKCE-related error
              if (exchangeError.message?.includes('code verifier')) {
              }
              
              router.replace('/(auth)/login');
              return;
            }
            
            if (data.session) {
              // Auth context will automatically update
            } else {
              router.replace('/(auth)/login');
              return;
            }
          } catch (codeError) {
            router.replace('/(auth)/login');
            return;
          }
        } else {
        }

        // Wait for auth state to update (mobile only)
        if (!isWeb) {
          let attempts = 0;
          const maxAttempts = 10;
          
          const checkAuthState = () => {
            attempts++;
            
            if (user) {
              router.replace('/(tabs)/tasks');
            } else if (attempts >= maxAttempts) {
              router.replace('/(auth)/login');
            } else {
              setTimeout(checkAuthState, 300);
            }
          };
          
          // Start checking after a short delay to allow Supabase to process
          setTimeout(checkAuthState, 500);
        }
        
        
      } catch (error) {
        
        // Safely access error properties
        const errorObj = error as Error;
        
        const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined');
        if (isWeb && typeof window !== 'undefined') {
          window.location.href = `${window.location.origin}/(auth)/login?error=${encodeURIComponent('Authentication failed')}`;
        } else {
          router.replace('/(auth)/login');
        }
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