import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Text } from 'react-native';
import { Heading2, Heading4, BodyText, CaptionText } from '~/components/common/Typography';
import { AppColors } from '~/constants/Colors';
import { useResponsiveDesign } from '~/utils/responsive';
import { MascotDisplay } from './MascotDisplay';

type FeatureTab = 'intelligence' | 'evolution' | 'insights' | 'chat';

const showcaseTabs = [
  {
    key: 'intelligence' as FeatureTab,
    label: 'AI',
    icon: '🧠',
    gradient: [AppColors.aiGradientStart, AppColors.aiGradientEnd] as [string, string],
    title: 'AI that understands YOUR workflow patterns',
    description: 'Not another generic assistant. OMNII learns how YOU think, work, and prioritize.',
    features: [
      'Analyzes your unique work patterns',
      'Suggests optimal timing for tasks',
      'Adapts to your personal style'
    ]
  },
  {
    key: 'evolution' as FeatureTab,
    label: 'Evolution',
    icon: '🌱',
    gradient: ['#00b894', '#55efc4'] as [string, string],
    title: 'Watch your productivity DNA grow',
    description: 'From foundation to mastery. Your Sacred Geometry mascot reflects your evolving productivity journey.',
    features: [
      '🌱 Seed of Life: Foundation building',
      '🌸 Flower of Life: Pattern recognition',
      '🌳 Tree of Life: Complete mastery'
    ]
  },
  {
    key: 'insights' as FeatureTab,
    label: 'Insights',
    icon: '📊',
    gradient: ['#667eea', '#764ba2'] as [string, string],
    title: 'Analytics that predict your perfect day',
    description: 'Know when you\'ll be most focused, when you need breaks, and how to optimize tomorrow.',
    features: [
      'Energy pattern mapping',
      'Distraction prediction alerts',
      'Optimal work scheduling'
    ]
  },
  {
    key: 'chat' as FeatureTab,
    label: 'Chat',
    icon: '💬',
    gradient: ['#FFB347', '#FFD700'] as [string, string],
    title: 'Conversation that actually gets things done',
    description: 'Talk to AI that understands context, remembers conversations, and takes action.',
    features: [
      'Natural conversation flow',
      'Full context awareness',
      'Action-oriented responses'
    ]
  }
];

