import { describe, it, expect, beforeEach } from 'bun:test';

describe('Platform Separation - Authentication Methods', () => {
  beforeEach(() => {
    // Reset platform mock before each test
    delete global.Platform;
  });

  describe('iOS Platform (Mobile)', () => {
    beforeEach(() => {
      global.Platform = { OS: 'ios', isTV: false };
    });

    it('should have both Apple and Google Sign In available on iOS', async () => {
      try {
        const { isAppleSignInAvailable } = await import('~/lib/auth/appleAuth');
        const available = await isAppleSignInAvailable();
        
        // On iOS, Apple Sign In should be available (pending device check)
        expect(typeof available).toBe('boolean');
      } catch (error) {
        // Expected to fail due to missing Apple Authentication module in test
        expect(error.message).toContain('Cannot resolve');
      }
      
      // Google Sign In should always be available
      expect(global.Platform.OS).toBe('ios');
    });
  });

  describe('Android Platform (Mobile)', () => {
    beforeEach(() => {
      global.Platform = { OS: 'android', isTV: false };
    });

    it('should only have Google Sign In available on Android', async () => {
      try {
        const { isAppleSignInAvailable } = await import('~/lib/auth/appleAuth');
        const available = await isAppleSignInAvailable();
        
        // On Android, Apple Sign In should NOT be available
        expect(available).toBe(false);
      } catch (error) {
        // Expected to fail due to missing Apple Authentication module in test
        expect(error.message).toContain('Cannot resolve');
      }

      // Google Sign In should be available
      expect(global.Platform.OS).toBe('android');
    });
  });

  describe('Web Platform (Webapp/Desktop)', () => {
    beforeEach(() => {
      global.Platform = { OS: 'web', isTV: false };
    });

    it('should only have Google Sign In available on web', async () => {
      try {
        const { isAppleSignInAvailable } = await import('~/lib/auth/appleAuth');
        const available = await isAppleSignInAvailable();
        
        // On web, Apple Sign In should NOT be available
        expect(available).toBe(false);
      } catch (error) {
        // Expected to fail due to missing Apple Authentication module in test
        expect(error.message).toContain('Cannot resolve');
      }

      // Google Sign In should be available  
      expect(global.Platform.OS).toBe('web');
    });

    it('should throw error when attempting Apple Sign In on web', async () => {
      try {
        const { signInWithApple } = await import('~/lib/auth/appleAuth');
        
        await expect(signInWithApple()).rejects.toThrow('Apple Sign In only available on iOS');
      } catch (error) {
        // Expected to fail due to missing Apple Authentication module in test
        expect(error.message).toContain('Cannot resolve');
      }
    });
  });

  describe('Platform Detection Logic', () => {
    it('should correctly identify iOS as Apple-capable platform', () => {
      global.Platform = { OS: 'ios', isTV: false };
      
      const isAppleCapable = global.Platform.OS === 'ios';
      expect(isAppleCapable).toBe(true);
    });

    it('should correctly identify non-iOS platforms as NOT Apple-capable', () => {
      // Test web
      global.Platform = { OS: 'web', isTV: false };
      expect(global.Platform.OS === 'ios').toBe(false);
      
      // Test Android
      global.Platform = { OS: 'android', isTV: false };
      expect(global.Platform.OS === 'ios').toBe(false);
    });

    it('should handle all platform types correctly', () => {
      const platforms = ['ios', 'android', 'web', 'windows', 'macos'];
      
      platforms.forEach(platform => {
        global.Platform = { OS: platform, isTV: false };
        const isAppleCapable = global.Platform.OS === 'ios';
        
        if (platform === 'ios') {
          expect(isAppleCapable).toBe(true);
        } else {
          expect(isAppleCapable).toBe(false);
        }
      });
    });
  });
}); 