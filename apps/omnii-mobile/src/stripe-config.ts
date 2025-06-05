import { env, getStripeConfig } from './lib/env';

/**
 * Stripe Configuration for OMNII
 * Uses type-safe environment variables with proper fallbacks
 */

// Get environment-based Stripe configuration
const stripeConfig = getStripeConfig();

/**
 * Stripe Product Configuration
 */
export const products = {
  omnii_pro: {
    name: 'OMNII Pro',
    description: 'AI-powered productivity assistant with unlimited access',
    monthly: {
      priceId: stripeConfig.pricing.monthlyPriceId || 'price_1RSsvYC7ANnP3tIcaFC3Lctg', // Fallback to current price
      amount: 999, // $9.99 in cents
      currency: 'usd',
      interval: 'month',
      mode: 'subscription' as const,
    },
    yearly: {
      priceId: stripeConfig.pricing.yearlyPriceId || '', // To be set from environment
      amount: 9999, // $99.99 in cents (17% savings)
      currency: 'usd',
      interval: 'year',
      mode: 'subscription' as const,
    },
  },
} as const;

/**
 * Stripe Public Configuration
 * Safe to use on client-side
 */
export const stripePublicConfig = {
  publishableKey: stripeConfig.publishableKey,
  environment: env.app.environment,
} as const;

/**
 * Stripe Features Configuration
 */
export const stripeFeatures = [
  '🤖 AI-powered task suggestions',
  '📊 Advanced analytics & insights',
  '🎮 Gamified productivity system',
  '🎯 Achievement tracking',
  '💬 AI productivity coach',
  '🔄 Cross-device sync',
  '📱 Mobile & desktop apps',
  '💎 Priority support',
] as const;

/**
 * Subscription Plan Configuration
 */
export const subscriptionPlans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$9.99',
    period: 'per month',
    priceId: products.omnii_pro.monthly.priceId,
    amount: products.omnii_pro.monthly.amount,
    savings: null,
    popular: false,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$99.99',
    period: 'per year',
    priceId: products.omnii_pro.yearly.priceId,
    amount: products.omnii_pro.yearly.amount,
    savings: 'Save 17%',
    popular: true,
  },
] as const;

/**
 * Stripe Webhook Event Types
 * For server-side event handling
 */
export const webhookEvents = {
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  PAYMENT_FAILED: 'invoice.payment_failed',
  PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
} as const;

/**
 * Payment Method Configuration
 */
export const paymentMethods = {
  card: {
    enabled: true,
    supportedNetworks: ['visa', 'mastercard', 'amex', 'discover'],
  },
  applePay: {
    enabled: true,
    merchantCountryCode: 'US',
  },
  googlePay: {
    enabled: true,
    merchantCountryCode: 'US',
    testEnv: env.app.environment !== 'production',
    currencyCode: 'USD',
  },
} as const;

/**
 * Trial Configuration
 */
export const trialConfig = {
  duration: 3, // days
  description: '3-day free trial',
  features: stripeFeatures,
} as const;

/**
 * Server-side Stripe Configuration
 * Only available in server-side environments (Supabase Edge Functions)
 */
export const getServerStripeConfig = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Server-side Stripe config should not be accessed on client-side');
  }
  
  return {
    secretKey: stripeConfig.secretKey,
    webhookSecret: stripeConfig.webhookSecret,
    pricing: stripeConfig.pricing,
  };
};

/**
 * Utility function to get subscription plan by ID
 */
export const getSubscriptionPlan = (planId: string) => {
  return subscriptionPlans.find(plan => plan.id === planId);
};

/**
 * Utility function to validate Stripe configuration
 */
export const validateStripeConfig = () => {
  const errors: string[] = [];
  
  if (!stripeConfig.publishableKey) {
    errors.push('Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }
  
  if (!products.omnii_pro.monthly.priceId) {
    errors.push('Missing monthly price ID');
  }
  
  if (errors.length > 0) {
    throw new Error(`Stripe configuration errors: ${errors.join(', ')}`);
  }
  
  return true;
};

// Validate configuration on import in development
if (env.app.enableDebugMode) {
  try {
    validateStripeConfig();
    console.log('✅ Stripe configuration validated successfully');
  } catch (error) {
    console.error('❌ Stripe configuration validation failed:', error);
  }
}