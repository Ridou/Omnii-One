import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Direct HTTP RDF hook - EXACT COPY of test-local-rdf-flow.js logic
 * No tRPC, no complexity, just raw fetch calls
 */
export const useRDF = () => {
  // Handle platform-specific localhost
  const getBaseUrl = () => {
    // For physical devices, replace with your computer's IP
    // Example: return 'http://192.168.1.100:8000';
    
    if (Platform.OS === 'ios') {
      // iOS simulator
      return 'http://localhost:8000';
    } else if (Platform.OS === 'android') {
      // Android emulator
      return 'http://10.0.2.2:8000';
    } else {
      // Web or other
      return 'http://localhost:8000';
    }
  };
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Test message analysis - EXACT COPY FROM test-local-rdf-flow.js
  const testAnalyzeMessage = useCallback(async (text: string) => {
    console.log('\n3️⃣ Testing message analysis through MCP...');
    setLoading(true);
    setLastError(null);
    
    try {
      const analyzeResponse = await fetch(`${getBaseUrl()}/api/rdf/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          domain: 'contact_communication',
          task: 'message_analysis',
          extractors: [
            'contact_names',
            'communication_intent',
            'context_clues',
            'formality_level',
            'urgency_indicators'
          ]
        })
      });
      console.log(`   Status: ${analyzeResponse.status}`);
      const analyzeData = await analyzeResponse.json();
      console.log(`   Response:`, JSON.stringify(analyzeData, null, 2));
      
      setLastResponse(analyzeData);
      return analyzeData;
    } catch (error: any) {
      console.log(`   ❌ Failed to analyze message: ${error.message}`);
      console.log(`   💡 Platform: ${Platform.OS}`);
      console.log(`   💡 URL used: ${getBaseUrl()}/api/rdf/analyze`);
      if (error.message === 'Network request failed') {
        console.log('   💡 Tips:');
        console.log('      - For physical device: Use your computer\'s IP instead of localhost');
        console.log('      - Make sure MCP service is running: cd apps/omnii_mcp && bun dev');
        console.log('      - Check if port 8000 is accessible from your device');
      }
      setLastError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Test concept extraction - EXACT COPY FROM test-local-rdf-flow.js
  const testExtractConcepts = useCallback(async (text: string) => {
    console.log('\n4️⃣ Testing concept extraction through MCP...');
    setLoading(true);
    setLastError(null);
    
    try {
      const extractResponse = await fetch(`${getBaseUrl()}/api/rdf/extract-concepts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text })
      });
      console.log(`   Status: ${extractResponse.status}`);
      const extractData = await extractResponse.json();
      console.log(`   Response:`, JSON.stringify(extractData, null, 2));
      
      setLastResponse(extractData);
      return extractData;
    } catch (error: any) {
      console.log(`   ❌ Failed to extract concepts: ${error.message}`);
      setLastError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Test health check - EXACT COPY FROM test-local-rdf-flow.js
  const testHealthCheck = useCallback(async () => {
    console.log('1️⃣ Testing MCP service at localhost:8000...');
    try {
      const mcpResponse = await fetch(`${getBaseUrl()}/api/rdf/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`   Status: ${mcpResponse.status}`);
      const mcpData = await mcpResponse.json();
      console.log(`   Response:`, JSON.stringify(mcpData, null, 2));
      return mcpData;
    } catch (error: any) {
      console.log(`   ❌ Failed to reach MCP service: ${error.message}`);
      console.log(`   💡 Make sure to run: cd apps/omnii_mcp && bun dev`);
      return null;
    }
  }, []);

  // Test Python service - EXACT COPY FROM test-local-rdf-flow.js
  const testPythonHealth = useCallback(async () => {
    console.log('\n2️⃣ Testing Python RDF service at localhost:8001...');
    try {
      // Python service port mapping
      const pythonUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8001/health' : 'http://localhost:8001/health';
      const pythonResponse = await fetch(pythonUrl, {
        method: 'GET'
      });
      console.log(`   Status: ${pythonResponse.status}`);
      console.log(`   ✅ Python RDF service is running!`);
      return true;
    } catch (error: any) {
      console.log(`   ❌ Python RDF service not accessible: ${error.message}`);
      console.log(`   💡 Make sure to run: cd apps/omnii-rdf && ./start-local.sh`);
      return false;
    }
  }, []);

  // Run full test flow - EXACT COPY FROM test-local-rdf-flow.js
  const runFullTestFlow = useCallback(async () => {
    console.log('🧪 Testing Local RDF Flow\n');
    
    await testHealthCheck();
    await testPythonHealth();
    await testAnalyzeMessage('Send Eden an email about weekend plans');
    await testExtractConcepts('Send Eden an email about weekend plans');
    
    console.log('\n📝 Summary of local setup:');
    console.log('- React Native app should have EXPO_PUBLIC_BACKEND_BASE_URL=http://localhost:8000');
    console.log('- MCP service should be running on port 8000');
    console.log('- Python RDF service should be running on port 8001');
    console.log('- Flow: React Native → localhost:8000 (MCP) → localhost:8001 (Python)');
  }, [testHealthCheck, testPythonHealth, testAnalyzeMessage, testExtractConcepts]);

  return {
    // State
    loading,
    lastResponse,
    lastError,
    
    // Test functions - matching test script exactly
    testAnalyzeMessage,
    testExtractConcepts,
    testHealthCheck,
    testPythonHealth,
    runFullTestFlow,
    
    // Simple helper to get JSON display
    getJsonDisplay: () => lastResponse ? JSON.stringify(lastResponse, null, 2) : '',
  };
};