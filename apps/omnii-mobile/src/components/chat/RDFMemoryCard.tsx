import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { cn } from '~/utils/cn';
import { useTheme } from '~/context/ThemeContext';

export function RDFMemoryCard() {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [testMessage, setTestMessage] = useState('Send Eden an email about weekend plans');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [extractResult, setExtractResult] = useState<any>(null);
  const [jsonDisplay, setJsonDisplay] = useState<string>('');
  
  // EXACT COPY FROM test-local-rdf-flow.js - Handle search/extract concepts
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      console.log('\n4️⃣ Testing concept extraction through MCP...');
      setIsExtracting(true);
      setJsonDisplay('');
      try {
        const extractResponse = await fetch('http://localhost:8000/api/rdf/extract-concepts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: searchQuery })
        });
        console.log(`   Status: ${extractResponse.status}`);
        const extractData = await extractResponse.json();
        console.log(`   Response:`, JSON.stringify(extractData, null, 2));
        setExtractResult(extractData);
        setJsonDisplay(JSON.stringify(extractData, null, 2));
      } catch (error) {
        console.log(`   ❌ Failed to extract concepts: ${error.message}`);
        setJsonDisplay(`Error: ${error.message}`);
      } finally {
        setIsExtracting(false);
      }
    }
  };
  
  // EXACT COPY FROM test-local-rdf-flow.js - Handle message analysis
  const handleAnalyze = async () => {
    if (testMessage.trim()) {
      console.log('\n3️⃣ Testing message analysis through MCP...');
      setIsAnalyzing(true);
      setJsonDisplay('');
      try {
        const analyzeResponse = await fetch('http://localhost:8000/api/rdf/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: testMessage,
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
        setAnalysisResult(analyzeData);
        setJsonDisplay(JSON.stringify(analyzeData, null, 2));
      } catch (error) {
        console.log(`   ❌ Failed to analyze message: ${error.message}`);
        setJsonDisplay(`Error: ${error.message}`);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <View className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <MaterialIcons
            name="psychology"
            size={24}
            color="#9333EA"
            style={{ marginRight: 8 }}
          />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            RDF Direct HTTP Test (No tRPC)
          </Text>
        </View>
        {(isAnalyzing || isExtracting) && (
          <ActivityIndicator size="small" color="#9333EA" />
        )}
      </View>

      {/* Contact Resolution Test */}
      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Test Message Analysis:
        </Text>
        <TextInput
          className="mb-2 rounded-lg bg-gray-100 px-4 py-3 text-gray-900 dark:bg-gray-700 dark:text-white"
          placeholder="Type a message to analyze..."
          placeholderTextColor="#9CA3AF"
          value={testMessage}
          onChangeText={setTestMessage}
          multiline
        />
        
        <TouchableOpacity
          onPress={handleAnalyze}
          className={cn(
            "mt-2 rounded-lg px-4 py-2",
            isDark ? "bg-purple-600" : "bg-purple-500"
          )}
        >
          <Text className="text-center text-white font-medium">Analyze Message</Text>
        </TouchableOpacity>
        
      </View>

      {/* Concept Search */}
      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Extract Concepts:
        </Text>
        <View className="flex-row">
          <TextInput
            className="mr-2 flex-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-900 dark:bg-gray-700 dark:text-white"
            placeholder="Search for concepts..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            onPress={handleSearch}
            className="rounded-lg bg-purple-600 px-4 py-2"
          >
            <MaterialIcons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Raw JSON Response Display */}
      {jsonDisplay && (
        <View className="mt-4">
          <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Raw HTTP Response:
          </Text>
          <ScrollView className="max-h-96 rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
            <Text className="text-xs font-mono text-gray-800 dark:text-gray-200">
              {jsonDisplay}
            </Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}