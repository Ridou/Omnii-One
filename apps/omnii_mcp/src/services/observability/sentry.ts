import * as Sentry from '@sentry/bun';

export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    console.warn('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    ignoreErrors: ['AbortError', 'NetworkError', 'TimeoutError'],
    beforeSend(event) {
      // Scrub PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(bc => {
          if (bc.data?.password) bc.data.password = '[REDACTED]';
          if (bc.data?.token) bc.data.token = '[REDACTED]';
          if (bc.data?.authorization) bc.data.authorization = '[REDACTED]';
          return bc;
        });
      }
      return event;
    },
  });

  console.log('[Sentry] Initialized for environment:', process.env.NODE_ENV || 'development');
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  Sentry.withScope(scope => {
    if (context?.userId) scope.setUser({ id: context.userId as string });
    if (context?.tags) {
      Object.entries(context.tags as Record<string, string>).forEach(([k, v]) => scope.setTag(k, v));
    }
    if (context?.extra) {
      Object.entries(context.extra as Record<string, unknown>).forEach(([k, v]) => scope.setExtra(k, v));
    }
    Sentry.captureException(error);
  });
}

export { Sentry };
