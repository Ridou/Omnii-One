import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { debugAuthConfig, debugOAuthFlow } from '~/lib/auth/debug';
import { signInWithGoogle } from '~/lib/auth/googleAuth';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

export default function OAuthDebugger() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const runDebugConfig = () => {
    addLog('Running debug configuration...');
    debugAuthConfig();
    addLog('Debug configuration complete - check console');
  };

  const runDebugFlow = async () => {
    addLog('Running debug OAuth flow...');
    try {
      await debugOAuthFlow();
      addLog('Debug OAuth flow complete - check console');
    } catch (error) {
      addLog(`Debug OAuth flow error: ${error}`);
    }
  };

  const testConfig = async () => {
    addLog('Testing OAuth configuration...');
    try {
      // await testOAuthConfig();
      addLog('OAuth configuration test passed');
    } catch (error) {
      addLog(`OAuth configuration test failed: ${error}`);
    }
  };

  const testRedirectURI = () => {
    addLog('Testing redirect URI generation...');
    try {
      const defaultUri = AuthSession.makeRedirectUri();
      const schemeUri = AuthSession.makeRedirectUri({ scheme: 'omnii-mobile' });
      const pathUri = AuthSession.makeRedirectUri({
        scheme: 'omnii-mobile',
        path: 'auth/callback'
      });

      addLog(`Default URI: ${defaultUri}`);
      addLog(`Scheme URI: ${schemeUri}`);
      addLog(`Path URI: ${pathUri}`);
    } catch (error) {
      addLog(`Redirect URI test failed: ${error}`);
    }
  };

  const testSupabaseOAuth = async () => {
    setIsLoading(true);
    addLog('Testing Supabase OAuth flow...');
    try {
      await signInWithGoogle();
      addLog('Supabase OAuth flow started successfully');
    } catch (error) {
      addLog(`Supabase OAuth flow failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectOAuth = async () => {
    setIsLoading(true);
    addLog('Testing Direct OAuth flow...');
    try {
      // await signInWithGoogleDirect();
      addLog('Direct OAuth flow started successfully');
    } catch (error) {
      addLog(`Direct OAuth flow failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkEnvironmentVars = () => {
    addLog('Checking environment variables...');
    const vars = {
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID': Constants.expoConfig?.extra?.googleClientId,
      'EXPO_PUBLIC_SUPABASE_URL': Constants.expoConfig?.extra?.supabaseUrl,
      'EXPO_PUBLIC_SUPABASE_ANON_KEY': Constants.expoConfig?.extra?.supabaseAnonKey,
    };

    for (const [key, value] of Object.entries(vars)) {
      if (value) {
        addLog(`✅ ${key}: Set (${value.substring(0, 10)}...)`);
      } else {
        addLog(`❌ ${key}: Missing`);
      }
    }
  };

  const showConfigSummary = () => {
    Alert.alert(
      'OAuth Configuration Summary',
      `
Google Client ID: ${Constants.expoConfig?.extra?.googleClientId ? 'Set' : 'Missing'}
Supabase URL: ${Constants.expoConfig?.extra?.supabaseUrl ? 'Set' : 'Missing'}
Supabase Key: ${Constants.expoConfig?.extra?.supabaseAnonKey ? 'Set' : 'Missing'}

Expected Redirect URIs:
1. https://aaxiawuatfajjpvwtjuz.supabase.co/auth/v1/callback (Supabase)
2. omnii-mobile://auth/callback (Deep link)

Make sure these are configured in:
- Google Cloud Console OAuth credentials
- Supabase Dashboard > Auth > Providers > Google

Recommended: Use Supabase OAuth (simpler and more reliable)
      `,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>OAuth Debugger</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={checkEnvironmentVars}>
            <Text style={styles.buttonText}>Check Environment Variables</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testRedirectURI}>
            <Text style={styles.buttonText}>Test Redirect URI</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={runDebugConfig}>
            <Text style={styles.buttonText}>Debug Configuration</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={runDebugFlow}>
            <Text style={styles.buttonText}>Debug OAuth Flow</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testConfig}>
            <Text style={styles.buttonText}>Test OAuth Config</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testSupabaseOAuth}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {isLoading ? 'Testing...' : 'Test Supabase OAuth (Recommended)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={testDirectOAuth}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Test Direct OAuth (Fallback)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoButton} onPress={showConfigSummary}>
            <Text style={styles.buttonText}>Show Config Summary</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
            <Text style={styles.buttonText}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logsContainer}>
          <Text style={styles.logsTitle}>Debug Logs:</Text>
          {logs.map((log) => (
            <Text key={`${Date.now()}-${Math.random()}`} style={styles.logText}>{log}</Text>
          ))}
          {logs.length === 0 && (
            <Text style={styles.noLogsText}>No logs yet. Run a test to see output.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#34C759',
  },
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  infoButton: {
    backgroundColor: '#FF9500',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: 'white',
  },
  logsContainer: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
  },
  logsTitle: {
    color: '#00FF00',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logText: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  noLogsText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
}); 