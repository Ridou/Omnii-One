import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import { useCachedConcepts, type CachedConcept } from '~/hooks/useCachedConcepts';

interface ConceptsMemoryCardProps {
  onConceptClick: (concept: CachedConcept) => void;
}

export const ConceptsMemoryCard: React.FC<ConceptsMemoryCardProps> = ({ onConceptClick }) => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const {
    conceptsOverview,
    searchResults,
    isLoading,
    isSearching,
    searchConcepts,
    clearSearch,
    isCacheValid,
    cacheStats,
    totalConcepts,
    isConnected,
    lastSyncTime
  } = useCachedConcepts();

  // Handle search input
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      await searchConcepts(query);
    } else {
      clearSearch();
    }
  }, [searchConcepts, clearSearch]);

  // Get concepts to display (search results or regular concepts)
  const displayConcepts = searchQuery.trim() ? searchResults : (conceptsOverview?.concepts || []);
  const allConcepts = displayConcepts; // Show all concepts, no limit

  const hasError = !isConnected && !isLoading;

  return (
    <View className={cn(
      "p-4 rounded-xl border shadow-sm",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className={cn(
            "w-10 h-10 rounded-xl items-center justify-center mr-3",
            isDark ? "bg-blue-900/30" : "bg-blue-100"
          )}>
            <Text className="text-xl">🧠</Text>
          </View>
          <View>
            <Text className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>
              Brain Concepts
            </Text>
            <Text className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-600")}>
              {isLoading ? "Loading..." : `${totalConcepts} concepts loaded`}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          onPress={() => setShowSearch(!showSearch)}
          className={cn(
            "px-3 py-2 rounded-lg",
            isDark ? "bg-blue-900/30" : "bg-blue-100"
          )}
        >
          <Text className={cn("text-sm font-medium", isDark ? "text-blue-300" : "text-blue-700")}>
            {showSearch ? "Hide Search" : "🔍 Search"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View className="mb-3">
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search concepts... (e.g. 'productivity', 'meetings')"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm",
              isDark 
                ? "bg-slate-700 border-slate-600 text-white" 
                : "bg-gray-50 border-gray-200 text-gray-900"
            )}
          />
          {isSearching && (
            <Text className={cn("text-xs mt-1", isDark ? "text-blue-400" : "text-blue-600")}>
              🔍 Searching...
            </Text>
          )}
        </View>
      )}

      {/* Cache Status */}
      {isCacheValid && (
        <View className={cn(
          "mb-3 p-2 rounded-lg",
          isDark ? "bg-green-900/30" : "bg-green-100"
        )}>
          <Text className={cn("text-xs", isDark ? "text-green-300" : "text-green-700")}>
            🧠 Brain cache hit • {cacheStats.avg_response_time_ms || 0}ms response
          </Text>
        </View>
      )}

      {/* Error State */}
      {hasError && (
        <View className={cn(
          "mb-3 p-3 rounded-lg",
          isDark ? "bg-yellow-900/30" : "bg-yellow-100"
        )}>
          <Text className={cn("text-sm font-medium", isDark ? "text-yellow-300" : "text-yellow-700")}>
            ⚠️ Neo4j Connection Required
          </Text>
          <Text className={cn("text-xs mt-1", isDark ? "text-yellow-400" : "text-yellow-600")}>
            Connect to Neo4j AuraDB to view your knowledge graph
          </Text>
        </View>
      )}

      {/* Concepts List */}
      {allConcepts.length > 0 ? (
        <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
          <View className="space-y-2">
            {allConcepts.map((concept: any, index: number) => (
              <TouchableOpacity
                key={concept.id || index}
                onPress={() => onConceptClick(concept)}
                className={cn(
                  "p-3 rounded-lg border-l-2 border-l-blue-500",
                  isDark ? "bg-slate-700" : "bg-gray-50"
                )}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-2">
                    <Text className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                      {concept.name || concept.text || concept.title || 'Unknown Concept'}
                    </Text>
                    
                    {/* Labels */}
                    {concept.labels && concept.labels.length > 0 && (
                      <View className="flex-row flex-wrap gap-1 mt-1">
                        {concept.labels.slice(0, 3).map((label: string, idx: number) => (
                          <View key={idx} className={cn(
                            "px-1 py-0.5 rounded",
                            isDark ? "bg-blue-800/50" : "bg-blue-200"
                          )}>
                            <Text className={cn("text-xs", isDark ? "text-blue-300" : "text-blue-700")}>
                              {label}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {/* Keywords */}
                    {concept.properties?.keywords && (
                      <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                        🏷️ {concept.properties.keywords}
                      </Text>
                    )}
                    
                    {/* Context preview */}
                    {concept.properties?.context && (
                      <Text className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-600")}>
                        {concept.properties.context.substring(0, 60)}...
                      </Text>
                    )}
                  </View>
                  
                  {/* Activation strength indicator */}
                  {concept.properties?.activation_strength && (
                    <View className="items-end">
                      <Text className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-500")}>
                        ⚡ {Math.round(concept.properties.activation_strength * 100)}%
                      </Text>
                    </View>
                  )}
                  
                  {/* Search relevance score */}
                  {searchQuery && concept.relevanceScore && (
                    <View className="items-end">
                      <Text className={cn("text-xs", isDark ? "text-blue-400" : "text-blue-600")}>
                        🎯 {Math.round(concept.relevanceScore)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            
            {/* All concepts are now shown - no more limit */}
          </View>
        </ScrollView>
      ) : isLoading ? (
        <View className="py-8">
          <Text className={cn("text-sm text-center", isDark ? "text-slate-400" : "text-gray-600")}>
            🔄 Loading concepts from brain memory...
          </Text>
        </View>
      ) : searchQuery ? (
        <View className="py-8">
          <Text className={cn("text-sm text-center", isDark ? "text-slate-400" : "text-gray-600")}>
            🔍 No concepts found matching &ldquo;{searchQuery}&rdquo;
          </Text>
          <TouchableOpacity
            onPress={() => handleSearch('')}
            className="mt-2"
          >
            <Text className={cn("text-sm text-center", isDark ? "text-blue-400" : "text-blue-600")}>
              Clear search to see all concepts
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="py-8">
          <Text className={cn("text-sm text-center", isDark ? "text-slate-400" : "text-gray-600")}>
            🧠 No concepts found in your knowledge graph
          </Text>
          {!hasError && (
            <Text className={cn("text-xs text-center mt-1", isDark ? "text-slate-500" : "text-gray-500")}>
              Start conversations to build your brain memory
            </Text>
          )}
        </View>
      )}

      {/* Connection Status Footer */}
      <View className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className={cn(
              "w-2 h-2 rounded-full mr-2",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <Text className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-600")}>
              {isConnected ? "Connected to Neo4j AuraDB" : "Disconnected"}
            </Text>
          </View>
          
          {lastSyncTime && (
            <Text className={cn("text-xs", isDark ? "text-slate-500" : "text-gray-500")}>
              Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}; 