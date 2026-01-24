import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to root for both web and mobile
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // For web/desktop: Hard redirect to avoid showing 404 page
      window.location.href = '/';
    } else {
      // For mobile: Use router navigation
      router.replace('/');
    }
  }, [router]);

  // Return null since we're redirecting immediately
  // This prevents any flash of 404 content
  return null;
}