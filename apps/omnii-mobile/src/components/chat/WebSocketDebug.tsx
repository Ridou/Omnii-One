import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getWebSocketUrl } from '~/lib/env';
import Constants from 'expo-constants';

export function WebSocketDebug() {
  const [wsUrl, setWsUrl] = useState<string>('');
  const [connectionTest, setConnectionTest] = useState<string>('');

  useEffect(() => {
    console.log('🔧 [WebSocketDebug] Getting WebSocket URL...');
    const url = getWebSocketUrl();
    console.log('🔧 [WebSocketDebug] URL result:', url);
    setWsUrl(url);
  }, []);

  const testConnection = () => {
    console.log('🧪 [WebSocketDebug] Testing direct WebSocket connection...');
    console.log('🧪 [WebSocketDebug] URL:', wsUrl);
    
    if (!wsUrl) {
      setConnectionTest('❌ No WebSocket URL');
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ [WebSocketDebug] Direct connection successful!');
        setConnectionTest('✅ Connection successful!');
        ws.close();
      };
      
      ws.onerror = (error) => {
        console.log('❌ [WebSocketDebug] Direct connection failed:', error);
        setConnectionTest('❌ Connection failed');
      };
      
      ws.onclose = (event) => {
        console.log('🔌 [WebSocketDebug] Direct connection closed:', event.code, event.reason);
      };
      
      setConnectionTest('⏳ Testing connection...');
    } catch (error) {
      console.log('❌ [WebSocketDebug] Connection error:', error);
      setConnectionTest('❌ Connection error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 WebSocket Debug</Text>
      
      <View style={styles.info}>
        <Text style={styles.label}>Host URI:</Text>
        <Text style={styles.value}>{Constants.expoConfig?.hostUri || 'not available'}</Text>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.label}>WebSocket URL:</Text>
        <Text style={styles.value}>{wsUrl || 'not set'}</Text>
      </View>
      
      <TouchableOpacity style={styles.button} onPress={testConnection}>
        <Text style={styles.buttonText}>Test Connection</Text>
      </TouchableOpacity>
      
      {connectionTest && (
        <Text style={styles.result}>{connectionTest}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    margin: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  info: {
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    color: '#333',
  },
  value: {
    color: '#666',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  result: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
}); 