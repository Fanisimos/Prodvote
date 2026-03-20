import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let initialized = false;

export function initSentry() {
  if (initialized || !DSN) return;

  Sentry.init({
    dsn: DSN,
    debug: __DEV__,
    enabled: !__DEV__, // Only report in production
    tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
    environment: __DEV__ ? 'development' : 'production',
  });

  initialized = true;
}

export function setUser(userId: string, username?: string, email?: string) {
  if (!initialized) return;
  Sentry.setUser({ id: userId, username, email });
}

export function clearUser() {
  if (!initialized) return;
  Sentry.setUser(null);
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (!initialized) return;
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  if (!initialized) return;
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
}
