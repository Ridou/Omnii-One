import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { 
  ProfileState, 
  ProductivityDNA, 
  AIPersona, 
  IntegrationService,
  ProfileMilestone,
  ProfileTab,
  EnergyData,
  CommunicationPrefs,
  GoalHierarchy,
  IntelligentNotifications,
  LearningSettings,
  TeamSyncSettings,
  PrivacySettings,
  MascotCustomization,
  CustomWorkflow,
  ThemeSettings
} from '~/types/profile';

// Default milestones based on profile.mdc plan
const DEFAULT_MILESTONES: ProfileMilestone[] = [
  {
    id: 'self-discovery',
    title: 'Self-Discovery',
    description: 'Complete full work style assessment',
    xpReward: 75,
    progress: 0,
    maxProgress: 1,
    completed: false,
    category: 'discovery',
    unlocksAt: 'seed'
  },
  {
    id: 'integration-master',
    title: 'Integration Master',
    description: 'Connect 5+ productivity tools successfully',
    xpReward: 125,
    progress: 0,
    maxProgress: 5,
    completed: false,
    category: 'integration',
    unlocksAt: 'seed'
  },
  {
    id: 'privacy-guardian',
    title: 'Privacy Guardian',
    description: 'Thoughtfully customize all privacy settings',
    xpReward: 100,
    progress: 0,
    maxProgress: 8, // 8 privacy settings
    completed: false,
    category: 'privacy',
    unlocksAt: 'seed'
  },
  {
    id: 'team-player',
    title: 'Team Player',
    description: 'Share anonymized productivity insights with colleagues',
    xpReward: 200,
    progress: 0,
    maxProgress: 1,
    completed: false,
    category: 'team',
    unlocksAt: 'flower'
  },
  {
    id: 'personalization-pro',
    title: 'Personalization Pro',
    description: 'Customize AI personality and workflow preferences',
    xpReward: 150,
    progress: 0,
    maxProgress: 6, // 6 AI personality settings
    completed: false,
    category: 'personalization',
    unlocksAt: 'seed'
  },
  {
    id: 'setup-sage',
    title: 'Setup Sage',
    description: 'Help 3 colleagues optimize their OMNII profiles',
    xpReward: 250,
    progress: 0,
    maxProgress: 3,
    completed: false,
    category: 'team',
    unlocksAt: 'tree'
  }
];

// Initial state
const initialState: ProfileState = {
  integrations: [],
  workflows: [],
  milestones: DEFAULT_MILESTONES,
  currentXP: 0,
  level: 1,
  mascotStage: 'seed',
  theme: {
    colorScheme: 'light',
    fontSize: 'medium',
    reducedMotion: false,
    voiceControls: false,
    screenReaderOptimized: false,
    hapticFeedback: 'light',
    colorBlindSupport: false
  }
};

// Action types
type ProfileAction = 
  | { type: 'UPDATE_DNA'; payload: Partial<ProductivityDNA> }
  | { type: 'UPDATE_ENERGY_DATA'; payload: Partial<EnergyData> }
  | { type: 'UPDATE_COMMUNICATION_PREFS'; payload: Partial<CommunicationPrefs> }
  | { type: 'UPDATE_GOAL_HIERARCHY'; payload: Partial<GoalHierarchy> }
  | { type: 'UPDATE_AI_PERSONA'; payload: Partial<AIPersona> }
  | { type: 'UPDATE_NOTIFICATIONS'; payload: Partial<IntelligentNotifications> }
  | { type: 'UPDATE_LEARNING_SETTINGS'; payload: Partial<LearningSettings> }
  | { type: 'ADD_INTEGRATION'; payload: IntegrationService }
  | { type: 'UPDATE_INTEGRATION'; payload: { id: string; updates: Partial<IntegrationService> } }
  | { type: 'REMOVE_INTEGRATION'; payload: string }
  | { type: 'UPDATE_TEAM_SYNC'; payload: Partial<TeamSyncSettings> }
  | { type: 'UPDATE_PRIVACY'; payload: Partial<PrivacySettings> }
  | { type: 'UPDATE_MASCOT'; payload: Partial<MascotCustomization> }
  | { type: 'ADD_WORKFLOW'; payload: CustomWorkflow }
  | { type: 'UPDATE_WORKFLOW'; payload: { id: string; updates: Partial<CustomWorkflow> } }
  | { type: 'REMOVE_WORKFLOW'; payload: string }
  | { type: 'UPDATE_THEME'; payload: Partial<ThemeSettings> }
  | { type: 'AWARD_XP'; payload: { amount: number; reason: string; category: string } }
  | { type: 'UPDATE_MILESTONE'; payload: { id: string; progress: number } }
  | { type: 'COMPLETE_MILESTONE'; payload: string }
  | { type: 'LOAD_STATE'; payload: Partial<ProfileState> }
  | { type: 'RESET_PROFILE' };

