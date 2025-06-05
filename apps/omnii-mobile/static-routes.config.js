// Static routes configuration for Expo Router
// These routes will be pre-rendered as static HTML for better SEO and crawler compatibility

export const STATIC_ROUTES = [
  '/', // Landing page for unauthenticated users
  '/privacy-policy', // Privacy policy (required by Google)
  '/terms-of-service', // Terms of service
  '/about', // About page
  '/support', // Support page
  '/sms-consent', // SMS consent page
  '/+not-found' // 404 page
];

// Dynamic routes that should remain as SPA (Single Page Application)
export const DYNAMIC_ROUTES = [
  '/(tabs)/*', // Protected routes requiring authentication
  '/(auth)/*', // OAuth flows and authentication
  '/request/*', // Dynamic request handling
  '/emergency-logout' // Dynamic logout action
];

// Helper function to check if a route should be static
export const isStaticRoute = (pathname) => {
  return STATIC_ROUTES.includes(pathname);
};

// Helper function to check if a route should be dynamic
export const isDynamicRoute = (pathname) => {
  return DYNAMIC_ROUTES.some(pattern => {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(pathname);
  });
}; 