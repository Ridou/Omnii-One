/**
 * n8n Agent Response Components
 * 
 * UI components for displaying n8n Agent Swarm responses in the mobile chat interface
 * Includes components for different agent types and response formats
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';

// Agent Automation Response - Shows n8n agent execution results
export const AgentAutomationResponse: React.FC<{
  agent: string;
  action: string;
  result: any;
  executionTime: string;
  success: boolean;
  metadata?: any;
}> = ({ agent, action, result, executionTime, success, metadata }) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const getAgentIcon = (agentName: string) => {
    const icons = {
      'Email Agent': '📧',
      'Calendar Agent': '📅', 
      'Contact Agent': '👥',
      'Web Agent': '🌐',
      'YouTube Agent': '🎥',
    };
    return icons[agentName] || '🤖';
  };

  const getSuccessColor = () => {
    if (success) {
      return isDark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200";
    } else {
      return isDark ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200";
    }
  };

  return (
    <View className={cn(
      "mt-3 p-4 rounded-xl border",
      getSuccessColor()
    )}>
      {/* Agent Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">{getAgentIcon(agent)}</Text>
          <Text className={cn(
            "font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            {agent}
          </Text>
        </View>
        
        <View className={cn(
          "px-2 py-1 rounded-full",
          success 
            ? (isDark ? "bg-green-900/50" : "bg-green-100")
            : (isDark ? "bg-red-900/50" : "bg-red-100")
        )}>
          <Text className={cn(
            "text-xs font-medium",
            success
              ? (isDark ? "text-green-300" : "text-green-700") 
              : (isDark ? "text-red-300" : "text-red-700")
          )}>
            {success ? '✅ Success' : '❌ Failed'}
          </Text>
        </View>
      </View>

      {/* Action Description */}
      <Text className={cn(
        "text-sm mb-2 font-medium",
        isDark ? "text-gray-300" : "text-gray-600"
      )}>
        {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Text>

      {/* Result Summary */}
      {success && result && (
        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          className={cn(
            "p-3 rounded-lg border",
            isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
          )}
        >
          <Text className={cn(
            "text-sm",
            isDark ? "text-gray-200" : "text-gray-700"
          )}>
            {isExpanded 
              ? (typeof result === 'string' ? result : JSON.stringify(result, null, 2))
              : (typeof result === 'string' ? result.substring(0, 100) + (result.length > 100 ? '...' : '') : 'View result details')
            }
          </Text>
          
          {!isExpanded && typeof result === 'object' && (
            <Text className={cn(
              "text-xs mt-1",
              isDark ? "text-blue-300" : "text-blue-600"
            )}>
              Tap to view details
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Error Message */}
      {!success && (
        <View className={cn(
          "p-3 rounded-lg border",
          isDark ? "bg-red-900/20 border-red-700" : "bg-red-50 border-red-200"
        )}>
          <Text className={cn(
            "text-sm",
            isDark ? "text-red-300" : "text-red-700"
          )}>
            {result?.error || 'Operation failed'}
          </Text>
        </View>
      )}

      {/* Metadata and Execution Time */}
      <View className="flex-row justify-between items-center mt-3">
        <Text className={cn(
          "text-xs",
          isDark ? "text-gray-400" : "text-gray-500"
        )}>
          Execution time: {executionTime}
        </Text>
        
        <View className="flex-row items-center gap-2">
          {metadata?.fallbackUsed && (
            <View className={cn(
              "px-2 py-1 rounded-full",
              isDark ? "bg-yellow-900/30" : "bg-yellow-100"
            )}>
              <Text className={cn(
                "text-xs font-medium",
                isDark ? "text-yellow-300" : "text-yellow-700"
              )}>
                🔄 Local Fallback
              </Text>
            </View>
          )}
          
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-blue-300" : "text-blue-600"
          )}>
            🤖 AI Agent
          </Text>
        </View>
      </View>
    </View>
  );
};