// Reducer
function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'UPDATE_DNA':
      return {
        ...state,
        productivityDNA: { ...state.productivityDNA, ...action.payload } as ProductivityDNA
      };
    
    case 'UPDATE_ENERGY_DATA':
      return {
        ...state,
        energyData: { ...state.energyData, ...action.payload } as EnergyData
      };
    
    case 'UPDATE_COMMUNICATION_PREFS':
      return {
        ...state,
        communicationPrefs: { ...state.communicationPrefs, ...action.payload } as CommunicationPrefs
      };
    
    case 'UPDATE_GOAL_HIERARCHY':
      return {
        ...state,
        goalHierarchy: { ...state.goalHierarchy, ...action.payload } as GoalHierarchy
      };
    
    case 'UPDATE_AI_PERSONA':
      return {
        ...state,
        aiPersona: { ...state.aiPersona, ...action.payload } as AIPersona
      };
    
    case 'UPDATE_NOTIFICATIONS':
      return {
        ...state,
        notifications: { ...state.notifications, ...action.payload } as IntelligentNotifications
      };
    
    case 'UPDATE_LEARNING_SETTINGS':
      return {
        ...state,
        learningSettings: { ...state.learningSettings, ...action.payload } as LearningSettings
      };
    
    case 'ADD_INTEGRATION':
      return {
        ...state,
        integrations: [...state.integrations, action.payload]
      };
    
    case 'UPDATE_INTEGRATION':
      return {
        ...state,
        integrations: state.integrations.map(integration =>
          integration.id === action.payload.id
            ? { ...integration, ...action.payload.updates }
            : integration
        )
      };
    
    case 'REMOVE_INTEGRATION':
      return {
        ...state,
        integrations: state.integrations.filter(integration => integration.id !== action.payload)
      };
    
    case 'UPDATE_TEAM_SYNC':
      return {
        ...state,
        teamSync: { ...state.teamSync, ...action.payload } as TeamSyncSettings
      };
    
    case 'UPDATE_PRIVACY':
      return {
        ...state,
        privacy: { ...state.privacy, ...action.payload } as PrivacySettings
      };
    
    case 'UPDATE_MASCOT':
      return {
        ...state,
        mascot: { ...state.mascot, ...action.payload } as MascotCustomization
      };
    
    case 'ADD_WORKFLOW':
      return {
        ...state,
        workflows: [...state.workflows, action.payload]
      };
    
    case 'UPDATE_WORKFLOW':
      return {
        ...state,
        workflows: state.workflows.map(workflow =>
          workflow.id === action.payload.id
            ? { ...workflow, ...action.payload.updates }
            : workflow
        )
      };
    
    case 'REMOVE_WORKFLOW':
      return {
        ...state,
        workflows: state.workflows.filter(workflow => workflow.id !== action.payload)
      };
    
    case 'UPDATE_THEME':
      return {
        ...state,
        theme: { ...state.theme, ...action.payload } as ThemeSettings
      };
    
    case 'AWARD_XP': {
      const newXP = state.currentXP + action.payload.amount;
      const newLevel = Math.floor(newXP / 100) + 1; // Every 100 XP = 1 level
      const newMascotStage = newLevel <= 10 ? 'seed' : newLevel <= 25 ? 'flower' : 'tree';
      
      return {
        ...state,
        currentXP: newXP,
        level: newLevel,
        mascotStage: newMascotStage
      };
    }
    
    case 'UPDATE_MILESTONE':
      return {
        ...state,
        milestones: state.milestones.map(milestone =>
          milestone.id === action.payload.id
            ? { ...milestone, progress: action.payload.progress }
            : milestone
        )
      };
    
    case 'COMPLETE_MILESTONE': {
      const milestone = state.milestones.find(m => m.id === action.payload);
      if (!milestone || milestone.completed) return state;
      
      const updatedMilestones = state.milestones.map(m =>
        m.id === action.payload
          ? { ...m, completed: true, progress: m.maxProgress, completedAt: new Date() }
          : m
      );
      
      // Award XP for milestone completion
      const newXP = state.currentXP + milestone.xpReward;
      const newLevel = Math.floor(newXP / 100) + 1;
      const newMascotStage = newLevel <= 10 ? 'seed' : newLevel <= 25 ? 'flower' : 'tree';
      
      return {
        ...state,
        milestones: updatedMilestones,
        currentXP: newXP,
        level: newLevel,
        mascotStage: newMascotStage
      };
    }
    
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    
    case 'RESET_PROFILE':
      return initialState;
    
    default:
      return state;
  }
}

