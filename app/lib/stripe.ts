import { loadStripe } from '@stripe/stripe-js';

export const STRIPE_PRICES = {
  basic: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID!,
  medium: process.env.NEXT_PUBLIC_STRIPE_MEDIUM_PRICE_ID!,
  premium: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!
} as const;

let stripePromise: Promise<any> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};