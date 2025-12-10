// Lightweight analytics/Sentry placeholder integration
// Initialize analytics or error reporting here. This file intentionally
// contains no external keys — configure via environment variables.

export function initAnalytics() {
  // Example: initialize Google Analytics or GTM dataLayer
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
  }
}

export function trackEvent(name, props = {}) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({ event: name, ...props });
  }
}

export function initErrorReporting() {
  // Placeholder: initialize Sentry or other error trackers using env config
  // Example:
  // if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  //   Sentry.init({ dsn: process.env.SENTRY_DSN });
  // }
}
