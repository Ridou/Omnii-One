// Analytics System Types - Following profile.ts pattern

export interface AnalyticsData {
  todayMetrics: TodayMetrics;
  energyCurve: EnergyDataPoint[];
  focusStreaks: FocusStreak[];
  weeklyPatterns: WeeklyPattern[];
  aiInsights: AIInsight[];
  predictions: Prediction[];
  bottlenecks: BottleneckAnalysis[];
  distractions: DistractionData[];
}

export interface TodayMetrics {
  tasksCompleted: number;
  hoursFocused: number;
  xpEarned: number;
  efficiencyScore: number; // 0-100 AI-calculated
  currentStreak: number;
  bestStreak: number;
}

export interface EnergyDataPoint {
  hour: number; // 0-23
  energy: number; // 0-100
  productivity: number; // 0-100
  focusQuality: number; // 0-100
}

export interface FocusStreak {
  startTime: string;
  duration: number; // minutes
  quality: number; // 0-100
}

export interface AIInsight {
  id: string;
  type: 'pattern' | 'suggestion' | 'prediction' | 'bottleneck';
  title: string;
  message: string;
  confidence: number; // 0-100
  action?: string;
  impact?: 'low' | 'medium' | 'high';
  sources: string[];
  suggestions?: string[];
  dismissed?: boolean;
}

export interface WeeklyPattern {
  day: string;
  productivity: number;
  energy: number;
  focus: number;
  taskCompletion: number;
}

export interface Prediction {
  id: string;
  type: 'energy' | 'productivity' | 'challenges';
  timeframe: 'tomorrow' | 'week' | 'month';
  prediction: string;
  confidence: number;
  preparationSuggestions: string[];
}

export interface BottleneckAnalysis {
  category: string;
  impact: number; // hours lost per week
  frequency: number; // occurrences per week
  aiSuggestion: string;
  actionable: boolean;
}

export interface DistractionData {
  source: string;
  frequency: number; // per day
  avgDuration: number; // minutes
  impactScore: number; // 0-100
}

export type AnalyticsTab = 'dashboard' | 'insights' | 'trends' | 'reports';

export interface AnalyticsTabConfig {
  key: AnalyticsTab;
  label: string;
  icon: string;
  gradient: [string, string];
} 