// Simple web version to avoid CSS conflicts
const SimpleWebFeatureShowcase: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<FeatureTab>('intelligence');
  const responsive = useResponsiveDesign();
  const activeTab = showcaseTabs.find(tab => tab.key === selectedTab)!;
  
  return (
    <View style={webStyles.container}>
      <View style={webStyles.header}>
        {Platform.OS === 'web' ? (
          <Text style={webStyles.webTitle}>
            What makes OMNII different
          </Text>
        ) : (
          <Heading2 color={AppColors.textPrimary} style={webStyles.title}>
            What makes OMNII different
          </Heading2>
        )}
        {Platform.OS === 'web' ? (
          <Text style={webStyles.webSubtitle}>
            Not just another productivity app. A true AI partnership.
          </Text>
        ) : (
          <BodyText size={1} color={AppColors.textSecondary} style={webStyles.subtitle}>
            Not just another productivity app. A true AI partnership.
          </BodyText>
        )}
      </View>
      
      {/* Simple Tab System */}
      <View style={webStyles.tabsContainer}>
        <View style={webStyles.tabsWrapper}>
          {showcaseTabs.map((tab) => {
            const isActive = selectedTab === tab.key;
            
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  webStyles.tab,
                  isActive && [webStyles.activeTab, { backgroundColor: tab.gradient[0] }]
                ]}
                onPress={() => setSelectedTab(tab.key)}
              >
                <View style={webStyles.tabContent}>
                  {Platform.OS === 'web' ? (
                    <Text style={webStyles.webTabIcon}>{tab.icon}</Text>
                  ) : (
                    <BodyText size={2} style={webStyles.tabIcon}>{tab.icon}</BodyText>
                  )}
                  {Platform.OS === 'web' ? (
                    <Text style={[
                      webStyles.webTabLabel,
                      { color: isActive ? '#FFFFFF' : AppColors.textSecondary }
                    ]}>
                      {tab.label}
                    </Text>
                  ) : (
                    <CaptionText 
                      color={isActive ? '#FFFFFF' : AppColors.textSecondary}
                      style={webStyles.tabLabel}
                      numberOfLines={2}
                    >
                      {tab.label}
                    </CaptionText>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      {/* Content Section */}
      <View style={webStyles.contentContainer}>
        <View style={webStyles.textContent}>
          {Platform.OS === 'web' ? (
            <Text style={webStyles.webFeatureTitle}>
              {activeTab.title}
            </Text>
          ) : (
            <Heading4 color={AppColors.textPrimary} style={webStyles.featureTitle}>
              {activeTab.title}
            </Heading4>
          )}
          {Platform.OS === 'web' ? (
            <Text style={webStyles.webFeatureDescription}>
              {activeTab.description}
            </Text>
          ) : (
            <BodyText size={2} color={AppColors.textSecondary} style={webStyles.featureDescription}>
              {activeTab.description}
            </BodyText>
          )}
          
          {/* Static features list */}
          <View style={webStyles.demoContainer}>
            {activeTab.features.map((feature, index) => (
              <View key={index} style={webStyles.demoItem}>
                {Platform.OS === 'web' ? (
                  <Text style={webStyles.webDemoText}>
                    {feature}
                  </Text>
                ) : (
                  <BodyText 
                    size={2} 
                    color={AppColors.textSecondary}
                    style={webStyles.demoText}
                  >
                    {feature}
                  </BodyText>
                )}
              </View>
            ))}
          </View>
        </View>
        
        {/* Mascot Display */}
        <View style={webStyles.mascotContainer}>
          <MascotDisplay
            stage={selectedTab === 'intelligence' ? 'seed' : selectedTab === 'evolution' ? 'flower' : 'tree'}
            size={responsive.isMobileXS ? 'small' : responsive.isMobile ? 'medium' : 'large'}
            showLevel={selectedTab === 'evolution'}
            level={selectedTab === 'evolution' ? 15 : undefined}
          />
        </View>
      </View>
    </View>
  );
};

export const FeatureShowcase: React.FC = () => {
  // Use simple web version on web platforms
  if (Platform.OS === 'web') {
    return <SimpleWebFeatureShowcase />;
  }

  // Full mobile version with animations
  const [selectedTab, setSelectedTab] = useState<FeatureTab>('intelligence');
  const [currentDemo, setCurrentDemo] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const responsive = useResponsiveDesign();
  
  // Simple scale animations only
  const scaleAnimations = useRef(
    showcaseTabs.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(1);
      return acc;
    }, {} as Record<FeatureTab, Animated.Value>)
  ).current;

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // Auto-cycling tabs (every 8 seconds)
  useEffect(() => {
    if (!isMounted) return;

    const tabCycleInterval = setInterval(() => {
      if (!isMounted) return;
      setSelectedTab(prev => {
        const currentIndex = showcaseTabs.findIndex(tab => tab.key === prev);
        const nextIndex = (currentIndex + 1) % showcaseTabs.length;
        return showcaseTabs[nextIndex].key;
      });
      setCurrentDemo(0); // Reset demo when tab changes
    }, 8000); // Change tab every 8 seconds
    
    return () => clearInterval(tabCycleInterval);
  }, [isMounted]);
  
  // Auto-cycling demo features within each tab
  useEffect(() => {
    if (!isMounted) return;

    const activeTab = showcaseTabs.find(tab => tab.key === selectedTab);
    if (!activeTab) return;
    
    const demoInterval = setInterval(() => {
      if (!isMounted) return;
      setCurrentDemo(prev => (prev + 1) % activeTab.features.length);
    }, 2500); // Demo features change every 2.5 seconds
    
    return () => clearInterval(demoInterval);
  }, [selectedTab, isMounted]);
  
  // Tab press handler with simple animation
  const handleTabPress = (tabKey: FeatureTab) => {
    const scaleAnim = scaleAnimations[tabKey];
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setSelectedTab(tabKey);
    setCurrentDemo(0);
  };
  
  const activeTab = showcaseTabs.find(tab => tab.key === selectedTab)!;
  
  return (
    <View style={[styles.container, { paddingHorizontal: responsive.spacing.horizontal }]}>
      <View style={styles.header}>
        <Heading2 color={AppColors.textPrimary} style={styles.title}>
          What makes OMNII different
        </Heading2>
        <BodyText size={1} color={AppColors.textSecondary} style={styles.subtitle}>
          Not just another productivity app. A true AI partnership.
        </BodyText>
      </View>
      
      {/* Simplified Tab System */}
      <View style={styles.tabsContainer}>
        <View style={[
          styles.tabsWrapper,
          responsive.isMobile ? styles.tabsWrapperMobile : styles.tabsWrapperDesktop
        ]}>
          {showcaseTabs.map((tab) => {
            const isActive = selectedTab === tab.key;
            
            return (
              <Animated.View
                key={tab.key}
                style={[
                  styles.tabWrapper,
                  { transform: [{ scale: scaleAnimations[tab.key] }] }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.tab,
                    isActive && [styles.activeTab, { backgroundColor: tab.gradient[0] }]
                  ]}
                  onPress={() => handleTabPress(tab.key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.tabContent}>
                    <BodyText size={2} style={styles.tabIcon}>{tab.icon}</BodyText>
                    <CaptionText 
                      color={isActive ? '#FFFFFF' : AppColors.textSecondary}
                      style={styles.tabLabel}
                      numberOfLines={2}
                    >
                      {tab.label}
                    </CaptionText>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
      
      {/* Content Section */}
      <View style={[
        styles.contentContainer,
        responsive.isMobile ? styles.contentMobile : styles.contentDesktop
      ]}>
        <View style={styles.textContent}>
          <Heading4 color={AppColors.textPrimary} style={styles.featureTitle}>
            {activeTab.title}
          </Heading4>
          <BodyText size={2} color={AppColors.textSecondary} style={styles.featureDescription}>
            {activeTab.description}
          </BodyText>
          
          {/* Auto-cycling demo features */}
          <View style={styles.demoContainer}>
            {activeTab.features.map((feature, index) => (
              <View 
                key={index}
                style={[
                  styles.demoItem,
                  index === currentDemo && styles.demoItemActive
                ]}
              >
                <BodyText 
                  size={2} 
                  color={index === currentDemo ? AppColors.aiGradientStart : AppColors.textSecondary}
                  style={styles.demoText}
                >
                  {feature}
                </BodyText>
              </View>
            ))}
          </View>
        </View>
        
        {/* Mascot Display */}
        <View style={styles.mascotContainer}>
          <MascotDisplay
            stage={selectedTab === 'intelligence' ? 'seed' : selectedTab === 'evolution' ? 'flower' : 'tree'}
            size={responsive.isMobileXS ? 'small' : responsive.isMobile ? 'medium' : 'large'}
            showLevel={selectedTab === 'evolution'}
            level={selectedTab === 'evolution' ? 15 : undefined}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 600,
  },
  tabsContainer: {
    marginBottom: 32,
  },
  tabsWrapper: {
    flexDirection: 'row',
    gap: 12,
  },
  tabsWrapperMobile: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tabsWrapperDesktop: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  tabWrapper: {
    flex: 1,
    minWidth: 65,
    maxWidth: 100,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: AppColors.cardBackground,
    borderWidth: 2,
    borderColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    flexShrink: 1,
    minWidth: 60,
  },
  activeTab: {
    borderWidth: 0,
  },
  tabContent: {
    alignItems: 'center',
    gap: 4,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    flexWrap: 'wrap',
    textAlignVertical: 'center',
  },
  contentContainer: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    minWidth: 300,
    maxWidth: '100%',
  },
  contentMobile: {
    gap: 24,
    flexDirection: 'column',
  },
  contentDesktop: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    width: '100%',
    minWidth: 250,
    maxWidth: '100%',
  },
  featureTitle: {
    marginBottom: 12,
    width: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' && ({
      minWidth: '200px' as any,
      maxWidth: '100%' as any,
    } as any)),
  },
  featureDescription: {
    marginBottom: 20,
    lineHeight: 22,
    width: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' && ({
      minWidth: '200px' as any,
      maxWidth: '100%' as any,
    } as any)),
  },
  demoContainer: {
    gap: 8,
    width: '100%',
  },
  demoItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    width: '100%',
    minWidth: 150,
  },
  demoItemActive: {
    borderColor: AppColors.aiGradientStart,
    backgroundColor: `${AppColors.aiGradientStart}10`,
  },
  demoText: {
    fontWeight: '500',
    width: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' && ({
      minWidth: '150px' as any,
      maxWidth: '100%' as any,
    } as any)),
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
});

