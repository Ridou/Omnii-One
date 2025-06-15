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
import { trpc } from '~/utils/api';
import { cn } from '~/utils/cn';
import { useTheme } from '~/context/ThemeContext';
import { useMutation } from '@tanstack/react-query';

export function RDFMemoryCard() {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [testMessage, setTestMessage] = useState('Send Eden an email about weekend plans');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [concepts, setConcepts] = useState<any[]>([]);
  
  // Use tRPC queries directly with error handling
  const extractConceptsQuery =useMutation(trpc.rdf.extractConcepts.mutationOptions({
    onSuccess: (data) => {
      if (data.success && data.data) {
        setConcepts(data.data.concepts || []);
      }
    },
}));
  
  const analyzeMessageQuery = useMutation(trpc.rdf.analyzeMessage.mutationOptions({
    onSuccess: (data) => {
      if (data.success && data.data) {
        setAnalysisResult(data.data);
      }
      console.log('🔍 RDFMemoryCard: Message analysis complete');
      console.log('   Result:', data.data);
      setIsAnalyzing(false);
    },
    onError: (error) => {
      console.error('❌ RDFMemoryCard: Message analysis failed:', error);
      setIsAnalyzing(false);
    },
  }));
  
  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      extractConceptsQuery.mutate({ text: searchQuery });
    }
  };
  
  // Handle message analysis
  const handleAnalyze = () => {
    if (testMessage.trim()) {
      console.log('🔍 RDFMemoryCard: Starting message analysis...');
      console.log('   Message:', testMessage);
      setIsAnalyzing(true);
      analyzeMessageQuery.mutate({
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
      });
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
            RDF Semantic Analysis
          </Text>
        </View>
        {(extractConceptsQuery.isPending || analyzeMessageQuery.isPending) && (
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
              • Contact: {analysisResult.contact_extraction?.primary_contact || 'Not found'}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-purple-300" : "text-purple-700"
            )}>
              • Intent: {analysisResult.intent_analysis?.communication_action || 'Unknown'}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-purple-300" : "text-purple-700"
            )}>
              • Confidence: {Math.round((analysisResult.contact_extraction?.confidence || 0) * 100)}%
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
          Extracted Concepts ({concepts.length}):
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          {concepts.length > 0 ? (
            concepts.map((concept, index) => (
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
    </View>
  );
}