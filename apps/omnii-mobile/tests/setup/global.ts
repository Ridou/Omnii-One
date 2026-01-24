// Global test setup for bun
import { beforeAll, afterAll } from 'bun:test';

// Setup global test environment
beforeAll(() => {
  console.log('🧪 Setting up global test environment...');
  
  // Set test environment variables
  if (!process.env.NODE_ENV) {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
  }
  if (!process.env.EXPO_PUBLIC_ENVIRONMENT) {
    Object.defineProperty(process.env, 'EXPO_PUBLIC_ENVIRONMENT', { value: 'test', writable: true });
  }
  
  // Mock React Native Platform
  global.Platform = {
    OS: 'ios',
    isTV: false,
    isTesting: true,
    select: (obj: any) => obj.ios || obj.default
  };

  // Keep modules simple for now - will add mocking as needed

  // Mock React Native dimensions
  global.Dimensions = {
    get: () => ({ width: 375, height: 812 }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  // Mock Expo constants
  global.Constants = {
    expoConfig: {
      extra: {
        googleClientId: 'test-google-client-id',
        googleWebClientId: 'test-google-web-client-id',
        googleIosClientId: 'test-google-ios-client-id'
      }
    }
  };

  // Suppress console warnings in tests unless explicitly needed
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('React')) {
      return; // Suppress React warnings in tests
    }
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  console.log('🧹 Cleaning up global test environment...');
}); 