// Simple web styles without complex properties  
const webStyles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
  },
  // Web-specific text styles with proper rendering
  webTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    // Force proper width
    width: '100%',
    minWidth: 200,
    maxWidth: '100%',
    ...(Platform.OS === 'web' && ({
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    } as any)),
  },
  webSubtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    // Force proper width
    width: '100%',
    minWidth: 200,
    maxWidth: '100%',
    ...(Platform.OS === 'web' && ({
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    } as any)),
  },
  webTabIcon: {
    fontSize: 18,
  },
  webTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    ...(Platform.OS === 'web' && ({
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      WebkitFontSmoothing: 'antialiased',
    } as any)),
  },
  webFeatureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
    // CRITICAL: Force proper width for title
    width: '100%',
    minWidth: 200,
    maxWidth: '100%',
    ...(Platform.OS === 'web' && ({
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    } as any)),
  },
  webFeatureDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    // CRITICAL: Force proper width for description
    width: '100%',
    minWidth: 200,
    maxWidth: '100%',
    ...(Platform.OS === 'web' && ({
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    } as any)),
  },
  webDemoText: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
    // CRITICAL: Force proper width for demo text
    width: '100%',
    minWidth: 150,
    maxWidth: '100%',
    ...(Platform.OS === 'web' && ({
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
    } as any)),
  },
  tabsContainer: {
    marginBottom: 32,
  },
  tabsWrapper: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: AppColors.cardBackground,
    borderWidth: 2,
    borderColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    flexShrink: 1,
    minWidth: 60,
  },
  activeTab: {
    borderWidth: 0,
  },
  tabContent: {
    alignItems: 'center',
    gap: 4,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    flexWrap: 'wrap',
    textAlignVertical: 'center',
  },
  contentContainer: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    gap: 32,
    alignItems: 'center',
    // CRITICAL: Force proper width for web content container
    width: '100%',
    minWidth: 320,
    maxWidth: '100%',
  },
  textContent: {
    flex: 1,
    // CRITICAL: Force text content to use full available width
    width: '100%',
    minWidth: 250,
    maxWidth: '100%',
  },
  featureTitle: {
    marginBottom: 12,
  },
  featureDescription: {
    marginBottom: 20,
    lineHeight: 22,
  },
  demoContainer: {
    gap: 8,
    // Ensure full width for demo container
    width: '100%',
  },
  demoItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    // Force full width for demo items
    width: '100%',
    minWidth: 150,
  },
  demoText: {
    fontWeight: '500',
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
}); 