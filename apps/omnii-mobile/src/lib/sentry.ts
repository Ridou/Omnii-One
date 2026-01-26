import * as Sentry from '@sentry/react-native';

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    attachScreenshot: true,
    attachViewHierarchy: true,
    // Don't send errors in development unless testing Sentry
    enabled: !__DEV__ || !!process.env.EXPO_PUBLIC_SENTRY_DEBUG,
  });

  console.log('[Sentry] Initialized for', __DEV__ ? 'development' : 'production');
}

export { Sentry };
