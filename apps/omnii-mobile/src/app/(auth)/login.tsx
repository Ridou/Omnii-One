import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '~/context/AuthContext';
import { signInWithGoogleImmediate , testOAuthWithMinimalScopes } from '~/lib/auth/googleAuth';
import { AppLogo } from '~/components/common/OmniiLogo';
import { 
  BrandText, 
  DisplayText, 
  H2,
  BodyText, 
  ButtonText,
  CaptionText
} from '~/components/common/Typography';
import { BRAND_COLORS } from '~/lib/assets';
import { runOAuthDiagnostics, testEnvironmentDetection } from '~/lib/auth/debug';
import { getCurrentScopeInfo } from '~/lib/auth/scopes';

// Official Google G SVG Icon
const GoogleIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path 
      fill="#4285F4" 
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path 
      fill="#34A853" 
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path 
      fill="#FBBC05" 
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path 
      fill="#EA4335" 
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);

// Interactive Google Login Button Component with Simple Shimmer
const GoogleLoginButton = ({ 
  onPress, 
  isLoading, 
  disabled 
}: { 
  onPress: () => void; 
  isLoading: boolean; 
  disabled?: boolean; 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Shimmer animation
  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Animated border color
  const borderColor = shimmerAnim.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [
      '#e9ecef',
      '#4285F4', // Google Blue
      '#34A853', // Google Green
      '#FBBC05', // Google Yellow
      '#EA4335', // Google Red
      '#e9ecef'
    ],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        marginBottom: 30,
      }}
    >
      <Animated.View
        style={{
          borderWidth: 2,
          borderColor: borderColor,
          borderRadius: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            paddingVertical: 16,
            paddingHorizontal: 20,
            minWidth: 280,
            opacity: disabled ? 0.6 : 1,
          }}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || isLoading}
          activeOpacity={0.9}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#3C4043" />
          ) : (
            <>
              <GoogleIcon size={20} />
              <ButtonText style={{ marginLeft: 12, color: "#3C4043" }}>
                Continue with Google
              </ButtonText>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default function LoginScreen() {
  const { signInWithGoogle, isLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isAttempting, setIsAttempting] = useState(false);
  const [showRetryOption, setShowRetryOption] = useState(false);
  
  // Add missing debug state variables
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError('');
    setIsAttempting(true);
    setShowRetryOption(false);
    
    try {
      // Provide immediate feedback
      console.log('🚀 Starting Google authentication...');
      
      await signInWithGoogle();
      
      // Success - redirect will be handled by auth context
      console.log('✅ Authentication successful!');
      router.replace('/(tabs)/approvals');
    } catch (err) {
      console.error('🚫 Authentication failed:', err);
      
      let errorMessage = 'Failed to sign in with Google';
      let shouldShowRetry = false;
      
      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        
        if (message.includes('popup') || message.includes('blocked')) {
          errorMessage = 'Login popup was blocked. Please enable popups and try again.';
          shouldShowRetry = true;
        } else if (message.includes('cancelled') || message.includes('dismissed')) {
          errorMessage = 'Login was cancelled. Please try again.';
        } else if (message.includes('network') || message.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (message.includes('configuration') || message.includes('not configured')) {
          errorMessage = 'Google sign-in is not properly configured. Please try again later.';
        } else if (message.includes('locked')) {
          errorMessage = 'Authentication was blocked by your browser security settings. Please try again.';
          shouldShowRetry = true;
        } else {
          // Use the original error message if it's user-friendly
          errorMessage = err.message.length < 100 ? err.message : errorMessage;
        }
      }
      
      setError(errorMessage);
      setShowRetryOption(shouldShowRetry);
    } finally {
      setIsAttempting(false);
    }
  };

  const handleRetryImmediate = async () => {
    setError('');
    setIsAttempting(true);
    setShowRetryOption(false);
    
    try {
      console.log('🔄 Trying immediate authentication approach...');
      
      await signInWithGoogleImmediate();
      
      console.log('✅ Immediate authentication successful!');
      router.replace('/(tabs)/approvals');
    } catch (err) {
      console.error('🚫 Immediate authentication failed:', err);
      
      let errorMessage = 'Alternative login method also failed';
      
      if (err instanceof Error) {
        errorMessage = err.message.length < 100 ? err.message : errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setIsAttempting(false);
    }
  };

  // Add missing debug handler functions
  const handleRunDiagnostics = async () => {
    setIsDebugging(true);
    setDebugResults(null);
    
    try {
      console.log('🔍 Running OAuth diagnostics...');
      const results = await runOAuthDiagnostics();
      setDebugResults(`Diagnostics completed: ${JSON.stringify(results, null, 2)}`);
    } catch (err) {
      console.error('🚫 Diagnostics failed:', err);
      setDebugResults(`Diagnostics failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDebugging(false);
    }
  };

  const handleTestMinimalOAuth = async () => {
    setIsDebugging(true);
    setDebugResults(null);
    
    try {
      console.log('🧪 Testing minimal OAuth...');
      const results = await testOAuthWithMinimalScopes();
      setDebugResults(`Minimal OAuth test: ${JSON.stringify(results, null, 2)}`);
    } catch (err) {
      console.error('🚫 Minimal OAuth test failed:', err);
      setDebugResults(`Minimal OAuth test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDebugging(false);
    }
  };

  const handleTestEnvironment = async () => {
    setIsDebugging(true);
    setDebugResults(null);
    
    try {
      console.log('🌍 Testing environment detection...');
      const results = await testEnvironmentDetection();
      setDebugResults(`Environment test: ${JSON.stringify(results, null, 2)}`);
    } catch (err) {
      console.error('🚫 Environment test failed:', err);
      setDebugResults(`Environment test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDebugging(false);
    }
  };

  const handleTestScopes = async () => {
    setIsDebugging(true);
    setDebugResults(null);
    
    try {
      console.log('🔧 Testing scope configuration...');
      const results = await getCurrentScopeInfo();
      setDebugResults(`Scope test: ${JSON.stringify(results, null, 2)}`);
    } catch (err) {
      console.error('🚫 Scope test failed:', err);
      setDebugResults(`Scope test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDebugging(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    backButton: {
      padding: 8,
      marginRight: 16,
    },
    headerTitle: {
      flex: 1,
      alignItems: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 32,
      paddingTop: 10,
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: -20,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: 24,
    },
    mainTitle: {
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      textAlign: 'center',
      marginBottom: 32,
      maxWidth: 320,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: '#e9ecef',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: 32,
      minWidth: 280,
      position: 'relative',
      overflow: 'hidden',
    },
    googleButtonDisabled: {
      opacity: 0.6,
    },
    benefitsContainer: {
      alignItems: 'flex-start',
      width: '100%',
      maxWidth: 320,
      backgroundColor: '#f8f9fa',
      borderRadius: 16,
      padding: 20,
      marginTop: 10,
    },
    benefitsTitle: {
      marginBottom: 12,
      alignSelf: 'flex-start',
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      width: '100%',
    },
    checkmark: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#34A853',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    checkmarkText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    benefitText: {
      flex: 1,
    },
    errorContainer: {
      backgroundColor: '#FEF7F0',
      borderColor: '#F9AB00',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      width: '100%',
      maxWidth: 320,
    },
    errorText: {
      color: '#E37400',
      fontSize: 14,
      textAlign: 'center',
    },
    helpSection: {
      marginTop: 12,
    },
    helpTitle: {
      marginBottom: 8,
    },
    helpText: {
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: '#4285F4',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginTop: 16,
      marginBottom: 20,
      minWidth: 280,
      alignItems: 'center',
    },
    retryButtonText: {
      textAlign: 'center',
    },
    // Add missing debug styles
    debugContainer: {
      marginTop: 32,
      width: '100%',
      maxWidth: 320,
      backgroundColor: '#f8f9fa',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: '#e9ecef',
    },
    debugTitle: {
      marginBottom: 12,
      alignSelf: 'flex-start',
    },
    debugButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#e9ecef',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 8,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    debugButtonDisabled: {
      opacity: 0.6,
      backgroundColor: '#f8f9fa',
    },
    debugResults: {
      marginTop: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: '#e9ecef',
      maxHeight: 200,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.topHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/chat');
            }
          }}
        >
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerTitle} />
        <View style={{ width: 40 }} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo and app branding */}
        <View style={styles.logoContainer}>
          <View style={{ transform: [{ scale: 1.3 }] }}>
            <AppLogo />
          </View>
          <BrandText size="medium" style={{ marginTop: 12 }}>OMNII</BrandText>
          <BodyText style={{ ...styles.subtitle, color: "#666666" }}>Your AI-Powered Task Assistant</BodyText>
        </View>

        {/* Main call to action */}
        <H2 style={styles.mainTitle}>Continue with Google</H2>
        <BodyText style={{ ...styles.description, color: "#666666" }}>
          Sign in to access your AI assistant and seamlessly integrate with your Google workspace.
        </BodyText>

        {/* Error message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {(error.toLowerCase().includes('popup') || error.toLowerCase().includes('blocked')) && (
              <View style={styles.helpSection}>
                <BodyText style={{ ...styles.helpTitle, color: "#E37400" }}>💡 Quick fixes:</BodyText>
                <CaptionText style={{ ...styles.helpText, color: "#E37400" }}>
                  • Tap the login button again{'\n'}
                  • Check if popups are enabled{'\n'}
                  • Try refreshing the page
                </CaptionText>
              </View>
            )}
          </View>
        ) : null}

        {/* Google sign-in button */}
        <GoogleLoginButton 
          onPress={handleGoogleLogin}
          isLoading={isLoading || isAttempting}
          disabled={isLoading || isAttempting}
        />

        {/* Retry with immediate approach */}
        {showRetryOption && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetryImmediate}
            disabled={isLoading || isAttempting}
          >
            <ButtonText style={{ ...styles.retryButtonText, color: "#4285F4" }}>
              🔄 Try Alternative Login Method
            </ButtonText>
          </TouchableOpacity>
        )}

        {/* Benefits section */}
        <View style={styles.benefitsContainer}>
          <BodyText style={styles.benefitsTitle}>🔗 Why Google Login?</BodyText>
          
          <View style={styles.benefitItem}>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
            <CaptionText style={{ ...styles.benefitText, color: "#5F6368" }}>
              Seamless integration with Gmail, Calendar & Drive
            </CaptionText>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
            <CaptionText style={{ ...styles.benefitText, color: "#5F6368" }}>
              AI accesses your data securely with your permission
            </CaptionText>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
            <CaptionText style={{ ...styles.benefitText, color: "#5F6368" }}>
              One login for all your productivity needs
            </CaptionText>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
            <CaptionText style={{ ...styles.benefitText, color: "#5F6368" }}>
              Enhanced task automation across Google services
            </CaptionText>
          </View>
        </View>

        {/* Debug section - only visible in development */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <BodyText style={styles.debugTitle}>🔧 Debug Tools</BodyText>
            
            <TouchableOpacity 
              style={[styles.debugButton, isDebugging && styles.debugButtonDisabled]}
              onPress={handleRunDiagnostics}
              disabled={isDebugging}
            >
              {isDebugging ? (
                <ActivityIndicator size="small" color="#666666" />
              ) : (
                <CaptionText style={{ color: "#666666" }}>Run OAuth Diagnostics</CaptionText>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, isDebugging && styles.debugButtonDisabled]}
              onPress={handleTestMinimalOAuth}
              disabled={isDebugging}
            >
              {isDebugging ? (
                <ActivityIndicator size="small" color="#666666" />
              ) : (
                <CaptionText style={{ color: "#666666" }}>Test Minimal OAuth</CaptionText>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, isDebugging && styles.debugButtonDisabled]}
              onPress={handleTestEnvironment}
              disabled={isDebugging}
            >
              {isDebugging ? (
                <ActivityIndicator size="small" color="#666666" />
              ) : (
                <CaptionText style={{ color: "#666666" }}>Test Environment Detection</CaptionText>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, isDebugging && styles.debugButtonDisabled]}
              onPress={handleTestScopes}
              disabled={isDebugging}
            >
              {isDebugging ? (
                <ActivityIndicator size="small" color="#666666" />
              ) : (
                <CaptionText style={{ color: "#666666" }}>Test Scope Configuration</CaptionText>
              )}
            </TouchableOpacity>

            {debugResults ? (
              <View style={styles.debugResults}>
                <CaptionText style={{ color: "#666666" }}>{debugResults}</CaptionText>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}