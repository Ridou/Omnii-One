// Profile System Types - Based on profile.mdc implementation plan

export interface ProductivityDNA {
  workStyle: 'analytical' | 'creative' | 'collaborative' | 'independent';
  energyPattern: 'morning' | 'afternoon' | 'evening' | 'flexible';
  communicationStyle: 'direct' | 'detailed' | 'visual' | 'conversational';
  goalOrientation: 'achievement' | 'growth' | 'impact' | 'balance';
  workEnvironment: 'home' | 'office' | 'hybrid' | 'nomadic';
  focusPreference: 'deep_work' | 'multi_task' | 'collaborative' | 'flexible';
}

export interface EnergyData {
  peakHours: number[];
  lowEnergyHours: number[];
  preferredBreakTimes: number[];
  focusSessionLength: number;
  energyTriggers: string[];
  optimalWorkDuration: number;
}

export interface CommunicationPrefs {
  notificationStyle: 'immediate' | 'batched' | 'scheduled' | 'proactive';
  updateFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  preferredChannels: ('push' | 'email' | 'sms' | 'slack')[];
  quietHours: { start: number; end: number };
  urgencyOverride: boolean;
  contextualInterruptions: boolean;
  learningMode: 'aggressive' | 'balanced' | 'conservative';
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  timeHorizon: 'daily' | 'weekly' | 'monthly' | 'yearly';
  progress: number;
  completed: boolean;
}

export interface GoalHierarchy {
  primaryGoals: Goal[];
  secondaryGoals: Goal[];
  coreValues: string[];
  timeHorizons: { daily: Goal[], weekly: Goal[], monthly: Goal[], yearly: Goal[] };
  impactMetrics: string[];
  balancePreferences: { work: number, life: number, growth: number, health: number };
}

export interface AIPersona {
  coachingStyle: 'gentle' | 'firm' | 'motivational' | 'analytical' | 'adaptive';
  proactivityLevel: number; // 0-100 slider
  decisionAuthority: 'suggest' | 'decide_low_risk' | 'decide_medium_risk' | 'full_autonomy';
  languageTone: 'professional' | 'casual' | 'motivational' | 'friendly' | 'adaptive';
  personalityTraits: string[];
  learningAggressiveness: 'conservative' | 'balanced' | 'aggressive';
}

export interface IntelligentNotifications {
  contextAwareness: boolean;
  energyLevelDetection: boolean;
  calendarIntegration: boolean;
  locationAwareness: boolean;
  batchingRules: BatchingRule[];
  urgencyOverride: UrgencySettings;
  learningFromFeedback: boolean;
  predictiveScheduling: boolean;
}

export interface BatchingRule {
  id: string;
  name: string;
  conditions: string[];
  interval: number; // minutes
  maxBatchSize: number;
}

export interface UrgencySettings {
  enabled: boolean;
  highPriorityBypass: boolean;
  urgencyThreshold: number;
  escalationRules: string[];
}

export interface LearningSettings {
  dataSourcesEnabled: DataSource[];
  learningSpeed: 'slow' | 'medium' | 'fast';
  privacyLevel: 'minimal' | 'balanced' | 'full';
  feedbackSensitivity: number;
  behaviorAdaptation: boolean;
  crossPlatformLearning: boolean;
  anonymousInsights: boolean;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'calendar' | 'email' | 'tasks' | 'communication' | 'files';
  enabled: boolean;
  permissions: string[];
}

export interface IntegrationService {
  id: string;
  name: string;
  category: 'calendar' | 'email' | 'project' | 'communication' | 'storage';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  permissions: Permission[];
  lastSync: Date;
  dataFlow: 'read' | 'write' | 'bidirectional';
  aiIntegration: boolean;
  icon?: string;
  brandColor?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  granted: boolean;
  required: boolean;
}

export interface TeamSyncSettings {
  shareProductivityInsights: boolean;
  anonymizePersonalData: boolean;
  crossTeamLearning: boolean;
  mentorMode: boolean; // Tree-level feature
  collaborativeGoals: boolean;
  teamNudges: boolean;
  leaderboardParticipation: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  sharingStatus: 'active' | 'limited' | 'none';
}

export interface PrivacySettings {
  dataRetentionPeriod: number;
  personalDataSharing: 'none' | 'anonymized' | 'aggregated';
  crossPlatformSync: boolean;
  localDataProcessing: boolean;
  exportDataOption: boolean;
  deleteAccountOption: boolean;
  auditTrail: boolean;
  biometricProtection: boolean;
}

export interface MascotCustomization {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  personality: 'encouraging' | 'analytical' | 'playful' | 'wise';
  evolutionStyle: 'classic' | 'modern' | 'minimalist' | 'vibrant';
  celebrationStyle: 'subtle' | 'moderate' | 'enthusiastic';
}

export interface CustomWorkflow {
  id: string;
  name: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  conditions: WorkflowCondition[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'situational';
  aiLearning: boolean;
  enabled: boolean;
}

export interface WorkflowTrigger {
  id: string;
  type: 'time' | 'event' | 'condition' | 'manual';
  config: Record<string, string | number | boolean>;
}

export interface WorkflowAction {
  id: string;
  type: 'notification' | 'task_creation' | 'calendar_block' | 'ai_suggestion';
  config: Record<string, string | number | boolean>;
}

export interface WorkflowCondition {
  id: string;
  type: 'energy_level' | 'calendar_status' | 'location' | 'time_of_day';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number | boolean;
}

export interface ThemeSettings {
  colorScheme: 'light' | 'dark' | 'auto' | 'high_contrast';
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  reducedMotion: boolean;
  voiceControls: boolean;
  screenReaderOptimized: boolean;
  hapticFeedback: 'none' | 'light' | 'medium' | 'strong';
  colorBlindSupport: boolean;
}

export interface ProfileMilestone {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
  category: 'discovery' | 'integration' | 'privacy' | 'team' | 'personalization';
  unlocksAt?: 'seed' | 'flower' | 'tree';
  completedAt?: Date;
}

export interface ProfileState {
  productivityDNA?: ProductivityDNA;
  energyData?: EnergyData;
  communicationPrefs?: CommunicationPrefs;
  goalHierarchy?: GoalHierarchy;
  aiPersona?: AIPersona;
  notifications?: IntelligentNotifications;
  learningSettings?: LearningSettings;
  integrations: IntegrationService[];
  teamSync?: TeamSyncSettings;
  privacy?: PrivacySettings;
  mascot?: MascotCustomization;
  workflows: CustomWorkflow[];
  theme?: ThemeSettings;
  milestones: ProfileMilestone[];
  currentXP: number;
  level: number;
  mascotStage: 'seed' | 'flower' | 'tree';
}

export type ProfileTab = 'dna' | 'ai' | 'connect' | 'settings';

export interface TabConfig {
  key: ProfileTab;
  label: string;
  icon: string;
  gradient: [string, string];
} 