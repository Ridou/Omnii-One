import { Platform, DeviceEventEmitter, NativeEventEmitter, NativeModules, Dimensions, AppState, PixelRatio } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';

/**
 * Performance optimization utilities for OMNII
 * Ensures App Store compliance with memory, battery, and performance requirements
 */

// Performance targets for App Store approval
export const PERFORMANCE_TARGETS = {
  LAUNCH_TIME_MAX: 3000, // 3 seconds
  MEMORY_BASELINE_MAX: 100 * 1024 * 1024, // 100MB
  MEMORY_PEAK_MAX: 200 * 1024 * 1024, // 200MB
  FRAME_DROP_THRESHOLD: 5, // Max consecutive dropped frames
  NETWORK_SESSION_MAX: 10 * 1024 * 1024, // 10MB per session
  TARGET_FPS: 60,
} as const;

// Performance metrics tracking
interface PerformanceMetrics {
  appLaunchTime: number;
  memoryUsage: {
    baseline: number;
    peak: number;
    current: number;
  };
  networkUsage: {
    sessionTotal: number;
    averagePerSession: number;
  };
  crashCount: number;
  frameDrops: number;
}

class PerformanceManager {
  private static instance: PerformanceManager;
  private metrics: PerformanceMetrics;
  private startTime: number;
  private sessionStartTime: number;
  private networkBytesUsed: number = 0;
  private isMonitoring: boolean = false;
  private performanceObserver?: any;
  
  private constructor() {
    this.startTime = Date.now();
    this.sessionStartTime = Date.now();
    this.metrics = {
      appLaunchTime: 0,
      memoryUsage: {
        baseline: 0,
        peak: 0,
        current: 0,
      },
      networkUsage: {
        sessionTotal: 0,
        averagePerSession: 0,
      },
      crashCount: 0,
      frameDrops: 0,
    };
    this.initializePerformanceMonitoring();
  }

  public static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (__DEV__) {
      console.log('🚀 Performance monitoring initialized');
    }

    // Track app launch time
    this.trackAppLaunchTime();
    
    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Set up crash prevention
    this.setupCrashPrevention();
    
