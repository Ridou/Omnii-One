import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { getBaseUrl } from '../utils/base-url';

/**
 * Direct HTTP RDF hook - Uses proper base URL configuration
 * No tRPC, no complexity, just raw fetch calls
 */
export const useRDF = () => {
  // Use the same base URL logic as the rest of the app
  const getRdfBaseUrl = () => {
    return getBaseUrl();
  };

  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Test message analysis - Updated to use proper base URL
  const testAnalyzeMessage = useCallback(async (text: string) => {
    console.log('\n3️⃣ Testing message analysis through MCP...');
    setLoading(true);
    setLastError(null);
    
    try {
      const analyzeResponse = await fetch(`${getRdfBaseUrl()}/api/rdf/analyze`, {
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
      console.log(`   💡 URL used: ${getRdfBaseUrl()}/api/rdf/analyze`);
      if (error.message === 'Network request failed') {
        console.log('   💡 Tips:');
        console.log('      - For physical device: Check EXPO_PUBLIC_BACKEND_BASE_URL configuration');
        console.log('      - Make sure MCP service is running and accessible');
        console.log('      - Check network connectivity and firewall settings');
      }
      setLastError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Test concept extraction - Updated to use proper base URL
  const testExtractConcepts = useCallback(async (text: string) => {
    console.log('\n4️⃣ Testing concept extraction through MCP...');
    setLoading(true);
    setLastError(null);
    
    try {
      const extractResponse = await fetch(`${getRdfBaseUrl()}/api/rdf/extract-concepts`, {
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

  // Test health check - Updated to use proper base URL
  const testHealthCheck = useCallback(async () => {
    console.log(`1️⃣ Testing MCP service at ${getRdfBaseUrl()}...`);
    try {
      const mcpResponse = await fetch(`${getRdfBaseUrl()}/api/rdf/health`, {
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
      console.log(`   💡 Check EXPO_PUBLIC_BACKEND_BASE_URL configuration`);
      return null;
    }
  }, []);

  // Test Python service - Updated for production compatibility
  const testPythonHealth = useCallback(async () => {
    console.log('\n2️⃣ Testing Python RDF service availability...');
    try {
      // In production, Python service is internal to the MCP service
      // We'll test through the MCP service instead
      const rdfHealthResponse = await fetch(`${getRdfBaseUrl()}/api/rdf/health`, {
        method: 'GET'
      });
      console.log(`   Status: ${rdfHealthResponse.status}`);
      const data = await rdfHealthResponse.json();
      if (data.python_rdf_service) {
        console.log(`   ✅ Python RDF service is accessible through MCP!`);
        return true;
      } else {
        console.log(`   ⚠️ Python RDF service status unknown`);
        return false;
      }
    } catch (error: any) {
      console.log(`   ❌ Python RDF service not accessible: ${error.message}`);
      console.log(`   💡 This may be expected in production environments`);
      return false;
    }
  }, []);

  // Run full test flow - Updated messaging
  const runFullTestFlow = useCallback(async () => {
    console.log('🧪 Testing RDF Flow\n');
    
    await testHealthCheck();
    await testPythonHealth();
    await testAnalyzeMessage('Send Eden an email about weekend plans');
    await testExtractConcepts('Send Eden an email about weekend plans');
    
    console.log('\n📝 Summary of setup:');
    console.log(`- React Native app using: ${getRdfBaseUrl()}`);
    console.log('- MCP service handling RDF operations');
    console.log('- Python RDF service integrated through MCP');
    console.log('- Flow: React Native → MCP → Python RDF (internal)');
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