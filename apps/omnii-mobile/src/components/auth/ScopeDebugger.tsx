import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { testGrantedScopes } from '~/lib/auth/googleAuth';
import { debugScopes } from '~/lib/auth/scopes/debug';
import { logSupabaseScopeString } from '~/lib/auth/scopes';

export default function ScopeDebugger() {
  const handleTestScopes = async () => {
    await testGrantedScopes();
  };

  const handleDebugScopes = () => {
    debugScopes();
  };

  const handleSupabaseConfig = () => {
    logSupabaseScopeString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>OAuth Scope Debugger</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleSupabaseConfig}>
          <Text style={styles.buttonText}>Get Supabase Config String</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleDebugScopes}>
          <Text style={styles.buttonText}>Debug Requested Scopes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleTestScopes}>
          <Text style={styles.buttonText}>Test Granted Scopes</Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Check the console logs for detailed scope information
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  note: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 24,
    maxWidth: 280,
  },
}); 