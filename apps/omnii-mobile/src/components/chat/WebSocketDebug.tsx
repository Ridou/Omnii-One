import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getWebSocketUrl, getEnv } from '~/lib/env';
import Constants from 'expo-constants';

export function WebSocketDebug() {
  const [wsUrl, setWsUrl] = useState<string>('');
  const [connectionTest, setConnectionTest] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const url = getWebSocketUrl();
    const env = getEnv();
    
    setWsUrl(url);
    setDebugInfo({
      backendBaseUrl: env.app.backendBaseUrl,
      hostUri: Constants.expoConfig?.hostUri,
      environment: env.app.environment,
      wsUrl: url,
    });
  }, []);

  const testConnection = () => {
    
    if (!wsUrl) {
      setConnectionTest('❌ No WebSocket URL - Check EXPO_PUBLIC_BACKEND_BASE_URL');
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        setConnectionTest('⏰ Connection timeout - Check if server is running');
        ws.close();
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        setConnectionTest('✅ Connection successful!');
        ws.close();
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        setConnectionTest('❌ Connection failed - Server may be down');
      };
      
      ws.onclose = (event) => {
        if (event.code !== 1000) {
          setConnectionTest(`❌ Connection closed unexpectedly: ${event.code}`);
        }
      };
      
      setConnectionTest('⏳ Testing connection...');
    } catch (error) {
      setConnectionTest('❌ Connection error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 WebSocket Debug</Text>
      
      <View style={styles.info}>
        <Text style={styles.label}>Environment:</Text>
        <Text style={styles.value}>{debugInfo.environment || 'unknown'}</Text>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.label}>Backend Base URL:</Text>
        <Text style={styles.value}>{debugInfo.backendBaseUrl || 'NOT SET ❌'}</Text>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.label}>Host URI:</Text>
        <Text style={styles.value}>{debugInfo.hostUri || 'not available'}</Text>
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
      
      {!debugInfo.backendBaseUrl && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>⚠️ Missing EXPO_PUBLIC_BACKEND_BASE_URL</Text>
          <Text style={styles.warningText}>Set it to: http://localhost:8000</Text>
          <Text style={styles.warningText}>Or: https://omniimcp-production.up.railway.app</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  info: {
    marginBottom: 10,
  },
  label: {
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontFamily: 'monospace',
    backgroundColor: '#eee',
    padding: 5,
    borderRadius: 3,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  result: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  warning: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
    fontFamily: 'monospace',
  },
}); 