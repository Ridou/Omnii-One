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
  
  // Use the simplified RDF hook
  const {
    loading,
    lastResponse,
    lastError,
    testAnalyzeMessage,
    testExtractConcepts,
    testHealthCheck,
    runFullTestFlow,
    getJsonDisplay
  } = useRDF();

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
          onPress={() => testAnalyzeMessage(testMessage)}
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
            onSubmitEditing={() => testExtractConcepts(searchQuery)}
          />
          <TouchableOpacity
            onPress={() => testExtractConcepts(searchQuery)}
            className="rounded-lg bg-purple-600 px-4 py-2"
          >
            <MaterialIcons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Test Buttons */}
      <View className="mt-4 flex-row flex-wrap gap-2">
        <TouchableOpacity
          onPress={testHealthCheck}
          className={cn(
            "rounded-lg px-3 py-2",
            isDark ? "bg-green-600" : "bg-green-500"
          )}
        >
          <Text className="text-white text-sm font-medium">Test Health</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={runFullTestFlow}
          className={cn(
            "rounded-lg px-3 py-2",
            isDark ? "bg-blue-600" : "bg-blue-500"
          )}
        >
          <Text className="text-white text-sm font-medium">Run Full Test</Text>
        </TouchableOpacity>
      </View>
      
      {/* Error Display */}
      {lastError && (
        <View className={cn(
          "mt-4 rounded-lg p-3",
          isDark ? "bg-red-900/20" : "bg-red-50"
        )}>
          <Text className={cn(
            "text-sm",
            isDark ? "text-red-300" : "text-red-700"
          )}>
            Error: {lastError}
          </Text>
        </View>
      )}
      
      {/* Raw JSON Response Display */}
      {getJsonDisplay() && (
        <View className="mt-4">
          <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Raw HTTP Response:
          </Text>
          <ScrollView className="max-h-96 rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
            <Text className="text-xs font-mono text-gray-800 dark:text-gray-200">
              {getJsonDisplay()}
            </Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}