// Web Research Response - Shows web search results
export const WebResearchResponse: React.FC<{
  query: string;
  results: Array<{title: string; snippet: string; link: string}>;
  executionTime: string;
  metadata?: any;
}> = ({ query, results, executionTime, metadata }) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLinkPress = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  const displayResults = isExpanded ? results : results.slice(0, 3);

  return (
    <View className={cn(
      "mt-3 p-4 rounded-xl border",
      isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
    )}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">🌐</Text>
          <Text className={cn(
            "font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            Web Research
          </Text>
        </View>
        
        <View className={cn(
          "px-2 py-1 rounded-full",
          isDark ? "bg-blue-900/30" : "bg-blue-100"
        )}>
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-blue-300" : "text-blue-700"
          )}>
            {results.length} results
          </Text>
        </View>
      </View>

      {/* Query */}
      <Text className={cn(
        "text-sm mb-3 italic",
        isDark ? "text-gray-300" : "text-gray-600"
      )}>
        "{query}"
      </Text>

      {/* Results */}
      <View className="space-y-2">
        {displayResults.map((result, index) => (
          <TouchableOpacity 
            key={index}
            onPress={() => handleLinkPress(result.link)}
            className={cn(
              "p-3 rounded-lg border",
              isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
            )}
          >
            <Text className={cn(
              "font-medium mb-1",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {result.title}
            </Text>
            <Text className={cn(
              "text-sm mb-2",
              isDark ? "text-gray-300" : "text-gray-600"
            )}>
              {result.snippet}
            </Text>
            <Text className={cn(
              "text-xs",
              isDark ? "text-blue-300" : "text-blue-600"
            )}>
              🔗 {result.link.replace(/^https?:\/\//, '').substring(0, 40)}...
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Expand/Collapse Button */}
      {results.length > 3 && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          className={cn(
            "mt-3 p-2 rounded-lg border",
            isDark ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200"
          )}
        >
          <Text className={cn(
            "text-sm text-center font-medium",
            isDark ? "text-blue-300" : "text-blue-600"
          )}>
            {isExpanded ? '▲ Show Less' : `▼ Show ${results.length - 3} More Results`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <Text className={cn(
        "text-xs mt-3 text-center",
        isDark ? "text-gray-400" : "text-gray-500"
      )}>
        Research completed in {executionTime} • Powered by Web Agent
      </Text>
    </View>
  );
};

// YouTube Search Response - Shows video search results
export const YoutubeSearchResponse: React.FC<{
  query: string;
  videos: Array<{
    videoId: string;
    title: string;
    description: string;
    channelTitle: string;
  }>;
  executionTime: string;
  metadata?: any;
}> = ({ query, videos, executionTime, metadata }) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleVideoPress = async (videoId: string) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      await Linking.openURL(youtubeUrl);
    } catch (error) {
      console.error('Failed to open YouTube video:', error);
    }
  };

  const displayVideos = isExpanded ? videos : videos.slice(0, 3);

  return (
    <View className={cn(
      "mt-3 p-4 rounded-xl border",
      isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
    )}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">🎥</Text>
          <Text className={cn(
            "font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            YouTube Videos
          </Text>
        </View>
        
        <View className={cn(
          "px-2 py-1 rounded-full",
          isDark ? "bg-red-900/30" : "bg-red-100"
        )}>
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-red-300" : "text-red-700"
          )}>
            {videos.length} videos
          </Text>
        </View>
      </View>

      {/* Query */}
      <Text className={cn(
        "text-sm mb-3 italic",
        isDark ? "text-gray-300" : "text-gray-600"
      )}>
        "{query}"
      </Text>

      {/* Video Results */}
      <View className="space-y-3">
        {displayVideos.map((video, index) => (
          <TouchableOpacity 
            key={video.videoId}
            onPress={() => handleVideoPress(video.videoId)}
            className={cn(
              "p-3 rounded-lg border",
              isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
            )}
          >
            <Text className={cn(
              "font-medium mb-1",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {video.title}
            </Text>
            <Text className={cn(
              "text-xs mb-2",
              isDark ? "text-blue-300" : "text-blue-600"
            )}>
              📺 {video.channelTitle}
            </Text>
            {video.description && (
              <Text className={cn(
                "text-sm",
                isDark ? "text-gray-300" : "text-gray-600"
              )}>
                {video.description.length > 120 
                  ? video.description.substring(0, 120) + '...'
                  : video.description
                }
              </Text>
            )}
            <Text className={cn(
              "text-xs mt-2",
              isDark ? "text-blue-300" : "text-blue-600"
            )}>
              🔗 Tap to watch on YouTube
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Expand/Collapse Button */}
      {videos.length > 3 && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          className={cn(
            "mt-3 p-2 rounded-lg border",
            isDark ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200"
          )}
        >
          <Text className={cn(
            "text-sm text-center font-medium",
            isDark ? "text-red-300" : "text-red-600"
          )}>
            {isExpanded ? '▲ Show Less' : `▼ Show ${videos.length - 3} More Videos`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <Text className={cn(
        "text-xs mt-3 text-center",
        isDark ? "text-gray-400" : "text-gray-500"
      )}>
        Search completed in {executionTime} • Powered by YouTube Agent
      </Text>
    </View>
  );
};

// n8n Agent Status Indicator - Shows agent processing status
export const N8nAgentStatusIndicator: React.FC<{
  agent: string;
  action: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
}> = ({ agent, action, status, progress }) => {
  const { isDark } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'processing': return isDark ? "text-yellow-300" : "text-yellow-600";
      case 'completed': return isDark ? "text-green-300" : "text-green-600";  
      case 'failed': return isDark ? "text-red-300" : "text-red-600";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing': return '⏳';
      case 'completed': return '✅';
      case 'failed': return '❌';
    }
  };

  const getStatusBackground = () => {
    switch (status) {
      case 'processing': return isDark ? "bg-yellow-900/20" : "bg-yellow-50";
      case 'completed': return isDark ? "bg-green-900/20" : "bg-green-50";
      case 'failed': return isDark ? "bg-red-900/20" : "bg-red-50";
    }
  };

  return (
    <View className={cn(
      "flex-row items-center justify-between p-3 rounded-lg border",
      getStatusBackground(),
      isDark ? "border-gray-600" : "border-gray-200"
    )}>
      <View className="flex-row items-center gap-2">
        <Text className="text-sm">{getStatusIcon()}</Text>
        <Text className={cn("text-sm font-medium", getStatusColor())}>
          {agent}
        </Text>
        <Text className={cn(
          "text-sm",
          isDark ? "text-gray-300" : "text-gray-600"
        )}>
          {status === 'processing' ? 'is working on' : status} {action.replace(/_/g, ' ')}
        </Text>
      </View>
      
      {/* Progress indicator for processing */}
      {status === 'processing' && progress !== undefined && (
        <View className="flex-row items-center gap-2">
          <Text className={cn(
            "text-xs",
            isDark ? "text-gray-400" : "text-gray-500"
          )}>
            {Math.round(progress)}%
          </Text>
          <View className={cn(
            "w-16 h-2 rounded-full",
            isDark ? "bg-gray-600" : "bg-gray-200"
          )}>
            <View 
              className={cn(
                "h-full rounded-full",
                isDark ? "bg-yellow-400" : "bg-yellow-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
      )}
    </View>
  );
};

// Workflow Coordination Response - Shows multi-service automation results
export const WorkflowCoordinationResponse: React.FC<{
  workflow: {
    name: string;
    steps: Array<{
      service: string;
      action: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      result?: any;
    }>;
    overallStatus: 'processing' | 'completed' | 'failed';
    executionTime: string;
  };
  metadata?: any;
}> = ({ workflow, metadata }) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const getStepIcon = (service: string) => {
    const icons = {
      'email': '📧',
      'calendar': '📅',
      'contact': '👥',
      'task': '✅',
      'web': '🌐',
      'youtube': '🎥',
    };
    return icons[service.toLowerCase()] || '⚙️';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'pending': '⏳',
      'processing': '🔄',
      'completed': '✅',
      'failed': '❌',
    };
    return icons[status] || '❓';
  };

  const getOverallStatusColor = () => {
    switch (workflow.overallStatus) {
      case 'processing': return isDark ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200";
      case 'completed': return isDark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200";
      case 'failed': return isDark ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200";
    }
  };

  return (
    <View className={cn(
      "mt-3 p-4 rounded-xl border",
      getOverallStatusColor()
    )}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">🔗</Text>
          <Text className={cn(
            "font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            {workflow.name}
          </Text>
        </View>
        
        <Text className={cn(
          "text-xs font-medium",
          isDark ? "text-blue-300" : "text-blue-600"
        )}>
          🤖 Workflow Agent
        </Text>
      </View>

      {/* Workflow Steps */}
      <View className="space-y-2">
        {(isExpanded ? workflow.steps : workflow.steps.slice(0, 2)).map((step, index) => (
          <View 
            key={index}
            className={cn(
              "flex-row items-center justify-between p-2 rounded-lg",
              isDark ? "bg-gray-700" : "bg-white"
            )}
          >
            <View className="flex-row items-center gap-2 flex-1">
              <Text className="text-sm">{getStepIcon(step.service)}</Text>
              <Text className={cn(
                "text-sm font-medium",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {step.service}
              </Text>
              <Text className={cn(
                "text-sm",
                isDark ? "text-gray-300" : "text-gray-600"
              )}>
                {step.action.replace(/_/g, ' ')}
              </Text>
            </View>
            
            <Text className="text-sm">{getStatusIcon(step.status)}</Text>
          </View>
        ))}
      </View>

      {/* Expand/Collapse Button */}
      {workflow.steps.length > 2 && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          className="mt-3"
        >
          <Text className={cn(
            "text-sm text-center font-medium",
            isDark ? "text-blue-300" : "text-blue-600"
          )}>
            {isExpanded ? '▲ Show Less' : `▼ Show ${workflow.steps.length - 2} More Steps`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <Text className={cn(
        "text-xs mt-3 text-center",
        isDark ? "text-gray-400" : "text-gray-500"
      )}>
        Workflow {workflow.overallStatus} in {workflow.executionTime}
      </Text>
    </View>
  );
};

// Generic n8n Agent Response Container
export const N8nAgentResponseContainer: React.FC<{
  agent: string;
  action: string;
  success: boolean;
  executionTime: string;
  children: React.ReactNode;
  metadata?: any;
}> = ({ agent, action, success, executionTime, children, metadata }) => {
  const { isDark } = useTheme();

  const getAgentIcon = (agentName: string) => {
    const icons = {
      'Email Agent': '📧',
      'Calendar Agent': '📅', 
      'Contact Agent': '👥',
      'Web Agent': '🌐',
      'YouTube Agent': '🎥',
    };
    return icons[agentName] || '🤖';
  };

  return (
    <View className={cn(
      "mt-3 p-4 rounded-xl border",
      success 
        ? (isDark ? "bg-green-900/20 border-green-700" : "bg-green-50 border-green-200")
        : (isDark ? "bg-red-900/20 border-red-700" : "bg-red-50 border-red-200")
    )}>
      {/* Agent Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">{getAgentIcon(agent)}</Text>
          <Text className={cn(
            "font-semibold",
            isDark ? "text-white" : "text-gray-900"
          )}>
            {agent}
          </Text>
        </View>
        
        <View className={cn(
          "px-2 py-1 rounded-full",
          success 
            ? (isDark ? "bg-green-900/50" : "bg-green-100")
            : (isDark ? "bg-red-900/50" : "bg-red-100")
        )}>
          <Text className={cn(
            "text-xs font-medium",
            success
              ? (isDark ? "text-green-300" : "text-green-700") 
              : (isDark ? "text-red-300" : "text-red-700")
          )}>
            {success ? '✅ Success' : '❌ Failed'}
          </Text>
        </View>
      </View>

      {/* Action */}
      <Text className={cn(
        "text-sm mb-3 font-medium",
        isDark ? "text-gray-300" : "text-gray-600"
      )}>
        {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Text>

      {/* Content */}
      {children}

      {/* Footer */}
      <View className="flex-row justify-between items-center mt-3">
        <Text className={cn(
          "text-xs",
          isDark ? "text-gray-400" : "text-gray-500"
        )}>
          Execution time: {executionTime}
        </Text>
        
        <Text className={cn(
          "text-xs font-medium",
          isDark ? "text-blue-300" : "text-blue-600"
        )}>
          🤖 AI Agent
        </Text>
      </View>
    </View>
  );
};
