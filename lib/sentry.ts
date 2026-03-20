// Sentry disabled — native plugin removed from app.json
// Re-enable when @sentry/react-native is added back as a plugin

export function initSentry() {}

export function setUser(_userId: string, _username?: string, _email?: string) {}

export function clearUser() {}

export function captureError(_error: Error, _context?: Record<string, any>) {}

export function addBreadcrumb(_message: string, _category?: string, _data?: Record<string, any>) {}
