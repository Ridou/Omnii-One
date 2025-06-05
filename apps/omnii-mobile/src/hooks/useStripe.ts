import { useCallback } from 'react';
import { useAuth } from '~/context/AuthContext';
import { products } from '~/stripe-config';
import Constants from 'expo-constants';

export function useStripe() {
  const { user } = useAuth();

  const createCheckoutSession = useCallback(
    async (productId: keyof typeof products) => {
      if (!user) {
        throw new Error('User must be logged in');
      }

      const product = products[productId];
      if (!product) {
        throw new Error('Invalid product');
      }

      const { priceId, mode } = product;

      const response = await fetch(
        `${Constants.expoConfig?.extra?.supabaseUrl}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Constants.expoConfig?.extra?.supabaseAnonKey}`,
          },
          body: JSON.stringify({
            price_id: priceId,
            success_url: `${window.location.origin}/success`,
            cancel_url: `${window.location.origin}/cancel`,
            mode,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    },
    [user]
  );

  return { createCheckoutSession };
}
