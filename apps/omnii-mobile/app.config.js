import 'dotenv/config';

export default {
  expo: {
    name: 'OMNII',
    slug: 'omnii',
    owner: 'omnii8',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icons/ios/app-icons/AppIcon-1024x1024@1x.png',
    userInterfaceStyle: 'light',
    scheme: 'omnii-mobile',
    splash: {
      image: './assets/images/icons/ios/app-icons/AppIcon-1024x1024@1x.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.omnii.mobile',
      icon: './assets/images/icons/ios/app-icons/AppIcon-1024x1024@1x.png',
    },
    android: {
      package: "com.omnii.mobile",
      icon: './assets/images/icons/android/app-icons/android-512x512.png',
      adaptiveIcon: {
        foregroundImage: './assets/images/icons/android/adaptive-icons/adaptive-foreground-108x108.png',
        backgroundColor: '#007AFF',
      },
    },
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './public/favicon.svg',
      name: 'OMNII - AI Productivity Assistant',
      shortName: 'OMNII',
      darkMode: false,
      staticRoutes: [
        '/',
        '/privacy-policy',
        '/terms-of-service',
        '/about',
        '/support',
        '/sms-consent',
        '/+not-found'
      ],
      config: {
        initialProps: async (params = {}) => {
          const { pathname = '/' } = params;
          const routeMetadata = {
            '/': {
              title: 'OMNII - AI Productivity Assistant | Reclaim Your Humanity',
              description: 'Let AI handle the rest. OMNII transforms chaos into clarity, insights into action, potential into progress with intelligent productivity assistance.',
              keywords: 'AI productivity, task management, productivity assistant, AI suggestions, goal tracking, productivity app',
            },
            '/privacy-policy': {
              title: 'Privacy Policy - OMNII AI Productivity Assistant',
              description: 'OMNII Privacy Policy - Learn how we collect, use, and protect your information when you use our AI productivity assistant.',
              keywords: 'privacy policy, data protection, OMNII, AI assistant, productivity app',
            },
            '/terms-of-service': {
              title: 'Terms of Service - OMNII AI Productivity Assistant',
              description: 'OMNII Terms of Service - The terms and conditions for using our AI productivity assistant.',
              keywords: 'terms of service, user agreement, OMNII, AI assistant, productivity app',
            },
            '/about': {
              title: 'About OMNII - AI Productivity Assistant',
              description: 'Learn about OMNII\'s mission to reclaim humanity through AI-powered productivity assistance. Born in Kyoto, built for the world.',
              keywords: 'about OMNII, AI productivity, company mission, productivity assistant',
            },
            '/support': {
              title: 'Support - OMNII AI Productivity Assistant',
              description: 'Get help with OMNII. Contact our support team for technical assistance, questions, and feedback.',
              keywords: 'OMNII support, customer service, help, contact',
            },
            '/sms-consent': {
              title: 'SMS Consent - OMNII AI Productivity Assistant',
              description: 'SMS consent documentation for OMNII\'s two-factor authentication and security notifications.',
              keywords: 'SMS consent, two-factor authentication, security, OMNII',
            }
          };

          return {
            metadata: routeMetadata[pathname] || routeMetadata['/'],
            pathname
          };
        }
      }
    },
    plugins: [
      'expo-secure-store',
      ['expo-router', { origin: 'https://omnii.net' }],
    ],
    extra: {
      eas: {
        projectId: "320277da-e364-485f-9098-82c908f7b327"
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
      backendApiUrl: process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '',
      environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'production',
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    },
  },
};
