import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Github, Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { useAuth } from '~/context/AuthContext';

export default function RegisterScreen() {
  const { signUpWithEmail, signInWithGoogle, isLoading } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: '#000000',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: '#666666',
      textAlign: 'center',
    },
    form: {
      marginBottom: 24,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 8,
    },
    input: {
      backgroundColor: '#F5F5F5',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 8,
      padding: 16,
      fontSize: 16,
      color: '#000000',
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F5',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 8,
    },
    passwordInput: {
      flex: 1,
      padding: 16,
      fontSize: 16,
      color: '#000000',
    },
    passwordToggle: {
      padding: 16,
    },
    registerButton: {
      backgroundColor: '#007AFF',
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    registerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    orContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    orLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#E0E0E0',
    },
    orText: {
      color: '#666666',
      fontSize: 14,
      marginHorizontal: 16,
    },
    socialContainer: {
      marginBottom: 24,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    socialButtonText: {
      fontSize: 16,
      color: '#000000',
      marginLeft: 12,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 8,
    },
    footerText: {
      color: '#666666',
      fontSize: 14,
    },
    footerLink: {
      color: '#007AFF',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
    errorContainer: {
      backgroundColor: '#FFE5E5',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      color: '#FF0000',
    },
  });

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setError('');
    try {
      await signUpWithEmail(email, password, name);
      router.replace('/(tabs)/tasks');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register';
      setError(errorMessage);
    }
  };

  const handleSocialRegister = async (provider: string) => {
    try {
      if (provider === 'Google') {
        await signInWithGoogle();
        router.replace('/(tabs)/tasks');
      } else {
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to register with ${provider}`;
      setError(errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to start using Omnii</Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Name</Text>
                <View style={styles.input}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.input}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="#999999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a password"
                    placeholderTextColor="#999999"
                    secureTextEntry={!showPassword}
                    style={styles.passwordInput}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 
                      <EyeOff size={20} color="#666666" /> : 
                      <Eye size={20} color="#666666" />
                    }
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor="#999999"
                    secureTextEntry={!showPassword}
                    style={styles.passwordInput}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.registerButton}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.registerButtonText}>Sign Up</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialRegister('GitHub')}
              >
                <Github size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Continue with GitHub</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialRegister('Google')}
              >
                <Mail size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Log In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}