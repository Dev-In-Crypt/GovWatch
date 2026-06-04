import Stripe from 'stripe';

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-09-30.acacia' as Stripe.LatestApiVersion })
  : null;

export const PRICE_IDS = {
  delegate_pro: process.env.STRIPE_PRICE_DELEGATE_PRO ?? '',
  fund_suite: process.env.STRIPE_PRICE_FUND_SUITE ?? '',
} as const;

export const PLAN_BY_PRICE: Record<string, 'delegate_pro' | 'fund_suite'> = Object.fromEntries(
  Object.entries(PRICE_IDS)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => [v, k as 'delegate_pro' | 'fund_suite']),
);
