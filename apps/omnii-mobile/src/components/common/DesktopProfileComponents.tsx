import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useResponsiveDesign } from '~/utils/responsive';
import { useTheme } from '~/context/ThemeContext';
import { cn } from '~/utils/cn';
import ThemeSelector from '~/components/profile/ThemeSelector';
import DataManagement from '~/components/profile/DataManagement';

// Desktop Profile Content with Multi-Column Layout
interface DesktopProfileContentProps {
  selectedTab: string;
  level: number;
  user: any;
  state: any;
  currentXP: number;
  updateTheme: (theme: any) => void;
  handleLogout: () => void;
  renderTabContent: () => React.ReactNode;
}

export const DesktopProfileContent: React.FC<DesktopProfileContentProps> = ({
  selectedTab,
  level,
  user,
  state,
  currentXP,
  updateTheme,
  handleLogout,
  renderTabContent
}) => {
  const responsive = useResponsiveDesign();
  
  if (selectedTab === 'connect') {
    return (
      <View className="flex-row gap-8 h-full">
        {/* Left column - main integrations */}
        <View className="flex-2 min-w-0">
          <Text className="text-2xl font-bold mb-6">🔗 Connect Your Tools</Text>
          <View className="flex-row flex-wrap gap-6">
            <View className="flex-1 min-w-[350px]">
              <IntegrationCard
                title="Calendar Integration"
                description="Connect your calendar to optimize scheduling and task management."
                icon="📱"
                status="coming-soon"
                color="blue"
              />
            </View>
            <View className="flex-1 min-w-[350px]">
              <IntegrationCard
                title="Email Integration"
                description="Smart email processing and task extraction from your inbox."
                icon="✉️"
                status="coming-soon"
                color="green"
              />
            </View>
          </View>
        </View>
        
        {/* Right column - community */}
        <View className="flex-1 min-w-0">
          <Text className="text-xl font-bold mb-6">👥 Community</Text>
          {level >= 5 && (
            <View className="rounded-2xl p-6 border border-l-4 border-l-purple-500 bg-slate-800">
              <Text className="text-xl font-bold text-white mb-4">Join Our Community</Text>
              <Text className="text-slate-300 mb-6">Connect with other productivity enthusiasts!</Text>
              <TouchableOpacity className="bg-purple-600 px-6 py-4 rounded-xl">
                <Text className="text-white text-center font-bold">Join Discord →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }
  
  if (selectedTab === 'dna') {
    return (
      <View className="flex-row gap-8 h-full">
        {/* Left column - DNA profile */}
        <View className="flex-2 min-w-0">
          <DesktopDNAProfile level={level} />
        </View>
        
        {/* Right column - additional DNA features */}
        <View className="flex-1 min-w-0">
          <DesktopDNAFeatures />
        </View>
      </View>
    );
  }
  
  if (selectedTab === 'ai') {
    return (
      <View className="gap-6">
        <DesktopAITuning />
      </View>
    );
  }
  
  if (selectedTab === 'settings') {
    return (
      <View className="flex-row gap-8 h-full">
        {/* Left column - account settings */}
        <View className="flex-1 min-w-0">
          <DesktopAccountSettings user={user} level={level} currentXP={currentXP} handleLogout={handleLogout} />
        </View>
        
        {/* Right column - appearance and data */}
        <View className="flex-1 min-w-0">
          <DesktopAppearanceSettings state={state} updateTheme={updateTheme} />
        </View>
      </View>
    );
  }
  
  return (
    <View style={{ maxWidth: 1200, width: '100%' }}>
      {renderTabContent()}
    </View>
  );
};

// Basic Integration Card
const IntegrationCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  status: string;
  color: string;
}> = ({ title, description, icon, status, color }) => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "rounded-2xl p-6 border shadow-sm border-l-4 border-l-blue-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-4">
        <Text className="text-2xl mr-4">{icon}</Text>
        <Text className={cn(
          "text-xl font-bold",
          isDark ? "text-white" : "text-gray-900"
        )}>{title}</Text>
      </View>
      
      <Text className={cn(
        "text-sm leading-6 mb-4",
        isDark ? "text-slate-300" : "text-gray-600"
      )}>{description}</Text>
      
      <View className={cn(
        "px-3 py-2 rounded-lg self-start",
        isDark ? "bg-orange-900/20" : "bg-orange-100"
      )}>
        <Text className={cn(
          "text-xs font-semibold",
          isDark ? "text-orange-400" : "text-orange-700"
        )}>Coming Soon</Text>
      </View>
    </View>
  );
};

