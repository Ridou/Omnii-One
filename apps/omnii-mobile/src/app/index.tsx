import React from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import LandingPageContent from '~/components/landing/LandingPageContent';
import { AppHead } from '~/components/common/Head';
import { isStaticExport } from '~/utils/navigation';


// Dynamically import AuthContext to avoid SSR issues
let useAuth: any = null;
if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  // Only import on client-side or mobile
  const authModule = require('~/context/AuthContext');
  useAuth = authModule.useAuth;
}

export default function LandingPage() {
  const router = useRouter();
  
  // For static export or when auth context is not available, always show landing page
  if (!useAuth || isStaticExport()) {
    console.log('🔧 Static export mode or no auth context: Showing landing page');
    return (
      <>
        <AppHead
          title="OMNII - AI Productivity Assistant | Reclaim Your Humanity"
          description="Let AI handle the rest. OMNII transforms chaos into clarity, insights into action, potential into progress with intelligent productivity assistance."
          keywords="AI productivity, task management, productivity assistant, AI suggestions, goal tracking, productivity app, reclaim humanity"
          canonical="https://omnii.live/"
          ogTitle="OMNII - Reclaim Your Humanity, Let AI Handle the Rest"
          ogDescription="Transform chaos into clarity, insights into action, potential into progress. Not just another productivity app - a true AI partnership."
          ogUrl="https://omnii.live/"
        />
        <LandingPageContent />
      </>
    );
  }

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

  // Always show landing page content with SEO metadata
  return (
    <>
      <AppHead
        title="OMNII - AI Productivity Assistant | Reclaim Your Humanity"
        description="Let AI handle the rest. OMNII transforms chaos into clarity, insights into action, potential into progress with intelligent productivity assistance."
        keywords="AI productivity, task management, productivity assistant, AI suggestions, goal tracking, productivity app, reclaim humanity"
        canonical="https://omnii.live/"
        ogTitle="OMNII - Reclaim Your Humanity, Let AI Handle the Rest"
        ogDescription="Transform chaos into clarity, insights into action, potential into progress. Not just another productivity app - a true AI partnership."
        ogUrl="https://omnii.live/"
      />
      <LandingPageContent />
    </>
  );
} 