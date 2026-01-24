import { Alert } from 'react-native';
import { checkGoogleTokenStatus, initiateGoogleOAuth } from './googleIntegration';

export class AIFeatureGuard {
  /**
   * Ensure Google access is available for features that require it
   */
  async ensureGoogleAccess(featureId: string): Promise<boolean> {
    try {
      
      const status = await checkGoogleTokenStatus();
      
      if (!status.isValid && this.requiresGoogle(featureId)) {
        
        const shouldConnect = await this.showGooglePrompt(featureId);
        if (shouldConnect) {
          try {
            await initiateGoogleOAuth();
            // Re-check status after connection attempt
            const newStatus = await checkGoogleTokenStatus();
            
            if (newStatus.isValid) {
              return true;
            } else {
              return false;
            }
          } catch (error) {
            return false;
          }
        } else {
          throw new Error(`Google Workspace access is required for ${this.getFeatureName(featureId)}`);
        }
      }
      
      return true;
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a feature requires Google workspace access
   */
  private requiresGoogle(featureId: string): boolean {
    const googleFeatures = [
      'email-analysis',
      'email-processing',
      'email-tasks',
      'calendar-optimization',
      'calendar-scheduling',
      'calendar-events',
      'task-sync',
      'task-import',
      'contact-management',
      'gmail-compose',
      'gmail-send'
    ];
    
    return googleFeatures.includes(featureId);
  }

  /**
   * Get user-friendly feature name
   */
  private getFeatureName(featureId: string): string {
    const featureNames: Record<string, string> = {
      'email-analysis': 'Email Analysis',
      'email-processing': 'Email Processing',
      'email-tasks': 'Email Task Extraction',
      'calendar-optimization': 'Calendar Optimization',
      'calendar-scheduling': 'Smart Scheduling',
      'calendar-events': 'Calendar Management',
      'task-sync': 'Task Synchronization',
      'task-import': 'Task Import',
      'contact-management': 'Contact Management',
      'gmail-compose': 'Gmail Compose',
      'gmail-send': 'Gmail Send'
    };
    
    return featureNames[featureId] || featureId;
  }

  /**
   * Show prompt to user asking if they want to connect Google
   */
  private async showGooglePrompt(featureId: string): Promise<boolean> {
    const featureName = this.getFeatureName(featureId);
    
    return new Promise((resolve) => {
      Alert.alert(
        'Connect Google Workspace',
        `${featureName} requires access to your Google account. Would you like to connect now?`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => resolve(false) 
          },
          { 
            text: 'Connect', 
            style: 'default',
            onPress: () => resolve(true) 
          }
        ]
      );
    });
  }

  /**
   * Show informational prompt about Google integration benefits
   */
  async showIntegrationBenefits(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Unlock AI Features',
                 'Connect your Google Workspace to enable:\n\n• Smart email processing\n• Calendar optimization\n• Task synchronization\n• Contact management',
        [
          { 
            text: 'Maybe Later', 
            style: 'cancel',
            onPress: () => resolve(false) 
          },
          { 
            text: 'Connect Now', 
            style: 'default',
            onPress: () => resolve(true) 
          }
        ]
      );
    });
  }

  /**
   * Quick check if Google is connected (no prompts)
   */
  async isGoogleConnected(): Promise<boolean> {
    try {
      const status = await checkGoogleTokenStatus();
      return status.isValid;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const aiFeatureGuard = new AIFeatureGuard(); 