// Context interface
interface ProfileContextValue {
  state: ProfileState;
  updateDNA: (dna: Partial<ProductivityDNA>) => void;
  updateEnergyData: (data: Partial<EnergyData>) => void;
  updateCommunicationPrefs: (prefs: Partial<CommunicationPrefs>) => void;
  updateGoalHierarchy: (hierarchy: Partial<GoalHierarchy>) => void;
  updateAIPersona: (persona: Partial<AIPersona>) => void;
  updateNotifications: (notifications: Partial<IntelligentNotifications>) => void;
  updateLearningSettings: (settings: Partial<LearningSettings>) => void;
  addIntegration: (integration: IntegrationService) => void;
  updateIntegration: (id: string, updates: Partial<IntegrationService>) => void;
  removeIntegration: (id: string) => void;
  updateTeamSync: (settings: Partial<TeamSyncSettings>) => void;
  updatePrivacy: (settings: Partial<PrivacySettings>) => void;
  updateMascot: (customization: Partial<MascotCustomization>) => void;
  addWorkflow: (workflow: CustomWorkflow) => void;
  updateWorkflow: (id: string, updates: Partial<CustomWorkflow>) => void;
  removeWorkflow: (id: string) => void;
  updateTheme: (theme: Partial<ThemeSettings>) => void;
  awardXP: (amount: number, reason: string, category: string) => void;
  updateMilestone: (id: string, progress: number) => void;
  completeMilestone: (id: string) => void;
  resetProfile: () => void;
}

// Create context
const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

// Provider component
interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [state, dispatch] = useReducer(profileReducer, initialState);

  // Load state from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await AsyncStorage.getItem('@omnii_profile_state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          dispatch({ type: 'LOAD_STATE', payload: parsedState });
        }
      } catch (error) {
      }
    };
    
    loadState();
  }, []);

  // Save state to AsyncStorage whenever it changes
  useEffect(() => {
    const saveState = async () => {
      try {
        await AsyncStorage.setItem('@omnii_profile_state', JSON.stringify(state));
      } catch (error) {
      }
    };
    
    saveState();
  }, [state]);

  // Context value
  const value: ProfileContextValue = {
    state,
    updateDNA: (dna) => dispatch({ type: 'UPDATE_DNA', payload: dna }),
    updateEnergyData: (data) => dispatch({ type: 'UPDATE_ENERGY_DATA', payload: data }),
    updateCommunicationPrefs: (prefs) => dispatch({ type: 'UPDATE_COMMUNICATION_PREFS', payload: prefs }),
    updateGoalHierarchy: (hierarchy) => dispatch({ type: 'UPDATE_GOAL_HIERARCHY', payload: hierarchy }),
    updateAIPersona: (persona) => dispatch({ type: 'UPDATE_AI_PERSONA', payload: persona }),
    updateNotifications: (notifications) => dispatch({ type: 'UPDATE_NOTIFICATIONS', payload: notifications }),
    updateLearningSettings: (settings) => dispatch({ type: 'UPDATE_LEARNING_SETTINGS', payload: settings }),
    addIntegration: (integration) => dispatch({ type: 'ADD_INTEGRATION', payload: integration }),
    updateIntegration: (id, updates) => dispatch({ type: 'UPDATE_INTEGRATION', payload: { id, updates } }),
    removeIntegration: (id) => dispatch({ type: 'REMOVE_INTEGRATION', payload: id }),
    updateTeamSync: (settings) => dispatch({ type: 'UPDATE_TEAM_SYNC', payload: settings }),
    updatePrivacy: (settings) => dispatch({ type: 'UPDATE_PRIVACY', payload: settings }),
    updateMascot: (customization) => dispatch({ type: 'UPDATE_MASCOT', payload: customization }),
    addWorkflow: (workflow) => dispatch({ type: 'ADD_WORKFLOW', payload: workflow }),
    updateWorkflow: (id, updates) => dispatch({ type: 'UPDATE_WORKFLOW', payload: { id, updates } }),
    removeWorkflow: (id) => dispatch({ type: 'REMOVE_WORKFLOW', payload: id }),
    updateTheme: (theme) => dispatch({ type: 'UPDATE_THEME', payload: theme }),
    awardXP: (amount, reason, category) => dispatch({ type: 'AWARD_XP', payload: { amount, reason, category } }),
    updateMilestone: (id, progress) => dispatch({ type: 'UPDATE_MILESTONE', payload: { id, progress } }),
    completeMilestone: (id) => dispatch({ type: 'COMPLETE_MILESTONE', payload: id }),
    resetProfile: () => dispatch({ type: 'RESET_PROFILE' })
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

// Hook to use profile context
export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
} 