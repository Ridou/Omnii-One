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
import { useRDF } from '~/hooks/useRDF';

export function RDFMemoryCard() {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [testMessage, setTestMessage] = useState('Send Eden an email about weekend plans');
  const [jsonDisplay, setJsonDisplay] = useState<string>('');
  
  // Use the direct fetch hook
  const {
    loading,
    error,
    analysisResult,
    concepts,
    analyzeMessage,
    extractConcepts,
    getConceptsArray,
    getPrimaryContact,
    getIntent,
    getConfidence
  } = useRDF();
  
  // Handle search
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      const result = await extractConcepts(searchQuery);
      // Display the raw JSON response
      setJsonDisplay(JSON.stringify(result, null, 2));
    }
  };
  
  // Handle message analysis
  const handleAnalyze = async () => {
    if (testMessage.trim()) {
      console.log('🔍 RDFMemoryCard: Starting message analysis...');
      console.log('   Message:', testMessage);
      
      const result = await analyzeMessage(testMessage);
      console.log('RDFMemoryCard: Message analysis complete');
      console.log('   Result:', result);
      // Display the raw JSON response
      setJsonDisplay(JSON.stringify(result, null, 2));
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
            RDF Semantic Analysis (Direct HTTP)
          </Text>
        </View>
        {loading && (
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
        
        {error && (
          <View className={cn(
            "mt-2 rounded-lg p-3",
            isDark ? "bg-red-900/20" : "bg-red-50"
          )}>
            <Text className={cn(
              "text-sm",
              isDark ? "text-red-300" : "text-red-700"
            )}>
              Error: {error}
            </Text>
          </View>
        )}
        
        {analysisResult && (
          <View className={cn(
            "mt-2 rounded-lg p-3",
            isDark ? "bg-purple-900/20" : "bg-purple-50"
          )}>
            <Text className={cn(
              "text-sm font-medium",
              isDark ? "text-purple-200" : "text-purple-900"
            )}>
              Analysis Results:
            </Text>
            <Text className={cn(
              "text-xs mt-1",
              isDark ? "text-purple-300" : "text-purple-700"
            )}>
              • Contact: {getPrimaryContact() || 'Not found'}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-purple-300" : "text-purple-700"
            )}>
              • Intent: {getIntent() || 'Unknown'}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-purple-300" : "text-purple-700"
            )}>
              • Confidence: {Math.round((getConfidence() || 0) * 100)}%
            </Text>
            <Text className={cn(
              "text-xs mt-2",
              isDark ? "text-orange-300" : "text-orange-700"
            )}>
              ⚠️ Note: The RDF service is returning brain memory analysis instead of contact extraction
            </Text>
          </View>
        )}
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

      {/* Current Concepts */}
      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Extracted Concepts ({getConceptsArray().length}):
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          {getConceptsArray().length > 0 ? (
            getConceptsArray().map((concept: any, index: number) => (
              <View
                key={index}
                className={cn(
                  "mr-2 rounded-full px-3 py-1",
                  isDark ? "bg-purple-900/30" : "bg-purple-100"
                )}
              >
                <Text className={cn(
                  "text-xs",
                  isDark ? "text-purple-200" : "text-purple-800"
                )}>
                  {concept.name} ({concept.type})
                </Text>
              </View>
            ))
          ) : (
            <Text className={cn(
              "text-sm",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              No concepts extracted yet
            </Text>
          )}
        </ScrollView>
      </View>
      
      {/* JSON Response Display */}
      {jsonDisplay && (
        <View className="mt-4">
          <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Raw JSON Response:
          </Text>
          <ScrollView className="max-h-64 rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
            <Text className="text-xs font-mono text-gray-800 dark:text-gray-200">
              {jsonDisplay}
            </Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}