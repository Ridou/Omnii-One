import { useState, useEffect, useCallback } from 'react';
import type { AnalyticsData } from '~/types/analytics';

// Mock analytics data following exact pattern from useFetchApprovals.ts
const mockAnalyticsData: AnalyticsData = {
  todayMetrics: {
    tasksCompleted: 8,
    hoursFocused: 5.2,
    xpEarned: 340,
    efficiencyScore: 87,
    currentStreak: 120,
    bestStreak: 180
  },
  energyCurve: [
    { hour: 6, energy: 20, productivity: 15, focusQuality: 10 },
    { hour: 7, energy: 40, productivity: 35, focusQuality: 30 },
    { hour: 8, energy: 65, productivity: 70, focusQuality: 75 },
    { hour: 9, energy: 95, productivity: 98, focusQuality: 95 },
    { hour: 10, energy: 98, productivity: 95, focusQuality: 90 },
    { hour: 11, energy: 85, productivity: 88, focusQuality: 85 },
    { hour: 12, energy: 70, productivity: 65, focusQuality: 60 },
    { hour: 13, energy: 60, productivity: 55, focusQuality: 50 },
    { hour: 14, energy: 75, productivity: 80, focusQuality: 75 },
    { hour: 15, energy: 85, productivity: 82, focusQuality: 80 },
    { hour: 16, energy: 80, productivity: 75, focusQuality: 70 },
    { hour: 17, energy: 65, productivity: 60, focusQuality: 55 },
    { hour: 18, energy: 45, productivity: 40, focusQuality: 35 },
    { hour: 19, energy: 35, productivity: 30, focusQuality: 25 },
    { hour: 20, energy: 25, productivity: 20, focusQuality: 15 },
    { hour: 21, energy: 15, productivity: 10, focusQuality: 5 },
    { hour: 22, energy: 10, productivity: 5, focusQuality: 0 },
    { hour: 23, energy: 5, productivity: 0, focusQuality: 0 },
  ],
  focusStreaks: [
    { startTime: '09:00', duration: 120, quality: 95 },
    { startTime: '14:30', duration: 90, quality: 82 },
    { startTime: '16:00', duration: 45, quality: 70 },
  ],
  weeklyPatterns: [
    { day: 'Monday', productivity: 75, energy: 70, focus: 80, taskCompletion: 85 },
    { day: 'Tuesday', productivity: 95, energy: 85, focus: 90, taskCompletion: 92 },
    { day: 'Wednesday', productivity: 85, energy: 80, focus: 88, taskCompletion: 87 },
    { day: 'Thursday', productivity: 90, energy: 88, focus: 85, taskCompletion: 89 },
    { day: 'Friday', productivity: 70, energy: 65, focus: 75, taskCompletion: 78 },
    { day: 'Saturday', productivity: 40, energy: 45, focus: 35, taskCompletion: 42 },
    { day: 'Sunday', productivity: 30, energy: 35, focus: 25, taskCompletion: 28 },
  ],
  aiInsights: [
    {
      id: '1',
      type: 'pattern',
      title: '📅 Weekly Pattern Detected',
      message: "You're 40% more focused on Tuesdays - should we block more deep work then?",
      confidence: 92,
      action: 'Schedule Deep Work',
      impact: 'high',
      sources: ['Calendar data', 'Task completion', 'Energy tracking'],
      suggestions: [
        'Block 2-3 hour focus sessions on Tuesday mornings',
        'Move routine meetings away from Tuesdays',
        'Set Tuesday as your primary creative work day'
      ]
    },
    {
      id: '2',
      type: 'suggestion',
      title: '⚡ Optimization Opportunity',
      message: 'Moving your meetings to afternoons could save 2.5 hours of peak focus time weekly',
      confidence: 85,
      action: 'Reschedule Meetings',
      impact: 'high',
      sources: ['Calendar analysis', 'Energy curve data', 'Productivity metrics'],
      suggestions: [
        'Schedule meetings after 2 PM when energy naturally dips',
        'Keep mornings free for deep work tasks',
        'Batch similar meetings together'
      ]
    },
    {
      id: '3',
      type: 'prediction',
      title: '🔮 Tomorrow\'s Forecast',
      message: 'Based on your calendar, tomorrow will be challenging. Here\'s how to prep:',
      confidence: 78,
      action: 'View Prep Plan',
      impact: 'medium',
      sources: ['Calendar events', 'Historical patterns', 'Task complexity'],
      suggestions: [
        'Block 30min morning focus time before first meeting',
        'Prepare meeting notes tonight',
        'Set priority reminders for key tasks'
      ]
    },
    {
      id: '4',
      type: 'bottleneck',
      title: '🚧 Productivity Bottleneck',
      message: 'Email checking is interrupting your flow 12 times daily',
      confidence: 96,
      action: 'Set Email Batches',
      impact: 'medium',
      sources: ['App usage data', 'Focus session interruptions', 'Task switching analysis'],
      suggestions: [
        'Check email only at 9 AM, 1 PM, and 5 PM',
        'Turn off email notifications during focus blocks',
        'Use auto-responses to set expectations'
      ]
    }
  ],
  predictions: [
    {
      id: 'p1',
      type: 'energy',
      timeframe: 'tomorrow',
      prediction: 'Low energy expected due to packed schedule',
      confidence: 82,
      preparationSuggestions: [
        'Get extra sleep tonight',
        'Prepare healthy snacks',
        'Block short break times'
      ]
    }
  ],
  bottlenecks: [
    {
      category: 'Email Interruptions',
      impact: 4.2,
      frequency: 12,
      aiSuggestion: 'Implement batched email checking',
      actionable: true
    },
    {
      category: 'Context Switching',
      impact: 3.8,
      frequency: 8,
      aiSuggestion: 'Group similar tasks together',
      actionable: true
    }
  ],
  distractions: [
    {
      source: 'Social Media',
      frequency: 15,
      avgDuration: 8,
      impactScore: 65
    },
    {
      source: 'Instant Messages',
      frequency: 25,
      avgDuration: 3,
      impactScore: 45
    }
  ]
};

export function useFetchAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call (identical pattern to useFetchApprovals)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAnalytics(mockAnalyticsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
} 