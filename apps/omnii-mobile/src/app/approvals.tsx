import { Redirect } from 'expo-router';

// Clean URL route that redirects to the tab-based approvals page
export default function ApprovalsRedirect() {
  // Use Expo Router's Redirect component for clean, safe navigation
  return <Redirect href="/(tabs)/approvals" />;
} 