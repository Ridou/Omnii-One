import React from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import LandingPageContent from '~/components/landing/LandingPageContent';
import { AppHead } from '~/components/common/Head';
import { isStaticExport } from '~/utils/navigation';


import { useAuth } from '~/context/AuthContext';

export default function LandingPage() {
  // ✅ All hooks called at top level
  const router = useRouter();
  const { isInitialized, user, session } = useAuth();
  const [hasRouted, setHasRouted] = React.useState(false);

  // Debug logging
  React.useEffect(() => {
    if (__DEV__ && user) {
      console.log('🏠 Index Route Debug:', {
        isInitialized,
        userId: user?.id,
        hasSession: !!session,
        hasRouted,
        isStaticExport: isStaticExport(),
      });
    }
  }, [isInitialized, user?.id, session, hasRouted]);

  // Handle authenticated user routing (only for dynamic builds)
  React.useEffect(() => {
    // Skip auth routing in static export mode - always show landing page
    if (isStaticExport()) {
      console.log('🔧 Static export mode: Showing landing page without auth routing');
      return;
    }
    
    if (hasRouted || !isInitialized || !user || !session) return;

    // Authenticated users go directly to approvals (onboarding happens there)
    console.log('✅ Redirecting authenticated user to approvals');
    setHasRouted(true);
    router.replace('/(tabs)/approvals');
  }, [isInitialized, user?.id, session, hasRouted, router]);

  // For static export, always show landing page
  if (isStaticExport()) {
    console.log('🔧 Static export mode: Showing landing page');
    return (
      <>
        <AppHead
          title="OMNII - AI Productivity Assistant | Reclaim Your Humanity"
          description="Let AI handle the rest. OMNII transforms chaos into clarity, insights into action, potential into progress with intelligent productivity assistance."
          keywords="AI productivity, task management, productivity assistant, AI suggestions, goal tracking, productivity app, reclaim humanity"
          canonical="https://omnii.net/"
          ogTitle="OMNII - AI Productivity Assistant"
          ogDescription="Reclaim your humanity. Let AI handle the rest."
          ogUrl="https://omnii.net/"
          ogImage="https://omnii.net/icon-512.png"
          ogType="website"
          twitterCard="summary_large_image"
          twitterTitle="OMNII - AI Productivity Assistant"
          twitterDescription="Reclaim your humanity. Let AI handle the rest."
          twitterImage="https://omnii.net/icon-512.png"
        />
        <LandingPageContent />
      </>
    );
  }

  // Always show landing page content with SEO metadata
  return (
    <>
      <AppHead
        title="OMNII - AI Productivity Assistant | Reclaim Your Humanity"
        description="Let AI handle the rest. OMNII transforms chaos into clarity, insights into action, potential into progress with intelligent productivity assistance."
        keywords="AI productivity, task management, productivity assistant, AI suggestions, goal tracking, productivity app, reclaim humanity"
        canonical="https://omnii.net/"
        ogTitle="OMNII - AI Productivity Assistant"
        ogDescription="Reclaim your humanity. Let AI handle the rest."
        ogUrl="https://omnii.net/"
        ogImage="https://omnii.net/icon-512.png"
        ogType="website"
        twitterCard="summary_large_image"
        twitterTitle="OMNII - AI Productivity Assistant"
        twitterDescription="Reclaim your humanity. Let AI handle the rest."
        twitterImage="https://omnii.net/icon-512.png"
      />
      <LandingPageContent />
    </>
  );
} 