// Desktop DNA Profile
const DesktopDNAProfile: React.FC<{ level: number }> = ({ level }) => {
  const { isDark } = useTheme();
  
  return (
    <View>
      <Text className={cn(
        "text-2xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🧬 Your Productivity DNA</Text>
      
      <View className={cn(
        "rounded-2xl p-6 border shadow-sm border-l-4 border-l-indigo-500",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <View className="flex-row items-center mb-6">
          <View className={cn(
            "w-12 h-12 rounded-xl items-center justify-center mr-4",
            isDark ? "bg-indigo-900/30" : "bg-indigo-100"
          )}>
            <Text className="text-2xl">🧬</Text>
          </View>
          <View className="flex-1">
            <Text className={cn(
              "text-xl font-bold",
              isDark ? "text-white" : "text-gray-900"
            )}>Productivity Profile</Text>
            <Text className={cn(
              "text-sm font-medium",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>Generated from your inspiration preferences</Text>
          </View>
        </View>
        
        {level >= 2 ? (
          <View>
            <Text className={cn(
              "text-base leading-6 mb-6",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>
              Based on your quote responses, we&apos;ve crafted your unique productivity profile.
            </Text>
            
            <View className="grid grid-cols-2 gap-4 mb-6">
              <DNATraitCard trait="Work Style" value="Results-Oriented" color="blue" />
              <DNATraitCard trait="Energy Pattern" value="Morning Focused" color="green" />
              <DNATraitCard trait="Communication" value="Direct & Clear" color="purple" />
              <DNATraitCard trait="Goal Orientation" value="Achievement Driven" color="orange" />
            </View>
            
            <TouchableOpacity className="bg-indigo-600 hover:bg-indigo-700 px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg">
              <Text className="text-white text-base font-bold mr-2">Customize Your DNA</Text>
              <Text className="text-white text-base font-bold">→</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="items-center justify-center py-8">
            <View className={cn(
              "w-16 h-16 rounded-full items-center justify-center mb-4",
              isDark ? "bg-slate-700" : "bg-gray-100"
            )}>
              <Text className="text-2xl">🔒</Text>
            </View>
            <Text className={cn(
              "text-sm font-medium mb-2 text-center",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>
              Complete more daily inspiration to unlock your personalized DNA profile.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const DNATraitCard: React.FC<{
  trait: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}> = ({ trait, value, color }) => {
  const { isDark } = useTheme();
  
  const colorMap = {
    blue: isDark ? 'bg-blue-900/30' : 'bg-blue-100',
    green: isDark ? 'bg-green-900/30' : 'bg-green-100',
    purple: isDark ? 'bg-purple-900/30' : 'bg-purple-100',
    orange: isDark ? 'bg-orange-900/30' : 'bg-orange-100',
  };
  
  const textColorMap = {
    blue: isDark ? 'text-blue-400' : 'text-blue-700',
    green: isDark ? 'text-green-400' : 'text-green-700',
    purple: isDark ? 'text-purple-400' : 'text-purple-700',
    orange: isDark ? 'text-orange-400' : 'text-orange-700',
  };
  
  return (
    <View className={cn(
      "p-4 rounded-xl border",
      isDark ? "bg-slate-700/50 border-slate-600" : "bg-gray-50 border-gray-200"
    )}>
      <Text className={cn(
        "text-sm font-semibold mb-2",
        isDark ? "text-slate-300" : "text-gray-700"
      )}>{trait}:</Text>
      <View className={cn("px-3 py-2 rounded-lg", colorMap[color])}>
        <Text className={cn("text-sm font-medium text-center", textColorMap[color])}>
          {value}
        </Text>
      </View>
    </View>
  );
};

// Desktop DNA Features
const DesktopDNAFeatures: React.FC = () => {
  const { isDark } = useTheme();
  
  return (
    <View className="h-full">
      <Text className={cn(
        "text-xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🎯 DNA Features</Text>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="gap-4">
          <FeatureCard
            title="Energy Mapping"
            description="Map your energy patterns to optimize your daily schedule."
            icon="⚡"
            status="coming-soon"
          />
          <FeatureCard
            title="Goal Hierarchy"
            description="Set and prioritize your goals for maximum impact."
            icon="🎯"
            status="coming-soon"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const FeatureCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  status: 'coming-soon' | 'active';
}> = ({ title, description, icon, status }) => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "rounded-xl p-4 border",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-3">
        <Text className="text-lg mr-3">{icon}</Text>
        <Text className={cn(
          "font-semibold flex-1",
          isDark ? "text-white" : "text-gray-900"
        )}>{title}</Text>
      </View>
      <Text className={cn(
        "text-sm mb-3 leading-5",
        isDark ? "text-slate-400" : "text-gray-600"
      )}>{description}</Text>
      <View className={cn(
        "px-2 py-1 rounded self-start",
        isDark ? "bg-orange-900/20" : "bg-orange-100"
      )}>
        <Text className={cn(
          "text-xs font-semibold",
          isDark ? "text-orange-400" : "text-orange-700"
        )}>Coming Soon</Text>
      </View>
    </View>
  );
};

// Desktop AI Tuning
const DesktopAITuning: React.FC = () => {
  const { isDark } = useTheme();
  
  return (
    <View>
      <Text className={cn(
        "text-2xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🤖 AI Tuning</Text>
      
      <View className="flex-row gap-8">
        <View className="flex-1">
          <AIPersonaCard />
        </View>
        <View className="flex-1">
          <NotificationIntelligenceCard />
        </View>
      </View>
    </View>
  );
};

const AIPersonaCard: React.FC = () => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "rounded-2xl p-6 border shadow-sm border-l-4 border-l-indigo-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-6">
        <View className={cn(
          "w-12 h-12 rounded-xl items-center justify-center mr-4",
          isDark ? "bg-indigo-900/30" : "bg-indigo-100"
        )}>
          <Text className="text-2xl">🤖</Text>
        </View>
        <Text className={cn(
          "text-xl font-bold",
          isDark ? "text-white" : "text-gray-900"
        )}>AI Persona</Text>
      </View>
      
      <View className="space-y-6">
        <AISlider
          label="Communication Style"
          leftLabel="Casual"
          rightLabel="Professional"
          value={65}
          currentLabel="Balanced Professional"
        />
        <AISlider
          label="Response Length"
          leftLabel="Brief"
          rightLabel="Detailed"
          value={40}
          currentLabel="Concise"
        />
        <AISlider
          label="Proactivity Level"
          leftLabel="Reactive"
          rightLabel="Proactive"
          value={80}
          currentLabel="Highly Proactive"
        />
      </View>
    </View>
  );
};

const NotificationIntelligenceCard: React.FC = () => {
  const { isDark } = useTheme();
  
  return (
    <View className={cn(
      "rounded-2xl p-6 border shadow-sm border-l-4 border-l-green-500",
      isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
    )}>
      <View className="flex-row items-center mb-6">
        <View className={cn(
          "w-12 h-12 rounded-xl items-center justify-center mr-4",
          isDark ? "bg-green-900/30" : "bg-green-100"
        )}>
          <Text className="text-2xl">🔔</Text>
        </View>
        <Text className={cn(
          "text-xl font-bold",
          isDark ? "text-white" : "text-gray-900"
        )}>Notification Intelligence</Text>
      </View>
      
      <View className="space-y-6">
        <AISlider
          label="Focus Time Respect"
          leftLabel="Interrupt"
          rightLabel="Respect"
          value={90}
          currentLabel="Maximum Respect"
          color="#4ECDC4"
        />
        <AISlider
          label="Urgency Threshold"
          leftLabel="Low"
          rightLabel="High"
          value={60}
          currentLabel="Moderate Threshold"
          color="#FF7043"
        />
      </View>
    </View>
  );
};

const AISlider: React.FC<{
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  currentLabel: string;
  color?: string;
}> = ({ label, leftLabel, rightLabel, value, currentLabel, color = '#6366f1' }) => {
  const { isDark } = useTheme();
  
  return (
    <View>
      <Text className={cn(
        "text-base font-bold mb-3",
        isDark ? "text-white" : "text-gray-800"
      )}>{label}</Text>
      <View className="flex-row items-center gap-3">
        <Text className={cn(
          "text-sm font-semibold w-16",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>{leftLabel}</Text>
        <View className={cn(
          "flex-1 h-6 rounded-2xl overflow-hidden relative",
          isDark ? "bg-slate-700" : "bg-gray-200"
        )}>
          <View 
            className="absolute top-0 left-0 bottom-0 rounded-2xl"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
          <View 
            className={cn(
              "absolute top-0 bottom-0 w-6 h-6 rounded-full border-2 shadow-sm",
              isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-300"
            )}
            style={{ left: `${Math.max(0, value - 8)}%` }}
          />
        </View>
        <Text className={cn(
          "text-sm font-semibold w-16 text-right",
          isDark ? "text-slate-400" : "text-gray-600"
        )}>{rightLabel}</Text>
      </View>
      <Text className={cn(
        "text-xs font-medium mt-2 text-center",
        isDark ? "text-slate-500" : "text-gray-500"
      )}>{currentLabel}</Text>
    </View>
  );
};

// Desktop Account Settings
const DesktopAccountSettings: React.FC<{
  user: any;
  level: number;
  currentXP: number;
  handleLogout: () => void;
}> = ({ user, level, currentXP, handleLogout }) => {
  const { isDark } = useTheme();
  
  return (
    <View>
      <Text className={cn(
        "text-xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>⚙️ Account Settings</Text>
      
      <View className={cn(
        "rounded-2xl p-6 border shadow-sm",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <View className="space-y-4 mb-6">
          <View className={cn(
            "flex-row justify-between items-center py-3 border-b",
            isDark ? "border-slate-700" : "border-gray-100"
          )}>
            <Text className={cn(
              "text-sm font-semibold",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>Email</Text>
            <Text className={cn(
              "text-sm font-medium",
              isDark ? "text-slate-400" : "text-gray-600"
            )}>{user?.email}</Text>
          </View>
          <View className={cn(
            "flex-row justify-between items-center py-3 border-b",
            isDark ? "border-slate-700" : "border-gray-100"
          )}>
            <Text className={cn(
              "text-sm font-semibold",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>Current Level</Text>
            <View className={cn(
              "px-3 py-1.5 rounded-full",
              isDark ? "bg-green-900/30" : "bg-green-100"
            )}>
              <Text className={cn(
                "text-sm font-bold",
                isDark ? "text-green-400" : "text-green-700"
              )}>Level {level}</Text>
            </View>
          </View>
          <View className="flex-row justify-between items-center py-3">
            <Text className={cn(
              "text-sm font-semibold",
              isDark ? "text-slate-300" : "text-gray-700"
            )}>Total XP</Text>
            <View className={cn(
              "px-3 py-1.5 rounded-full",
              isDark ? "bg-purple-900/30" : "bg-purple-100"
            )}>
              <Text className={cn(
                "text-sm font-bold",
                isDark ? "text-purple-400" : "text-purple-700"
              )}>{currentXP} XP</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          className={cn(
            "px-6 py-4 rounded-xl border flex-row items-center justify-center",
            isDark 
              ? "bg-slate-700 hover:bg-slate-600 border-slate-600" 
              : "bg-gray-100 hover:bg-gray-200 border-gray-200"
          )}
          onPress={handleLogout}
        >
          <Text className={cn(
            "text-base font-bold",
            isDark ? "text-slate-300" : "text-gray-700"
          )}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Desktop Appearance Settings
const DesktopAppearanceSettings: React.FC<{
  state: any;
  updateTheme: (theme: any) => void;
}> = ({ state, updateTheme }) => {
  const { isDark } = useTheme();
  
  return (
    <View>
      <Text className={cn(
        "text-xl font-bold mb-6",
        isDark ? "text-white" : "text-gray-900"
      )}>🎨 Appearance & Data</Text>
      
      <View className={cn(
        "rounded-2xl p-6 border shadow-sm mb-6",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <Text className={cn(
          "text-lg font-bold mb-4",
          isDark ? "text-white" : "text-gray-900"
        )}>Theme Settings</Text>
        
        <ThemeSelector 
          currentTheme={state.theme?.colorScheme || 'light'}
          onThemeChange={(theme) => updateTheme({ colorScheme: theme })}
        />
      </View>
      
      <View className={cn(
        "rounded-2xl p-6 border shadow-sm mb-6",
        isDark ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
      )}>
        <View className="flex-row items-center mb-3">
          <View className={cn(
            "w-10 h-10 rounded-lg items-center justify-center mr-3",
            isDark ? "bg-green-900/30" : "bg-green-100"
          )}>
            <Text className="text-xl">🔒</Text>
          </View>
          <Text className={cn(
            "text-lg font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}>Privacy & Data</Text>
        </View>
        <Text className={cn(
          "text-sm leading-6",
          isDark ? "text-slate-300" : "text-gray-600"
        )}>
          Your inspiration data and productivity insights are private and stored securely.
        </Text>
      </View>
      
      <DataManagement />
    </View>
  );
};

// Tablet Profile Content
export const TabletProfileContent: React.FC<{
  selectedTab: string;
  renderTabContent: () => React.ReactNode;
}> = ({ selectedTab, renderTabContent }) => {
  return (
    <View className="flex-1 px-6">
      {renderTabContent()}
    </View>
  );
}; 