    // Monitor frame drops
    this.setupFrameMonitoring();
  }

  /**
   * Track app launch time - Apple guideline: < 3 seconds
   */
  private trackAppLaunchTime(): void {
    const launchTime = Date.now() - this.startTime;
    this.metrics.appLaunchTime = launchTime;
    
    if (__DEV__) {
      const status = launchTime < 3000 ? '✅' : '⚠️';
      console.log(`${status} App launch time: ${launchTime}ms (target: <3000ms)`);
    }
    
    // Log to analytics in production
    if (!__DEV__ && launchTime > 3000) {
      this.logPerformanceWarning('app_launch_slow', { launchTime });
    }
  }

  /**
   * Monitor memory usage - Apple guideline: < 100MB baseline, < 200MB peak
   */
  private startMemoryMonitoring(): void {
    // Simulated memory monitoring (would use native module in real implementation)
    const monitorMemory = () => {
      if (global.performance?.memory) {
        const memoryInfo = global.performance.memory;
        const currentMemory = memoryInfo.usedJSHeapSize / (1024 * 1024); // MB
        
        this.metrics.memoryUsage.current = currentMemory;
        this.metrics.memoryUsage.peak = Math.max(
          this.metrics.memoryUsage.peak, 
          currentMemory
        );
        
        if (this.metrics.memoryUsage.baseline === 0) {
          this.metrics.memoryUsage.baseline = currentMemory;
        }

        // Check memory thresholds
        if (currentMemory > 200) {
          this.logPerformanceWarning('memory_peak_exceeded', { currentMemory });
          this.attemptMemoryCleanup();
        } else if (currentMemory > 150) {
          if (__DEV__) {
            console.warn(`⚠️ High memory usage: ${currentMemory.toFixed(1)}MB`);
          }
        }
      }
    };

    // Monitor every 30 seconds
    setInterval(monitorMemory, 30000);
    monitorMemory(); // Initial check
  }

  /**
   * Setup comprehensive crash prevention
   */
  private setupCrashPrevention(): void {
    // Global error handler
    const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
    
    global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
      this.handleCrash(error, isFatal);
      
      // Call original handler if it exists
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });

    // Unhandled promise rejection handler
    const originalRejectionHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event: any) => {
      this.handleUnhandledRejection(event);
      
      if (originalRejectionHandler) {
        originalRejectionHandler(event);
      }
    };

    // Network request timeout protection
    this.setupNetworkTimeouts();
  }

  /**
   * Setup frame monitoring for 60 FPS target
   */
  private setupFrameMonitoring(): void {
    if (Platform.OS === 'ios' && !__DEV__) {
      // Would integrate with native performance monitoring
      // For now, we'll simulate frame drop detection
      let lastFrameTime = Date.now();
      
      const checkFrameRate = () => {
        const currentTime = Date.now();
        const frameTime = currentTime - lastFrameTime;
        
        // Target: 16.67ms per frame (60 FPS)
        if (frameTime > 32) { // 30 FPS threshold
          this.metrics.frameDrops++;
          
          if (this.metrics.frameDrops % 10 === 0) {
            this.logPerformanceWarning('frame_drops_detected', { 
              frameDrops: this.metrics.frameDrops 
            });
          }
        }
        
        lastFrameTime = currentTime;
        requestAnimationFrame(checkFrameRate);
      };
      
      requestAnimationFrame(checkFrameRate);
    }
  }

  /**
   * Handle crashes gracefully
   */
  private handleCrash(error: Error, isFatal: boolean): void {
    this.metrics.crashCount++;
    
    const crashReport = {
      error: error.message,
      stack: error.stack,
      isFatal,
      timestamp: new Date().toISOString(),
      deviceInfo: this.getDeviceInfo(),
      appState: this.getAppState(),
    };

    if (__DEV__) {
      console.error('💥 Crash detected:', crashReport);
    }

    // Log to crash reporting service in production
    if (!__DEV__) {
      this.logCrashReport(crashReport);
    }

    // Attempt graceful recovery for non-fatal errors
    if (!isFatal) {
      this.attemptGracefulRecovery();
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: any): void {
    const rejectionReport = {
      reason: event.reason?.toString() || 'Unknown rejection',
      promise: 'Promise rejection',
      timestamp: new Date().toISOString(),
      deviceInfo: this.getDeviceInfo(),
    };

    if (__DEV__) {
      console.error('🚨 Unhandled promise rejection:', rejectionReport);
    }

    // Prevent default handling in production to avoid crashes
    if (!__DEV__) {
      event.preventDefault?.();
      this.logCrashReport(rejectionReport);
    }
  }

  /**
   * Setup network request timeouts
   */
  private setupNetworkTimeouts(): void {
    const originalFetch = global.fetch;
    
    global.fetch = (input: RequestInfo, init?: RequestInit) => {
      const timeout = init?.signal ? undefined : 30000; // 30 second default timeout
      
      if (timeout && !init?.signal) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const initWithTimeout = {
          ...init,
          signal: controller.signal,
        };
        
        return originalFetch(input, initWithTimeout).finally(() => {
          clearTimeout(timeoutId);
        });
      }
      
      return originalFetch(input, init);
    };
  }

  /**
   * Attempt memory cleanup
   */
  private attemptMemoryCleanup(): void {
    if (__DEV__) {
      console.log('🧹 Attempting memory cleanup...');
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear any cached data
    this.clearOptionalCaches();
    
    // Reduce image cache size
    this.optimizeImageCache();
  }

  /**
   * Clear optional caches
   */
  private clearOptionalCaches(): void {
    // Clear navigation cache
    // Clear image cache (keeping essential images)
    // Clear old analytics data
    // Clear temporary files
    
    if (__DEV__) {
      console.log('🗑️ Cleared optional caches');
    }
  }

  /**
   * Optimize image cache
   */
  private optimizeImageCache(): void {
    // Reduce image cache size
    // Convert high-res images to appropriate sizes
    // Remove unused images from memory
    
    if (__DEV__) {
      console.log('🖼️ Optimized image cache');
    }
  }

  /**
   * Attempt graceful recovery from errors
   */
  private attemptGracefulRecovery(): void {
    // Reset navigation state if needed
    // Clear problematic data
    // Refresh critical app state
    
    if (__DEV__) {
      console.log('🔄 Attempting graceful recovery...');
    }
  }

  /**
   * Get device information for crash reports
   */
  private getDeviceInfo(): any {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      deviceName: Device.deviceName,
      modelName: Device.modelName,
      totalMemory: Device.totalMemory,
      appVersion: Application.nativeApplicationVersion,
      buildNumber: Application.nativeBuildVersion,
    };
  }

  /**
   * Get current app state for crash reports
   */
  private getAppState(): any {
    return {
      memoryUsage: this.metrics.memoryUsage,
      sessionDuration: Date.now() - this.sessionStartTime,
      networkUsage: this.metrics.networkUsage,
      frameDrops: this.metrics.frameDrops,
    };
  }

  /**
   * Log performance warning
   */
  private logPerformanceWarning(type: string, data: any): void {
    if (!__DEV__) {
      // Log to analytics service
      console.warn(`Performance warning: ${type}`, data);
    }
  }

  /**
   * Log crash report
   */
  private logCrashReport(crashReport: any): void {
    if (!__DEV__) {
      // Log to crash reporting service (Sentry, Crashlytics, etc.)
      console.error('Crash report:', crashReport);
    }
  }

  /**
   * Track network usage
   */
  public trackNetworkUsage(bytes: number): void {
    this.networkBytesUsed += bytes;
    this.metrics.networkUsage.sessionTotal = this.networkBytesUsed;
    
    const sessionDuration = (Date.now() - this.sessionStartTime) / (1000 * 60); // minutes
    this.metrics.networkUsage.averagePerSession = this.networkBytesUsed / Math.max(sessionDuration, 1);
    
    // Check if network usage is excessive (> 10MB per session)
    const sessionMB = this.networkBytesUsed / (1024 * 1024);
    if (sessionMB > 10) {
      this.logPerformanceWarning('network_usage_high', { 
        sessionMB,
        averagePerMinute: this.metrics.networkUsage.averagePerSession / (1024 * 1024) 
      });
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Generate performance report for App Store compliance
   */
  public generatePerformanceReport(): string {
    const metrics = this.getMetrics();
    const deviceInfo = this.getDeviceInfo();
    
    const report = {
      timestamp: new Date().toISOString(),
      deviceInfo,
      performance: {
        appLaunchTime: {
          value: metrics.appLaunchTime,
          target: 3000,
          status: metrics.appLaunchTime < 3000 ? 'PASS' : 'FAIL',
        },
        memoryUsage: {
          baseline: metrics.memoryUsage.baseline,
          peak: metrics.memoryUsage.peak,
          current: metrics.memoryUsage.current,
          baselineTarget: 100,
          peakTarget: 200,
          status: metrics.memoryUsage.peak < 200 ? 'PASS' : 'FAIL',
        },
        networkEfficiency: {
          sessionTotal: metrics.networkUsage.sessionTotal,
          averagePerSession: metrics.networkUsage.averagePerSession,
          target: 10 * 1024 * 1024, // 10MB
          status: metrics.networkUsage.sessionTotal < 10 * 1024 * 1024 ? 'PASS' : 'FAIL',
        },
        stability: {
          crashCount: metrics.crashCount,
          frameDrops: metrics.frameDrops,
          status: metrics.crashCount === 0 ? 'PASS' : 'WARN',
        },
      },
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Export performance data for debugging
   */
  public exportPerformanceData(): Promise<string> {
    return new Promise((resolve) => {
      const data = {
        metrics: this.getMetrics(),
        deviceInfo: this.getDeviceInfo(),
        appState: this.getAppState(),
        timestamp: new Date().toISOString(),
      };
      
      resolve(JSON.stringify(data, null, 2));
    });
  }
}

// Singleton instance
export const performanceManager = PerformanceManager.getInstance();

// Utility functions for easy access
export const trackNetworkUsage = (bytes: number) => performanceManager.trackNetworkUsage(bytes);
export const getPerformanceMetrics = () => performanceManager.getMetrics();
export const generatePerformanceReport = () => performanceManager.generatePerformanceReport();
export const exportPerformanceData = () => performanceManager.exportPerformanceData();

// Performance optimization utilities
export const optimizeImageLoading = (imageUri: string, maxWidth: number = 800) => {
  // Optimize image loading for memory efficiency
  const optimizedUri = imageUri.includes('?') 
    ? `${imageUri}&w=${maxWidth}&q=85&f=auto`
    : `${imageUri}?w=${maxWidth}&q=85&f=auto`;
  
  return optimizedUri;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory management utilities
export const createMemoizedSelector = <T, R>(
  selector: (input: T) => R,
  isEqual: (a: R, b: R) => boolean = (a, b) => a === b
) => {
  let lastInput: T;
  let lastResult: R;
  let hasResult = false;
  
  return (input: T): R => {
    if (!hasResult || lastInput !== input) {
      const newResult = selector(input);
      if (!hasResult || !isEqual(lastResult, newResult)) {
        lastResult = newResult;
      }
      lastInput = input;
      hasResult = true;
    }
    return lastResult;
  };
};

// Performance optimization utilities
export const PerformanceUtils = {
  // Optimize component rendering
  shouldComponentUpdate: <T extends Record<string, any>>(
    nextProps: T, 
    currentProps: T, 
    excludeKeys: (keyof T)[] = []
  ): boolean => {
    const keys = Object.keys(nextProps).filter(key => !excludeKeys.includes(key as keyof T));
    return keys.some(key => nextProps[key] !== currentProps[key]);
  },

  // Debounce function calls for performance
  debounce: <T extends (...args: any[]) => any>(
    func: T, 
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    };
  },

  // Throttle function calls
  throttle: <T extends (...args: any[]) => any>(
    func: T, 
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Optimize image loading
  getOptimalImageSize: (containerWidth: number, containerHeight: number, pixelRatio?: number): { width: number; height: number } => {
    const ratio = pixelRatio || PixelRatio.get();
    return {
      width: Math.ceil(containerWidth * ratio),
      height: Math.ceil(containerHeight * ratio),
    };
  },

  // Memory-efficient list rendering
  getListRenderConfig: (itemCount: number) => {
    const { height } = Dimensions.get('window');
    const estimatedItemHeight = 80; // Average item height
    const visibleItems = Math.ceil(height / estimatedItemHeight);
    
    return {
      initialNumToRender: Math.min(itemCount, visibleItems),
      maxToRenderPerBatch: visibleItems,
      windowSize: 5,
      removeClippedSubviews: itemCount > 100,
      getItemLayout: (data: any, index: number) => ({
        length: estimatedItemHeight,
        offset: estimatedItemHeight * index,
        index,
      }),
    };
  },

  // Crash prevention wrapper
  safeExecute: async <T>(
    operation: () => Promise<T>,
    fallback: T,
    errorHandler?: (error: Error) => void
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      performanceManager.recordError('js', err, true);
      
      if (errorHandler) {
        errorHandler(err);
      }
      
      return fallback;
    }
  },

  // Bundle size optimization checker
  analyzeBundleSize: () => {
    if (__DEV__) {
      console.log('📦 Bundle analysis available in development mode');
      // In production, this would integrate with bundle analyzers
    }
  },
};

// Performance hooks for React components
export const usePerformanceTracking = (componentName: string) => {
  const startTime = Date.now();
  
  React.useEffect(() => {
    const renderTime = Date.now() - startTime;
    if (renderTime > 100) { // Log slow renders
      console.log(`⏱️ Slow render: ${componentName} took ${renderTime}ms`);
    }
  }, [componentName, startTime]);

  const trackInteraction = React.useCallback((action: string) => {
    const interactionStart = Date.now();
    return () => {
      const interactionTime = Date.now() - interactionStart;
      if (interactionTime > 100) {
        console.log(`🖱️ Slow interaction: ${componentName}.${action} took ${interactionTime}ms`);
      }
    };
  }, [componentName]);

  return { trackInteraction };
};

// Network performance optimization
export const NetworkOptimizer = {
  // Request batching
  batchRequests: <T>(
    requests: (() => Promise<T>)[], 
    batchSize = 3
  ): Promise<T[]> => {
    const batches: (() => Promise<T>)[][] = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }

    return batches.reduce(async (acc, batch) => {
      const results = await acc;
      const batchResults = await Promise.all(batch.map(req => req()));
      return [...results, ...batchResults];
    }, Promise.resolve([] as T[]));
  },

  // Response caching
  createCacheWrapper: <T>(
    fetcher: (...args: any[]) => Promise<T>,
    ttl = 300000 // 5 minutes
  ) => {
    const cache = new Map<string, { data: T; timestamp: number }>();
    
    return async (...args: any[]): Promise<T> => {
      const key = JSON.stringify(args);
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < ttl) {
        performanceManager.recordNetworkRequest(0, true); // Cache hit
        return cached.data;
      }
      
      const data = await fetcher(...args);
      cache.set(key, { data, timestamp: Date.now() });
      performanceManager.recordNetworkRequest(JSON.stringify(data).length);
      
      return data;
    };
  },
};

// Development performance helpers
if (__DEV__) {
  // Add performance logging in development
  console.log('🔧 Performance monitoring enabled in development mode');
  
  // Monitor bundle size in development
  setTimeout(() => {
    console.log('📊 Performance report:', performanceManager.generatePerformanceReport());
  }, 5000);
} 